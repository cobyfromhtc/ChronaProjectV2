import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { checkHolidayBadges, awardBadge, seedEventBadges } from '@/lib/badges'
import { db } from '@/lib/db'

// POST /api/badges/check - Check for holiday/automatic badges
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check for holiday badges
    await checkHolidayBadges(user.id)
    
    // Check for achievement badges
    
    // First persona badge
    const personaCount = await db.persona.count({
      where: { userId: user.id }
    })
    if (personaCount >= 1) {
      await awardBadge(user.id, 'first_persona', 'Created your first character!')
    }
    
    // Storyline creator badge
    const storylineCount = await db.storyline.count({
      where: { ownerId: user.id }
    })
    if (storylineCount >= 1) {
      await awardBadge(user.id, 'storyline_creator', 'Created your first storyline!')
    }
    
    // OOC profile badges - get full user
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { oocBio: true, oocPronouns: true, oocLinks: true, createdAt: true }
    })
    
    if (fullUser?.oocBio && fullUser?.oocPronouns) {
      await awardBadge(user.id, 'ooc_verified', 'Completed your OOC profile!')
    }
    
    if (fullUser?.oocLinks) {
      try {
        const links = JSON.parse(fullUser.oocLinks)
        if (links.length >= 3) {
          await awardBadge(user.id, 'ooc_social', 'Added 3+ social links!')
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Check for one year membership
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    if (fullUser && new Date(fullUser.createdAt) <= oneYearAgo) {
      await awardBadge(user.id, 'one_year_member', 'Been a member for 1 year!')
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error checking badges:', error)
    return NextResponse.json({ error: 'Failed to check badges' }, { status: 500 })
  }
}

// GET /api/badges/check - Seed default badges (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await seedEventBadges()
    
    return NextResponse.json({ success: true, message: 'Badges seeded' })
  } catch (error) {
    console.error('Error seeding badges:', error)
    return NextResponse.json({ error: 'Failed to seed badges' }, { status: 500 })
  }
}
