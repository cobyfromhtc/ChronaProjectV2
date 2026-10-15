import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// =============================================================
// List Bookmarks API
// =============================================================
// GET /api/bookmarks?personaId=xxx
//   Returns all bookmarks for the given persona (the user's active
//   persona), with message + sender + conversation context.
// =============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('personaId')

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    // Verify persona belongs to user
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })
    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }

    const bookmarks = await db.messageBookmark.findMany({
      where: { personaId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true, user: { select: { isOfficial: true } } } },
            conversation: {
              include: {
                personaA: { include: { user: { select: { username: true } } } },
                personaB: { include: { user: { select: { username: true } } } },
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get all the user's persona IDs to determine the "other" persona per conversation
    const userPersonas = await db.persona.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const userPersonaIds = userPersonas.map(p => p.id)

    const formatted = bookmarks.map((b: any) => {
      const conv = b.message?.conversation
      const isPersonaA = conv ? userPersonaIds.includes(conv.personaAId) : false
      const other = conv ? (isPersonaA ? conv.personaB : conv.personaA) : null
      return {
        id: b.id,
        messageId: b.messageId,
        personaId: b.personaId,
        note: b.note,
        createdAt: b.createdAt,
        message: b.message ? {
          id: b.message.id,
          content: b.message.content,
          imageUrl: b.message.imageUrl,
          createdAt: b.message.createdAt,
          sender: {
            id: b.message.sender.id,
            name: b.message.sender.name,
            avatarUrl: b.message.sender.avatarUrl,
            isOfficial: b.message.sender.user?.isOfficial || false,
          },
          conversationId: b.message.conversationId,
          otherPersonaName: other?.name || 'Unknown',
          otherPersonaAvatarUrl: other?.avatarUrl || null,
        } : null,
      }
    }).filter((b: any) => b.message !== null)

    return NextResponse.json({ success: true, bookmarks: formatted })
  } catch (error) {
    console.error('List bookmarks error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
