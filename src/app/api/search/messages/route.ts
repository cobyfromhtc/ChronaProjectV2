import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// Global Message Search API
// =============================================================
// GET /api/search/messages?q=keyword
//   Searches across ALL DM conversations the user is part of for
//   messages matching the keyword. Returns up to 30 results with
//   conversation + sender context.
// =============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50)

    if (q.length < 2) {
      return NextResponse.json({ success: true, results: [] })
    }

    const queryLower = q.toLowerCase()

    // Get all personas owned by the user
    const userPersonas = await db.persona.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const personaIds = userPersonas.map(p => p.id)

    if (personaIds.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    // Get all conversations the user is part of
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { personaAId: { in: personaIds } },
          { personaBId: { in: personaIds } },
        ]
      },
      include: {
        personaA: { include: { user: { select: { username: true } } } },
        personaB: { include: { user: { select: { username: true } } } },
      }
    })

    const conversationMap = new Map<string, any>()
    for (const conv of conversations) {
      const isPersonaA = personaIds.includes(conv.personaAId)
      const other = isPersonaA ? conv.personaB : conv.personaA
      const mine = isPersonaA ? conv.personaA : conv.personaB
      conversationMap.set(conv.id, {
        conversationId: conv.id,
        otherPersona: {
          id: other.id,
          name: other.name,
          avatarUrl: other.avatarUrl,
          username: other.user?.username || 'Unknown',
        },
        myPersonaId: mine.id,
      })
    }

    if (conversationMap.size === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    // Search messages in those conversations
    const messages = await db.message.findMany({
      where: {
        conversationId: { in: Array.from(conversationMap.keys()) },
        content: { contains: queryLower },
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Format results with conversation context
    const results = messages.map((msg: any) => {
      const conv = conversationMap.get(msg.conversationId)
      if (!conv) return null
      return {
        messageId: msg.id,
        conversationId: msg.conversationId,
        content: msg.content,
        imageUrl: msg.imageUrl,
        createdAt: msg.createdAt,
        sender: {
          id: msg.sender?.id,
          name: msg.sender?.name || 'Unknown',
          avatarUrl: msg.sender?.avatarUrl || null,
          isMine: msg.senderId === conv.myPersonaId,
        },
        otherPersona: conv.otherPersona,
      }
    }).filter(Boolean)

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Message search error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
