// =============================================================
// Message attachment rules and helpers (shared client/server)
// =============================================================
//
// Chrona DM messages can carry multiple image attachments
// (PNG / JPG / GIF / WebP) alongside their text content. Files are
// uploaded separately through the image upload endpoint; only their
// metadata ({ url, fileName, fileType, fileSize }) is stored on the
// message (as a JSON string in PocketBase's `attachments` json field).
//
// This module centralizes the limits so the UI (pre-upload checks)
// and the API routes (server-side validation) stay in sync:
//   - max 5 attachments per message
//   - max 8 MB per file
//   - only PNG / JPEG / GIF / WebP images
//   - URL must be a relative same-origin path (e.g. /api/images/...
//     or /uploads/...) or an absolute https:// URL

export interface MessageAttachment {
  /** Where the file is served from (relative path or https URL) */
  url: string
  /** Original/derived file name, e.g. "screenshot.png" */
  fileName: string
  /** MIME type, one of ALLOWED_ATTACHMENT_MIME_TYPES */
  fileType: string
  /** File size in bytes (metadata only — the file itself is not re-verified) */
  fileSize: number
}

export const MAX_ATTACHMENTS_PER_MESSAGE = 5

export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const

export const MAX_ATTACHMENT_FILENAME_LENGTH = 255

// ─────────────────────────────────────────────────────────────
// Client-side pre-upload validation (DOM File API)
// ─────────────────────────────────────────────────────────────

/**
 * Validate a browser File before uploading it as a message attachment.
 *
 * @param file The file the user picked
 * @returns `null` when the file is acceptable, otherwise a friendly,
 *          user-facing error string explaining what is wrong.
 */
export function validateAttachment(file: File): string | null {
  if (!file.type || !(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `"${file.name}" is not a supported image type. Only PNG, JPG, GIF and WebP images can be attached.`
  }
  if (file.size <= 0) {
    return `"${file.name}" is empty.`
  }
  if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    return `"${file.name}" is too large. Images must be 8 MB or smaller.`
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Pure URL / payload validation (usable on client and server)
// ─────────────────────────────────────────────────────────────

/**
 * Check that an attachment URL points somewhere we allow:
 *   - a relative same-origin path starting with "/" (e.g. "/api/images/abc",
 *     "/uploads/messages/123/xyz.png"), or
 *   - an absolute https:// URL (e.g. an external image host).
 *
 * Everything else (javascript:, data:, http://, protocol-relative "//",
 * URLs with whitespace) is rejected.
 */
export function isValidAttachmentUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  // Relative same-origin path
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true
  // Absolute URL — https only
  if (trimmed.startsWith('https://')) {
    try {
      new URL(trimmed)
      return true
    } catch {
      return false
    }
  }
  return false
}

/** Sanitize a file name for storage (trim, strip control chars, cap length). */
function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_ATTACHMENT_FILENAME_LENGTH)
  return cleaned || 'image'
}

/** Best-effort file name derived from a URL path (used for legacy synthesis). */
export function fileNameFromUrl(url: string): string {
  try {
    const clean = url.split('?')[0].split('#')[0]
    const last = clean.split('/').filter(Boolean).pop() || ''
    return sanitizeFileName(decodeURIComponent(last)) || 'image'
  } catch {
    return 'image'
  }
}

/** Best-effort image MIME type inferred from a URL extension. */
export function fileTypeFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0].toLowerCase()
  if (clean.endsWith('.png')) return 'image/png'
  if (clean.endsWith('.gif')) return 'image/gif'
  if (clean.endsWith('.webp')) return 'image/webp'
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/jpeg'
}

export type SanitizeAttachmentsResult =
  | { ok: true; value: MessageAttachment[] }
  | { ok: false; error: string }

/**
 * Server-side validation of a request body's `attachments` array.
 *
 * Accepts `null`/`undefined` (no attachments) and arrays of up to
 * MAX_ATTACHMENTS_PER_MESSAGE objects shaped `{ url, fileName, fileType, fileSize }`.
 * Any extra properties on the objects are stripped. Returns a friendly
 * error string for the first problem found.
 */
export function sanitizeAttachmentsInput(input: unknown): SanitizeAttachmentsResult {
  if (input == null) return { ok: true, value: [] }
  if (!Array.isArray(input)) {
    return { ok: false, error: 'attachments must be an array of image attachments' }
  }
  if (input.length === 0) {
    return { ok: true, value: [] }
  }
  if (input.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return {
      ok: false,
      error: `Too many attachments: you can attach at most ${MAX_ATTACHMENTS_PER_MESSAGE} images per message`,
    }
  }

  const cleaned: MessageAttachment[] = []
  for (let i = 0; i < input.length; i++) {
    const item = input[i]
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: `Attachment #${i + 1} is malformed` }
    }
    const { url, fileName, fileType, fileSize } = item as Record<string, unknown>

    // url
    if (typeof url !== 'string' || !isValidAttachmentUrl(url)) {
      return {
        ok: false,
        error: `Attachment #${i + 1} has an invalid URL (must be an uploaded image path or https URL)`,
      }
    }

    // fileType (metadata must match an allowed image type)
    if (typeof fileType !== 'string' || !(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(fileType)) {
      return {
        ok: false,
        error: `Attachment #${i + 1} has an unsupported file type. Only PNG, JPG, GIF and WebP images are allowed`,
      }
    }

    // fileSize (metadata check only — actual bytes were checked at upload time)
    const size = Number(fileSize)
    if (!Number.isFinite(size) || size < 0) {
      return { ok: false, error: `Attachment #${i + 1} has an invalid file size` }
    }
    if (size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error: `Attachment #${i + 1} exceeds the 8 MB per-image size limit`,
      }
    }

    // fileName (fall back to a name derived from the URL)
    const name =
      typeof fileName === 'string' && fileName.trim()
        ? sanitizeFileName(fileName)
        : fileNameFromUrl(url)

    cleaned.push({
      url: url.trim(),
      fileName: name,
      fileType,
      fileSize: Math.round(size),
    })
  }

  return { ok: true, value: cleaned }
}

/**
 * Parse a stored `attachments` value (JSON string or already-parsed array)
 * into a MessageAttachment[]. Tolerates corrupt/legacy values by returning [].
 */
export function parseStoredAttachments(stored: unknown): MessageAttachment[] {
  if (stored == null) return []
  let value: unknown = stored
  if (typeof stored === 'string') {
    try {
      value = JSON.parse(stored)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  const out: MessageAttachment[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const { url, fileName, fileType, fileSize } = item as Record<string, unknown>
    if (typeof url !== 'string' || !url) continue
    out.push({
      url,
      fileName: typeof fileName === 'string' && fileName ? fileName : fileNameFromUrl(url),
      fileType: typeof fileType === 'string' && fileType ? fileType : fileTypeFromUrl(url),
      fileSize: typeof fileSize === 'number' && Number.isFinite(fileSize) ? fileSize : 0,
    })
  }
  return out
}

/**
 * Build the uniform `attachments` array for a message response:
 * use the stored attachments when present, otherwise synthesize a
 * single-entry array from a legacy `imageUrl` (if any) so the UI can
 * render every message the same way. Does not mutate stored data.
 */
export function attachmentsForResponse(
  storedAttachments: unknown,
  legacyImageUrl: string | null | undefined
): MessageAttachment[] {
  const parsed = parseStoredAttachments(storedAttachments)
  if (parsed.length > 0) return parsed
  if (legacyImageUrl && typeof legacyImageUrl === 'string') {
    return [
      {
        url: legacyImageUrl,
        fileName: fileNameFromUrl(legacyImageUrl),
        fileType: fileTypeFromUrl(legacyImageUrl),
        fileSize: 0,
      },
    ]
  }
  return []
}
