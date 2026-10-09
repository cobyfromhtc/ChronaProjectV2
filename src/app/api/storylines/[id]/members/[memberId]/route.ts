import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE - Kick a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, memberId: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { id, memberId } = await params
    
    // Check permissions
    const membership = await db.storylineMember.findFirst({
      where: { storylineId: id, userId: user.id },
      include: {
        customRole: {
          select: {
            canKickMembers: true,
            position: true,
          }
        }
      }
    })
    
    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }
    
    const canKickMembers = membership.role === 'owner' || 
      membership.role === 'admin' || 
      membership.customRole?.canKickMembers
    
    if (!canKickMembers) {
      return NextResponse.json({ error: 'Not authorized to kick' }, { status: 403 })
    }
    
    // Get target member
    const targetMember = await db.storylineMember.findUnique({
      where: { id: memberId },
      include: {
        customRole: {
          select: {
            position: true,
          }
        }
      }
    })
    
    if (!targetMember || targetMember.storylineId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    
    // Can't kick owners
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot kick the owner' }, { status: 403 })
    }
    
    // Can't kick someone with a higher role position
    const targetPosition = targetMember.customRole?.position ?? 0
    const myPosition = membership.customRole?.position ?? 0
    
    if (membership.role !== 'owner' && targetPosition >= myPosition) {
      return NextResponse.json({ error: 'Cannot kick someone with equal or higher role' }, { status: 403 })
    }
    
    // Remove the member
    await db.storylineMember.delete({
      where: { id: memberId }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Kick member error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH - Update a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, memberId: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { id, memberId } = await params
    const body = await request.json()
    const { role, customRoleId } = body
    
    // Check permissions
    const membership = await db.storylineMember.findFirst({
      where: { storylineId: id, userId: user.id }
    })
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    
    // Get target member
    const targetMember = await db.storylineMember.findUnique({
      where: { id: memberId }
    })
    
    if (!targetMember || targetMember.storylineId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify the owner' }, { status: 403 })
    }
    
    // Update the member
    const updateData: Record<string, unknown> = {}
    if (role) updateData.role = role
    if (customRoleId !== undefined) updateData.customRoleId = customRoleId || null
    
    await db.storylineMember.update({
      where: { id: memberId },
      data: updateData
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
