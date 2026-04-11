import { NextResponse } from 'next/server'
// Using db-native to avoid caching issues with new Prisma models
import { db } from '@/lib/db-native'
import { getSession } from '@/lib/auth'
import { stripe, isStripeConfigured, getChronosPack, generateReceiptNumber } from '@/lib/stripe'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, logSuspiciousActivity } from '@/lib/rate-limit'

// Force reload v3 - using db-native
console.log('[Checkout] Using db-native. Available models:', Object.keys(db))

// POST - Create a Stripe checkout session for Chronos purchase
// This endpoint is rate-limited to prevent abuse
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Stripe is configured
    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json(
        { error: 'Payments are not currently available. Please try again later.' },
        { status: 503 }
      )
    }

    // Check rate limit for checkout attempts
    const rateLimitKey = getRateLimitKey(user.id, 'checkout')
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.CHECKOUT)

    if (!rateLimitResult.success) {
      // Log potential abuse
      logSuspiciousActivity(user.id, 'checkout', 'Rate limit exceeded', {
        remaining: rateLimitResult.remaining,
        blocked: rateLimitResult.blocked,
      })

      return NextResponse.json(
        {
          error: 'Too many checkout attempts. Please wait before trying again.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      )
    }

    const body = await request.json()
    const { packId } = body

    const pack = getChronosPack(packId)
    if (!pack) {
      return NextResponse.json({ error: 'Invalid pack ID' }, { status: 400 })
    }

    // Check for existing pending purchases
    // Debug: Check if chronosPurchase exists on db
    if (!db.chronosPurchase) {
      console.error('[Checkout] chronosPurchase is undefined! Available models:', Object.keys(db))
      return NextResponse.json({ error: 'Database model not available. Please restart the server.' }, { status: 500 })
    }

    const existingPending = await db.chronosPurchase.findFirst({
      where: {
        userId: user.id,
        paymentStatus: 'pending',
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      }
    })

    if (existingPending) {
      // User has a pending purchase - don't allow another until it completes or expires
      return NextResponse.json(
        {
          error: 'You have a pending purchase. Please wait for it to complete or expire before starting a new one.',
          pendingPurchaseId: existingPending.id,
        },
        { status: 400 }
      )
    }

    // Get user data for email
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        username: true,
        chronos: true,
      }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create a pending purchase record first
    const receiptNumber = generateReceiptNumber()
    const purchase = await db.chronosPurchase.create({
      data: {
        userId: user.id,
        packId: pack.id,
        chronosAmount: pack.chronos,
        bonusAmount: pack.bonus,
        totalChronos: pack.total,
        priceUsd: pack.priceUsd,
        priceCents: pack.priceCents,
        receiptNumber,
        paymentStatus: 'pending',
      }
    })

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userData.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pack.name,
              description: pack.description,
              images: [],
            },
            unit_amount: pack.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        username: userData.username,
        packId: pack.id,
        purchaseId: purchase.id,
        chronosAmount: pack.chronos.toString(),
        bonusAmount: pack.bonus.toString(),
        totalChronos: pack.total.toString(),
        receiptNumber,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?chronos_purchase=success&purchase_id=${purchase.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?chronos_purchase=cancelled`,
    })

    // Update purchase with session ID
    await db.chronosPurchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      purchaseId: purchase.id,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
