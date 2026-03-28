import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { BLORP_USER_ID } from '@/lib/blorp'

// MBTI to approximate HEXACO/Big Five mappings for search sync
const MBTI_TO_TRAITS: Record<string, { hexaco: string[]; bigFive: string[] }> = {
  'INTJ': { hexaco: ['analytical', 'strategic', 'independent'], bigFive: ['high openness', 'low extraversion', 'high conscientiousness'] },
  'INTP': { hexaco: ['analytical', 'curious', 'logical'], bigFive: ['high openness', 'low extraversion', 'low conscientiousness'] },
  'ENTJ': { hexaco: ['assertive', 'strategic', 'leader'], bigFive: ['high extraversion', 'high conscientiousness', 'low agreeableness'] },
  'ENTP': { hexaco: ['innovative', 'debater', 'quick-thinking'], bigFive: ['high openness', 'high extraversion', 'low conscientiousness'] },
  'INFJ': { hexaco: ['insightful', 'empathetic', 'principled'], bigFive: ['high openness', 'high agreeableness', 'low extraversion'] },
  'INFP': { hexaco: ['creative', 'empathetic', 'idealistic'], bigFive: ['high openness', 'high agreeableness', 'low extraversion'] },
  'ENFJ': { hexaco: ['charismatic', 'empathetic', 'leader'], bigFive: ['high extraversion', 'high agreeableness', 'high conscientiousness'] },
  'ENFP': { hexaco: ['enthusiastic', 'creative', 'empathetic'], bigFive: ['high openness', 'high extraversion', 'high agreeableness'] },
  'ISTJ': { hexaco: ['reliable', 'organized', 'practical'], bigFive: ['high conscientiousness', 'low openness', 'low extraversion'] },
  'ISFJ': { hexaco: ['supportive', 'reliable', 'empathetic'], bigFive: ['high agreeableness', 'high conscientiousness', 'low extraversion'] },
  'ESTJ': { hexaco: ['organized', 'assertive', 'practical'], bigFive: ['high extraversion', 'high conscientiousness', 'low openness'] },
  'ESFJ': { hexaco: ['supportive', 'social', 'organized'], bigFive: ['high extraversion', 'high agreeableness', 'high conscientiousness'] },
  'ISTP': { hexaco: ['practical', 'analytical', 'independent'], bigFive: ['low extraversion', 'low agreeableness', 'low conscientiousness'] },
  'ISFP': { hexaco: ['artistic', 'sensitive', 'flexible'], bigFive: ['high openness', 'high agreeableness', 'low extraversion'] },
  'ESTP': { hexaco: ['action-oriented', 'practical', 'bold'], bigFive: ['high extraversion', 'low conscientiousness', 'low agreeableness'] },
  'ESFP': { hexaco: ['entertaining', 'social', 'spontaneous'], bigFive: ['high extraversion', 'high agreeableness', 'low conscientiousness'] },
}

// GET - Fetch personas for discovery with advanced search
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'new'
    const showOffline = searchParams.get('showOffline') === 'true'
    
    // Advanced search parameters
    const searchQuery = searchParams.get('q') || ''
    const searchIn = searchParams.get('searchIn')?.split(',') || ['all'] // all, name, tags, backstory, attributes
    const mbtiTypes = searchParams.get('mbti')?.split(',').filter(Boolean) || []
    const gender = searchParams.get('gender')?.split(',').filter(Boolean) || []
    const ageMin = searchParams.get('ageMin') ? parseInt(searchParams.get('ageMin')!) : null
    const ageMax = searchParams.get('ageMax') ? parseInt(searchParams.get('ageMax')!) : null
    const species = searchParams.get('species')?.split(',').filter(Boolean) || []
    const archetypes = searchParams.get('archetype')?.split(',').filter(Boolean) || []
    const tagsFilter = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const attributesFilter = searchParams.get('attributes')?.split(',').filter(Boolean) || [] // strengths, flaws, values, fears
    const likesFilter = searchParams.get('likes')?.split(',').filter(Boolean) || []
    const hobbiesFilter = searchParams.get('hobbies')?.split(',').filter(Boolean) || []
    const skillsFilter = searchParams.get('skills')?.split(',').filter(Boolean) || []
    const syncPersonality = searchParams.get('syncPersonality') === 'true' // Sync MBTI with HEXACO/Big Five
    
    // Get current user's active persona to exclude from results
    const currentUserPersonas = await db.persona.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const currentUserPersonaIds = currentUserPersonas.map(p => p.id)
    
    // Define the select object for all persona fields
    const personaSelect = {
      id: true,
      userId: true,
      name: true,
      avatarUrl: true,
      bannerUrl: true,
      description: true,
      archetype: true,
      gender: true,
      age: true,
      tags: true,
      personalityDescription: true,
      personalitySpectrums: true,
      bigFive: true,
      hexaco: true,
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
    
    // Base condition: exclude current user's personas AND Blorp's personas
    const baseCondition: any = {
      id: { notIn: currentUserPersonaIds },
      userId: { not: BLORP_USER_ID }, // Exclude Blorp from discovery
    }
    
    // Only filter by online status if showOffline is false
    if (!showOffline) {
      baseCondition.isOnline = true
    }
    
    // Build search conditions
    const buildSearchConditions = () => {
      const conditions: any[] = []
      
      // General search query
      if (searchQuery) {
        const searchFields = searchIn.includes('all') 
          ? ['name', 'tags', 'backstory', 'description', 'strengths', 'flaws', 'values', 'fears', 'likes', 'hobbies', 'skills', 'personalityDescription', 'username']
          : searchIn
        
        const searchCondition = searchFields.map(field => {
          switch (field) {
            case 'name':
              return { name: { contains: searchQuery } }
            case 'tags':
              return { tags: { contains: searchQuery } }
            case 'backstory':
              return { backstory: { contains: searchQuery } }
            case 'description':
              return { description: { contains: searchQuery } }
            case 'personalityDescription':
              return { personalityDescription: { contains: searchQuery } }
            case 'strengths':
              return { strengths: { contains: searchQuery } }
            case 'flaws':
              return { flaws: { contains: searchQuery } }
            case 'values':
              return { values: { contains: searchQuery } }
            case 'fears':
              return { fears: { contains: searchQuery } }
            case 'likes':
              return { likes: { contains: searchQuery } }
            case 'hobbies':
              return { hobbies: { contains: searchQuery } }
            case 'skills':
              return { skills: { contains: searchQuery } }
            case 'appearance':
              return { appearance: { contains: searchQuery } }
            case 'username':
              // Search by owner's username - need to join with user table
              return { user: { username: { contains: searchQuery } } }
            default:
              return null
          }
        }).filter(Boolean)
        
        if (searchCondition.length > 0) {
          conditions.push({ OR: searchCondition })
        }
      }
      
      // MBTI filter with personality sync
      if (mbtiTypes.length > 0) {
        const mbtiCondition: any = {
          OR: mbtiTypes.map(type => ({ mbtiType: type }))
        }
        
        // If sync is enabled, also search for matching personality traits in HEXACO/Big Five descriptions
        if (syncPersonality) {
          const traitKeywords = new Set<string>()
          mbtiTypes.forEach(type => {
            const traits = MBTI_TO_TRAITS[type]
            if (traits) {
              traits.hexaco.forEach(t => traitKeywords.add(t))
              traits.bigFive.forEach(t => traitKeywords.add(t))
            }
          })
          
          // Add personality description search for matching traits
          if (traitKeywords.size > 0) {
            const personalitySearch = Array.from(traitKeywords).map(keyword => ({
              personalityDescription: { contains: keyword }
            }))
            mbtiCondition.OR.push(...personalitySearch)
          }
        }
        
        conditions.push(mbtiCondition)
      }
      
      // Gender filter
      if (gender.length > 0) {
        conditions.push({
          OR: gender.map(g => ({ gender: { equals: g } }))
        })
      }
      
      // Age range filter
      if (ageMin !== null || ageMax !== null) {
        const ageCondition: any = {}
        if (ageMin !== null) ageCondition.gte = ageMin
        if (ageMax !== null) ageCondition.lte = ageMax
        conditions.push({ age: ageCondition })
      }
      
      // Species filter
      if (species.length > 0) {
        conditions.push({
          OR: species.map(s => ({ species: { contains: s } }))
        })
      }
      
      // Archetype filter
      if (archetypes.length > 0) {
        conditions.push({
          OR: archetypes.map(a => ({ archetype: { equals: a } }))
        })
      }
      
      // Tags filter (must contain ANY of the specified tags)
      if (tagsFilter.length > 0) {
        conditions.push({
          OR: tagsFilter.map(tag => ({ tags: { contains: tag } }))
        })
      }
      
      // Attributes filter (strengths, flaws, values, fears)
      if (attributesFilter.length > 0) {
        conditions.push({
          OR: [
            ...attributesFilter.map(attr => ({ strengths: { contains: attr } })),
            ...attributesFilter.map(attr => ({ flaws: { contains: attr } })),
            ...attributesFilter.map(attr => ({ values: { contains: attr } })),
            ...attributesFilter.map(attr => ({ fears: { contains: attr } }))
          ]
        })
      }
      
      // Likes filter
      if (likesFilter.length > 0) {
        conditions.push({
          OR: likesFilter.map(like => ({ likes: { contains: like } }))
        })
      }
      
      // Hobbies filter
      if (hobbiesFilter.length > 0) {
        conditions.push({
          OR: hobbiesFilter.map(hobby => ({ hobbies: { contains: hobby } }))
        })
      }
      
      // Skills filter
      if (skillsFilter.length > 0) {
        conditions.push({
          OR: skillsFilter.map(skill => ({ skills: { contains: skill } }))
        })
      }
      
      return conditions
    }
    
    const searchConditions = buildSearchConditions()
    
    // Combine base condition with search conditions
    const whereCondition = searchConditions.length > 0
      ? { ...baseCondition, AND: searchConditions }
      : baseCondition
    
    if (filter === 'following') {
      // Get personas of users that current user follows
      const follows = await db.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true }
      })
      const followingIds = follows.map(f => f.followingId)
      
      personas = await db.persona.findMany({
        where: {
          ...whereCondition,
          userId: { in: followingIds },
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
          ...whereCondition,
          userId: { in: followerIds },
        },
        select: personaSelect,
        orderBy: { updatedAt: 'desc' },
        take: 50,
      })
    } else {
      // 'new' - Get all personas sorted by newest
      personas = await db.persona.findMany({
        where: whereCondition,
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
      bannerUrl: p.bannerUrl,
      bio: p.description,
      username: p.user?.username || 'Unknown',
      userId: p.userId,
      isOnline: p.isOnline,
      // Extended fields
      archetype: p.archetype,
      gender: p.gender,
      age: p.age,
      tags: p.tags ? JSON.parse(p.tags) : [],
      personalityDescription: p.personalityDescription,
      personalitySpectrums: p.personalitySpectrums ? JSON.parse(p.personalitySpectrums) : null,
      bigFive: p.bigFive ? JSON.parse(p.bigFive) : null,
      hexaco: p.hexaco ? JSON.parse(p.hexaco) : null,
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
      personas: result,
      searchMeta: {
        query: searchQuery,
        filters: {
          mbti: mbtiTypes,
          gender,
          ageRange: { min: ageMin, max: ageMax },
          species,
          archetypes,
          tags: tagsFilter,
          attributes: attributesFilter,
          likes: likesFilter,
          hobbies: hobbiesFilter,
          skills: skillsFilter,
          syncPersonality
        },
        resultCount: result.length
      }
    })
    
  } catch (error) {
    console.error('Discovery error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
