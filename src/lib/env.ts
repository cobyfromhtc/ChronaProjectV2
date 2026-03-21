/**
 * Environment Variable Validation
 * Ensures critical environment variables are set in production
 */

function getEnvVar(key: string, required: boolean = true, defaultValue?: string): string | undefined {
  const value = process.env[key]
  
  if (!value && required) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`)
    } else {
      console.warn(`[ENV WARNING] Missing environment variable: ${key}. Using default: ${defaultValue}`)
      return defaultValue
    }
  }
  
  return value || defaultValue
}

export const env = {
  // Node Environment
  get nodeEnv() {
    return process.env.NODE_ENV || 'development'
  },
  
  get isProduction() {
    return this.nodeEnv === 'production'
  },
  
  get isDevelopment() {
    return this.nodeEnv === 'development'
  },
  
  // JWT Secret - CRITICAL
  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET
    
    if (!secret) {
      if (this.isProduction) {
        throw new Error('JWT_SECRET environment variable is required in production!')
      }
      // Only use default in development
      console.warn('[ENV WARNING] Using default JWT_SECRET. Set JWT_SECRET environment variable for security!')
      return 'persona-secret-key-change-in-production'
    }
    
    // Warn if using default-like value in production
    if (this.isProduction && secret.includes('change-this')) {
      throw new Error('JWT_SECRET must be changed from the default value in production!')
    }
    
    return secret
  },
  
  // Database
  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'file:./db/custom.db'
  },
  
  // Storage
  get storageType(): 'local' | 's3' {
    const type = process.env.STORAGE_TYPE || 'local'
    if (type !== 'local' && type !== 's3') {
      console.warn(`[ENV WARNING] Invalid STORAGE_TYPE: ${type}. Defaulting to 'local'`)
      return 'local'
    }
    return type
  },
  
  get s3Bucket(): string | undefined {
    return process.env.S3_BUCKET
  },
  
  get s3Region(): string {
    return process.env.S3_REGION || 'us-east-1'
  },
  
  get s3Endpoint(): string {
    return process.env.S3_ENDPOINT || 'https://s3.amazonaws.com'
  },
  
  get s3AccessKey(): string | undefined {
    return process.env.S3_ACCESS_KEY
  },
  
  get s3SecretKey(): string | undefined {
    return process.env.S3_SECRET_KEY
  },
  
  get s3CdnUrl(): string | undefined {
    return process.env.S3_CDN_URL
  },
  
  // CORS
  get corsOrigins(): string[] {
    const origins = process.env.CORS_ORIGINS || 'http://localhost:3000'
    return origins.split(',').map(o => o.trim()).filter(Boolean)
  },
  
  get chatCorsOrigins(): string[] {
    const origins = process.env.CHAT_CORS_ORIGINS || process.env.CORS_ORIGINS || 'http://localhost:3000'
    return origins.split(',').map(o => o.trim()).filter(Boolean)
  },
  
  // Ports
  get port(): number {
    return parseInt(process.env.PORT || '3000', 10)
  },
  
  get chatServicePort(): number {
    return parseInt(process.env.CHAT_SERVICE_PORT || '3003', 10)
  },
  
  // Chronos
  get startingChronos(): number {
    return parseInt(process.env.STARTING_CHRONOS || '100', 10)
  },
  
  // Rate Limiting
  get rateLimitAuth(): number {
    return parseInt(process.env.RATE_LIMIT_AUTH || '10', 10)
  },
  
  get rateLimitUpload(): number {
    return parseInt(process.env.RATE_LIMIT_UPLOAD || '20', 10)
  },
  
  get rateLimitApi(): number {
    return parseInt(process.env.RATE_LIMIT_API || '100', 10)
  },
  
  // First Setup
  get firstSetupKey(): string | undefined {
    return process.env.FIRST_SETUP_KEY
  },
  
  // Cron
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET
  },
}

/**
 * Validate environment configuration
 * Call this at application startup
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check JWT_SECRET
  try {
    // Access the jwtSecret getter to trigger validation
    const _ = env.jwtSecret
    void _ // Silence unused variable warning
  } catch (e) {
    errors.push((e as Error).message)
  }
  
  // Check S3 configuration if using S3 storage
  if (env.storageType === 's3') {
    if (!env.s3Bucket) errors.push('S3_BUCKET is required when STORAGE_TYPE=s3')
    if (!env.s3AccessKey) errors.push('S3_ACCESS_KEY is required when STORAGE_TYPE=s3')
    if (!env.s3SecretKey) errors.push('S3_SECRET_KEY is required when STORAGE_TYPE=s3')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Log environment status on load (only in development)
if (env.isDevelopment) {
  console.log('[ENV] Environment configuration loaded')
  console.log(`[ENV] NODE_ENV: ${env.nodeEnv}`)
  console.log(`[ENV] STORAGE_TYPE: ${env.storageType}`)
}
