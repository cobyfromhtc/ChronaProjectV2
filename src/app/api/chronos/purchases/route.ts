import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - Get user's Chronos purchase history
export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const purchaseId = searchParams.get('id')

    if (purchaseId) {
      // Get specific purchase
      const purchase = await db.chronosPurchase.findFirst({
        where: {
          id: purchaseId,
          userId: user.id
        }
      })

      if (!purchase) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
      }

      // Get user info for receipt
      const userData = await db.user.findUnique({
        where: { id: user.id },
        select: { username: true, email: true }
      })

      return NextResponse.json({
        purchase,
        user: userData
      })
    }

    // Get all purchases
    const purchases = await db.chronosPurchase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ purchases })
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
