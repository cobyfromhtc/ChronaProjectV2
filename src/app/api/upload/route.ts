import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

/**
 * POST /api/upload
 *
 * Accepts a multipart FormData with:
 *   - file: the image file (required)
 *   - type: upload type (optional, defaults to 'avatar')
 *
 * Saves the file to the local `upload/` directory and creates an
 * `imageRecord` in Pocketbase. Returns the image URL as
 * `/api/images/{code}` which redirects to the actual file.
 *
 * This replaces the old Discord webhook storage system — images are now
 * saved locally on the server (backed by the filesystem) and tracked in
 * the Pocketbase SQLite database.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'avatar'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Generate a unique image code (20-char alphanumeric)
    const code = crypto.randomBytes(10).toString('hex')

    // Determine file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const safeExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'png'
    const fileName = `${code}.${safeExt}`

    // Save the file to the upload directory
    const uploadDir = join(process.cwd(), 'upload')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // The URL that the frontend will use to access the image
    // /api/images/{code} will serve the file
    const imageUrl = `/api/images/${code}`

    // Save the image record to Pocketbase
    await db.imageRecord.create({
      data: {
        code,
        url: imageUrl,
        discordUrl: imageUrl, // Reuse the same URL (no Discord anymore)
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: user.id,
        uploadType: type,
      },
    })

    return NextResponse.json({
      success: true,
      url: imageUrl,
      code,
      fileName: file.name,
      fileSize: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
