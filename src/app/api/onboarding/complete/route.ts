import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureBlorpExists, sendOnboardingWelcome } from '@/lib/blorp'
import { z } from 'zod'

// Onboarding completion (Task 2-a)
// Marks the authenticated user as onboarded (onboarded=true, onboardingCompletedAt=now)
// and stores their chosen UI variant. Also triggers Blorp's onboarding welcome DM
// (idempotent — can never double-send).

const VARIANTS = ['chrona', 'chrona-v2', 'chrona-v3'] as const
type Variant = (typeof VARIANTS)[number]

const completeSchema = z.object({
  variant: z.enum(VARIANTS).default('chrona'),
})

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionFromRequest(request)

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Validate body (tolerates empty body / missing variant)
    let parsed: z.infer<typeof completeSchema>
    try {
      const body = await request.json()
      const result = completeSchema.safeParse(body ?? {})
      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid variant. Expected one of: ' + VARIANTS.join(', ') },
          { status: 400 }
        )
      }
      parsed = result.data
    } catch {
      // Body wasn't valid JSON — use the default variant
      parsed = completeSchema.parse({})
    }

    let variant: Variant = parsed.variant

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, onboarded: true, preferredVariant: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Mark onboarded (only the first completion writes the timestamp + variant;
    // repeat calls are idempotent no-ops that keep the original choices)
    if (!user.onboarded) {
      await db.user.update({
        where: { id: user.id },
        data: {
          onboarded: true,
          onboardingCompletedAt: new Date(),
          preferredVariant: variant,
        },
      })
    } else if (VARIANTS.includes(user.preferredVariant as Variant)) {
      // Already onboarded — the originally chosen variant stays authoritative
      variant = user.preferredVariant as Variant
    }

    // Blorp onboarding welcome DM. Idempotent (marker-checked inside), so
    // repeated calls — including an already-onboarded user retrying — never
    // double-send. A user without a persona yet simply gets it later, when
    // their first persona is created (see api/personas POST hook).
    let blorpWelcomeSent = false
    try {
      await ensureBlorpExists()
      const welcome = await sendOnboardingWelcome(user.id)
      blorpWelcomeSent = welcome.success
      if (!welcome.success) {
        console.warn('[Onboarding] Blorp welcome not delivered yet:', welcome.error)
      }
    } catch (welcomeError) {
      console.error('[Onboarding] Failed to send Blorp welcome DM:', welcomeError)
    }

    return NextResponse.json({
      success: true,
      onboarded: true,
      preferredVariant: variant,
      blorpWelcomeSent,
    })

  } catch (error) {
    console.error('[Onboarding] Completion error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
