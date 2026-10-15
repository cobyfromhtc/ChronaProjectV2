import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createNotification } from '@/lib/notify'

// Constants for Chronos pricing
export const PRICING = {
  PERSONA_SLOT: 200,        // Extra persona slot
  STORYLINE: 500,           // Create a storyline
  EXTRA_IMAGE: 2,           // Send an extra image beyond daily cap
  NAME_COLOR: 300,          // Global name color
  PROFILE_THEME_MIN: 100,   // Minimum theme price
  PROFILE_THEME_MAX: 600,   // Maximum theme price
  DAILY_LOGIN: 10,          // Daily login bonus
  WEEKLY_STREAK: 50,        // Weekly streak bonus
  FIRST_PURCHASE_BONUS_MULTIPLIER: 2,  // Double value for first purchase
}

// POST - Purchase items with Chronos
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    // Get current user data
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        chronos: true,
        purchasedSlots: true,
        nameColor: true,
        dailyImagesUsed: true,
        dailyImagesResetAt: true,
        hasFirstPurchaseBonus: true,
      }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let cost = 0
    let description = ''
    let category = ''
    let referenceId: string | undefined
    // For custom (user-designed) theme purchases: the creator who earns 90%
    let themeCreator: { id: string; chronos: number } | null = null
    let themeSaleThemeName = ''

    switch (action) {
      case 'buy_slot': {
        // Purchase an extra persona slot
        cost = PRICING.PERSONA_SLOT
        description = 'Purchased extra persona slot'
        category = 'slot'
        break
      }

      case 'create_storyline': {
        // Create a storyline
        cost = PRICING.STORYLINE
        description = 'Created a new storyline'
        category = 'storyline'
        break
      }

      case 'extra_image': {
        // Send an extra image beyond daily cap
        cost = PRICING.EXTRA_IMAGE
        description = 'Sent extra image beyond daily cap'
        category = 'extra_image'
        break
      }

      case 'buy_name_color': {
        // Purchase a name color
        const { color } = data
        if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
          return NextResponse.json({ error: 'Invalid color format' }, { status: 400 })
        }
        cost = PRICING.NAME_COLOR
        description = `Purchased name color: ${color}`
        category = 'name_color'
        referenceId = color
        break
      }

      case 'buy_theme': {
        // Purchase a profile theme
        const { themeId } = data
        if (!themeId) {
          return NextResponse.json({ error: 'Theme ID required' }, { status: 400 })
        }

        const theme = await db.profileTheme.findUnique({
          where: { id: themeId }
        })

        if (!theme || !theme.isActive) {
          return NextResponse.json({ error: 'Theme not found or unavailable' }, { status: 404 })
        }

        // Ownership is PER-USER, derived from the transaction ledger:
        //   - system themes are SHARED catalog records — many users can own
        //     the same theme, so we never mutate the record's ownerId for them
        //   - custom themes are single-owner (ownerId is the creator)
        if (theme.isSystem) {
          const existingPurchase = await db.chronosTransaction.findFirst({
            where: {
              userId: user.id,
              category: 'theme',
              referenceId: themeId,
            },
            select: { id: true },
          })
          if (existingPurchase) {
            return NextResponse.json({ error: 'You already own this theme' }, { status: 400 })
          }
        } else if (theme.ownerId === user.id) {
          return NextResponse.json({ error: 'You already own this theme' }, { status: 400 })
        } else if (!theme.isPublic) {
          // Custom designs must be published (isPublic) to be purchasable
          return NextResponse.json({ error: 'This theme is not available for purchase' }, { status: 400 })
        } else {
          // Buying another user's published design — the creator earns 90%
          // (platform fee 10%, mirroring the marketplace split)
          const creator = await db.user.findUnique({
            where: { id: theme.ownerId },
            select: { id: true, chronos: true },
          })
          if (creator) {
            themeCreator = creator
            themeSaleThemeName = theme.name
          }
        }

        cost = theme.price
        description = `Purchased profile theme: ${theme.name}`
        category = 'theme'
        referenceId = themeId
        break
      }

      case 'earn_daily': {
        // Daily login bonus
        cost = -PRICING.DAILY_LOGIN // Negative because it's earning
        description = 'Daily login bonus'
        category = 'daily_login'
        break
      }

      case 'earn_streak': {
        // Weekly streak bonus
        cost = -PRICING.WEEKLY_STREAK // Negative because it's earning
        description = 'Weekly streak bonus'
        category = 'streak_bonus'
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Calculate bonus for first purchase
    let bonusAmount = 0
    const isFirstPurchase = cost > 0 && !userData.hasFirstPurchaseBonus

    // For the first purchase, give them back the same amount as bonus (effectively double value)
    if (isFirstPurchase) {
      bonusAmount = cost
    }

    // Check if user has enough chronos (for purchases)
    if (cost > 0 && userData.chronos < cost) {
      return NextResponse.json({ 
        error: 'Insufficient Chronos',
        required: cost,
        current: userData.chronos 
      }, { status: 400 })
    }

    // Calculate new balance
    const newBalance = userData.chronos - cost + bonusAmount

    // Perform the transaction (sequential best-effort — PocketBase has no
    // cross-collection atomicity; the chronosTransaction record is created
    // BEFORE the user mutation so a record-create failure can't leave the
    // user charged with no ledger entry)
    const [, updatedUser] = await db.$transaction([
      // Record the transaction FIRST (values are precomputed above)
      db.chronosTransaction.create({
        data: {
          userId: user.id,
          amount: -cost + bonusAmount,
          balance: newBalance,
          type: cost > 0 ? 'spend' : 'earn',
          category,
          description,
          referenceId,
        }
      }),
      // Then apply the user mutation
      db.user.update({
        where: { id: user.id },
        data: {
          chronos: newBalance,
          hasFirstPurchaseBonus: isFirstPurchase ? true : userData.hasFirstPurchaseBonus,
          // Update specific fields based on action
          ...(action === 'buy_slot' && { purchasedSlots: { increment: 1 } }),
          ...(action === 'buy_name_color' && { nameColor: referenceId }),
          ...(action === 'extra_image' && { dailyImagesUsed: { increment: 1 } }),
        }
      })
    ] as any)

    // Theme ownership is tracked per-user via the chronosTransaction ledger
    // (see the buy_theme case) — deliberately NOT by mutating the shared
    // system-theme record's ownerId, which would let a second buyer "steal"
    // the theme from the first.

    // ── Custom theme sale: credit the designer 90% (best-effort) ──────
    // A credit failure must never roll back the buyer's successful purchase
    // (they already own the theme) — log it so the ledger gap is auditable.
    if (action === 'buy_theme' && themeCreator && cost > 0) {
      try {
        const creatorEarnings = Math.floor(cost * 0.9)
        const creatorNewBalance = themeCreator.chronos + creatorEarnings
        await db.$transaction([
          db.chronosTransaction.create({
            data: {
              userId: themeCreator.id,
              amount: creatorEarnings,
              balance: creatorNewBalance,
              type: 'earn',
              category: 'theme_sale',
              description: `Theme design sale: ${themeSaleThemeName} (bought by @${user.username})`,
              referenceId,
            },
          }),
          db.user.update({
            where: { id: themeCreator.id },
            data: { chronos: creatorNewBalance },
          }),
        ] as any)
        await createNotification({
          userId: themeCreator.id,
          type: 'marketplace_sale',
          title: 'You made a sale!',
          message: `@${user.username} purchased your theme design "${themeSaleThemeName}" — you earned ${creatorEarnings} Chronos`,
          data: { themeId: referenceId, earnings: creatorEarnings },
        }).catch(() => {})
      } catch (saleError) {
        console.error('Theme sale creator credit failed (buyer purchase NOT rolled back):', saleError)
      }
    }

    return NextResponse.json({
      success: true,
      chronos: updatedUser.chronos,
      bonusReceived: bonusAmount,
      isFirstPurchase,
      message: isFirstPurchase 
        ? `🎉 First purchase bonus! You received ${bonusAmount} Chronos back!`
        : undefined
    })
  } catch (error) {
    console.error('Error processing chronos transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
