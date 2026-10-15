import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// Message Reactions API
// =============================================================
// POST   /api/conversations/[id]/messages/[messageId]/reactions
//   Body: { emoji, personaId }
//   Toggles a reaction: adds it if not present, removes it if it exists.
//   Returns { reacted: boolean, reactions: [...] }
//
// GET    /api/conversations/[id]/messages/[messageId]/reactions
//   Returns all reactions for a message, grouped by emoji.
// =============================================================

interface ReactionGroup {
  emoji: string
  count: number
  personas: { id: string; name: string }[]
  reactedByMe: boolean
}

function groupReactions(reactions: any[], myPersonaId?: string): ReactionGroup[] {
  const map = new Map<string, { emoji: string; count: number; personas: { id: string; name: string }[]; reactedByMe: boolean }>()
  for (const r of reactions) {
    const emoji = r.emoji
    if (!map.has(emoji)) {
      map.set(emoji, { emoji, count: 0, personas: [], reactedByMe: false })
    }
    const group = map.get(emoji)!
    group.count++
    if (r.persona?.name) {
      group.personas.push({ id: r.personaId, name: r.persona.name })
    }
    if (myPersonaId && r.personaId === myPersonaId) {
      group.reactedByMe = true
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

// GET - Fetch all reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: conversationId, messageId } = await params

    // Verify user is part of this conversation
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        personaA: { select: { userId: true, id: true } },
        personaB: { select: { userId: true, id: true } },
      }
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const userIds = [conversation.personaA.userId, conversation.personaB.userId]
    if (!userIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the user's active persona id (for "reactedByMe" flag)
    const myPersona = await db.persona.findFirst({
      where: { userId: user.id, isActive: true },
      select: { id: true }
    })

    const reactions = await db.messageReaction.findMany({
      where: { messageId },
      include: {
        persona: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({
      success: true,
      reactions: groupReactions(reactions as any[], myPersona?.id)
    })
  } catch (error) {
    console.error('Fetch reactions error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Toggle a reaction (add if absent, remove if present)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: conversationId, messageId } = await params
    const body = await request.json()
    const { emoji, personaId } = body

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    // Verify conversation exists and user is part of it
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        personaA: { select: { userId: true, id: true } },
        personaB: { select: { userId: true, id: true } },
      }
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    const userIds = [conversation.personaA.userId, conversation.personaB.userId]
    if (!userIds.includes(user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify persona belongs to the user
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })
    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }

    // Verify the message exists and belongs to this conversation
    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message || message.conversationId !== conversationId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if the reaction already exists (toggle)
    const existing = await db.messageReaction.findUnique({
      where: {
        messageId_personaId_emoji: {
          messageId,
          personaId,
          emoji,
        }
      }
    })

    let reacted: boolean
    if (existing) {
      await db.messageReaction.delete({ where: { id: existing.id } })
      reacted = false
    } else {
      await db.messageReaction.create({
        data: { messageId, personaId, emoji }
      })
      reacted = true
    }

    // Fetch all reactions for the message to return the full state
    const reactions = await db.messageReaction.findMany({
      where: { messageId },
      include: {
        persona: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({
      success: true,
      reacted,
      reactions: groupReactions(reactions as any[], personaId)
    })
  } catch (error) {
    console.error('Toggle reaction error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
