import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  SIFY_CODE_LENGTH,
  formatSifyCode,
  generateSifyCode,
  getSifyInviteStatus,
  isSifyInviteActive,
  type SifyInviteStatus,
} from '@/lib/invites'

// Default invite lifetime: 7 days (in hours)
const DEFAULT_EXPIRY_HOURS = 24 * 7
// How many fresh codes to try before giving up on global uniqueness
const CODE_GENERATION_ATTEMPTS = 10

interface InviteRecord {
  id: string
  storylineId: string
  code: string
  createdById: string
  maxUses: number | null
  uses: number | null
  expiresAt: string | Date | null
  createdAt: string | Date
}

/** Serialize an invite with SI.FY display fields + computed status. */
function serializeInvite(invite: InviteRecord) {
  const status: SifyInviteStatus = getSifyInviteStatus(invite)
  return {
    ...invite,
    maxUses: invite.maxUses ?? 0,
    uses: invite.uses ?? 0,
    displayCode: formatSifyCode(invite.code),
    url: formatSifyCode(invite.code),
    status,
  }
}

/**
 * A code is available only when NO other invite anywhere is still active
 * with that code (not expired AND not exhausted). Expired/exhausted
 * invites release their code for reuse.
 */
async function isCodeAvailable(code: string): Promise<boolean> {
  const now = new Date()
  const candidates = await db.storylineInvite.findMany({
    where: {
      code,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
  })
  // Exhaustion can't be expressed as a PocketBase filter (field-to-field
  // comparison), so it is checked here on the (tiny) candidate set.
  return !candidates.some((inv: InviteRecord) => isSifyInviteActive(inv, now))
}

/** Generate a globally-unique code among ACTIVE invites, retrying up to 10 times. */
async function generateUniqueCode(): Promise<string | null> {
  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateSifyCode(SIFY_CODE_LENGTH)
    if (await isCodeAvailable(candidate)) return candidate
  }
  return null
}

// GET - Get all invites for storyline (with computed status)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Check membership
    const membership = await db.storylineMember.findFirst({
      where: { storylineId: id, userId: user.id }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const invites = await db.storylineInvite.findMany({
      where: { storylineId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      invites: (invites as InviteRecord[]).map(serializeInvite)
    })

  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Create a new invite (SI.FY://XXXXXXX)
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

    let body: { maxUses?: unknown; expiresIn?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      // No body / invalid JSON — defaults apply (sidebar context menu sends `{}`)
    }

    // Check permissions
    const membership = await db.storylineMember.findFirst({
      where: { storylineId: id, userId: user.id },
      include: {
        customRole: {
          select: {
            canInvite: true,
          }
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const canInvite = membership.role === 'owner' ||
      membership.role === 'admin' ||
      membership.customRole?.canInvite

    if (!canInvite) {
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 })
    }

    // Check if storyline requires approval and member cap
    const storyline = await db.storyline.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } }
    })

    if (!storyline) {
      return NextResponse.json({ error: 'Storyline not found' }, { status: 404 })
    }

    if (storyline.memberCap && storyline._count.members >= storyline.memberCap) {
      return NextResponse.json({ error: 'Member cap reached' }, { status: 400 })
    }

    // maxUses: 0 (or null/absent) = unlimited uses
    const rawMaxUses = Number(body.maxUses)
    const maxUses = Number.isFinite(rawMaxUses) && rawMaxUses > 0 ? Math.floor(rawMaxUses) : 0

    // expiresIn: hours until expiry.
    //   > 0       → custom expiry
    //   0         → never expires
    //   null/absent → default (7 days)
    let expiresAt: Date | null
    const rawExpiresIn = Number(body.expiresIn)
    if (rawExpiresIn === 0) {
      expiresAt = null
    } else if (Number.isFinite(rawExpiresIn) && rawExpiresIn > 0) {
      expiresAt = new Date(Date.now() + rawExpiresIn * 60 * 60 * 1000)
    } else {
      expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000)
    }

    // Generate a crypto-random 7-char code from the unambiguous alphabet,
    // globally unique among ACTIVE invites (retry up to 10 times).
    const code = await generateUniqueCode()
    if (!code) {
      return NextResponse.json(
        { error: 'Could not generate a unique invite code. Please try again.' },
        { status: 500 }
      )
    }

    const invite = await db.storylineInvite.create({
      data: {
        storylineId: id,
        code,
        createdById: user.id,
        maxUses,
        uses: 0,
        expiresAt
      }
    })

    return NextResponse.json({ success: true, invite: serializeInvite(invite as InviteRecord) })

  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
