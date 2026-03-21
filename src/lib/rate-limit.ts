/**
 * Rate Limiting Middleware
 * 
 * In-memory rate limiting for API routes.
 * For production with multiple instances, consider using Redis-based rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server'

// ===========================================
// Types
// ===========================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
  keyGenerator?: (request: NextRequest) => string // Custom key generator
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

// ===========================================
// In-Memory Store
// ===========================================

// Simple in-memory store for rate limiting
// Note: This will reset on server restart
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute

// ===========================================
// Rate Limit Functions
// ===========================================

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback
  return 'unknown'
}

/**
 * Default key generator (IP-based)
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIp(request)
  const path = request.nextUrl.pathname
  return `${ip}:${path}`
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): RateLimitResult {
  const key = config.keyGenerator 
    ? config.keyGenerator(request) 
    : defaultKeyGenerator(request)
  
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }
  
  // Increment count
  entry.count++
  
  const remaining = Math.max(0, config.maxRequests - entry.count)
  const success = entry.count <= config.maxRequests
  
  return {
    success,
    limit: config.maxRequests,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: success ? undefined : Math.ceil((entry.resetTime - now) / 1000),
  }
}

/**
 * Apply rate limit to a request
 * Returns a Response if rate limited, null otherwise
 */
export function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(request, config)
  
  if (!result.success) {
    return NextResponse.json(
      {
        error: config.message || 'Too many requests, please try again later.',
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime),
          'Retry-After': String(result.retryAfter || 60),
        },
      }
    )
  }
  
  return null
}

// ===========================================
// Preset Rate Limiters
// ===========================================

/**
 * Auth rate limiter - strict limits for login/signup
 */
export function authRateLimiter(request: NextRequest): NextResponse | null {
  const limit = parseInt(process.env.RATE_LIMIT_AUTH || '10', 10)
  
  return applyRateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: limit,
    message: 'Too many authentication attempts. Please try again later.',
    keyGenerator: (req) => {
      const ip = getClientIp(req)
      return `auth:${ip}`
    },
  })
}

/**
 * Upload rate limiter - moderate limits for file uploads
 */
export function uploadRateLimiter(request: NextRequest): NextResponse | null {
  const limit = parseInt(process.env.RATE_LIMIT_UPLOAD || '20', 10)
  
  return applyRateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: limit,
    message: 'Too many upload requests. Please try again later.',
    keyGenerator: (req) => {
      const ip = getClientIp(req)
      return `upload:${ip}`
    },
  })
}

/**
 * General API rate limiter - relaxed limits for general API
 */
export function apiRateLimiter(request: NextRequest): NextResponse | null {
  const limit = parseInt(process.env.RATE_LIMIT_API || '100', 10)
  
  return applyRateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: limit,
    message: 'Too many requests. Please slow down.',
    keyGenerator: (req) => {
      const ip = getClientIp(req)
      return `api:${ip}`
    },
  })
}

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (request: NextRequest) => applyRateLimit(request, config)
}

// ===========================================
// Rate Limit Headers Helper
// ===========================================

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.resetTime))
  return response
}
