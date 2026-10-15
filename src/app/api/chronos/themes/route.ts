import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getPb } from '@/lib/pb'
import { SYSTEM_THEMES } from '@/lib/theme-presets'

// Flat Chronos cost to mint a custom theme design (the designer UI shows this).
const CUSTOM_THEME_MINT_COST = 200
// Optional sale price bounds when publishing a design to the public shop.
const MIN_SALE_PRICE = 100
const MAX_SALE_PRICE = 600

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

// GET - Get available profile themes.
// Self-heals the system-theme seed: on first call (or after a fresh install)
// missing SYSTEM_THEMES records are created with stable ids, so the wallet's
// theme shop always has real purchasable records. Ownership is per-user and
// derived from chronosTransactions (category='theme', referenceId=themeId) —
// system themes are shared records and never have their ownerId mutated.
// The catalog also lists PUBLIC custom themes designed by other users
// (isPublic=true) so user-designed themes can be bought from their creators.
export async function GET() {
  try {
    const user = await getSession()

    // ── Self-heal: ensure every system preset exists ──────────────────
    // (idempotent — only creates records whose id is missing; uses the PB
    // superuser client directly because the db adapter strips client-
    // supplied record ids on create, and stable ids are what purchases
    // and persona.themeId references key off of)
    const existing = await db.profileTheme.findMany({
      where: { id: { in: SYSTEM_THEMES.map(t => t.id) } },
      select: { id: true },
    })
    const existingIds = new Set(existing.map(t => t.id))
    const missing = SYSTEM_THEMES.filter(t => !existingIds.has(t.id))
    if (missing.length > 0) {
      const pb = await getPb()
      await Promise.all(
        missing.map(preset =>
          pb
            .collection('profileThemes')
            .create({
              id: preset.id,
              name: preset.name,
              description: preset.description,
              background: preset.background,
              borderColor: preset.borderColor,
              textColor: preset.textColor,
              accentColor: preset.accentColor,
              price: preset.price,
              isSystem: true,
              isActive: true,
            })
            .catch(() => {
              // A concurrent request may have raced us to the create —
              // the id is the unique key, so a failure here just means
              // the record already exists. Safe to swallow.
            })
        )
      )
    }

    // ── Per-user purchase history (system + public custom themes) ─────
    const purchasedIds: Set<string> = new Set()
    if (user) {
      const purchases = await db.chronosTransaction.findMany({
        where: {
          userId: user.id,
          category: 'theme',
        },
        select: { referenceId: true },
      })
      for (const p of purchases) {
        if (p.referenceId) purchasedIds.add(p.referenceId)
      }
    }

    // ── Catalog: system themes + the user's custom themes + public designs
    const themes = await db.profileTheme.findMany({
      where: {
        isActive: true,
        OR: [
          { isSystem: true },
          ...(user ? [{ ownerId: user.id }, { isPublic: true }] : [{ isPublic: true }]),
        ],
      },
      orderBy: [{ isSystem: 'desc' }, { price: 'asc' }],
      include: { owner: { select: { username: true } } },
    })

    return NextResponse.json({
      themes: themes.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        background: t.background,
        borderColor: t.borderColor,
        textColor: t.textColor,
        accentColor: t.accentColor,
        price: t.price,
        isSystem: t.isSystem,
        isPublic: t.isPublic ?? false,
        creatorUsername: !t.isSystem && t.owner ? t.owner.username : null,
        isOwned: purchasedIds.has(t.id) || (!t.isSystem && !!user && t.ownerId === user.id),
      })),
    })
  } catch (error) {
    console.error('Error fetching themes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Design (mint) a custom theme from the Theme Designer.
// Charges a flat minting cost; the created theme is immediately owned by the
// designer (ownerId) and can optionally be published to the public shop with
// a sale price (100-600) so other users can buy it — the creator then earns
// 90% of each sale (handled in /api/chronos/purchase buy_theme).
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, backgroundFrom, backgroundTo, borderColor, textColor, accentColor, salePrice } = body ?? {}

    // ── Validation ────────────────────────────────────────────────────
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Theme name required' }, { status: 400 })
    }
    if (name.trim().length > 30) {
      return NextResponse.json({ error: 'Theme name must be 30 characters or fewer' }, { status: 400 })
    }
    const colorFields: Array<[string, unknown]> = [
      ['background gradient start', backgroundFrom],
      ['background gradient end', backgroundTo],
      ['border color', borderColor],
      ['text color', textColor],
      ['accent color', accentColor],
    ]
    for (const [label, value] of colorFields) {
      if (typeof value !== 'string' || !HEX_COLOR_RE.test(value)) {
        return NextResponse.json({ error: `Invalid ${label} — use a #rrggbb hex color` }, { status: 400 })
      }
    }
    let listedPrice = 0
    if (salePrice != null && salePrice !== false && salePrice !== 0 && salePrice !== '') {
      const parsed = Number(salePrice)
      if (!Number.isInteger(parsed) || parsed < MIN_SALE_PRICE || parsed > MAX_SALE_PRICE) {
        return NextResponse.json(
          { error: `Sale price must be a whole number between ${MIN_SALE_PRICE} and ${MAX_SALE_PRICE} Chronos` },
          { status: 400 }
        )
      }
      listedPrice = parsed
    }

    // ── Balance check + first-purchase bonus (mirrors purchase route) ─
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: { chronos: true, hasFirstPurchaseBonus: true },
    })
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const isFirstPurchase = !userData.hasFirstPurchaseBonus
    const bonusAmount = isFirstPurchase ? CUSTOM_THEME_MINT_COST : 0
    if (userData.chronos < CUSTOM_THEME_MINT_COST) {
      return NextResponse.json(
        { error: 'Insufficient Chronos', required: CUSTOM_THEME_MINT_COST, current: userData.chronos },
        { status: 400 }
      )
    }
    const newBalance = userData.chronos - CUSTOM_THEME_MINT_COST + bonusAmount

    // ── Mint: theme record FIRST, then the ledger, then the balance ───
    // (a theme-create failure must never charge the user; if the ledger
    // fails after the theme exists we best-effort delete the orphan theme)
    const theme = await db.profileTheme.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim().slice(0, 80) : 'A custom-designed theme',
        background: `linear-gradient(135deg, ${backgroundFrom} 0%, ${backgroundTo} 100%)`,
        borderColor,
        textColor,
        accentColor,
        price: listedPrice,
        isSystem: false,
        isActive: true,
        isPublic: listedPrice > 0,
        ownerId: user.id,
      },
    })

    try {
      await db.$transaction([
        db.chronosTransaction.create({
          data: {
            userId: user.id,
            amount: -CUSTOM_THEME_MINT_COST + bonusAmount,
            balance: newBalance,
            type: 'spend',
            category: 'theme',
            description: `Designed a custom theme: ${name.trim()}${listedPrice > 0 ? ` (listed at ${listedPrice})` : ''}`,
            referenceId: theme.id,
          },
        }),
        db.user.update({
          where: { id: user.id },
          data: {
            chronos: newBalance,
            hasFirstPurchaseBonus: isFirstPurchase ? true : userData.hasFirstPurchaseBonus,
          },
        }),
      ] as any)
    } catch (txError) {
      // Charge failed — remove the orphan theme so a retry starts clean
      console.error('Theme mint transaction failed:', txError)
      await db.profileTheme.delete({ where: { id: theme.id } }).catch(() => {})
      return NextResponse.json({ error: 'Failed to complete the mint — no Chronos were charged' }, { status: 500 })
    }

    return NextResponse.json({
      theme: { ...theme, isOwned: true, creatorUsername: user.username },
      chronos: newBalance,
      bonusReceived: bonusAmount,
      isFirstPurchase,
    })
  } catch (error) {
    console.error('Error creating theme:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
