'use client'

// =============================================================
// Attachment lightbox — full-screen image viewer (shadcn Dialog)
// =============================================================
//
// Opens from a message attachment thumbnail. Shows the image large,
// a file-name + size caption, and a download button that opens the
// image URL in a new tab. Closes on Esc and on backdrop click
// (handled natively by the Radix dialog primitives).

import { Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatAttachmentSize } from '@/components/attachment-composer'

export interface LightboxAttachment {
  url: string
  fileName: string
  fileType?: string
  fileSize?: number
}

export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: LightboxAttachment | null
  onClose: () => void
}) {
  const open = Boolean(attachment)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent
        className="max-w-[min(96vw,960px)] bg-[#0c0e13]/95 backdrop-blur-xl border border-violet-500/20 rounded-2xl p-0 overflow-hidden gap-0"
      >
        {attachment && (
          <div className="flex flex-col max-h-[88vh]">
            {/* Image */}
            <div className="flex-1 min-h-0 flex items-center justify-center bg-black/70 p-3 sm:p-6 overflow-hidden">
              <img
                src={attachment.url}
                alt={attachment.fileName}
                className="max-w-full max-h-[64vh] object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Caption + download */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.08] bg-white/[0.02]">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm font-medium text-slate-100 truncate">
                  {attachment.fileName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  {[
                    attachment.fileSize ? formatAttachmentSize(attachment.fileSize) : null,
                    attachment.fileType || null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Image attachment'}
                </DialogDescription>
              </div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-950/40 hover:shadow-violet-900/50 flex-shrink-0"
                aria-label={`Download ${attachment.fileName}`}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Open / Download
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
