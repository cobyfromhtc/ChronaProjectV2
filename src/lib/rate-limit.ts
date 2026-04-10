import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Rate Limiting Utility for Chronos API Security
 *
 * This provides protection against:
 * - Brute force attacks on purchase endpoints
 * - API abuse
 * - Rapid repeated requests
 */

interface RateLimitEntry {
  count: number
  resetAt: number
  blocked: boolean
}

// In-memory rate limit store (for single server)
// For production with multiple servers, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000)

export interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  blockDurationMs: number // How long to block after exceeding limit
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // Chronos purchase checkout - strict limit
  CHECKOUT: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 3,           // 3 checkout attempts per minute
    blockDurationMs: 5 * 60 * 1000, // 5 minute block
  },

  // Gift Chronos - moderate limit
  GIFT: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 5,           // 5 gifts per minute
    blockDurationMs: 10 * 60 * 1000, // 10 minute block
  },

  // General Chronos API - relaxed limit
  GENERAL: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,          // 30 requests per minute
    blockDurationMs: 60 * 1000, // 1 minute block
  },

  // Webhook - strict limit to prevent replay attacks
  WEBHOOK: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 webhooks per minute (Stripe sends multiple)
    blockDurationMs: 0,       // No blocking, just logging
  },
} as const

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  blocked: boolean
  retryAfter?: number
}

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // If blocked, check if block has expired
  if (entry?.blocked) {
    if (entry.resetAt > now) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
        blocked: true,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      }
    } else {
      // Block expired, reset
      rateLimitStore.delete(key)
    }
  }

  // Check if window has expired
  if (!entry || entry.resetAt < now) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
      blocked: false,
    }
    rateLimitStore.set(key, newEntry)

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
      blocked: false,
    }
  }

  // Within current window
  if (entry.count >= config.maxRequests) {
    // Exceeded limit - block if configured
    if (config.blockDurationMs > 0) {
      const blockedEntry: RateLimitEntry = {
        ...entry,
        blocked: true,
        resetAt: now + config.blockDurationMs,
      }
      rateLimitStore.set(key, blockedEntry)

      return {
        success: false,
        remaining: 0,
        resetAt: blockedEntry.resetAt,
        blocked: true,
        retryAfter: Math.ceil(config.blockDurationMs / 1000),
      }
    }

    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      blocked: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    blocked: false,
  }
}

/**
 * Generate rate limit key for user + action
 */
export function getRateLimitKey(userId: string, action: string): string {
  return `ratelimit:${userId}:${action}`
}

/**
 * Auth rate limiter for login/signup endpoints
 * Returns a response if rate limited, null if allowed
 */
export function authRateLimiter(request: NextRequest): NextResponse | null {
  // Get client IP from headers or fallback
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown'

  const key = getRateLimitKey(clientIp, 'auth')
  const result = checkRateLimit(key, {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 10,          // 10 attempts per minute
    blockDurationMs: 5 * 60 * 1000, // 5 minute block
  })

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '300',
        }
      }
    )
  }

  return null
}

/**
 * Upload rate limiter for file upload endpoints
 * Returns a response if rate limited, null if allowed
 * Updated to fix build error
 */
export function uploadRateLimiter(request: NextRequest): NextResponse | null {
  // Get client IP from headers or fallback
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown'

  const key = getRateLimitKey(clientIp, 'upload')
  const result = checkRateLimit(key, {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 20,          // 20 uploads per minute
    blockDurationMs: 2 * 60 * 1000, // 2 minute block
  })

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '120',
        }
      }
    )
  }

  return null
}

/**
 * Log suspicious activity for anomaly detection
 */
export function logSuspiciousActivity(
  userId: string,
  action: string,
  reason: string,
  metadata?: Record<string, unknown>
) {
  // In production, this should log to a monitoring service
  console.warn(`[SECURITY] Suspicious activity detected:`, {
    userId,
    action,
    reason,
    metadata,
    timestamp: new Date().toISOString(),
  })

  // TODO: In production, send to monitoring/alerting service
  // or store in database for review
}

/**
 * Check for anomalous balance changes
 */
export function detectAnomalousBalanceChange(
  oldBalance: number,
  newBalance: number,
  action: string
): boolean {
  // Flag if balance increased by more than 2000 in a single action
  // (max purchase is 1000, so anything above is suspicious)
  const increase = newBalance - oldBalance

  if (increase > 2000) {
    return true
  }

  // Flag if balance became negative
  if (newBalance < 0) {
    return true
  }

  // Flag rapid large transactions
  // (This would need more context about timing, but for now we flag large amounts)
  if (action === 'gift' && Math.abs(increase) > 500) {
    return true
  }

  return false
}

/**
 * Generate a secure request signature for client-server communication
 * This helps prevent request forgery
 */
export function generateRequestSignature(
  userId: string,
  action: string,
  timestamp: number,
  secret: string
): string {
  // Simple HMAC-like signature
  // In production, use proper HMAC with crypto
  const data = `${userId}:${action}:${timestamp}`
  return Buffer.from(`${data}:${secret}`).toString('base64')
}

/**
 * Verify request signature
 */
export function verifyRequestSignature(
  signature: string,
  userId: string,
  action: string,
  timestamp: number,
  secret: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
): boolean {
  // Check timestamp is not too old
  const now = Date.now()
  if (Math.abs(now - timestamp) > maxAgeMs) {
    return false
  }

  // Regenerate signature and compare
  const expected = generateRequestSignature(userId, action, timestamp, secret)
  return signature === expected
}
