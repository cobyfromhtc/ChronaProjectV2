import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const user = await getSessionFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's badges
    const userBadges = await db.userBadge.findMany({
      where: {
        userId: user.id
      },
      include: {
        badge: true
      },
      orderBy: [
        { displayOrder: 'asc' },
        { earnedAt: 'desc' }
      ]
    })

    return NextResponse.json({
      badges: userBadges.map(ub => ({
        id: ub.id,
        badgeId: ub.badgeId,
        earnedAt: ub.earnedAt.toISOString(),
        earnedReason: ub.earnedReason,
        isDisplayed: ub.isDisplayed,
        displayOrder: ub.displayOrder,
        badge: {
          id: ub.badge.id,
          name: ub.badge.name,
          displayName: ub.badge.displayName,
          description: ub.badge.description,
          icon: ub.badge.icon,
          category: ub.badge.category,
          rarity: ub.badge.rarity,
          color: ub.badge.color,
          priority: ub.badge.priority || 999
        }
      }))
    })
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return NextResponse.json({ error: 'Failed to fetch user badges' }, { status: 500 })
  }
}

// PATCH - Update badge display settings
export async function PATCH(request: NextRequest) {
  try {
    // Get current user from session
    const user = await getSessionFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { badgeId, isDisplayed, displayOrder } = body

    if (!badgeId) {
      return NextResponse.json({ error: 'Badge ID is required' }, { status: 400 })
    }

    // Verify the badge belongs to the user
    const userBadge = await db.userBadge.findFirst({
      where: {
        id: badgeId,
        userId: user.id
      }
    })

    if (!userBadge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
    }

    // Update the badge
    const updatedBadge = await db.userBadge.update({
      where: { id: badgeId },
      data: {
        isDisplayed: isDisplayed ?? userBadge.isDisplayed,
        displayOrder: displayOrder ?? userBadge.displayOrder
      },
      include: {
        badge: true
      }
    })

    return NextResponse.json({
      success: true,
      badge: {
        id: updatedBadge.id,
        badgeId: updatedBadge.badgeId,
        isDisplayed: updatedBadge.isDisplayed,
        displayOrder: updatedBadge.displayOrder
      }
    })
  } catch (error) {
    console.error('Error updating badge:', error)
    return NextResponse.json({ error: 'Failed to update badge' }, { status: 500 })
  }
}
