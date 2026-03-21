// Next.js Instrumentation - runs when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Server starting up...')
    
    // Validate environment
    try {
      const { validateEnv } = await import('./src/lib/env')
      const result = validateEnv()
      
      if (!result.valid) {
        console.error('[Instrumentation] Environment validation failed:')
        result.errors.forEach(err => console.error(`  - ${err}`))
        
        if (process.env.NODE_ENV === 'production') {
          process.exit(1)
        }
      } else {
        console.log('[Instrumentation] Environment validated successfully')
      }
    } catch (error) {
      console.error('[Instrumentation] Failed to validate environment:', error)
    }
    
    // Start internal cron scheduler
    try {
      const { startCronScheduler } = await import('./src/lib/cron')
      startCronScheduler()
      console.log('[Instrumentation] Cron scheduler started')
    } catch (error) {
      console.error('[Instrumentation] Failed to start cron scheduler:', error)
    }
    
    console.log('[Instrumentation] Server ready!')
  }
}
