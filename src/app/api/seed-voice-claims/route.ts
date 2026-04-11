import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Sample voice claims data
const sampleVoiceClaims = [
  // Movies
  { characterName: 'Tony Stark', actorName: 'Robert Downey Jr.', sourceTitle: 'Iron Man', sourceType: 'movie', year: 2008, description: 'Charismatic, witty, confident voice with a slight edge' },
  { characterName: 'Elsa', actorName: 'Idina Menzel', sourceTitle: 'Frozen', sourceType: 'movie', year: 2013, description: 'Powerful, emotional soprano with a gentle speaking voice' },
  { characterName: 'Jack Sparrow', actorName: 'Johnny Depp', sourceTitle: 'Pirates of the Caribbean', sourceType: 'movie', year: 2003, description: 'Slurred, eccentric, playful with unexpected gravitas' },
  { characterName: 'Scarlet Witch', actorName: 'Elizabeth Olsen', sourceTitle: 'WandaVision', sourceType: 'tv_show', year: 2021, description: 'Soft, emotional, Eastern European accent' },
  { characterName: 'Geralt', actorName: 'Henry Cavill', sourceTitle: 'The Witcher', sourceType: 'tv_show', year: 2019, description: 'Deep, gravelly, world-weary but caring' },
  
  // Anime
  { characterName: 'Naruto Uzumaki', actorName: 'Maile Flanagan', sourceTitle: 'Naruto', sourceType: 'anime', year: 2002, description: 'Energetic, youthful, determined voice' },
  { characterName: 'Light Yagami', actorName: 'Brad Swaile', sourceTitle: 'Death Note', sourceType: 'anime', year: 2006, description: 'Calm, intelligent, subtly menacing' },
  { characterName: 'Mikasa Ackerman', actorName: 'Trina Nishimura', sourceTitle: 'Attack on Titan', sourceType: 'anime', year: 2013, description: 'Serious, determined, protective undertone' },
  { characterName: 'Spike Spiegel', actorName: 'Steven Blum', sourceTitle: 'Cowboy Bebop', sourceType: 'anime', year: 1998, description: 'Cool, laid-back, world-weary charm' },
  { characterName: 'Goku', actorName: 'Sean Schemmel', sourceTitle: 'Dragon Ball Z', sourceType: 'anime', year: 1989, description: 'Energetic, innocent, powerful when serious' },
  
  // Games
  { characterName: 'Kratos', actorName: 'Christopher Judge', sourceTitle: 'God of War', sourceType: 'game', year: 2018, description: 'Deep, powerful, restrained rage' },
  { characterName: 'Aloy', actorName: 'Ashly Burch', sourceTitle: 'Horizon Zero Dawn', sourceType: 'game', year: 2017, description: 'Curious, determined, intelligent' },
  { characterName: 'Arthur Morgan', actorName: 'Roger Clark', sourceTitle: 'Red Dead Redemption 2', sourceType: 'game', year: 2018, description: 'Gruff, weary, hidden warmth' },
  { characterName: 'Glados', actorName: 'Ellen McLain', sourceTitle: 'Portal', sourceType: 'game', year: 2007, description: 'Synthetic, sarcastic, passive-aggressive' },
  { characterName: 'Cloud Strife', actorName: 'Cody Christian', sourceTitle: 'Final Fantasy VII Remake', sourceType: 'game', year: 2020, description: 'Aloof, conflicted, hidden emotion' },
  
  // More TV Shows
  { characterName: 'Walter White', actorName: 'Bryan Cranston', sourceTitle: 'Breaking Bad', sourceType: 'tv_show', year: 2008, description: 'Transforms from mild-mannered to menacing' },
  { characterName: 'Daenerys Targaryen', actorName: 'Emilia Clarke', sourceTitle: 'Game of Thrones', sourceType: 'tv_show', year: 2011, description: 'Regal, determined, soft to commanding' },
  { characterName: 'Eleven', actorName: 'Millie Bobby Brown', sourceTitle: 'Stranger Things', sourceType: 'tv_show', year: 2016, description: 'Quiet, intense, powerful when needed' },
  { characterName: 'Homelander', actorName: 'Antony Starr', sourceTitle: 'The Boys', sourceType: 'tv_show', year: 2019, description: 'All-American charm masking narcissistic menace' },
  
  // More Movies
  { characterName: 'Batman', actorName: 'Kevin Conroy', sourceTitle: 'Batman: The Animated Series', sourceType: 'tv_show', year: 1992, description: 'Deep, brooding, dual voice for Bruce Wayne' },
  { characterName: 'Joker', actorName: 'Mark Hamill', sourceTitle: 'Batman: The Animated Series', sourceType: 'tv_show', year: 1992, description: 'Manic, theatrical, chilling laugh' },
  { characterName: 'Villanelle', actorName: 'Jodie Comer', sourceTitle: 'Killing Eve', sourceType: 'tv_show', year: 2018, description: 'Playful, unpredictable, multiple accents' },
  { characterName: 'Violet Evergarden', actorName: 'Erika Harlacher', sourceTitle: 'Violet Evergarden', sourceType: 'anime', year: 2018, description: 'Initially emotionless, growing warmth' },
  { characterName: 'Levi Ackerman', actorName: 'Matthew Mercer', sourceTitle: 'Attack on Titan', sourceType: 'anime', year: 2013, description: 'Cold, blunt, rarely shows emotion' },
]

export async function POST(request: NextRequest) {
  try {
    // Check if already seeded
    const existing = await db.voiceClaim.count()
    if (existing > 0) {
      return NextResponse.json({ message: 'Already seeded', count: existing })
    }

    // Seed voice claims
    const created = await db.voiceClaim.createMany({
      data: sampleVoiceClaims,
      skipDuplicates: true
    })

    return NextResponse.json({ 
      message: 'Voice claims seeded successfully', 
      count: created.count 
    })
  } catch (error) {
    console.error('Error seeding voice claims:', error)
    return NextResponse.json({ error: 'Failed to seed voice claims' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const count = await db.voiceClaim.count()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error checking voice claims:', error)
    return NextResponse.json({ error: 'Failed to check voice claims' }, { status: 500 })
  }
}
