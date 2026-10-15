import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { uploadRateLimiter } from '@/lib/rate-limit'
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
} from '@/lib/attachments'

// =============================================
// Upload API — general image upload endpoint
// =============================================
// Accepts multipart/form-data with a `file` field (image only, ≤ 8MB),
// stores it in the local `upload/` directory as `{code}.{ext}` and
// registers an `imageRecords` row so the existing /api/images/[code]
// route can serve it with immutable caching.
// Used by the persona/scenario image pickers across the app.

const UPLOAD_DIR = path.join(process.cwd(), 'upload')

// Extension lookup for the stored file name
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

function generateCode(): string {
  // 20-char hex code (matches what /api/images/[code] expects)
  return crypto.randomBytes(10).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const limited = uploadRateLimiter(request)
    if (limited) return limited

    // Auth required
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Parse multipart form
    const formData = await request.formData().catch(() => null)
    if (!formData) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'A "file" field is required' }, { status: 400 })
    }

    // Optional metadata from the client (e.g. 'avatar' | 'scenario_image')
    const rawUploadType = formData.get('uploadType')
    const uploadType =
      typeof rawUploadType === 'string' && rawUploadType.trim().length > 0
        ? rawUploadType.trim().slice(0, 60)
        : 'avatar'

    // Validate type + size (mirror the message-attachment rules)
    if (!(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PNG, JPG, GIF and WebP images are allowed.' },
        { status: 400 }
      )
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: 'The file is empty' }, { status: 400 })
    }
    if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image is too large. Maximum size is 8MB.' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    // Read the file into a buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Ensure the upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate a unique code and write the file
    let code = generateCode()
    let filePath = path.join(UPLOAD_DIR, `${code}.${ext}`)
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!existsSync(filePath)) break
      code = generateCode()
      filePath = path.join(UPLOAD_DIR, `${code}.${ext}`)
    }
    await writeFile(filePath, buffer)

    // Register the image record (url points at the serving route)
    const url = `/api/images/${code}`
    try {
      await db.imageRecord.create({
        data: {
          code,
          url,
          discordUrl: url,
          fileName: file.name || `upload.${ext}`,
          fileType: file.type,
          fileSize: file.size,
          uploadedBy: user.id,
          uploadType,
        },
      })
    } catch (recordError) {
      // Non-fatal: the file still exists on disk and is servable by code
      console.error('[Upload] Failed to create image record:', recordError)
    }

    return NextResponse.json({ success: true, url, code }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Failed to upload image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
