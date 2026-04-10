import { NextRequest, NextResponse } from 'next/server'
import { getSessionWithFreshRoleFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/roles'

// Valid custom tag styles
const VALID_STYLES = [
  'glossy',    // Shiny, reflective appearance
  'radiant',   // Glowing, vibrant appearance  
  'shadowy',   // Dark, mysterious appearance
  'shiny',     // Bright, sparkling effect
  'neon',      // Neon glow effect
  'fire',      // Fiery, burning effect
  'ice',       // Icy, frozen effect
  'electric',  // Electric, shocking effect
]

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getSessionWithFreshRoleFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Only admin+ can assign custom tags
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { personaId, text, color, style, clear } = body
    
    // Validate personaId is provided
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }
    
    // Find the persona
    const persona = await db.persona.findUnique({
      where: { id: personaId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    })
    
    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }
    
    // If clearing the tag
    if (clear) {
      await db.persona.update({
        where: { id: personaId },
        data: { customTag: null }
      })
      
      return NextResponse.json({
        success: true,
        message: `Custom tag cleared for "${persona.name}" (${persona.user.username})`
      })
    }
    
    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Tag text is required' }, { status: 400 })
    }
    
    if (text.length > 50) {
      return NextResponse.json({ error: 'Tag text must be 50 characters or less' }, { status: 400 })
    }
    
    // Validate color (hex format)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!hexColorRegex.test(color)) {
      return NextResponse.json({ error: 'Invalid color format. Use hex format like #f59e0b' }, { status: 400 })
    }
    
    // Validate style
    if (!VALID_STYLES.includes(style)) {
      return NextResponse.json({ 
        error: `Invalid style. Choose from: ${VALID_STYLES.join(', ')}` 
      }, { status: 400 })
    }
    
    // Create the custom tag object
    const customTag = JSON.stringify({
      text: text.trim(),
      color,
      style
    })
    
    // Update the persona
    await db.persona.update({
      where: { id: personaId },
      data: { customTag }
    })
    
    return NextResponse.json({
      success: true,
      message: `Custom tag applied to "${persona.name}" (${persona.user.username})!`,
      data: {
        personaId,
        personaName: persona.name,
        username: persona.user.username,
        customTag: { text: text.trim(), color, style }
      }
    })
    
  } catch (error) {
    console.error('Error applying custom tag:', error)
    return NextResponse.json({ error: 'Failed to apply custom tag' }, { status: 500 })
  }
}
