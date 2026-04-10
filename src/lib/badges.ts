import { db } from '@/lib/db'

// Badge types
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type BadgeCategory = 'event' | 'achievement' | 'special' | 'milestone' | 'ooc'

export interface BadgeData {
  name: string
  displayName: string
  description?: string
  icon: string
  category: BadgeCategory
  rarity?: BadgeRarity
  color?: string
  howToEarn?: string
  isLimited?: boolean
  maxAwarded?: number
  eventId?: string
  priority?: number
}

// Award a badge to a user
export async function awardBadge(userId: string, badgeName: string, reason?: string) {
  try {
    // Find the badge
    const badge = await db.badge.findUnique({
      where: { name: badgeName }
    })
    
    if (!badge) {
      console.error(`Badge not found: ${badgeName}`)
      return null
    }
    
    // Check if user already has this badge
    const existingBadge = await db.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id
        }
      }
    })
    
    if (existingBadge) {
      return existingBadge
    }
    
    // Check if badge has a limit
    if (badge.isLimited && badge.maxAwarded) {
      const awardCount = await db.userBadge.count({
        where: { badgeId: badge.id }
      })
      
      if (awardCount >= badge.maxAwarded) {
        console.log(`Badge ${badgeName} has reached max awards`)
        return null
      }
    }
    
    // Award the badge
    const userBadge = await db.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        earnedReason: reason,
        isDisplayed: badge.showOnProfile
      }
    })
    
    // Update badge award count
    await db.badge.update({
      where: { id: badge.id },
      data: { timesAwarded: { increment: 1 } }
    })
    
    return userBadge
  } catch (error) {
    console.error('Error awarding badge:', error)
    return null
  }
}

// Check and award holiday badges
export async function checkHolidayBadges(userId: string) {
  const now = new Date()
  const year = now.getFullYear()
  
  // Christmas (Dec 24-26)
  if (now.getMonth() === 11 && now.getDate() >= 24 && now.getDate() <= 26) {
    await awardBadge(userId, `christmas_${year}`, 'Visited Chrona during Christmas!')
    await recordEventParticipation(userId, `christmas_${year}`)
  }
  
  // Halloween (Oct 31 - Nov 2)
  if ((now.getMonth() === 9 && now.getDate() === 31) || 
      (now.getMonth() === 10 && now.getDate() <= 2)) {
    await awardBadge(userId, `halloween_${year}`, 'Visited Chrona during Halloween!')
    await recordEventParticipation(userId, `halloween_${year}`)
  }
  
  // New Year (Dec 31 - Jan 2)
  if ((now.getMonth() === 11 && now.getDate() === 31) ||
      (now.getMonth() === 0 && now.getDate() <= 2)) {
    const newYear = now.getMonth() === 11 ? year + 1 : year
    await awardBadge(userId, `new_year_${newYear}`, 'Celebrated the New Year on Chrona!')
    await recordEventParticipation(userId, `new_year_${newYear}`)
  }
  
  // Valentine's Day (Feb 13-15)
  if (now.getMonth() === 1 && now.getDate() >= 13 && now.getDate() <= 15) {
    await awardBadge(userId, `valentines_${year}`, 'Spread love on Chrona!')
    await recordEventParticipation(userId, `valentines_${year}`)
  }
  
  // Independence Day USA (July 4-5)
  if (now.getMonth() === 6 && now.getDate() >= 4 && now.getDate() <= 5) {
    await awardBadge(userId, `fourth_of_july_${year}`, 'Celebrated Independence Day on Chrona!')
    await recordEventParticipation(userId, `fourth_of_july_${year}`)
  }
  
  // Chrona Anniversary (whatever the launch date is - example: March 15)
  if (now.getMonth() === 2 && now.getDate() >= 14 && now.getDate() <= 16) {
    await awardBadge(userId, `anniversary_${year}`, 'Celebrated Chrona\'s anniversary!')
    await recordEventParticipation(userId, `anniversary_${year}`)
  }
}

// Record event participation
async function recordEventParticipation(userId: string, eventName: string) {
  try {
    const event = await db.event.findFirst({
      where: { name: eventName }
    })
    
    if (!event) return
    
    // Check if already participating
    const existing = await db.eventParticipation.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId
        }
      }
    })
    
    if (existing) return
    
    // Create participation record
    await db.eventParticipation.create({
      data: {
        eventId: event.id,
        userId,
        participatedAt: new Date()
      }
    })
    
    // Award chronos if configured
    if (event.rewardChronos > 0) {
      await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { chronos: { increment: event.rewardChronos } }
        }),
        db.chronosTransaction.create({
          data: {
            userId,
            amount: event.rewardChronos,
            balance: 0, // Will be updated after
            type: 'earn',
            category: 'event',
            description: `Participated in ${event.name}`
          }
        })
      ])
    }
  } catch (error) {
    console.error('Error recording event participation:', error)
  }
}

// Create default badges for events
export async function seedEventBadges() {
  const year = new Date().getFullYear()
  
  const badges = [
    // Christmas
    {
      name: `christmas_${year}`,
      displayName: 'Christmas 2024',
      description: 'Visited Chrona during the Christmas season',
      icon: '🎄',
      category: 'event' as BadgeCategory,
      rarity: 'uncommon' as BadgeRarity,
      color: '#22c55e',
      howToEarn: 'Visit Chrona on December 24-26',
      isLimited: true
    },
    // Halloween
    {
      name: `halloween_${year}`,
      displayName: 'Halloween 2024',
      description: 'Spooked around Chrona during Halloween',
      icon: '🎃',
      category: 'event' as BadgeCategory,
      rarity: 'uncommon' as BadgeRarity,
      color: '#f97316',
      howToEarn: 'Visit Chrona on October 31 - November 2',
      isLimited: true
    },
    // New Year
    {
      name: `new_year_${year + 1}`,
      displayName: 'New Year 2025',
      description: 'Welcomed the New Year on Chrona',
      icon: '🎆',
      category: 'event' as BadgeCategory,
      rarity: 'uncommon' as BadgeRarity,
      color: '#eab308',
      howToEarn: 'Visit Chrona on December 31 - January 2',
      isLimited: true
    },
    // Valentine's Day
    {
      name: `valentines_${year}`,
      displayName: 'Valentine\'s 2024',
      description: 'Spread love on Chrona',
      icon: '💕',
      category: 'event' as BadgeCategory,
      rarity: 'uncommon' as BadgeRarity,
      color: '#ec4899',
      howToEarn: 'Visit Chrona on February 13-15',
      isLimited: true
    },
    // Fourth of July
    {
      name: `fourth_of_july_${year}`,
      displayName: 'Independence Day 2024',
      description: 'Celebrated Independence Day on Chrona',
      icon: '🇺🇸',
      category: 'event' as BadgeCategory,
      rarity: 'uncommon' as BadgeRarity,
      color: '#3b82f6',
      howToEarn: 'Visit Chrona on July 4-5',
      isLimited: true
    },
    // OOC Badges
    {
      name: 'ooc_verified',
      displayName: 'Verified OOC',
      description: 'Has a complete OOC profile',
      icon: '✅',
      category: 'ooc' as BadgeCategory,
      rarity: 'common' as BadgeRarity,
      color: '#22c55e',
      howToEarn: 'Complete your OOC profile with bio and pronouns'
    },
    {
      name: 'ooc_social',
      displayName: 'Social Butterfly',
      description: 'Added 3+ social links to OOC profile',
      icon: '🦋',
      category: 'ooc' as BadgeCategory,
      rarity: 'uncommon' as BadgeRarity,
      color: '#8b5cf6',
      howToEarn: 'Add at least 3 social links to your OOC profile'
    },
    // Achievement Badges
    {
      name: 'first_persona',
      displayName: 'Character Creator',
      description: 'Created your first character',
      icon: '🎭',
      category: 'achievement' as BadgeCategory,
      rarity: 'common' as BadgeRarity,
      color: '#06b6d4',
      howToEarn: 'Create your first persona'
    },
    {
      name: 'storyline_creator',
      displayName: 'World Builder',
      description: 'Created a storyline',
      icon: '🏰',
      category: 'achievement' as BadgeCategory,
      rarity: 'uncommon' as BadgeRarity,
      color: '#f59e0b',
      howToEarn: 'Create your first storyline'
    },
    {
      name: 'community_helper',
      displayName: 'Community Helper',
      description: 'Helped other users with questions',
      icon: '🤝',
      category: 'special' as BadgeCategory,
      rarity: 'rare' as BadgeRarity,
      color: '#10b981',
      howToEarn: 'Awarded by moderators for helpful contributions'
    },
    // Milestone Badges
    {
      name: 'one_year_member',
      displayName: 'One Year Member',
      description: 'Been a member for 1 year',
      icon: '🎂',
      category: 'milestone' as BadgeCategory,
      rarity: 'rare' as BadgeRarity,
      color: '#a855f7',
      howToEarn: 'Be a member for 365 days'
    }
  ]
  
  for (const badge of badges) {
    try {
      await db.badge.upsert({
        where: { name: badge.name },
        create: badge,
        update: badge
      })
    } catch (error) {
      console.error(`Error creating badge ${badge.name}:`, error)
    }
  }
}
