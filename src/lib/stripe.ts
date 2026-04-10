import Stripe from 'stripe'

// Initialize Stripe - will use environment variable STRIPE_SECRET_KEY
// In development without a key, stripe will be null
const stripeKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-03-31.basil',
}) : null

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return stripe !== null
}

// Chronos pack definitions with Stripe price IDs
export const CHRONOS_PACKS = [
  {
    id: 'starter',
    chronos: 200,
    bonus: 0,
    total: 200,
    priceUsd: '$1.99',
    priceCents: 199,
    name: 'Starter Pack',
    description: '200 Chronos',
    popular: false,
  },
  {
    id: 'standard',
    chronos: 500,
    bonus: 50,
    total: 550,
    priceUsd: '$4.99',
    priceCents: 499,
    name: 'Standard Pack',
    description: '500 Chronos + 50 Bonus',
    popular: true,
  },
  {
    id: 'value',
    chronos: 850,
    bonus: 150,
    total: 1000,
    priceUsd: '$9.99',
    priceCents: 999,
    name: 'Value Pack',
    description: '850 Chronos + 150 Bonus',
    popular: true,
  },
] as const

export type ChronosPack = typeof CHRONOS_PACKS[number]

// Get pack by ID
export function getChronosPack(packId: string): ChronosPack | undefined {
  return CHRONOS_PACKS.find(pack => pack.id === packId)
}

// Generate a unique receipt number
export function generateReceiptNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `CHR-${year}-${random}`
}

// Create Stripe checkout session
export async function createCheckoutSession(params: {
  packId: string
  userId: string
  userEmail: string
  username: string
  successUrl: string
  cancelUrl: string
}): Promise<{ sessionId: string; purchaseId: string } | { error: string }> {
  const { packId, userId, userEmail, username, successUrl, cancelUrl } = params

  // Check if Stripe is configured
  if (!stripe) {
    return { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.' }
  }

  const pack = getChronosPack(packId)
  if (!pack) {
    return { error: 'Invalid pack ID' }
  }

  try {
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pack.name,
              description: pack.description,
              images: [], // Could add product images here
            },
            unit_amount: pack.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        username,
        packId,
        chronosAmount: pack.chronos.toString(),
        bonusAmount: pack.bonus.toString(),
        totalChronos: pack.total.toString(),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { sessionId: session.id, purchaseId: '' } // Purchase ID will be created in webhook
  } catch (error) {
    console.error('Error creating Stripe session:', error)
    return { error: 'Failed to create checkout session' }
  }
}