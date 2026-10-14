import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// Conversation Preferences API
// =============================================================
// GET  /api/conversations/[id]/preferences
//   Returns the user's preferences (muted/archived) for this conversation.
//
// PATCH /api/conversations/[id]/preferences
//   Body: { isMuted?: boolean, isArchived?: boolean }
//   Upserts the user's preferences for this conversation.
// =============================================================

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: conversationId } = await params

    // Verify access
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        personaA: { select: { userId: true } },
        personaB: { select: { userId: true } },
      }
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const userIds = [conversation.personaA.userId, conversation.personaB.userId]
    if (!userIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const pref = await db.conversationPreference.findUnique({
      where: {
        userId_conversationId: { userId: user.id, conversationId }
      }
    })

    return NextResponse.json({
      success: true,
      preferences: {
        isMuted: pref?.isMuted || false,
        isArchived: pref?.isArchived || false,
      }
    })
  } catch (error) {
    console.error('Get conversation preferences error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH — upsert preferences
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: conversationId } = await params
    const body = await request.json()
    const { isMuted, isArchived } = body

    // Verify access
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        personaA: { select: { userId: true } },
        personaB: { select: { userId: true } },
      }
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const userIds = [conversation.personaA.userId, conversation.personaB.userId]
    if (!userIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Upsert the preference
    const updateData: Record<string, unknown> = {}
    if (typeof isMuted === 'boolean') updateData.isMuted = isMuted
    if (typeof isArchived === 'boolean') updateData.isArchived = isArchived

    const pref = await db.conversationPreference.upsert({
      where: {
        userId_conversationId: { userId: user.id, conversationId }
      },
      create: {
        userId: user.id,
        conversationId,
        isMuted: typeof isMuted === 'boolean' ? isMuted : false,
        isArchived: typeof isArchived === 'boolean' ? isArchived : false,
      },
      update: updateData,
    })

    return NextResponse.json({
      success: true,
      preferences: {
        isMuted: pref.isMuted,
        isArchived: pref.isArchived,
      }
    })
  } catch (error) {
    console.error('Update conversation preferences error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
