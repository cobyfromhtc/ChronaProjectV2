'use client'

// =============================================================
// Message attachments — collapsible dropdown for DM message bubbles
// =============================================================
//
// Every message that carries attachments (multi-image messages and
// legacy single-image messages alike — the API synthesizes a uniform
// `attachments` array for both) renders a compact toggle bar:
//
//   [📎] 3 attachments                    [v]
//
// COLLAPSED by default. Clicking the bar expands a responsive grid
// of attachment thumbnails (2 columns on mobile up to 5 on desktop)
// with a framer-motion height/slide animation. Clicking a thumbnail
// opens the full-screen lightbox (shadcn Dialog) with the image, a
// file-name + size caption and a download button.
//
// The toggle is keyboard operable (native <button>) and exposes
// aria-expanded / aria-controls for screen readers.

import { useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Paperclip } from 'lucide-react'
import type { ChatAttachment } from '@/hooks/use-chat'
import { fileNameFromUrl, fileTypeFromUrl } from '@/lib/attachments'
import { formatAttachmentSize } from '@/components/attachment-composer'
import {
  AttachmentLightbox,
  type LightboxAttachment,
} from '@/components/attachment-lightbox'

/** Fully-normalized attachment metadata used for rendering. */
export interface NormalizedMessageAttachment {
  url: string
  fileName: string
  fileType: string
  fileSize: number
}

/**
 * Normalize a message's `attachments` array (which may mix the new
 * { url, fileName, fileType, fileSize } payload with legacy
 * { url, type, name } entries) into the full rendering shape.
 */
export function normalizeChatAttachments(
  raw: ChatAttachment[] | null | undefined
): NormalizedMessageAttachment[] {
  if (!raw || !Array.isArray(raw)) return []
  const out: NormalizedMessageAttachment[] = []
  for (const att of raw) {
    if (!att || typeof att.url !== 'string' || !att.url) continue
    out.push({
      url: att.url,
      fileName: att.fileName || att.name || fileNameFromUrl(att.url),
      fileType: att.fileType || fileTypeFromUrl(att.url),
      fileSize:
        typeof att.fileSize === 'number' && Number.isFinite(att.fileSize)
          ? att.fileSize
          : 0,
    })
  }
  return out
}

export function MessageAttachments({
  attachments,
}: {
  attachments?: ChatAttachment[] | null
}) {
  const normalized = useMemo(() => normalizeChatAttachments(attachments), [attachments])
  const [expanded, setExpanded] = useState(false) // collapsed by default
  const [lightboxAttachment, setLightboxAttachment] = useState<NormalizedMessageAttachment | null>(
    null
  )
  const panelId = useId()

  if (normalized.length === 0) return null

  const count = normalized.length
  const totalSize = normalized.reduce((sum, a) => sum + (a.fileSize || 0), 0)

  return (
    <div className="mt-1.5 w-full max-w-full">
      {/* Compact toggle bar — collapsed by default */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full flex items-center gap-2.5 min-h-[44px] px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm text-left transition-colors hover:bg-violet-500/[0.08] hover:border-violet-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
      >
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
          <Paperclip className="w-4 h-4 text-violet-300" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-medium text-slate-200">
            {count} attachment{count !== 1 ? 's' : ''}
          </span>
          <span className="block text-[10px] text-slate-500 truncate">
            {normalized[0].fileName}
            {count > 1 ? ` +${count - 1} more` : ''}
            {totalSize > 0 ? ` · ${formatAttachmentSize(totalSize)}` : ''}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Expandable thumbnail grid */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            key="attachments-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {normalized.map((att, idx) => (
                <button
                  key={`${att.url}-${idx}`}
                  type="button"
                  onClick={() => setLightboxAttachment(att)}
                  className="group/th flex flex-col gap-1.5 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                  aria-label={`View attachment ${att.fileName}`}
                >
                  <span className="relative block w-full aspect-square rounded-xl overflow-hidden border border-white/[0.08] transition-all duration-200 group-hover/th:scale-[1.03] group-hover/th:border-violet-500/40 group-hover/th:shadow-[0_0_18px_rgba(167,139,250,0.28)]">
                    <img
                      src={att.url}
                      alt={att.fileName}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover/th:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-violet-950/50 via-transparent to-transparent opacity-0 group-hover/th:opacity-100 transition-opacity pointer-events-none"
                      aria-hidden="true"
                    />
                  </span>
                  <span
                    className="text-[11px] text-slate-400 truncate w-full transition-colors group-hover/th:text-violet-300"
                    title={att.fileName}
                  >
                    {att.fileName}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen lightbox */}
      <AttachmentLightbox
        attachment={lightboxAttachment}
        onClose={() => setLightboxAttachment(null)}
      />
    </div>
  )
}
