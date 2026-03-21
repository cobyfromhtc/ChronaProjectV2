import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Fetch online personas for discovery
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'new'
    
    // Get current user's active persona to exclude from results
    const currentUserPersonas = await db.persona.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const currentUserPersonaIds = currentUserPersonas.map(p => p.id)
    
    // Define the select object for all persona fields
    const personaSelect = {
      id: true,
      name: true,
      avatarUrl: true,
      description: true,
      archetype: true,
      gender: true,
      age: true,
      tags: true,
      personalityDescription: true,
      personalitySpectrums: true,
      strengths: true,
      flaws: true,
      values: true,
      fears: true,
      species: true,
      likes: true,
      dislikes: true,
      hobbies: true,
      skills: true,
      languages: true,
      habits: true,
      speechPatterns: true,
      backstory: true,
      appearance: true,
      mbtiType: true,
      isOnline: true,
      user: {
        select: { username: true }
      },
      connections: {
        select: {
          id: true,
          characterName: true,
          relationshipType: true,
          specificRole: true,
          characterAge: true,
          description: true
        }
      }
    }
    
    let personas: any[] = []
    
    if (filter === 'following') {
      // Get personas of users that current user follows
      const follows = await db.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true }
      })
      const followingIds = follows.map(f => f.followingId)
      
      personas = await db.persona.findMany({
        where: {
          userId: { in: followingIds },
          id: { notIn: currentUserPersonaIds },
          isOnline: true,
        },
        select: personaSelect,
        orderBy: { updatedAt: 'desc' },
        take: 50,
      })
    } else if (filter === 'followers') {
      // Get personas of users that follow current user
      const followers = await db.follow.findMany({
        where: { followingId: user.id },
        select: { followerId: true }
      })
      const followerIds = followers.map(f => f.followerId)
      
      personas = await db.persona.findMany({
        where: {
          userId: { in: followerIds },
          id: { notIn: currentUserPersonaIds },
          isOnline: true,
        },
        select: personaSelect,
        orderBy: { updatedAt: 'desc' },
        take: 50,
      })
    } else {
      // 'new' - Get all online personas sorted by newest
      personas = await db.persona.findMany({
        where: {
          id: { notIn: currentUserPersonaIds },
          isOnline: true,
        },
        select: personaSelect,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    }
    
    // Transform data for frontend - parse JSON fields
    const result = personas.map(p => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      bio: p.description,
      username: p.user.username,
      isOnline: p.isOnline,
      // Extended fields
      archetype: p.archetype,
      gender: p.gender,
      age: p.age,
      tags: p.tags ? JSON.parse(p.tags) : [],
      personalityDescription: p.personalityDescription,
      personalitySpectrums: p.personalitySpectrums ? JSON.parse(p.personalitySpectrums) : null,
      strengths: p.strengths ? JSON.parse(p.strengths) : [],
      flaws: p.flaws ? JSON.parse(p.flaws) : [],
      values: p.values ? JSON.parse(p.values) : [],
      fears: p.fears ? JSON.parse(p.fears) : [],
      species: p.species,
      likes: p.likes ? JSON.parse(p.likes) : [],
      dislikes: p.dislikes ? JSON.parse(p.dislikes) : [],
      hobbies: p.hobbies ? JSON.parse(p.hobbies) : [],
      skills: p.skills ? JSON.parse(p.skills) : [],
      languages: p.languages ? JSON.parse(p.languages) : [],
      habits: p.habits ? JSON.parse(p.habits) : [],
      speechPatterns: p.speechPatterns ? JSON.parse(p.speechPatterns) : [],
      backstory: p.backstory,
      appearance: p.appearance,
      mbtiType: p.mbtiType,
      // Connections
      connections: p.connections || []
    }))
    
    return NextResponse.json({ 
      success: true,
      personas: result 
    })
    
  } catch (error) {
    console.error('Discovery error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}