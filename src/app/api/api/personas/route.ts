import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { serializeBigInt } from '@/lib/bigint-serializer'

// Personas API - Full CRUD for character personas with all fields
// Last updated: 2024

// Schema for creating a persona with all fields
const createPersonaSchema = z.object({
  // Overview
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  avatarUrl: z.string().optional().nullable(),
  bannerUrl: z.string().optional().nullable(),
  title: z.array(z.string().max(100)).max(10).optional(), // Custom archetypes as array
  description: z.string().max(12000, 'Description must be at most 12000 characters').optional().nullable(),
  archetype: z.string().max(50).optional().nullable(),
  secondaryArchetype: z.string().max(50).optional().nullable(), // Dual archetype system
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

// GET - Fetch all personas for current user
export async function GET(request: Request) {
  try {
    const user = await getSessionFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Fetch personas
    const personas = await db.persona.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    // Fix: Ensure only ONE persona is active (in case of data inconsistency)
    const activePersonas = personas.filter(p => p.isActive)
    if (activePersonas.length > 1) {
      // Keep only the most recently active one active
      const mostRecentActive = activePersonas[0]
      await db.persona.updateMany({
        where: {
          userId: user.id,
          id: { not: mostRecentActive.id },
          isActive: true
        },
        data: { isActive: false, isOnline: false }
      })
      // Re-fetch after fix
      const fixedPersonas = await db.persona.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
      
      const personasWithConnections = await Promise.all(
        fixedPersonas.map(async (persona) => {
          const connections = await db.personaConnection.findMany({
            where: { personaId: persona.id },
            orderBy: { createdAt: 'asc' }
          })
          return serializeBigInt({ ...persona, connections })
        })
      )
      
      return NextResponse.json({ 
        success: true,
        personas: personasWithConnections 
      })
    }
    
    // Fetch connections for each persona
    const personasWithConnections = await Promise.all(
      personas.map(async (persona) => {
        const connections = await db.personaConnection.findMany({
          where: { personaId: persona.id },
          orderBy: { createdAt: 'asc' }
        })
        return serializeBigInt({ ...persona, connections })
      })
    )
    
    return NextResponse.json({ 
      success: true,
      personas: personasWithConnections 
    })
    
  } catch (error) {
    console.error('Fetch personas error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// POST - Create a new persona
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // Validate input
    const result = createPersonaSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    
    const data = result.data
    
    // Check slot limits (25 free + purchased slots)
    const FREE_SLOTS = 25
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: { purchasedSlots: true }
    })
    
    const existingPersonas = await db.persona.count({
      where: { userId: user.id }
    })
    
    const totalSlots = FREE_SLOTS + (userData?.purchasedSlots || 0)
    
    if (existingPersonas >= totalSlots) {
      return NextResponse.json(
        { 
          error: 'No available persona slots. Purchase more slots in the Chronos wallet.',
          code: 'NO_SLOTS',
          currentSlots: existingPersonas,
          totalSlots,
        },
        { status: 400 }
      )
    }
    
    // If this is the first persona, make it active by default
    const isActive = existingPersonas === 0
    
    // Generate a unique display ID (15-digit number like 123456789101112)
    const generateDisplayId = (): bigint => {
      const timestamp = Date.now() // 13 digits
      const random = Math.floor(Math.random() * 1000) // 3 digits
      return BigInt(`${timestamp}${random.toString().padStart(3, '0')}`)
    }
    
    // Create persona with all fields
    const persona = await db.persona.create({
      data: {
        userId: user.id,
        displayId: generateDisplayId(),
        originalCreatorId: user.id, // Track original creator
        name: data.name,
        avatarUrl: data.avatarUrl || null,
        bannerUrl: data.bannerUrl || null,
        title: data.title ? JSON.stringify(data.title) : null,
        description: data.description || null,
        archetype: data.archetype || null,
        secondaryArchetype: data.secondaryArchetype || null,
        gender: data.gender || null,
        pronouns: data.pronouns || null,
        age: data.age ?? null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        personalityDescription: data.personalityDescription || null,
        personalitySpectrums: data.personalitySpectrums ? JSON.stringify(data.personalitySpectrums) : null,
        bigFive: data.bigFive ? JSON.stringify(data.bigFive) : null,
        hexaco: data.hexaco ? JSON.stringify(data.hexaco) : null,
        strengths: data.strengths ? JSON.stringify(data.strengths) : null,
        flaws: data.flaws ? JSON.stringify(data.flaws) : null,
        values: data.values ? JSON.stringify(data.values) : null,
        fears: data.fears ? JSON.stringify(data.fears) : null,
        species: data.species || null,
        likes: data.likes ? JSON.stringify(data.likes) : null,
        dislikes: data.dislikes ? JSON.stringify(data.dislikes) : null,
        hobbies: data.hobbies ? JSON.stringify(data.hobbies) : null,
        skills: data.skills ? JSON.stringify(data.skills) : null,
        languages: data.languages ? JSON.stringify(data.languages) : null,
        habits: data.habits ? JSON.stringify(data.habits) : null,
        speechPatterns: data.speechPatterns ? JSON.stringify(data.speechPatterns) : null,
        backstory: data.backstory || null,
        appearance: data.appearance || null,
        mbtiType: data.mbtiType || null,
        themeEnabled: data.themeEnabled ?? false,
        rpStyle: data.rpStyle || null,
        rpPreferredGenders: data.rpPreferredGenders ? JSON.stringify(data.rpPreferredGenders) : null,
        rpGenres: data.rpGenres ? JSON.stringify(data.rpGenres) : null,
        rpLimits: data.rpLimits ? JSON.stringify(data.rpLimits) : null,
        rpThemes: data.rpThemes ? JSON.stringify(data.rpThemes) : null,
        rpExperienceLevel: data.rpExperienceLevel || null,
        rpResponseTime: data.rpResponseTime || null,
        // NSFW fields
        nsfwEnabled: data.nsfwEnabled ?? false,
        nsfwBodyType: data.nsfwBodyType || null,
        nsfwKinks: data.nsfwKinks ? JSON.stringify(data.nsfwKinks) : null,
        nsfwContentWarnings: data.nsfwContentWarnings ? JSON.stringify(data.nsfwContentWarnings) : null,
        nsfwOrientation: data.nsfwOrientation || null,
        nsfwRolePreference: data.nsfwRolePreference || null,
        isActive,
        isOnline: isActive,
      }
    })
    
    // Create connections if provided - with all extended fields
    let connections: any[] = []
    if (data.connections && data.connections.length > 0) {
      const createdConnections = await Promise.all(
        data.connections.map(conn => 
          db.personaConnection.create({
            data: {
              personaId: persona.id,
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
      connections = createdConnections
    }
    
    // Serialize BigInt values for JSON
    return NextResponse.json({ 
      success: true,
      persona: serializeBigInt({ ...persona, connections })
    })
    
  } catch (error) {
    console.error('Create persona error:', error)
    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Something went wrong'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { error: errorMessage, details: errorStack },
      { status: 500 }
    )
  }
}