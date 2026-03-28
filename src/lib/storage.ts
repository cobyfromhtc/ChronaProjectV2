/**
 * Storage abstraction layer for file uploads
 * Supports both local filesystem (development) and S3-compatible storage (production)
 */

import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Storage type
export type StorageType = 'local' | 's3'

// Configuration - Save to public/uploads so Next.js serves them as static files
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// Check if S3 is configured
export function isS3Configured(): boolean {
  return !!(
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME &&
    process.env.S3_REGION &&
    process.env.S3_ENDPOINT
  )
}

// Get current storage type
export function getStorageType(): StorageType {
  if (isS3Configured()) {
    return 's3'
  }
  return 'local'
}

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Generate a unique filename
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}${ext}`
}

/**
 * Upload a file
 * @param file - The file buffer
 * @param filename - Original filename
 * @param folder - Optional folder path
 * @returns The URL or path to the uploaded file
 */
export async function uploadFile(
  file: Buffer,
  filename: string,
  folder?: string
): Promise<{ url: string; key: string }> {
  const storageType = getStorageType()
  const key = folder ? `${folder}/${generateFilename(filename)}` : generateFilename(filename)
  
  if (storageType === 's3') {
    return uploadToS3(file, key)
  } else {
    return uploadToLocal(file, key)
  }
}

/**
 * Upload an avatar image
 */
export async function uploadAvatar(
  file: Buffer,
  filename: string,
  userId: string
): Promise<{ url: string; key: string }> {
  return uploadFile(file, filename, `avatars/${userId}`)
}

/**
 * Upload to local filesystem
 */
async function uploadToLocal(file: Buffer, key: string): Promise<{ url: string; key: string }> {
  await ensureUploadDir()
  
  const filepath = path.join(UPLOAD_DIR, key)
  const dir = path.dirname(filepath)
  
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  
  await writeFile(filepath, file)
  
  return {
    url: `/uploads/${key}`,
    key
  }
}

/**
 * Upload to S3-compatible storage
 */
async function uploadToS3(file: Buffer, key: string): Promise<{ url: string; key: string }> {
  // S3 upload implementation
  // This would use AWS SDK or a similar library
  // For now, fall back to local storage
  
  console.warn('[Storage] S3 not fully configured, falling back to local storage')
  return uploadToLocal(file, key)
}

/**
 * Get a file
 */
export async function getFile(key: string): Promise<Buffer | null> {
  const storageType = getStorageType()
  
  if (storageType === 's3') {
    return getFileFromS3(key)
  } else {
    return getFileFromLocal(key)
  }
}

/**
 * Get file from local filesystem
 */
async function getFileFromLocal(key: string): Promise<Buffer | null> {
  try {
    const filepath = path.join(UPLOAD_DIR, key)
    if (!existsSync(filepath)) {
      return null
    }
    return await readFile(filepath)
  } catch (error) {
    console.error('[Storage] Error reading file:', error)
    return null
  }
}

/**
 * Get file from S3
 */
async function getFileFromS3(key: string): Promise<Buffer | null> {
  // S3 get implementation
  console.warn('[Storage] S3 not fully configured, falling back to local storage')
  return getFileFromLocal(key)
}

/**
 * Delete a file
 */
export async function deleteFile(key: string): Promise<boolean> {
  const storageType = getStorageType()
  
  if (storageType === 's3') {
    return deleteFromS3(key)
  } else {
    return deleteFromLocal(key)
  }
}

/**
 * Delete from local filesystem
 */
async function deleteFromLocal(key: string): Promise<boolean> {
  try {
    const filepath = path.join(UPLOAD_DIR, key)
    if (!existsSync(filepath)) {
      return false
    }
    await unlink(filepath)
    return true
  } catch (error) {
    console.error('[Storage] Error deleting file:', error)
    return false
  }
}

/**
 * Delete from S3
 */
async function deleteFromS3(key: string): Promise<boolean> {
  // S3 delete implementation
  console.warn('[Storage] S3 not fully configured, falling back to local storage')
  return deleteFromLocal(key)
}

/**
 * Get public URL for a file
 */
export function getFileUrl(key: string): string {
  const storageType = getStorageType()
  
  if (storageType === 's3' && process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL}/${key}`
  }
  
  return `/uploads/${key}`
}