import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema for updating a persona with all fields
const updatePersonaSchema = z.object({
  // Overview
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters').optional(),
  avatarUrl: z.string().optional().nullable(),
  description: z.string().max(12000, 'Description must be at most 12000 characters').optional().nullable(),
  archetype: z.string().max(50).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  pronouns: z.string().max(50).optional().nullable(),
  age: z.number().int().min(0).max(9999).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  
  // Personality
  personalityDescription: z.string().max(12000).optional().nullable(),
  personalitySpectrums: z.object({
    introvertExtrovert: z.number().min(0).max(100),
    intuitiveObservant: z.number().min(0).max(100),
    thinkingFeeling: z.number().min(0).max(100),
    judgingProspecting: z.number().min(0).max(100),
    assertiveTurbulent: z.number().min(0).max(100),
  }).optional().nullable(),
  bigFive: z.object({
    openness: z.number().min(0).max(100),
    conscientiousness: z.number().min(0).max(100),
    extraversion: z.number().min(0).max(100),
    agreeableness: z.number().min(0).max(100),
    neuroticism: z.number().min(0).max(100),
  }).optional().nullable(),
  hexaco: z.object({
    honestyHumility: z.number().min(0).max(100),
    emotionality: z.number().min(0).max(100),
    extraversion: z.number().min(0).max(100),
    agreeableness: z.number().min(0).max(100),
    conscientiousness: z.number().min(0).max(100),
    opennessToExperience: z.number().min(0).max(100),
  }).optional().nullable(),
  strengths: z.array(z.string().max(100)).max(20).optional(),
  flaws: z.array(z.string().max(100)).max(20).optional(),
  values: z.array(z.string().max(100)).max(20).optional(),
  fears: z.array(z.string().max(100)).max(20).optional(),
  
  // Attributes
  species: z.string().max(100).optional().nullable(),
  likes: z.array(z.string().max(100)).max(30).optional(),
  dislikes: z.array(z.string().max(100)).max(30).optional(),
  hobbies: z.array(z.string().max(100)).max(20).optional(),
  skills: z.array(z.string().max(100)).max(20).optional(),
  languages: z.array(z.string().max(100)).max(10).optional(),
  habits: z.array(z.string().max(100)).max(20).optional(),
  speechPatterns: z.array(z.string().max(100)).max(20).optional(),
  
  // Backstory
  backstory: z.string().max(12000).optional().nullable(),
  appearance: z.string().max(12000).optional().nullable(),
  
  // MBTI
  mbtiType: z.string().max(10).optional().nullable(),
  
  // Profile Theme
  themeEnabled: z.boolean().optional(),
  
  // Roleplay Preferences
  rpStyle: z.string().max(50).optional().nullable(),
  rpPreferredGenders: z.array(z.string().max(50)).max(10).optional(),
  rpGenres: z.array(z.string().max(100)).max(20).optional(),
  rpLimits: z.array(z.string().max(100)).max(30).optional(),
  rpThemes: z.array(z.string().max(100)).max(30).optional(),
  rpExperienceLevel: z.string().max(50).optional().nullable(),
  rpResponseTime: z.string().max(50).optional().nullable(),
  
  // NSFW Content (18+)
  nsfwEnabled: z.boolean().optional(),
  nsfwBodyType: z.string().max(12000).optional().nullable(),
  nsfwKinks: z.array(z.string().max(100)).max(50).optional(),
  nsfwContentWarnings: z.array(z.string().max(100)).max(50).optional(),
  nsfwOrientation: z.string().max(50).optional().nullable(),
  nsfwRolePreference: z.string().max(50).optional().nullable(),
  
  // Connections - Extended with full persona-like fields
  connections: z.array(z.object({
    id: z.string().optional(),
    characterName: z.string().max(100),
    relationshipType: z.string().max(50),
    specificRole: z.string().max(100).optional().nullable(),
    characterAge: z.number().int().min(0).max(9999).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    // Extended fields
    avatarUrl: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    gender: z.string().max(50).optional().nullable(),
    pronouns: z.string().max(50).optional().nullable(),
    species: z.string().max(100).optional().nullable(),
    archetype: z.string().max(50).optional().nullable(),
    mbtiType: z.string().max(10).optional().nullable(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    personalityDescription: z.string().max(12000).optional().nullable(),
    personalitySpectrums: z.object({
      introvertExtrovert: z.number().min(0).max(100),
      intuitiveObservant: z.number().min(0).max(100),
      thinkingFeeling: z.number().min(0).max(100),
      judgingProspecting: z.number().min(0).max(100),
      assertiveTurbulent: z.number().min(0).max(100),
    }).optional().nullable(),
    bigFive: z.object({
      openness: z.number().min(0).max(100),
      conscientiousness: z.number().min(0).max(100),
      extraversion: z.number().min(0).max(100),
      agreeableness: z.number().min(0).max(100),
      neuroticism: z.number().min(0).max(100),
    }).optional().nullable(),
    hexaco: z.object({
      honestyHumility: z.number().min(0).max(100),
      emotionality: z.number().min(0).max(100),
      extraversion: z.number().min(0).max(100),
      agreeableness: z.number().min(0).max(100),
      conscientiousness: z.number().min(0).max(100),
      opennessToExperience: z.number().min(0).max(100),
    }).optional().nullable(),
    strengths: z.array(z.string().max(100)).max(20).optional(),
    flaws: z.array(z.string().max(100)).max(20).optional(),
    values: z.array(z.string().max(100)).max(20).optional(),
    fears: z.array(z.string().max(100)).max(20).optional(),
    likes: z.array(z.string().max(100)).max(30).optional(),
    dislikes: z.array(z.string().max(100)).max(30).optional(),
    hobbies: z.array(z.string().max(100)).max(20).optional(),
    skills: z.array(z.string().max(100)).max(20).optional(),
    languages: z.array(z.string().max(100)).max(10).optional(),
    habits: z.array(z.string().max(100)).max(20).optional(),
    speechPatterns: z.array(z.string().max(100)).max(20).optional(),
    backstory: z.string().max(12000).optional().nullable(),
    appearance: z.string().max(12000).optional().nullable(),
    rpStyle: z.string().max(50).optional().nullable(),
    rpPreferredGenders: z.array(z.string().max(50)).max(10).optional(),
    rpGenres: z.array(z.string().max(100)).max(20).optional(),
    rpLimits: z.array(z.string().max(100)).max(30).optional(),
    rpThemes: z.array(z.string().max(100)).max(30).optional(),
    rpExperienceLevel: z.string().max(50).optional().nullable(),
    rpResponseTime: z.string().max(50).optional().nullable(),
    nsfwEnabled: z.boolean().optional(),
    nsfwBodyType: z.string().max(12000).optional().nullable(),
    nsfwKinks: z.array(z.string().max(100)).max(50).optional(),
    nsfwContentWarnings: z.array(z.string().max(100)).max(50).optional(),
    nsfwOrientation: z.string().max(50).optional().nullable(),
    nsfwRolePreference: z.string().max(50).optional().nullable(),
  })).max(50).optional(),
})

// GET - Fetch a single persona
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    
    const persona = await db.persona.findFirst({
      where: { 
        id,
        userId: user.id 
      },
      include: {
        connections: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })
    
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      persona 
    })
    
  } catch (error) {
    console.error('Fetch persona error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// PUT - Update a persona
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    const body = await request.json()
    
    // Validate input
    const result = updatePersonaSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    
    const data = result.data
    
    // Check if persona belongs to user
    const existingPersona = await db.persona.findFirst({
      where: { 
        id,
        userId: user.id 
      },
    })
    
    if (!existingPersona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }
    
    // Build update data - only include fields that are present
    const updateData: Record<string, unknown> = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl
    if (data.description !== undefined) updateData.description = data.description
    if (data.archetype !== undefined) updateData.archetype = data.archetype
    if (data.gender !== undefined) updateData.gender = data.gender
    if (data.pronouns !== undefined) updateData.pronouns = data.pronouns
    if (data.age !== undefined) updateData.age = data.age
    if (data.tags !== undefined) updateData.tags = data.tags ? JSON.stringify(data.tags) : null
    if (data.personalityDescription !== undefined) updateData.personalityDescription = data.personalityDescription
    if (data.personalitySpectrums !== undefined) updateData.personalitySpectrums = data.personalitySpectrums ? JSON.stringify(data.personalitySpectrums) : null
    if (data.bigFive !== undefined) updateData.bigFive = data.bigFive ? JSON.stringify(data.bigFive) : null
    if (data.hexaco !== undefined) updateData.hexaco = data.hexaco ? JSON.stringify(data.hexaco) : null
    if (data.strengths !== undefined) updateData.strengths = data.strengths ? JSON.stringify(data.strengths) : null
    if (data.flaws !== undefined) updateData.flaws = data.flaws ? JSON.stringify(data.flaws) : null
    if (data.values !== undefined) updateData.values = data.values ? JSON.stringify(data.values) : null
    if (data.fears !== undefined) updateData.fears = data.fears ? JSON.stringify(data.fears) : null
    if (data.species !== undefined) updateData.species = data.species
    if (data.likes !== undefined) updateData.likes = data.likes ? JSON.stringify(data.likes) : null
    if (data.dislikes !== undefined) updateData.dislikes = data.dislikes ? JSON.stringify(data.dislikes) : null
    if (data.hobbies !== undefined) updateData.hobbies = data.hobbies ? JSON.stringify(data.hobbies) : null
    if (data.skills !== undefined) updateData.skills = data.skills ? JSON.stringify(data.skills) : null
    if (data.languages !== undefined) updateData.languages = data.languages ? JSON.stringify(data.languages) : null
    if (data.habits !== undefined) updateData.habits = data.habits ? JSON.stringify(data.habits) : null
    if (data.speechPatterns !== undefined) updateData.speechPatterns = data.speechPatterns ? JSON.stringify(data.speechPatterns) : null
    if (data.backstory !== undefined) updateData.backstory = data.backstory
    if (data.appearance !== undefined) updateData.appearance = data.appearance
    if (data.mbtiType !== undefined) updateData.mbtiType = data.mbtiType
    if (data.themeEnabled !== undefined) updateData.themeEnabled = data.themeEnabled
    if (data.rpStyle !== undefined) updateData.rpStyle = data.rpStyle
    if (data.rpPreferredGenders !== undefined) updateData.rpPreferredGenders = data.rpPreferredGenders ? JSON.stringify(data.rpPreferredGenders) : null
    if (data.rpGenres !== undefined) updateData.rpGenres = data.rpGenres ? JSON.stringify(data.rpGenres) : null
    if (data.rpLimits !== undefined) updateData.rpLimits = data.rpLimits ? JSON.stringify(data.rpLimits) : null
    if (data.rpThemes !== undefined) updateData.rpThemes = data.rpThemes ? JSON.stringify(data.rpThemes) : null
    if (data.rpExperienceLevel !== undefined) updateData.rpExperienceLevel = data.rpExperienceLevel
    if (data.rpResponseTime !== undefined) updateData.rpResponseTime = data.rpResponseTime
    // NSFW fields
    if (data.nsfwEnabled !== undefined) updateData.nsfwEnabled = data.nsfwEnabled
    if (data.nsfwBodyType !== undefined) updateData.nsfwBodyType = data.nsfwBodyType
    if (data.nsfwKinks !== undefined) updateData.nsfwKinks = data.nsfwKinks ? JSON.stringify(data.nsfwKinks) : null
    if (data.nsfwContentWarnings !== undefined) updateData.nsfwContentWarnings = data.nsfwContentWarnings ? JSON.stringify(data.nsfwContentWarnings) : null
    if (data.nsfwOrientation !== undefined) updateData.nsfwOrientation = data.nsfwOrientation
    if (data.nsfwRolePreference !== undefined) updateData.nsfwRolePreference = data.nsfwRolePreference
    
    // Update persona
    const persona = await db.persona.update({
      where: { id },
      data: updateData,
      include: {
        connections: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })
    
    // Update connections if provided
    if (data.connections !== undefined) {
      // Delete existing connections
      await db.personaConnection.deleteMany({
        where: { personaId: id }
      })
      
      // Create new connections with all extended fields
      if (data.connections && data.connections.length > 0) {
        await Promise.all(
          data.connections.map(conn => 
            db.personaConnection.create({
              data: {
                personaId: id,
                // Basic info
                characterName: conn.characterName,
                relationshipType: conn.relationshipType,
                specificRole: conn.specificRole || null,
                characterAge: conn.characterAge ?? null,
                description: conn.description || null,
                avatarUrl: conn.avatarUrl || null,
                bannerUrl: conn.bannerUrl || null,
                // Extended profile
                gender: conn.gender || null,
                pronouns: conn.pronouns || null,
                species: conn.species || null,
                archetype: conn.archetype || null,
                mbtiType: conn.mbtiType || null,
                tags: conn.tags ? JSON.stringify(conn.tags) : null,
                // Personality
                personalityDescription: conn.personalityDescription || null,
                personalitySpectrums: conn.personalitySpectrums ? JSON.stringify(conn.personalitySpectrums) : null,
                bigFive: conn.bigFive ? JSON.stringify(conn.bigFive) : null,
                hexaco: conn.hexaco ? JSON.stringify(conn.hexaco) : null,
                // Traits
                strengths: conn.strengths ? JSON.stringify(conn.strengths) : null,
                flaws: conn.flaws ? JSON.stringify(conn.flaws) : null,
                values: conn.values ? JSON.stringify(conn.values) : null,
                fears: conn.fears ? JSON.stringify(conn.fears) : null,
                // Attributes
                likes: conn.likes ? JSON.stringify(conn.likes) : null,
                dislikes: conn.dislikes ? JSON.stringify(conn.dislikes) : null,
                hobbies: conn.hobbies ? JSON.stringify(conn.hobbies) : null,
                skills: conn.skills ? JSON.stringify(conn.skills) : null,
                languages: conn.languages ? JSON.stringify(conn.languages) : null,
                habits: conn.habits ? JSON.stringify(conn.habits) : null,
                speechPatterns: conn.speechPatterns ? JSON.stringify(conn.speechPatterns) : null,
                // Background
                backstory: conn.backstory || null,
                appearance: conn.appearance || null,
                // RP Preferences
                rpStyle: conn.rpStyle || null,
                rpPreferredGenders: conn.rpPreferredGenders ? JSON.stringify(conn.rpPreferredGenders) : null,
                rpGenres: conn.rpGenres ? JSON.stringify(conn.rpGenres) : null,
                rpLimits: conn.rpLimits ? JSON.stringify(conn.rpLimits) : null,
                rpThemes: conn.rpThemes ? JSON.stringify(conn.rpThemes) : null,
                rpExperienceLevel: conn.rpExperienceLevel || null,
                rpResponseTime: conn.rpResponseTime || null,
                // NSFW
                nsfwEnabled: conn.nsfwEnabled ?? false,
                nsfwBodyType: conn.nsfwBodyType || null,
                nsfwKinks: conn.nsfwKinks ? JSON.stringify(conn.nsfwKinks) : null,
                nsfwContentWarnings: conn.nsfwContentWarnings ? JSON.stringify(conn.nsfwContentWarnings) : null,
                nsfwOrientation: conn.nsfwOrientation || null,
                nsfwRolePreference: conn.nsfwRolePreference || null,
              }
            })
          )
        )
      }
      
      // Re-fetch with updated connections
      const updatedPersona = await db.persona.findUnique({
        where: { id },
        include: {
          connections: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
      
      return NextResponse.json({ 
        success: true,
        persona: updatedPersona 
      })
    }
    
    return NextResponse.json({ 
      success: true,
      persona 
    })
    
  } catch (error) {
    console.error('Update persona error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a persona
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    
    // Check if persona belongs to user
    const existingPersona = await db.persona.findFirst({
      where: { 
        id,
        userId: user.id 
      },
    })
    
    if (!existingPersona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }
    
    // If this was the active persona, we need to activate another one
    if (existingPersona.isActive) {
      // Find another persona to make active
      const anotherPersona = await db.persona.findFirst({
        where: { 
          userId: user.id,
          id: { not: id }
        },
      })
      
      if (anotherPersona) {
        await db.persona.update({
          where: { id: anotherPersona.id },
          data: { isActive: true, isOnline: true },
        })
      }
    }
    
    // Delete persona (connections will be cascade deleted)
    await db.persona.delete({
      where: { id },
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Persona deleted' 
    })
    
  } catch (error) {
    console.error('Delete persona error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}