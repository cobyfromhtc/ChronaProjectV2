'use client'

// =============================================================
// DM composer — multi-file image attachment picker
// =============================================================
//
// `usePendingAttachments()` owns the pending-attachment state for the
// DM message composer: picking files (native multi-select picker),
// client-side validation via the shared rules in `src/lib/attachments`,
// preview chips, and per-file uploads through `/api/upload` with real
// XHR progress. Files are uploaded when the message is sent; only
// their metadata ({ url, fileName, fileType, fileSize }) is attached
// to the outgoing message.
//
// `AttachmentChipsBar` renders the pending-attachment chips above the
// message textarea (the hidden multi-file input itself is rendered by
// the page next to the paperclip button; `openPicker` clicks it).

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  validateAttachment,
  type MessageAttachment,
} from '@/lib/attachments'
import { useToast } from '@/hooks/use-toast'

export type PendingAttachmentStatus = 'ready' | 'uploading'

export interface PendingAttachment {
  id: string
  file: File
  /** Object URL used for the chip thumbnail (revoked on remove/clear) */
  previewUrl: string
  /** Upload progress 0–1 (only meaningful while status === 'uploading') */
  progress: number
  status: PendingAttachmentStatus
}

/** Format a byte count as a compact human-readable string. */
export function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Module-scoped id counter for pending chips ──────────────────────
let pendingIdCounter = 0
function nextPendingId(): string {
  pendingIdCounter += 1
  return `pending-${Date.now().toString(36)}-${pendingIdCounter}`
}

// ── Upload a single file with progress events ───────────────────────
function uploadFileWithProgress(
  file: File,
  onProgress: (fraction: number) => void
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(1, e.loaded / e.total))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          if (data && typeof data.url === 'string' && data.url) {
            resolve({ url: data.url })
          } else {
            reject(new Error('The upload response was missing the image URL'))
          }
        } catch {
          reject(new Error('The upload response could not be read'))
        }
      } else {
        let message = `Upload failed (${xhr.status})`
        try {
          const data = JSON.parse(xhr.responseText)
          if (data && typeof data.error === 'string') message = data.error
        } catch {
          /* keep the default message */
        }
        reject(new Error(message))
      }
    }
    xhr.onerror = () => reject(new Error('Network error while uploading'))
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadType', 'message_attachment')
    xhr.send(formData)
  })
}

// ── Hook: pending attachment state for the composer ─────────────────
export interface PendingAttachmentsApi {
  items: PendingAttachment[]
  /** Open the native multi-file picker (clicks the hidden input) */
  openPicker: () => void
  addFiles: (files: FileList | File[] | null) => void
  removeAttachment: (id: string) => void
  clearAll: () => void
  /**
   * Upload every pending file via /api/upload (in parallel, with
   * per-file progress on the chips). Failed uploads are toasted and
   * their chips removed; successfully uploaded chips are reset to
   * 'ready' and stay until the caller clears them after the message
   * actually sends. Returns the metadata of the files that uploaded.
   */
  uploadAll: () => Promise<MessageAttachment[]>
  count: number
  isAtMax: boolean
  anyUploading: boolean
}

export function usePendingAttachments(max = MAX_ATTACHMENTS_PER_MESSAGE): PendingAttachmentsApi {
  const [items, setItems] = useState<PendingAttachment[]>([])
  const createdUrlsRef = useRef<Set<string>>(new Set())
  const { toast } = useToast()

  // Revoke any leftover object URLs when the composer unmounts
  useEffect(() => {
    const urls = createdUrlsRef.current
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
    }
  }, [])

  const openPicker = useCallback(() => {
    // Dispatch a click on the hidden multi-file input owned by the page
    const input = document.getElementById('chrona-attachment-input') as HTMLInputElement | null
    input?.click()
  }, [])

  const addFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files) return
      const list = Array.from(files)
      if (list.length === 0) return
      const accepted: PendingAttachment[] = []
      for (const file of list) {
        // Client-side validation — toast a friendly error for rejects
        const error = validateAttachment(file)
        if (error) {
          toast({ title: 'Attachment not added', description: error, variant: 'destructive' })
          continue
        }
        if (items.length + accepted.length >= max) {
          toast({
            title: 'Attachment limit reached',
            description: `You can attach at most ${max} images per message.`,
            variant: 'destructive',
          })
          break
        }
        const previewUrl = URL.createObjectURL(file)
        createdUrlsRef.current.add(previewUrl)
        accepted.push({ id: nextPendingId(), file, previewUrl, progress: 0, status: 'ready' })
      }
      if (accepted.length > 0) setItems((prev) => [...prev, ...accepted])
    },
    [items.length, max, toast]
  )

  const removeAttachment = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target && createdUrlsRef.current.has(target.previewUrl)) {
        URL.revokeObjectURL(target.previewUrl)
        createdUrlsRef.current.delete(target.previewUrl)
      }
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((i) => {
        if (createdUrlsRef.current.has(i.previewUrl)) {
          URL.revokeObjectURL(i.previewUrl)
          createdUrlsRef.current.delete(i.previewUrl)
        }
      })
      return []
    })
  }, [])

  const uploadAll = useCallback(async (): Promise<MessageAttachment[]> => {
    const current = items
    if (current.length === 0) return []
    setItems((prev) => prev.map((i) => ({ ...i, status: 'uploading' as const, progress: 0 })))

    const results = await Promise.all(
      current.map(async (item): Promise<MessageAttachment | null> => {
        try {
          const { url } = await uploadFileWithProgress(item.file, (fraction) => {
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, progress: fraction } : i))
            )
          })
          return {
            url,
            fileName: item.file.name,
            fileType: item.file.type,
            fileSize: item.file.size,
          }
        } catch (err) {
          // Failure handling: toast + remove the chip (no dead UI)
          const reason = err instanceof Error ? err.message : 'Upload failed'
          toast({
            title: 'Attachment upload failed',
            description: `"${item.file.name}" could not be uploaded. ${reason}`,
            variant: 'destructive',
          })
          removeAttachment(item.id)
          return null
        }
      })
    )

    // Reset the chips that uploaded successfully back to 'ready' — the
    // caller clears them once the message actually goes out.
    setItems((prev) =>
      prev.map((i) => (i.status === 'uploading' ? { ...i, status: 'ready' as const, progress: 0 } : i))
    )
    return results.filter((r): r is MessageAttachment => r !== null)
  }, [items, removeAttachment, toast])

  return {
    items,
    openPicker,
    addFiles,
    removeAttachment,
    clearAll,
    uploadAll,
    count: items.length,
    isAtMax: items.length >= max,
    anyUploading: items.some((i) => i.status === 'uploading'),
  }
}

// ── Chips bar (pending attachment chips above the input) ───────
export function AttachmentChipsBar({ picker }: { picker: PendingAttachmentsApi }) {
  const { items } = picker

  return (
    <>
      {items.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2" role="list" aria-label="Pending attachments">
          {items.map((item) => {
            const percent = Math.round(item.progress * 100)
            return (
              <div
                key={item.id}
                role="listitem"
                className="relative flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm"
                style={{ animation: 'fadeIn 0.15s ease-out' }}
              >
                {/* Thumbnail */}
                <span className="relative block w-12 h-12 rounded-lg overflow-hidden border border-white/[0.1] flex-shrink-0">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                  {item.status === 'uploading' && (
                    <span className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-300" aria-hidden="true" />
                      <span className="block w-9 h-1 rounded-full bg-white/15 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-150"
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                      <span className="sr-only">Uploading {percent}%</span>
                    </span>
                  )}
                </span>

                {/* Name + size */}
                <span className="flex flex-col min-w-0 max-w-[150px]">
                  <span className="text-xs text-slate-200 truncate" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.status === 'uploading'
                      ? `Uploading… ${percent}%`
                      : formatAttachmentSize(item.file.size) || 'Ready'}
                  </span>
                </span>

                {/* Remove — hidden while uploading */}
                {item.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => picker.removeAttachment(item.id)}
                    aria-label={`Remove attachment ${item.file.name}`}
                    title={`Remove ${item.file.name}`}
                    className="relative w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/80 hover:border-red-400/60 transition-colors flex-shrink-0"
                  >
                    {/* Expanded touch target (≥44px) */}
                    <span className="absolute -inset-2.5" aria-hidden="true" />
                    <X className="w-3.5 h-3.5 pointer-events-none" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
