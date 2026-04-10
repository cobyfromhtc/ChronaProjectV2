import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

// Archetype-to-aesthetic mapping for prompt construction
const ARCHETYPE_AESTHETIC: Record<string, string> = {
  'Morally Grey': 'gray mist, morally ambiguous shadows, twilight tones',
  'Dominant': 'deep purple velvet, commanding presence, regal darkness',
  'Protective': 'warm blue shield glow, guardian light, safe haven',
  'Cold & Distant': 'frost crystals, icy blue, distant mountains, cold breath',
  'Obsessive': 'intense red focal point, all-seeing eye, compulsive patterns',
  'Brooding': 'dark slate storm clouds, moonlit silhouette, heavy atmosphere',
  'Flirtatious': 'soft pink petals, playful curves, warm blush tones',
  'Tsundere': 'sharp orange contrast, hidden warmth, thorny exterior',
  'Yandere': 'deep crimson, blood moon, beautiful danger, obsessive love',
  'Kuudere': 'cool cyan ice, hidden depths, stoic beauty, frozen lake',
  'Mysterious': 'deep violet fog, hidden pathways, enigmatic shadows',
  'Wholesome': 'golden sunlight, warm fields, gentle sunrise, nurturing glow',
  'Chaotic': 'wild amber sparks, explosive energy, swirling storm',
  'Defiant': 'burning orange rebellion, raised fist, breaking chains',
  'Possessive': 'rose thorns wrapping, tight embrace, claiming shadow',
  'Devoted': 'warm candlelight, amber glow, steadfast flame, unwavering',
  'Dark & Gritty': 'gritty charcoal, urban decay, rain-soaked streets, noir',
  'Supernatural': 'ethereal indigo, ghostly apparitions, otherworldly glow',
  'Royalty': 'gold and purple regalia, crown jewels, opulent chambers',
  'Warrior': 'battle-scarred steel, red dawn, war-torn landscape',
  'Scholar': 'ancient books, blue-ink manuscripts, candlelit library',
  'Trauma-Coded': 'fractured rose, bandaged heart, fragile beauty',
  'Protector': 'strong blue shield, steadfast guard, lighthouse beacon',
  'Street-Smart': 'urban zinc, graffiti alleys, neon rain, city pulse',
  'Trickster': 'glittering amber, playing cards, mischievous shadows',
  'Rebel': 'fire orange, broken chains, revolutionary flames',
  'Sage': 'ancient wisdom purple, star charts, cosmic knowledge',
  'Lover': 'pink rose garden, intimate candlelight, warm embrace',
  'Villain': 'dark red throne, menacing shadow, power and corruption',
  'Hero': 'golden sunrise, blue sky hope, epic silhouette',
  'Antihero': 'gray morality, twilight anti-hero, lone wolf',
  'Caregiver': 'warm rose, healing hands, nurturing garden',
  'Explorer': 'emerald wilderness, uncharted maps, horizon glow',
  'Creator': 'cyan sparks of creation, artist studio, canvas and light',
  'Ruler': 'gold crown, amber throne, commanding architecture',
  'Other': 'neutral gray, abstract mystery, undefined beauty',
}

function buildPrompt(
  type: 'atmosphere' | 'setting' | 'symbolism' | 'colors',
  archetype: string | null,
  secondaryArchetype: string | null,
  personalityDescription: string | null,
  appearance: string | null,
  backstory: string | null,
  mbtiType: string | null
): string {
  const aesthetic = ARCHETYPE_AESTHETIC[archetype || 'Other'] || ARCHETYPE_AESTHETIC['Other']
  const secondaryAesthetic = secondaryArchetype ? (ARCHETYPE_AESTHETIC[secondaryArchetype] || '') : ''
  const personalityKeywords = personalityDescription 
    ? personalityDescription.split(/[.!?]+/).slice(0, 2).join(', ').toLowerCase()
    : ''
  const backstoryKeywords = backstory
    ? backstory.split(/[.!?]+/).slice(0, 2).join(', ').toLowerCase()
    : ''
  const appearanceKeywords = appearance
    ? appearance.split(/[.!?]+/).slice(0, 2).join(', ').toLowerCase()
    : ''
  const mbtiNote = mbtiType ? `${mbtiType} personality archetype` : ''

  switch (type) {
    case 'atmosphere':
      return `Aesthetic mood board for a ${archetype || 'mysterious'} character, ${aesthetic}, ${secondaryAesthetic ? `with hints of ${secondaryAesthetic},` : ''} ${personalityKeywords}, dark moody lighting, cinematic atmosphere, abstract emotional landscape, no text, no faces, high quality, detailed`
    
    case 'setting':
      return `Character environment setting for a ${archetype || 'mysterious'} archetype, ${aesthetic}, ${backstoryKeywords}, ${mbtiNote}, atmospheric landscape, dark fantasy world, cinematic environment, no text, no faces, no characters, high quality, detailed`
    
    case 'symbolism':
      return `Symbolic objects and details for a ${archetype || 'mysterious'} character, ${aesthetic}, ${appearanceKeywords}, ${mbtiNote}, ${secondaryAesthetic ? `subtle ${secondaryAesthetic} undertones,` : ''} close-up details, dark aesthetic, moody lighting, no text, no faces, no characters, high quality, detailed`
    
    case 'colors':
      return `Color palette aesthetic for a ${archetype || 'mysterious'} character, ${aesthetic}, ${personalityKeywords}, abstract gradient, dark cinematic colors, pure color study, no text, no characters, no objects, high quality, detailed`
  }
}

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
    const { archetype, secondaryArchetype, personalityDescription, appearance, backstory, mbtiType } = body
    
    // Build 4 prompts for different moods
    const prompts = [
      buildPrompt('atmosphere', archetype, secondaryArchetype, personalityDescription, appearance, backstory, mbtiType),
      buildPrompt('setting', archetype, secondaryArchetype, personalityDescription, appearance, backstory, mbtiType),
      buildPrompt('symbolism', archetype, secondaryArchetype, personalityDescription, appearance, backstory, mbtiType),
      buildPrompt('colors', archetype, secondaryArchetype, personalityDescription, appearance, backstory, mbtiType),
    ]
    
    const images: string[] = []
    
    // Generate images sequentially to avoid rate limits
    for (let i = 0; i < prompts.length; i++) {
      try {
        const zai = await ZAI.create()
        const response = await zai.images.generations.create({
          prompt: prompts[i],
          size: '1024x1024',
        })
        
        if (response.data && response.data[0] && response.data[0].base64) {
          const base64 = response.data[0].base64
          images.push(`data:image/png;base64,${base64}`)
        } else {
          images.push('')
        }
      } catch (imgError) {
        console.error(`Failed to generate mood board image ${i + 1}:`, imgError)
        images.push('')
      }
    }
    
    return NextResponse.json({
      success: true,
      images,
      labels: ['Atmosphere', 'Setting', 'Symbolism', 'Colors'],
    })
    
  } catch (error) {
    console.error('Mood board generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate mood board' },
      { status: 500 }
    )
  }
}
