import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadAvatar, getStorageType, isS3Configured } from '@/lib/storage'
import { uploadRateLimiter } from '@/lib/rate-limit'

// POST - Upload an avatar image
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for uploads
    const rateLimitResponse = uploadRateLimiter(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      )
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }
    
    // Get file extension
    const extension = file.name.split('.').pop() || 'png'
    
    // Read file as buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload using storage abstraction
    const result = await uploadAvatar(buffer, user.id, extension)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      )
    }
    
    // Log storage type for debugging
    console.log(`[Upload] File uploaded successfully via ${getStorageType()} storage`)
    
    return NextResponse.json({ 
      success: true,
      url: result.url,
      avatarUrl: result.url,  // Keep for backwards compatibility
      storageType: getStorageType(),
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// GET - Check storage configuration status
export async function GET() {
  return NextResponse.json({
    storageType: getStorageType(),
    s3Configured: isS3Configured(),
  })
}
