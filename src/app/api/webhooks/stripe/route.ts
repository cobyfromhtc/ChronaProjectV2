import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'

// Stripe webhook handler for payment confirmation
// This is the ONLY place where Chronos are credited for real-money purchases
// All security validation happens here - NEVER trust client-side claims

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature - critical for security
    let event: stripe.Event
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
      }

      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as stripe.Checkout.Session
        await handleSuccessfulPayment(session)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as stripe.Checkout.Session
        await handleExpiredSession(session)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as stripe.Charge
        await handleRefund(charge)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// Handle successful payment - Credit Chronos
async function handleSuccessfulPayment(session: stripe.Checkout.Session) {
  const { userId, purchaseId, packId, totalChronos, receiptNumber } = session.metadata || {}

  if (!userId || !purchaseId || !totalChronos) {
    console.error('Missing required metadata in session:', session.id)
    return
  }

  // Check if purchase was already processed (idempotency)
  const existingPurchase = await db.chronosPurchase.findUnique({
    where: { id: purchaseId }
  })

  if (!existingPurchase) {
    console.error('Purchase not found:', purchaseId)
    return
  }

  if (existingPurchase.paymentStatus === 'completed') {
    console.log('Purchase already completed:', purchaseId)
    return // Already processed
  }

  // Get current user balance
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { chronos: true, username: true }
  })

  if (!user) {
    console.error('User not found:', userId)
    return
  }

  const chronosAmount = parseInt(totalChronos, 10)
  const newBalance = user.chronos + chronosAmount

  // Create receipt data
  const receiptData = JSON.stringify({
    receiptNumber: existingPurchase.receiptNumber || receiptNumber,
    username: user.username,
    packId,
    chronosAmount,
    priceUsd: existingPurchase.priceUsd,
    stripeSessionId: session.id,
    stripePaymentId: session.payment_intent as string || null,
    purchasedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  })

  // Use a transaction to ensure atomicity
  await db.$transaction([
    // Update user balance
    db.user.update({
      where: { id: userId },
      data: { chronos: newBalance }
    }),

    // Update purchase record
    db.chronosPurchase.update({
      where: { id: purchaseId },
      data: {
        paymentStatus: 'completed',
        stripePaymentId: session.payment_intent as string || undefined,
        receiptData,
        completedAt: new Date()
      }
    }),

    // Create transaction record
    db.chronosTransaction.create({
      data: {
        userId,
        amount: chronosAmount,
        balance: newBalance,
        type: 'purchase',
        category: 'chronos_pack',
        description: `Purchased ${chronosAmount} Chronos (${existingPurchase.packId} pack)`,
        referenceId: purchaseId
      }
    })
  ])

  console.log(`Successfully credited ${chronosAmount} Chronos to user ${userId}`)
}

// Handle expired checkout session
async function handleExpiredSession(session: stripe.Checkout.Session) {
  const { purchaseId } = session.metadata || {}

  if (!purchaseId) return

  await db.chronosPurchase.update({
    where: { id: purchaseId },
    data: { paymentStatus: 'failed' }
  })

  console.log('Checkout session expired:', session.id)
}

// Handle refund - Deduct Chronos if possible
async function handleRefund(charge: stripe.Charge) {
  // Find the purchase by payment intent
  const purchase = await db.chronosPurchase.findFirst({
    where: {
      stripePaymentId: charge.payment_intent as string,
      paymentStatus: 'completed'
    }
  })

  if (!purchase) {
    console.log('No completed purchase found for refund')
    return
  }

  // Get user's current balance
  const user = await db.user.findUnique({
    where: { id: purchase.userId },
    select: { chronos: true }
  })

  if (!user) return

  // Calculate how much to deduct (if user has enough balance)
  const deductAmount = Math.min(purchase.totalChronos, user.chronos)
  const newBalance = user.chronos - deductAmount

  await db.$transaction([
    db.user.update({
      where: { id: purchase.userId },
      data: { chronos: newBalance }
    }),

    db.chronosPurchase.update({
      where: { id: purchase.id },
      data: { paymentStatus: 'refunded' }
    }),

    db.chronosTransaction.create({
      data: {
        userId: purchase.userId,
        amount: -deductAmount,
        balance: newBalance,
        type: 'spend',
        category: 'refund',
        description: `Refund: ${purchase.packId} pack - ${deductAmount} Chronos deducted`,
        referenceId: purchase.id
      }
    })
  ])

  console.log(`Refund processed for purchase ${purchase.id}, deducted ${deductAmount} Chronos`)
}
