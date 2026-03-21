import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { STORYLINE_CATEGORIES } from '@/lib/constants'

// GET - Browse public storylines
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    const where: Record<string, unknown> = { isPublic: true }
    
    if (category && STORYLINE_CATEGORIES.includes(category as typeof STORYLINE_CATEGORIES[number])) {
      where.category = category
    }
    
    let storylines = await db.storyline.findMany({
      where,
      include: {
        owner: {
          select: { id: true, username: true, avatarUrl: true }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    
    if (search && search.length >= 2) {
      const searchLower = search.toLowerCase()
      storylines = storylines.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        (s.description && s.description.toLowerCase().includes(searchLower))
      )
    }
    
    const joinedIds = await db.storylineMember.findMany({
      where: { userId: user.id },
      select: { storylineId: true }
    })
    const joinedSet = new Set(joinedIds.map(j => j.storylineId))
    
    const result = storylines.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      iconUrl: s.iconUrl,
      bannerUrl: s.bannerUrl,
      category: s.category,
      isPublic: s.isPublic,
      accentColor: s.accentColor,
      createdAt: s.createdAt,
      owner: s.owner,
      memberCount: s._count.members,
      isJoined: joinedSet.has(s.id)
    }))
    
    return NextResponse.json({ 
      success: true, 
      storylines: result,
      categories: STORYLINE_CATEGORIES
    })
    
  } catch (error) {
    console.error('Browse storylines error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST - Create a new storyline
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      name, 
      description, 
      lore,
      iconUrl, 
      bannerUrl, 
      category, 
      isPublic,
      accentColor,
      welcomeMessage,
      requireApproval,
      memberCap
    } = body
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    if (!category || !STORYLINE_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }
    
    // Create storyline
    const storyline = await db.storyline.create({
      data: {
        ownerId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        lore: lore?.trim() || null,
        iconUrl: iconUrl || null,
        bannerUrl: bannerUrl || null,
        category,
        isPublic: isPublic !== false,
        accentColor: accentColor || '#8b5cf6',
        welcomeMessage: welcomeMessage?.trim() || null,
        requireApproval: requireApproval || false,
        memberCap: memberCap || null
      }
    })
    
    // Create default "Owner" role
    const ownerRole = await db.storylineRole.create({
      data: {
        storylineId: storyline.id,
        name: 'Owner',
        color: '#fbbf24',
        position: 100,
        canManageChannels: true,
        canManageRoles: true,
        canKickMembers: true,
        canBanMembers: true,
        canManageMessages: true,
        canInvite: true,
        canChangeSettings: true,
        isAdmin: true
      }
    })
    
    // Create default "Admin" role
    await db.storylineRole.create({
      data: {
        storylineId: storyline.id,
        name: 'Admin',
        color: '#ef4444',
        position: 50,
        canManageChannels: true,
        canManageRoles: false,
        canKickMembers: true,
        canBanMembers: true,
        canManageMessages: true,
        canInvite: true,
        canChangeSettings: false,
        isAdmin: true
      }
    })
    
    // Create default "Member" role
    await db.storylineRole.create({
      data: {
        storylineId: storyline.id,
        name: 'Member',
        color: '#8b5cf6',
        position: 0,
        canManageChannels: false,
        canManageRoles: false,
        canKickMembers: false,
        canBanMembers: false,
        canManageMessages: false,
        canInvite: true,
        canChangeSettings: false,
        isAdmin: false
      }
    })
    
    // Create default categories
    const generalCategory = await db.storylineCategory.create({
      data: {
        storylineId: storyline.id,
        name: 'Story',
        position: 0
      }
    })
    
    const oocCategory = await db.storylineCategory.create({
      data: {
        storylineId: storyline.id,
        name: 'Out of Character',
        position: 1
      }
    })
    
    // Create default channels
    await db.storylineChannel.createMany({
      data: [
        { 
          storylineId: storyline.id, 
          categoryId: generalCategory.id,
          name: 'general', 
          type: 'text', 
          position: 0,
          topic: 'General discussion'
        },
        { 
          storylineId: storyline.id, 
          categoryId: oocCategory.id,
          name: 'ooc', 
          type: 'text', 
          position: 0,
          topic: 'Out-of-character chat'
        }
      ]
    })
    
    // Add owner as member
    await db.storylineMember.create({
      data: {
        storylineId: storyline.id,
        userId: user.id,
        role: 'owner',
        roleId: ownerRole.id
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      storyline,
      message: 'Storyline created successfully' 
    })
    
  } catch (error) {
    console.error('Create storyline error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
