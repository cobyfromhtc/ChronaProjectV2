import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { formatSifyCode, isSifyInviteActive, parseSifyCode } from '@/lib/invites'

interface InviteRecord {
  id: string
  storylineId: string
  code: string
  maxUses: number | null
  uses: number | null
  expiresAt: string | Date | null
  storyline?: any
}

type InviteResolution =
  | { kind: 'invalid' }
  | { kind: 'expired' }
  | { kind: 'exhausted' }
  | { kind: 'active'; invite: InviteRecord }

/**
 * Resolve a join input ("SI.FY://abcdefg", "SI.FY/abcdefg", "si.fy://Abc234",
 * or a bare code) to the single ACTIVE invite with that code.
 *
 * Codes are unique among ACTIVE invites, but expired/exhausted invites may
 * share the code — so all matches are fetched and only the active one wins.
 */
async function resolveInvite(rawCode: string, include?: Record<string, unknown>): Promise<InviteResolution> {
  // Next.js already decodes the path param once; decode again defensively
  // (in case of double-encoded prefixes like "SI.FY%3A%2F%2F...")
  let raw = rawCode || ''
  try {
    raw = decodeURIComponent(raw)
  } catch {
    // Malformed escape sequence — fall through, parse will reject it
  }
  const code = parseSifyCode(raw)
  if (!code) return { kind: 'invalid' }

  const matches = await db.storylineInvite.findMany({
    where: { code },
    include: include as any,
  })

  const records = matches as InviteRecord[]
  if (records.length === 0) return { kind: 'invalid' }

  const now = new Date()
  const active = records.find((inv) => isSifyInviteActive(inv, now))
  if (active) return { kind: 'active', invite: active }

  // No active invite with this code — report why
  const notExpired = records.filter(
    (inv) => !(inv.expiresAt && new Date(inv.expiresAt).getTime() <= now.getTime())
  )
  return notExpired.length > 0 ? { kind: 'exhausted' } : { kind: 'expired' }
}

// GET - Get invite info (preview before joining)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const resolution = await resolveInvite(code, {
      storyline: {
        include: {
          owner: { select: { username: true, avatarUrl: true } },
          _count: { select: { members: true } }
        }
      }
    })

    if (resolution.kind === 'invalid') {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }
    if (resolution.kind === 'expired') {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
    }
    if (resolution.kind === 'exhausted') {
      return NextResponse.json({ error: 'This invite has reached its maximum uses' }, { status: 410 })
    }

    const invite = resolution.invite
    return NextResponse.json({
      success: true,
      invite: {
        code: invite.code,
        displayCode: formatSifyCode(invite.code),
        storyline: {
          id: invite.storyline.id,
          name: invite.storyline.name,
          description: invite.storyline.description,
          iconUrl: invite.storyline.iconUrl,
          bannerUrl: invite.storyline.bannerUrl,
          category: invite.storyline.category,
          memberCount: invite.storyline._count.members,
          memberCap: invite.storyline.memberCap,
          requireApproval: invite.storyline.requireApproval,
          owner: invite.storyline.owner
        }
      }
    })

  } catch (error) {
    console.error('Get invite error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Join storyline via invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { code } = await params

    const resolution = await resolveInvite(code, { storyline: true })

    if (resolution.kind === 'invalid') {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }
    if (resolution.kind === 'expired') {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
    }
    if (resolution.kind === 'exhausted') {
      return NextResponse.json({ error: 'This invite has reached its maximum uses' }, { status: 410 })
    }

    const invite = resolution.invite

    // Check if already a member
    const existingMember = await db.storylineMember.findFirst({
      where: { storylineId: invite.storylineId, userId: user.id }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this storyline', storylineId: invite.storylineId }, { status: 409 })
    }

    // Check if banned
    const ban = await db.storylineBan.findUnique({
      where: { storylineId_userId: { storylineId: invite.storylineId, userId: user.id } }
    })

    if (ban) {
      return NextResponse.json({ error: 'You are banned from this storyline' }, { status: 403 })
    }

    // Check member cap
    if (invite.storyline.memberCap) {
      const memberCount = await db.storylineMember.count({
        where: { storylineId: invite.storylineId }
      })
      if (memberCount >= invite.storyline.memberCap) {
        return NextResponse.json({ error: 'This storyline has reached its member limit' }, { status: 400 })
      }
    }

    // Check if requires approval
    if (invite.storyline.requireApproval) {
      // For now, just reject - in future, create a join request
      return NextResponse.json({ error: 'This storyline requires approval to join. Contact the owner.' }, { status: 400 })
    }

    // Get the default member role
    const memberRole = await db.storylineRole.findFirst({
      where: { storylineId: invite.storylineId, name: 'Member' }
    })

    // Join the storyline
    await db.storylineMember.create({
      data: {
        storylineId: invite.storylineId,
        userId: user.id,
        role: 'member',
        roleId: memberRole?.id
      }
    })

    // Increment invite uses
    await db.storylineInvite.update({
      where: { id: invite.id },
      data: { uses: (invite.uses ?? 0) + 1 }
    })

    return NextResponse.json({
      success: true,
      storylineId: invite.storylineId,
      message: 'Successfully joined!'
    })

  } catch (error) {
    console.error('Join storyline error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
