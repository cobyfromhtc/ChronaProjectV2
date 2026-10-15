import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { canInteract } from '@/lib/age-utils'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

// =============================================================
// Scenario Requests — the Personas-tab chat flow
// =============================================================
// Chatting with someone else's persona from Discover > Personas now goes
// through scenarios: the requester crafts a scenario around one of their own
// personas and sends it as a request. The target persona's owner receives a
// Blorp notification ("X is asking trying to Start a scenario with you")
// with the scenario details rendered below it, and can Accept (a conversation
// is created and the scenario's opening messages are seeded) or Decline.

const createRequestSchema = z.object({
  scenarioId: z.string().min(1),
  fromPersonaId: z.string().min(1),
  toPersonaId: z.string().min(1),
  message: z.string().max(500).optional().nullable(),
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

// GET — my outgoing pending scenario requests (so the Personas tab can show
// "Request pending" on persona cards the user has already pinged).
export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const requests = await db.scenarioRequest.findMany({
      where: { fromUserId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      requests: requests.map((r: Record<string, unknown>) => ({
        id: r.id,
        scenarioId: r.scenarioId,
        fromPersonaId: r.fromPersonaId,
        toPersonaId: r.toPersonaId,
        status: r.status,
        createdAt: r.createdAt,
      })),
    })
  } catch (error) {
    console.error('List scenario requests error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST — send a scenario request to another user's persona
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { scenarioId, fromPersonaId, toPersonaId } = parsed.data
    const note = parsed.data.message?.trim() || ''

    // The scenario must exist
    const scenario = await db.scenario.findUnique({
      where: { id: scenarioId },
    })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // The speaking persona must belong to the requester
    const myPersona = await db.persona.findFirst({
      where: { id: fromPersonaId, userId: user.id },
      include: { user: { select: { id: true, username: true } } },
    })
    if (!myPersona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }
    if (scenario.personaId !== fromPersonaId) {
      return NextResponse.json(
        { error: 'The scenario must feature your own character' },
        { status: 403 }
      )
    }

    // The target persona must exist and belong to someone else
    const targetPersona = await db.persona.findUnique({
      where: { id: toPersonaId },
      include: { user: { select: { id: true, username: true, dateOfBirth: true } } },
    })
    if (!targetPersona) {
      return NextResponse.json({ error: 'Target persona not found' }, { status: 404 })
    }
    if (targetPersona.user.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot send a scenario request to your own character' },
        { status: 400 }
      )
    }

    // Age-gating: both owners must be in the same age bracket
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { dateOfBirth: true },
    })
    const myDob = dbUser?.dateOfBirth ?? null
    const targetDob = targetPersona.user.dateOfBirth ?? null
    if (!canInteract(myDob, targetDob)) {
      return NextResponse.json(
        { error: 'You cannot start a conversation with this user due to age restrictions' },
        { status: 403 }
      )
    }

    // If a conversation already exists between the personas, no request needed
    const existingConv = await db.conversation.findFirst({
      where: {
        OR: [
          { personaAId: fromPersonaId, personaBId: toPersonaId },
          { personaAId: toPersonaId, personaBId: fromPersonaId },
        ],
      },
    })
    if (existingConv) {
      return NextResponse.json({
        success: true,
        conversationId: existingConv.id,
        alreadyExists: true,
      })
    }

    // One pending request per persona-pair at a time
    const pendingRequest = await db.scenarioRequest.findFirst({
      where: {
        fromPersonaId,
        toPersonaId,
        status: 'pending',
      },
    })
    if (pendingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending scenario request with this character', code: 'REQUEST_PENDING' },
        { status: 400 }
      )
    }

    // Create the request
    const scenarioRequest = await db.scenarioRequest.create({
      data: {
        status: 'pending',
        scenarioId,
        fromPersonaId,
        toPersonaId,
        fromUserId: user.id,
        toUserId: targetPersona.user.id,
        message: note || null,
      },
    })

    // Assemble the scenario snapshot for the Blorp notification so the
    // notification center can render the full details without extra fetches.
    const initialMessages = parseJsonArray(scenario.initialMessages)
    const tags = parseJsonArray(scenario.tags)
    const notificationData = {
      requestId: scenarioRequest.id,
      status: 'pending',
      fromPersona: {
        id: myPersona.id,
        name: myPersona.name,
        avatarUrl: myPersona.avatarUrl || null,
      },
      fromUsername: myPersona.user.username,
      toPersona: {
        id: targetPersona.id,
        name: targetPersona.name,
        avatarUrl: targetPersona.avatarUrl || null,
      },
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description || null,
        category: scenario.category,
        mood: scenario.mood || null,
        location: scenario.location || null,
        tags: tags.slice(0, 6),
        imageUrl: scenario.imageUrl || null,
        bannerUrl: scenario.bannerUrl || null,
        openingMessage: initialMessages[0] || null,
      },
      message: note || null,
    }

    // Blorp notification to the persona's owner
    await createNotification({
      userId: targetPersona.user.id,
      type: 'scenario_request',
      title: 'Scenario request',
      message: `${myPersona.name} is asking trying to Start a scenario with you`,
      data: notificationData,
    }).catch((err) => console.error('[ScenarioRequest] notification failed:', err))

    return NextResponse.json({ success: true, request: scenarioRequest }, { status: 201 })
  } catch (error) {
    console.error('Create scenario request error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
