import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://superluxurious-alica-ceratoid.ngrok-free.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'file://', // Electron apps use file:// protocol
  'app://',  // Some Electron apps use app:// protocol
  'https://chrona.app', // Future production domain
  'https://', // Allow all HTTPS origins (for preview environments like space.z.ai)
]

export function middleware(request: NextRequest) {
  // Get the origin from the request
  const origin = request.headers.get('origin') || ''
  const host = request.headers.get('host') || ''
  
  // Check if origin is allowed or if it's a same-origin request (no origin header)
  // Also allow all requests in development mode
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const isPreview = origin.includes('space.z.ai') || origin.includes('.z.ai')
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
  const isSameOrigin = !origin || origin.includes(host) || origin.includes('localhost') || origin.includes('127.0.0.1')
  const shouldAllowCors = isDevelopment || isAllowed || isSameOrigin || isPreview || origin.startsWith('file://') || origin.startsWith('app://')
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    
    if (shouldAllowCors) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Session-Token, ngrok-skip-browser-warning')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Max-Age', '86400')
    }
    
    return response
  }
  
  // Handle actual requests
  const response = NextResponse.next()
  
  if (shouldAllowCors) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Session-Token, ngrok-skip-browser-warning')
  }
  
  return response
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    '/api/:path*', // Apply to all API routes
  ],
}
