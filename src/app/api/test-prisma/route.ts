import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Test endpoint to verify Prisma client has chronosPurchase model
export async function GET() {
  const models = Object.keys(db)

  return NextResponse.json({
    models,
    hasChronosPurchase: 'chronosPurchase' in db,
    chronosPurchaseType: typeof (db as Record<string, unknown>).chronosPurchase,
  })
}
