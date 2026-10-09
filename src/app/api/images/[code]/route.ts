import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import { join } from 'path'

/**
 * GET /api/images/[code]
 *
 * Serves an image file from the local `upload/` directory by its code.
 * The code is a 20-char hex string generated during upload. The file
 * extension is auto-detected by scanning the upload directory.
 *
 * This replaces the old Discord webhook redirect system — images are
 * now served directly from the local filesystem, tracked by the
 * `imageRecords` collection in Pocketbase.
 *
 * Query parameters:
 * - json: If set to "true", returns JSON with image metadata instead of serving the file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code || code.trim() === '') {
      return NextResponse.json(
        { error: 'Image code is required' },
        { status: 400 }
      )
    }

    // Look up the image record in Pocketbase
    let imageRecord: any = null
    try {
      imageRecord = await db.imageRecord.findUnique({
        where: { code },
      })
    } catch {
      // If PB lookup fails, try to serve the file directly from the filesystem
    }

    // Check if the client wants JSON metadata
    const jsonResponse = request.nextUrl.searchParams.get('json')
    if (jsonResponse === 'true' && imageRecord) {
      return NextResponse.json({
        code,
        url: imageRecord.url || `/api/images/${code}`,
        fileName: imageRecord.fileName,
        fileType: imageRecord.fileType,
        uploadType: imageRecord.uploadType,
        createdAt: imageRecord.createdAt,
      })
    }

    // Try to find the file in the upload directory
    // The file is saved as {code}.{ext} where ext is png/jpg/jpeg/gif/webp/svg
    const uploadDir = join(process.cwd(), 'upload')
    if (!existsSync(uploadDir)) {
      return NextResponse.json(
        { error: 'Image not found', code },
        { status: 404 }
      )
    }

    // Scan for a file that starts with the code
    const files = await readdir(uploadDir)
    const matchingFile = files.find((f) => f.startsWith(`${code}.`))

    if (!matchingFile) {
      // If no local file found, try to redirect to the stored URL (for old Discord images)
      if (imageRecord?.url && imageRecord.url.startsWith('http')) {
        return NextResponse.redirect(imageRecord.url)
      }
      return NextResponse.json(
        { error: 'Image not found', code },
        { status: 404 }
      )
    }

    // Serve the file from the local filesystem
    const filePath = join(uploadDir, matchingFile)

    // Determine content type from extension
    const ext = matchingFile.split('.').pop()?.toLowerCase() || ''
    const contentTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    // Use Node.js file system to read and serve the file
    const { readFile } = await import('fs/promises')
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[Image Serve] Error serving image:', error)
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    )
  }
}
