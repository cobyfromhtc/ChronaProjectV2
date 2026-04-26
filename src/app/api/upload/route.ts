import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadFile, type StorageType } from '@/lib/storage'
import { isPostImagesConfigured, testPostImagesConnection, getPostImagesStatus } from '@/lib/postimages'
import { isDiscordConfigured, uploadToDiscord, saveImageRecord, getDiscordStorageStatus, testDiscordConnection } from '@/lib/discord-storage'
import { uploadRateLimiter } from '@/lib/rate-limit'
import type { UploadType } from '@/lib/postimages'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * GET /api/upload?action=status
 * Check the status of the upload service (PostImages, Discord configuration, etc.)
 */
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')

  if (action === 'status') {
    const postImagesStatus = getPostImagesStatus()
    const discordStatus = getDiscordStorageStatus()
    return NextResponse.json({
      storage: {
        postimages: {
          configured: postImagesStatus.configured,
          keyCount: postImagesStatus.keyCount,
          maxFileSize: postImagesStatus.maxFileSize,
          uploadTypes: postImagesStatus.uploadTypes,
        },
        discord: {
          configured: discordStatus.configured,
          webhookUrlSet: discordStatus.webhookUrlSet,
          maxFileSize: discordStatus.maxFileSize,
          uploadTypes: discordStatus.uploadTypes,
        },
      },
    })
  }

  if (action === 'test') {
    // Test upload connections - admin utility
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const postImagesResult = await testPostImagesConnection()
    const discordResult = await testDiscordConnection()
    return NextResponse.json({
      postimages: postImagesResult,
      discord: discordResult,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

/**
 * POST /api/upload
 * Upload an image file.
 *
 * Query parameters:
 * - storage: Force a specific storage backend ('local' | 'postimages' | 'discord')
 * - type: Upload type ('avatar' | 'banner' | 'storyline_icon' | 'message_image')
 *
 * When Discord webhook is configured, uploads are also sent to Discord for CDN storage.
 * When PostImages API keys are configured, uploads default to PostImages
 * with automatic fallback to local storage on failure.
 * When no external storage is configured, uploads go to local storage.
 *
 * After successful upload, an ImageRecord is saved in the database with a unique
 * image code, allowing the image to be referenced via /api/images/{code}.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = uploadRateLimiter(request)
    if (rateLimitResponse) return rateLimitResponse

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    // Parse query parameters
    const storageParam = request.nextUrl.searchParams.get('storage') as StorageType | null
    const uploadTypeParam = (request.nextUrl.searchParams.get('type') as UploadType) || 'avatar'

    // Determine storage backend
    let forceStorage: StorageType | undefined
    if (storageParam === 'postimages') {
      if (!isPostImagesConfigured()) {
        return NextResponse.json(
          { error: 'PostImages API is not configured. Set POSTIMAGES_API_KEY environment variables.' },
          { status: 400 }
        )
      }
      forceStorage = 'postimages'
    } else if (storageParam === 'discord') {
      if (!isDiscordConfigured()) {
        return NextResponse.json(
          { error: 'Discord webhook is not configured. Set DISCORD_WEBHOOK_URL environment variable.' },
          { status: 400 }
        )
      }
      forceStorage = 'discord'
    } else if (storageParam === 'local') {
      forceStorage = 'local'
    }
    // If no storage param specified, auto-detect (Discord > PostImages > local)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine folder based on upload type and user
    let folder: string | undefined
    switch (uploadTypeParam) {
      case 'avatar':
        folder = `avatars/${session.id}`
        break
      case 'banner':
        folder = `banners/${session.id}`
        break
      case 'storyline_icon':
        folder = 'icons'
        break
      case 'message_image':
        folder = 'messages'
        break
      default:
        folder = `uploads/${session.id}`
    }

    const result = await uploadFile(buffer, file.name, folder, uploadTypeParam, forceStorage)

    // Try to also send to Discord webhook if configured and not already using Discord as primary
    let code: string | undefined
    let discordUrl: string | undefined

    if (result.storage === 'discord') {
      // If Discord was the primary storage, use its code and discordUrl
      code = result.code
      discordUrl = result.discordUrl

      // Save ImageRecord for Discord-uploaded images
      try {
        await saveImageRecord({
          code: code,
          url: result.url,
          discordUrl: discordUrl || '',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedBy: session.id,
          uploadType: uploadTypeParam,
        })
      } catch (dbError) {
        console.warn('[Upload] Failed to save Discord ImageRecord to database:', dbError)
      }
    } else if (isDiscordConfigured()) {
      // Discord is configured but wasn't the primary storage — also send to Discord for CDN backup
      try {
        const discordResult = await uploadToDiscord(buffer, file.name, uploadTypeParam)
        code = discordResult.code
        discordUrl = discordResult.discordUrl

        // Save ImageRecord with both the original URL and Discord CDN URL
        try {
          await saveImageRecord({
            code: discordResult.code,
            url: result.url,
            discordUrl: discordResult || '',
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadedBy: session.id,
            uploadType: uploadTypeParam,
          })
        } catch (dbError) {
          console.warn('[Upload] Failed to save ImageRecord to database:', dbError)
        }
      } catch (discordError) {
        // Discord upload failed — don't fail the whole request, just log and continue
        console.warn(
          '[Upload] Discord webhook upload failed (non-fatal):',
          discordError instanceof Error ? discordError.message : discordError
        )
      }
    }

    // Maintain backward-compatible response format, adding new fields
    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      storage: result.storage,
      code: code,
      discordUrl: discordUrl,
      avatarUrl: uploadTypeParam === 'avatar' ? result.url : undefined,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
