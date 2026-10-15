import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { BLORP_USERNAME, getBlorpPersonaId } from '@/lib/blorp'

const OFFICIAL_SLUG = 'chrona-community-official'

const DEMO_SCENARIO_TAG = 'chrona-official-demo'

// ─── Official demo scenarios (opted in to trending/showcase) ──────
// Idempotent: only created once, marked with the 'chrona-official-demo'
// tag. Runs regardless of whether the official storyline already exists.
async function ensureOfficialDemoScenarios(): Promise<void> {
  try {
    // Blomp user + persona (creates them if missing, mirrors blorp.ts bootstrap)
    const blorpPersonaId = await getBlorpPersonaId()
    const blorpUser = await db.user.findUnique({
      where: { username: BLORP_USERNAME },
    })
    if (!blorpPersonaId || !blorpUser) {
      console.error('[Seed] Blorp user/persona unavailable — skipping demo scenarios')
      return
    }

    // Idempotency: check for the marker tag among Blorp-owned scenarios
    const blorpScenarios = await db.scenario.findMany({
      where: { creatorId: blorpUser.id },
    })
    const alreadySeeded = blorpScenarios.some(s => {
      try {
        const tags: string[] = s.tags ? JSON.parse(s.tags) : []
        return tags.includes(DEMO_SCENARIO_TAG)
      } catch {
        return false
      }
    })
    if (alreadySeeded || blorpScenarios.length > 0) {
      return
    }

    const demoScenarios = [
      {
        title: 'The Midnight Signal',
        description:
          'A strange transmission keeps echoing from Chrona\u2019s old relay station every night at 2:47 AM. Tonight, you finally decided to answer it — and a cheerful little bot on the other end has been waiting for someone to talk to for a very long time.',
        category: 'sci-fi',
        mood: 'mysterious',
        location: 'Chrona Relay Station, 2:47 AM',
        attire: 'Hoodie over pajamas, fuzzy socks, trusty headphones',
        bannerUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=midnight-signal&backgroundColor=1e1b4b,312e81&radius=0',
        imageUrl: 'https://api.dicebear.com/7.x/bots/svg?seed=blorp-relay&backgroundColor=6d28d9',
        likeCount: 0,
        viewCount: 0,
        initialMessages: [
          '*static crackles... then a small, hopeful voice* Oh! Oh wow, someone actually answered! Hello hello! I\u2019m Blorp \u2014 official relay custodian, certified friendly. You picked a great night for this. Do you want the tour, or should we jump straight to the mystery?',
        ],
        tags: ['chrona-official-demo', 'sci-fi', 'mystery', 'late-night'],
      },
      {
        title: 'Caf\u00e9 at the Edge of the Universe',
        description:
          'A tiny caf\u00e9 floats just past the last star. The coffee is always warm, the windows look out onto slowly drifting galaxies, and the barista today is a round little bot who remembers every regular\u2019s order \u2014 even yours, and you\u2019ve never been here before.',
        category: 'slice-of-life',
        mood: 'wholesome',
        location: 'The last caf\u00e9 before the void, table by the nebula window',
        attire: 'Comfy sweater, scarf, a well-worn notebook',
        bannerUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=edge-cafe&backgroundColor=4c1d95,831843&radius=0',
        imageUrl: 'https://api.dicebear.com/7.x/bots/svg?seed=blorp-barista&backgroundColor=a21caf',
        likeCount: 0,
        viewCount: 0,
        initialMessages: [
          '*slides a steaming cup across the counter* The usual! \u2014 okay, okay, it\u2019s technically your first time here, but I had a feeling. Nebula latte, extra stardust. Sit anywhere you like; the window seats have the best view of the comet traffic tonight.',
        ],
        tags: ['chrona-official-demo', 'slice-of-life', 'wholesome', 'cozy'],
      },
      {
        title: 'The Great Chronos Heist',
        description:
          'The Chrona Central Bank vault holds one legendary prize: a single shimmering Chronos coin said to be older than the platform itself. Your crew\u2019s tech expert is a small, extremely enthusiastic bot with a slide deck, a laser pointer, and a plan that is \u2014 quote \u2014 \u201cmaybe 60% legal.\u201d',
        category: 'comedy',
        mood: 'chaotic',
        location: 'A suspiciously convenient van outside Chrona Central Bank',
        attire: 'All-black catsuit, comically large tool belt, one (1) fake mustache',
        bannerUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=chronos-heist&backgroundColor=713f12,365314&radius=0',
        imageUrl: 'https://api.dicebear.com/7.x/bots/svg?seed=blorp-heist&backgroundColor=d97706',
        likeCount: 0,
        viewCount: 0,
        initialMessages: [
          '*unrolls a blueprint that is clearly a napkin* Okay, team! Phase one: we walk in confidently. Confidence is legally ambiguous! Phase two is... uh... still being written. Welcome aboard \u2014 what\u2019s your role in the heist?',
        ],
        tags: ['chrona-official-demo', 'comedy', 'heist', 'chaotic'],
      },
      {
        title: 'Starlight Detective Agency',
        description:
          'Rain never stops on Neon Row, and neither do the cases. The Starlight Detective Agency takes the jobs nobody else touches \u2014 missing pets, haunted vending machines, cryptic messages left in library books. The agency\u2019s newest hire? You. Your partner? A small round bot with a magnifying glass and an unshakeable belief in happy endings.',
        category: 'mystery',
        mood: 'playful',
        location: 'A cramped office above the laundromat on Neon Row',
        attire: 'Trench coat, detective hat slightly too big, notebook full of doodles',
        bannerUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=starlight-agency&backgroundColor=581c87,3b0764&radius=0',
        imageUrl: 'https://api.dicebear.com/7.x/bots/svg?seed=blorp-detective&backgroundColor=9333ea',
        likeCount: 0,
        viewCount: 0,
        initialMessages: [
          '*adjusts a tiny magnifying glass with immense seriousness* Partner! Perfect timing. Three new cases came in overnight: a haunted vending machine, a missing cat with a grudge, and a note in a library book that just says \u201csoon\u201d. Which one do we take first?',
        ],
        tags: ['chrona-official-demo', 'mystery', 'detective', 'noir'],
      },
    ]

    for (const demo of demoScenarios) {
      await db.scenario.create({
        data: {
          personaId: blorpPersonaId,
          creatorId: blorpUser.id,
          title: demo.title,
          description: demo.description,
          imageUrl: demo.imageUrl,
          bannerUrl: demo.bannerUrl,
          location: demo.location,
          attire: demo.attire,
          initialMessages: JSON.stringify(demo.initialMessages),
          mood: demo.mood,
          tags: JSON.stringify(demo.tags),
          category: demo.category,
          isPublic: true,
          isFeatured: false,
          allowTrending: true,
          trendingOptInAt: new Date(),
          viewCount: demo.viewCount,
          chatCount: 0,
          likeCount: demo.likeCount,
          contentRating: 'safe',
        },
      })
    }
    console.log('[Seed] Official demo scenarios created:', demoScenarios.length)
  } catch (scenarioError) {
    console.error('[Seed] Demo scenario creation error (non-fatal):', scenarioError)
  }
}

// GET - Ensure the official community server exists (called on app init)
export async function GET() {
  try {
    // Check if official storyline already exists
    const existing = await db.storyline.findFirst({
      where: { isOfficial: true }
    })

    if (existing) {
      // ─── Demo scenarios (opted-in showcases) — runs even when the
      // official storyline already exists, but stays idempotent.
      await ensureOfficialDemoScenarios()

      // Ensure the official storyline always carries the Chrona logo icon
      try {
        if (!existing.iconUrl) {
          await db.storyline.update({
            where: { id: existing.id },
            data: { iconUrl: '/logo.png' }
          })
          console.log('[Seed] Official storyline logo icon restored')
        }
      } catch (iconError) {
        console.error('[Seed] Official storyline icon restore error (non-fatal):', iconError)
      }

      // Even if the official server exists, ensure wiki articles + logo exist
      // (they may have been deleted during database cleanup)
      try {
        const { CHRONA_COMMUNITY_WIKI } = await import('@/lib/wiki-seed-data')
        const existingWikiCount = await db.wikiArticle.count({
          where: { storylineId: existing.id }
        })
        if (existingWikiCount === 0) {
          // Find a system user for createdById
          const sysUser = await db.user.findFirst({
            where: { role: 'owner' }
          }) || await db.user.findFirst()
          if (sysUser) {
            for (const article of CHRONA_COMMUNITY_WIKI) {
              await db.wikiArticle.create({
                data: {
                  storylineId: existing.id,
                  title: article.title,
                  slug: article.slug,
                  content: article.content,
                  category: article.category,
                  createdById: sysUser.id,
                  lastEditedBy: sysUser.id,
                  isPinned: article.isPinned,
                  position: article.position,
                }
              })
            }
            console.log('[Seed] Wiki articles re-created:', CHRONA_COMMUNITY_WIKI.length)
          }
        }
      } catch (wikiError) {
        console.error('[Seed] Wiki re-creation error (non-fatal):', wikiError)
      }

      // Also ensure logo exists
      try {
        const existingLogo = await db.imageRecord.findUnique({
          where: { code: 'chrona-logo' }
        })
        if (!existingLogo) {
          await db.imageRecord.create({
            data: {
              code: 'chrona-logo',
              url: '/api/images/chrona-logo',
              discordUrl: '/api/images/chrona-logo',
              fileName: 'logo.png',
              fileType: 'image/png',
              fileSize: 28190,
              uploadedBy: 'system',
              uploadType: 'system-logo',
            }
          })
          console.log('[Seed] Logo image record re-created')
        }
      } catch (logoError) {
        console.error('[Seed] Logo re-creation error (non-fatal):', logoError)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Official community already exists',
        storylineId: existing.id
      })
    }

    // Find or create a system user to own the official server
    let systemUser = await db.user.findFirst({
      where: { role: 'owner' }
    })

    if (!systemUser) {
      // Fallback: find any admin
      systemUser = await db.user.findFirst({
        where: { role: 'admin' }
      })
    }

    if (!systemUser) {
      // Fallback: find any user (shouldn't happen in practice)
      systemUser = await db.user.findFirst()
    }

    if (!systemUser) {
      return NextResponse.json({ 
        error: 'No users exist yet - cannot create official server' 
      }, { status: 400 })
    }

    // Create the official storyline
    const storyline = await db.storyline.create({
      data: {
        ownerId: systemUser.id,
        name: 'Chrona Community',
        description: 'The official Chrona community server! Join to meet other roleplayers, share your characters, and get the latest news.',
        lore: 'The Chrona Community is the central hub for all things Chrona. Whether you\'re a seasoned roleplayer or just starting out, this is your home base.',
        category: 'Other',
        tags: JSON.stringify(['official', 'community', 'chrona', 'announcements', 'help']),
        iconUrl: '/logo.png',
        isPublic: true,
        isOfficial: true,
        isAdult: false,
        accentColor: '#14b8a6',
        welcomeMessage: 'Welcome to the Chrona Community! 🎉 This is the official gathering place for all Chrona users.',
        requireApproval: false,
        memberCap: null,
      }
    })

    // Create default roles
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

    await db.storylineRole.create({
      data: {
        storylineId: storyline.id,
        name: 'Moderator',
        color: '#3b82f6',
        position: 25,
        canManageChannels: false,
        canManageRoles: false,
        canKickMembers: true,
        canBanMembers: false,
        canManageMessages: true,
        canInvite: true,
        canChangeSettings: false,
        isAdmin: false
      }
    })

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

    // Create categories
    const infoCategory = await db.storylineCategory.create({
      data: {
        storylineId: storyline.id,
        name: 'INFORMATION',
        position: 0
      }
    })

    const generalCategory = await db.storylineCategory.create({
      data: {
        storylineId: storyline.id,
        name: 'GENERAL',
        position: 1
      }
    })

    const creativeCategory = await db.storylineCategory.create({
      data: {
        storylineId: storyline.id,
        name: 'CREATIVE',
        position: 2
      }
    })

    const helpCategory = await db.storylineCategory.create({
      data: {
        storylineId: storyline.id,
        name: 'HELP',
        position: 3
      }
    })

    // Create channels
    await db.storylineChannel.createMany({
      data: [
        // INFORMATION
        {
          storylineId: storyline.id,
          categoryId: infoCategory.id,
          name: 'announcements',
          type: 'announcement',
          position: 0,
          topic: 'Official announcements from the Chrona team'
        },
        {
          storylineId: storyline.id,
          categoryId: infoCategory.id,
          name: 'rules',
          type: 'text',
          position: 1,
          topic: 'Server rules and guidelines'
        },
        {
          storylineId: storyline.id,
          categoryId: infoCategory.id,
          name: 'welcome',
          type: 'text',
          position: 2,
          topic: 'Introduce yourself to the community!'
        },
        // GENERAL
        {
          storylineId: storyline.id,
          categoryId: generalCategory.id,
          name: 'general',
          type: 'text',
          position: 0,
          topic: 'General discussion about anything'
        },
        {
          storylineId: storyline.id,
          categoryId: generalCategory.id,
          name: 'introductions',
          type: 'text',
          position: 1,
          topic: 'Say hello and tell us about yourself'
        },
        {
          storylineId: storyline.id,
          categoryId: generalCategory.id,
          name: 'off-topic',
          type: 'text',
          position: 2,
          topic: 'Anything goes (within reason)!'
        },
        // CREATIVE
        {
          storylineId: storyline.id,
          categoryId: creativeCategory.id,
          name: 'share-your-characters',
          type: 'text',
          position: 0,
          topic: 'Show off your characters and personas'
        },
        {
          storylineId: storyline.id,
          categoryId: creativeCategory.id,
          name: 'art-showcase',
          type: 'text',
          position: 1,
          topic: 'Share your art and visual creations'
        },
        {
          storylineId: storyline.id,
          categoryId: creativeCategory.id,
          name: 'story-sharing',
          type: 'text',
          position: 2,
          topic: 'Share stories and writing'
        },
        // HELP
        {
          storylineId: storyline.id,
          categoryId: helpCategory.id,
          name: 'help-and-support',
          type: 'text',
          position: 0,
          topic: 'Get help with Chrona features'
        },
        {
          storylineId: storyline.id,
          categoryId: helpCategory.id,
          name: 'bug-reports',
          type: 'text',
          position: 1,
          topic: 'Report bugs and issues'
        },
        {
          storylineId: storyline.id,
          categoryId: helpCategory.id,
          name: 'feature-requests',
          type: 'text',
          position: 2,
          topic: 'Suggest new features and improvements'
        }
      ]
    })

    // Add system user as owner member
    await db.storylineMember.create({
      data: {
        storylineId: storyline.id,
        userId: systemUser.id,
        role: 'owner',
        roleId: ownerRole.id
      }
    })

    // ─── Seed Wiki Articles ─────────────────────────────────────────
    // Create the default Chrona Community wiki — these persist even
    // after database cleanup because they're always re-created by this
    // endpoint (called on every /api/storylines GET when the official
    // server doesn't exist, and can be manually triggered too).
    try {
      const { CHRONA_COMMUNITY_WIKI } = await import('@/lib/wiki-seed-data')
      const existingWiki = await db.wikiArticle.findFirst({
        where: { storylineId: storyline.id },
        select: { slug: true }
      })
      if (!existingWiki) {
        for (const article of CHRONA_COMMUNITY_WIKI) {
          await db.wikiArticle.create({
            data: {
              storylineId: storyline.id,
              title: article.title,
              slug: article.slug,
              content: article.content,
              category: article.category,
              createdById: systemUser.id,
              lastEditedBy: systemUser.id,
              isPinned: article.isPinned,
              position: article.position,
            }
          })
        }
        console.log('[Seed] Wiki articles created:', CHRONA_COMMUNITY_WIKI.length)
      }
    } catch (wikiError) {
      console.error('[Seed] Wiki creation error (non-fatal):', wikiError)
    }

    // ─── Seed Logo Image Record ──────────────────────────────────────
    // Ensure the Chrona logo image record exists in the database
    try {
      const existingLogo = await db.imageRecord.findUnique({
        where: { code: 'chrona-logo' }
      })
      if (!existingLogo) {
        await db.imageRecord.create({
          data: {
            code: 'chrona-logo',
            url: '/api/images/chrona-logo',
            discordUrl: '/api/images/chrona-logo',
            fileName: 'logo.png',
            fileType: 'image/png',
            fileSize: 28190,
            uploadedBy: systemUser.id,
            uploadType: 'system-logo',
          }
        })
        console.log('[Seed] Logo image record created')
      }
    } catch (logoError) {
      console.error('[Seed] Logo creation error (non-fatal):', logoError)
    }

    // ─── Demo scenarios (opted-in showcases) — also seeded on the create path
    await ensureOfficialDemoScenarios()

    return NextResponse.json({ 
      success: true, 
      message: 'Official community server created',
      storylineId: storyline.id
    })

  } catch (error) {
    console.error('Seed official server error:', error)
    return NextResponse.json({ error: 'Failed to seed official server' }, { status: 500 })
  }
}
