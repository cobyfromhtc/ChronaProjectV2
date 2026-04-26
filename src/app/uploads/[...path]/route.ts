import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

/**
 * GET /uploads/[...path]
 * Serve uploaded files from the public/uploads directory.
 * If the file doesn't exist, return a 1x1 transparent PNG
 * instead of a 404 to avoid console errors for missing avatars/images.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = path.join(UPLOAD_DIR, ...pathSegments)

    // Security: ensure the resolved path is within UPLOAD_DIR
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (existsSync(resolvedPath)) {
      const fileBuffer = await readFile(resolvedPath)
      const ext = path.extname(resolvedPath).toLowerCase()

      const contentTypeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      }

      const contentType = contentTypeMap[ext] || 'application/octet-stream'

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // File not found - return a minimal transparent 1x1 PNG
    // This prevents 404 console errors while the Avatar component shows fallback
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )

    return new NextResponse(transparentPng, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        'X-Missing-Image': 'true',
      },
    })
  } catch (error) {
    console.error('[Upload Serve] Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
