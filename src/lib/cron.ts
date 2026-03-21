/**
 * Internal Cron Scheduler
 * 
 * This module provides an internal cron scheduler for applications that don't have
 * access to external cron services. It runs scheduled tasks within the Next.js process.
 * 
 * For production, it's recommended to use external cron services:
 * - Vercel Cron Jobs (vercel.json)
 * - GitHub Actions
 * - Kubernetes CronJobs
 * - System crontab
 */

import { db } from './db'
import { getTierFromChronos } from './boost-tiers'

// ===========================================
// Cron Configuration
// ===========================================

const CRON_SECRET = process.env.CRON_SECRET || 'chrona-cron-secret-change-in-production'
const CRON_ENABLED = process.env.CRON_ENABLED !== 'false' // Enabled by default

// ===========================================
// Scheduled Tasks
// ===========================================

interface CronTask {
  name: string
  interval: number // milliseconds
  lastRun: number
  handler: () => Promise<{ success: boolean; message: string }>
}

const tasks: CronTask[] = [
  {
    name: 'expire-boosts',
    interval: 60 * 60 * 1000, // Run every hour
    lastRun: 0,
    handler: expireOldBoosts,
  },
]

/**
 * Expire old storyline boosts and recalculate tiers
 */
async function expireOldBoosts(): Promise<{ success: boolean; message: string }> {
  try {
    const now = new Date()
    
    // Find all expired boosts
    const expiredBoosts = await db.storylineBoost.findMany({
      where: {
        expiresAt: { lte: now }
      },
      select: {
        id: true,
        storylineId: true
      }
    })
    
    if (expiredBoosts.length === 0) {
      return { success: true, message: 'No expired boosts found' }
    }
    
    // Get unique storyline IDs that need updating
    const affectedStorylineIds = [...new Set(expiredBoosts.map(b => b.storylineId))]
    
    // Delete expired boosts
    const deleteResult = await db.storylineBoost.deleteMany({
      where: {
        id: { in: expiredBoosts.map(b => b.id) }
      }
    })
    
    // Recalculate boost totals for affected storylines
    const updatePromises = affectedStorylineIds.map(async (storylineId) => {
      const activeBoosts = await db.storylineBoost.findMany({
        where: {
          storylineId,
          expiresAt: { gt: now }
        },
        select: { amount: true }
      })
      
      const totalBoostChronos = activeBoosts.reduce((sum, b) => sum + b.amount, 0)
      const newTier = getTierFromChronos(totalBoostChronos)
      
      return db.storyline.update({
        where: { id: storylineId },
        data: {
          boostChronos: totalBoostChronos,
          boostTier: newTier
        }
      })
    })
    
    await Promise.all(updatePromises)
    
    return { 
      success: true, 
      message: `Expired ${deleteResult.count} boosts, updated ${affectedStorylineIds.length} storylines` 
    }
  } catch (error) {
    console.error('[Cron] Error in expire-boosts:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// ===========================================
// Scheduler
// ===========================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null

/**
 * Run a single task if enough time has passed
 */
async function runTask(task: CronTask): Promise<void> {
  const now = Date.now()
  
  if (now - task.lastRun >= task.interval) {
    console.log(`[Cron] Running task: ${task.name}`)
    
    try {
      const result = await task.handler()
      
      if (result.success) {
        console.log(`[Cron] Task ${task.name} completed: ${result.message}`)
      } else {
        console.error(`[Cron] Task ${task.name} failed: ${result.message}`)
      }
    } catch (error) {
      console.error(`[Cron] Task ${task.name} threw error:`, error)
    }
    
    task.lastRun = now
  }
}

/**
 * Start the cron scheduler
 */
export function startCronScheduler(): void {
  if (!CRON_ENABLED) {
    console.log('[Cron] Scheduler disabled via CRON_ENABLED=false')
    return
  }
  
  if (schedulerInterval) {
    console.log('[Cron] Scheduler already running')
    return
  }
  
  console.log('[Cron] Starting internal scheduler...')
  
  // Run tasks every minute to check if they need to execute
  schedulerInterval = setInterval(async () => {
    for (const task of tasks) {
      await runTask(task)
    }
  }, 60 * 1000) // Check every minute
  
  // Run immediately on startup (after a short delay)
  setTimeout(async () => {
    console.log('[Cron] Running initial task check...')
    for (const task of tasks) {
      await runTask(task)
    }
  }, 10 * 1000) // 10 second delay after startup
}

/**
 * Stop the cron scheduler
 */
export function stopCronScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
    console.log('[Cron] Scheduler stopped')
  }
}

/**
 * Get scheduler status
 */
export function getCronStatus(): { 
  enabled: boolean
  running: boolean
  tasks: Array<{ name: string; interval: number; lastRun: Date }>
} {
  return {
    enabled: CRON_ENABLED,
    running: schedulerInterval !== null,
    tasks: tasks.map(t => ({
      name: t.name,
      interval: t.interval,
      lastRun: new Date(t.lastRun),
    })),
  }
}

// ===========================================
// External Cron Call Helper
// ===========================================

/**
 * Call the cron endpoint from an external scheduler
 * Use this for Vercel Cron, GitHub Actions, etc.
 */
export async function callCronEndpoint(baseUrl: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const response = await fetch(`${baseUrl}/api/cron/expire-boosts`, {
      method: 'POST',
      headers: {
        'x-cron-secret': CRON_SECRET,
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Unknown error' }
    }
    
    return { success: true, message: data.message }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
