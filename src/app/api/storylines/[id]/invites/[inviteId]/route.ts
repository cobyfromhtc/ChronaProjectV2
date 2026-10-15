import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE - Revoke an invite (hard delete — the code becomes reusable)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id, inviteId } = await params

    // Check permissions (same rules as creating invites)
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
      return NextResponse.json({ error: 'Not authorized to revoke invites' }, { status: 403 })
    }

    // Find the invite and make sure it belongs to this storyline
    const invite = await db.storylineInvite.findUnique({
      where: { id: inviteId }
    })

    if (!invite || invite.storylineId !== id) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    await db.storylineInvite.delete({ where: { id: invite.id } })

    return NextResponse.json({ success: true, message: 'Invite revoked' })

  } catch (error) {
    console.error('Revoke invite error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
