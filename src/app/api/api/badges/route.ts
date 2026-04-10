import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get optional query params for filtering
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const rarity = searchParams.get('rarity')
    const active = searchParams.get('active')

    // Build where clause
    const where: any = {}
    
    if (category) {
      where.category = category
    }
    
    if (rarity) {
      where.rarity = rarity
    }
    
    if (active === 'true') {
      where.isActive = true
    }

    // Fetch all badges
    const badges = await db.badge.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { rarity: 'desc' },
        { displayName: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        icon: true,
        category: true,
        rarity: true,
        color: true,
        howToEarn: true,
        isLimited: true,
        maxAwarded: true,
        timesAwarded: true,
        showOnProfile: true,
        priority: true,
        isActive: true
      }
    })

    return NextResponse.json({
      badges: badges.map(badge => ({
        id: badge.id,
        name: badge.name,
        displayName: badge.displayName,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        color: badge.color,
        howToEarn: badge.howToEarn,
        isLimited: badge.isLimited,
        maxAwarded: badge.maxAwarded,
        timesAwarded: badge.timesAwarded,
        showOnProfile: badge.showOnProfile,
        priority: badge.priority || 999,
        isActive: badge.isActive
      }))
    })
  } catch (error) {
    console.error('Error fetching badges:', error)
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 })
  }
}
