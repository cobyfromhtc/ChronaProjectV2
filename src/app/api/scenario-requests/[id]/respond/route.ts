import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

// =============================================================
// POST /api/scenario-requests/[id]/respond — Accept or Decline
// =============================================================
// Only the owner of the TARGET persona (toUserId) can respond.
//  - Accept: creates (or reuses) the conversation between the two personas,
//    seeds the scenario's opening messages as the requester's messages, and
//    notifies the requester via Blorp.
//  - Decline: marks the request declined and notifies the requester.

const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
})

function parseJsonArray(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((m) => typeof m === 'string' && m.trim()) : []
  } catch {
    return []
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = respondSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    const { action } = parsed.data

    const scenarioRequest = await db.scenarioRequest.findUnique({
      where: { id },
      include: {
        scenario: { select: { id: true, title: true, initialMessages: true } },
        fromPersona: { select: { id: true, name: true, avatarUrl: true } },
        toPersona: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
    if (!scenarioRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only the target persona's owner can respond
    if (scenarioRequest.toUserId !== user.id) {
      return NextResponse.json({ error: 'Only the requested persona\'s owner can respond' }, { status: 403 })
    }
    if (scenarioRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `This request was already ${scenarioRequest.status}` },
        { status: 400 }
      )
    }

    const requesterPersonaId = scenarioRequest.fromPersonaId
    const targetPersonaId = scenarioRequest.toPersonaId

    if (action === 'accept') {
      // Reuse an existing conversation if the personas already have one
      let conversation = await db.conversation.findFirst({
        where: {
          OR: [
            { personaAId: requesterPersonaId, personaBId: targetPersonaId },
            { personaAId: targetPersonaId, personaBId: requesterPersonaId },
          ],
        },
      })

      let seeded = false
      if (!conversation) {
        conversation = await db.conversation.create({
          data: {
            personaAId: requesterPersonaId,
            personaBId: targetPersonaId,
          },
        })

        // Seed the scenario's opening messages as the requester's messages
        const openingMessages = parseJsonArray(scenarioRequest.scenario?.initialMessages)
        for (const content of openingMessages.slice(0, 10)) {
          await db.message.create({
            data: {
              conversationId: conversation.id,
              senderId: requesterPersonaId,
              content: content.trim(),
            },
          })
        }
        seeded = openingMessages.length > 0
      }

      await db.scenarioRequest.update({
        where: { id: scenarioRequest.id },
        data: { status: 'accepted', respondedAt: new Date() },
      })

      // Tell the requester the good news (via Blorp)
      await createNotification({
        userId: scenarioRequest.fromUserId,
        type: 'scenario_request_accepted',
        title: 'Scenario request accepted',
        message: `${scenarioRequest.toPersona?.name || 'Your partner'} accepted your scenario request — "${scenarioRequest.scenario?.title || 'Untitled scenario'}"`,
        data: {
          requestId: scenarioRequest.id,
          conversationId: conversation.id,
          scenarioTitle: scenarioRequest.scenario?.title || null,
          acceptedByPersona: scenarioRequest.toPersona?.name || null,
          acceptedByAvatar: scenarioRequest.toPersona?.avatarUrl || null,
        },
      }).catch((err) => console.error('[ScenarioRequest] accept notification failed:', err))

      return NextResponse.json({
        success: true,
        status: 'accepted',
        conversationId: conversation.id,
        seededOpeningMessages: seeded,
      })
    } else {
      // Decline
      await db.scenarioRequest.update({
        where: { id: scenarioRequest.id },
        data: { status: 'declined', respondedAt: new Date() },
      })

      await createNotification({
        userId: scenarioRequest.fromUserId,
        type: 'scenario_request_declined',
        title: 'Scenario request declined',
        message: `${scenarioRequest.toPersona?.name || 'The requested persona'} declined your scenario request — "${scenarioRequest.scenario?.title || 'Untitled scenario'}"`,
        data: {
          requestId: scenarioRequest.id,
          scenarioTitle: scenarioRequest.scenario?.title || null,
        },
      }).catch((err) => console.error('[ScenarioRequest] decline notification failed:', err))

      return NextResponse.json({ success: true, status: 'declined' })
    }
  } catch (error) {
    console.error('Respond to scenario request error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
