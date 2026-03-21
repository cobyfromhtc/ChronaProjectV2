/**
 * Storage Abstraction Layer
 * Supports local filesystem (development) and S3-compatible cloud storage (production)
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Types
export interface UploadResult {
  success: boolean
  url: string
  key?: string // For S3, the object key
  error?: string
}

export interface StorageConfig {
  type: 'local' | 's3'
  // Local config
  localPath?: string
  // S3 config
  s3Bucket?: string
  s3Region?: string
  s3Endpoint?: string
  s3AccessKey?: string
  s3SecretKey?: string
  s3CdnUrl?: string
}

// Get storage configuration from environment
function getStorageConfig(): StorageConfig {
  return {
    type: (process.env.STORAGE_TYPE as 'local' | 's3') || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './public/uploads',
    s3Bucket: process.env.S3_BUCKET,
    s3Region: process.env.S3_REGION || 'us-east-1',
    s3Endpoint: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
    s3AccessKey: process.env.S3_ACCESS_KEY,
    s3SecretKey: process.env.S3_SECRET_KEY,
    s3CdnUrl: process.env.S3_CDN_URL,
  }
}

/**
 * Upload file to local filesystem
 */
async function uploadToLocal(
  file: Buffer,
  filename: string,
  folder: string,
  config: StorageConfig
): Promise<UploadResult> {
  try {
    const basePath = config.localPath || './public/uploads'
    const uploadDir = path.join(process.cwd(), basePath, folder)
    
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, file)
    
    // Return URL relative to public folder
    const url = `/uploads/${folder}/${filename}`
    
    return { success: true, url, key: `${folder}/${filename}` }
  } catch (error) {
    console.error('[Storage] Local upload error:', error)
    return { 
      success: false, 
      url: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Upload file to S3-compatible storage
 * Uses fetch with AWS Signature V4 for authentication
 */
async function uploadToS3(
  file: Buffer,
  filename: string,
  folder: string,
  config: StorageConfig
): Promise<UploadResult> {
  try {
    // Validate S3 config
    if (!config.s3Bucket || !config.s3AccessKey || !config.s3SecretKey) {
      throw new Error('Missing S3 configuration. Please set S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY')
    }
    
    const key = `${folder}/${filename}`
    const host = `${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com`
    
    // AWS Signature V4 signing
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    
    // Create canonical request
    const canonicalUri = `/${key}`
    const canonicalQueryString = ''
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${await hashSha256(file)}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    const payloadHash = await hashSha256(file)
    
    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
    
    // Create string to sign
    const credentialScope = `${dateStamp}/${config.s3Region}/s3/aws4_request`
    const canonicalRequestHash = await hashSha256(Buffer.from(canonicalRequest))
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`
    
    // Calculate signature
    const signingKey = await getSignatureKey(
      config.s3SecretKey,
      dateStamp,
      config.s3Region,
      's3'
    )
    const signature = await hmacSha256(signingKey, stringToSign)
    
    // Create authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${config.s3AccessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    
    // Upload to S3
    const endpoint = config.s3Endpoint || `https://${host}`
    const response = await fetch(`${endpoint}/${config.s3Bucket}/${key}`, {
      method: 'PUT',
      headers: {
        'Host': host,
        'Content-Type': 'application/octet-stream',
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorization,
      },
      body: file,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`S3 upload failed: ${response.status} ${errorText}`)
    }
    
    // Return URL (use CDN URL if configured)
    const url = config.s3CdnUrl 
      ? `${config.s3CdnUrl}/${key}`
      : `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`
    
    return { success: true, url, key }
  } catch (error) {
    console.error('[Storage] S3 upload error:', error)
    return { 
      success: false, 
      url: '', 
      error: error instanceof Error ? error.message : 'S3 upload failed' 
    }
  }
}

// Helper functions for AWS signing
async function hashSha256(data: Buffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(hashBuffer)
}

async function hmacSha256(key: Buffer | ArrayBuffer, data: string): Promise<string> {
  const keyBuffer = key instanceof Buffer ? key : Buffer.from(key)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    Buffer.from(data)
  )
  return bufferToHex(signature)
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Buffer> {
  const kDate = await hmacSha256Raw(Buffer.from(`AWS4${key}`), dateStamp)
  const kRegion = await hmacSha256Raw(kDate, region)
  const kService = await hmacSha256Raw(kRegion, service)
  const kSigning = await hmacSha256Raw(kService, 'aws4_request')
  return Buffer.from(kSigning)
}

async function hmacSha256Raw(key: Buffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, Buffer.from(data))
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Main upload function
 * Automatically selects storage backend based on configuration
 */
export async function uploadFile(
  file: Buffer,
  filename: string,
  folder: string = 'avatars'
): Promise<UploadResult> {
  const config = getStorageConfig()
  
  console.log(`[Storage] Uploading ${filename} to ${config.type} storage in folder ${folder}`)
  
  if (config.type === 's3') {
    return uploadToS3(file, filename, folder, config)
  } else {
    return uploadToLocal(file, filename, folder, config)
  }
}

/**
 * Upload avatar image with validation
 */
export async function uploadAvatar(
  file: Buffer,
  userId: string,
  extension: string = 'png'
): Promise<UploadResult> {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const filename = `${userId}-${timestamp}-${randomString}.${extension}`
  
  return uploadFile(file, filename, 'avatars')
}

/**
 * Upload storyline image (icon, banner)
 */
export async function uploadStorylineImage(
  file: Buffer,
  storylineId: string,
  type: 'icon' | 'banner',
  extension: string = 'png'
): Promise<UploadResult> {
  const timestamp = Date.now()
  const filename = `${storylineId}-${type}-${timestamp}.${extension}`
  
  return uploadFile(file, filename, 'storylines')
}

/**
 * Get the storage type currently in use
 */
export function getStorageType(): 'local' | 's3' {
  return (process.env.STORAGE_TYPE as 'local' | 's3') || 'local'
}

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY
  )
}
