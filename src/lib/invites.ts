// =============================================================
// SI.FY invite code helpers — shared by API routes and client UI.
//
// SI.FY = "Server Invite For You"
// An invite code is 7 characters from an unambiguous alphabet
// (no 0/O/1/I/l) displayed as: SI.FY://XXXXXXX
//
// Semantics (mirrors the storylineInvites collection):
//   expiresAt: null            → never expires
//   expiresAt in the past      → expired
//   maxUses: 0 or null         → unlimited uses
//   maxUses > 0 && uses >= max → exhausted
//   status = 'active'          → not expired AND not exhausted
// =============================================================

export const SIFY_PREFIX = 'SI.FY://'

// Unambiguous alphabet: A-Z without I/L/O, digits 2-9 (no 0/1)
export const SIFY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export const SIFY_CODE_LENGTH = 7

export type SifyInviteStatus = 'active' | 'expired' | 'exhausted'

export interface SifyInviteLike {
  expiresAt?: string | Date | null
  maxUses?: number | null
  uses?: number | null
}

/** Format a bare code as the full SI.FY:// display form. */
export function formatSifyCode(code: string): string {
  return `${SIFY_PREFIX}${code.toUpperCase()}`
}

const SIFY_CODE_RE = new RegExp(`^[${SIFY_ALPHABET}]{${SIFY_CODE_LENGTH}}$`)

/** True when the value is a valid bare code (case-insensitive). */
export function isValidSifyCode(code: string): boolean {
  return typeof code === 'string' && SIFY_CODE_RE.test(code.toUpperCase())
}

/**
 * Parse any accepted user input into a normalized bare code (uppercase).
 * Accepted forms (case-insensitive, surrounding whitespace tolerated):
 *   "SI.FY://abcdefg"  "SI.FY/abcdefg"  "si.fy://ab23cd4"
 *   "https://si.fy/ab23cd4"  "chrona.gg/ab23cd4"  "ab23cd4"
 * Returns null when the input can't be a valid code.
 */
export function parseSifyCode(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null
  let s = input.trim()
  if (!s) return null
  // Strip an optional URL scheme
  s = s.replace(/^https?:\/\//i, '')
  // Codes never contain ':' or '/', so keep only the tail segment —
  // this drops any prefix ("si.fy://", "si.fy/", "chrona.gg/", ...).
  const segments = s.split(/[:/]/).filter((seg) => seg.length > 0)
  const candidate = (segments.length > 0 ? segments[segments.length - 1] : '').toUpperCase()
  return SIFY_CODE_RE.test(candidate) ? candidate : null
}

/**
 * Generate a crypto-random code from the unambiguous alphabet.
 * Uses WebCrypto (`crypto.getRandomValues`) which is available in both
 * Node (>= 18) and browsers, so this file stays import-safe everywhere.
 * Rejection sampling avoids modulo bias.
 */
export function generateSifyCode(length: number = SIFY_CODE_LENGTH): string {
  const limit = 256 - (256 % SIFY_ALPHABET.length) // uniform multiple of alphabet size
  let out = ''
  while (out.length < length) {
    const buf = new Uint8Array(length * 4)
    crypto.getRandomValues(buf)
    for (let i = 0; i < buf.length && out.length < length; i++) {
      if (buf[i] < limit) out += SIFY_ALPHABET[buf[i] % SIFY_ALPHABET.length]
    }
  }
  return out
}

/** Compute the invite status from its fields (active / expired / exhausted). */
export function getSifyInviteStatus(invite: SifyInviteLike, now: Date = new Date()): SifyInviteStatus {
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return 'expired'
  }
  const maxUses = invite.maxUses ?? 0
  if (maxUses > 0 && (invite.uses ?? 0) >= maxUses) {
    return 'exhausted'
  }
  return 'active'
}

/** True when the invite is neither expired nor exhausted. */
export function isSifyInviteActive(invite: SifyInviteLike, now: Date = new Date()): boolean {
  return getSifyInviteStatus(invite, now) === 'active'
}

/** Human-friendly expiry / countdown text for UI display. */
export function formatSifyExpiry(expiresAt: string | Date | null | undefined, now: Date = new Date()): string {
  if (!expiresAt) return 'Never expires'
  const ms = new Date(expiresAt).getTime() - now.getTime()
  if (ms <= 0) return 'Expired'
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) {
    const remHours = hours % 24
    return `Expires in ${days}d${remHours > 0 ? ` ${remHours}h` : ''}`
  }
  if (hours > 0) {
    const remMinutes = minutes % 60
    return `Expires in ${hours}h${remMinutes > 0 ? ` ${remMinutes}m` : ''}`
  }
  return `Expires in ${minutes}m`
}
