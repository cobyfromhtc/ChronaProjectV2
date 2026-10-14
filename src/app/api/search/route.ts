import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { canInteract, isMinor } from '@/lib/age-utils'

// =============================================================
// Unified Chrona Search API
// =============================================================
// Supports multiple search modes via the `mode` query param:
//   - friends   : only accepted friends (default, no prefix)
//   - mutual    : users who share a storyline server with me ("@")
//   - all       : all users across the platform ("@@")
//   - servers   : storyline servers by name/category ("")
//   - channels  : channels in storylines I've joined ("#")
//   - auto      : smart combination — returns friends + servers + channels
//
// The frontend detects the prefix (@@, @, #) and sets `mode` accordingly.
// Plain text defaults to `auto`.
// =============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const mode = (searchParams.get('mode') || 'auto').toLowerCase()
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    if (q.length < 1) {
      return NextResponse.json({ success: true, results: { users: [], servers: [], channels: [], friends: [] } })
    }

    const queryLower = q.toLowerCase()

    // Fetch user's DOB for age-gating
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { dateOfBirth: true },
    })
    const userDob = dbUser?.dateOfBirth ?? null
    const userIsMinor = isMinor(userDob)

    // ---- Helper: format a user for search results ----
    const formatUser = (u: any) => {
      const activePersona = u.personas?.[0] || u.persona || null
      return {
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        activePersona: activePersona ? {
          id: activePersona.id,
          name: activePersona.name,
          avatarUrl: activePersona.avatarUrl,
          isOnline: activePersona.isOnline ?? false,
        } : null,
      }
    }

    const results: {
      friends: any[]
      users: any[]
      servers: any[]
      channels: any[]
    } = { friends: [], users: [], servers: [], channels: [] }

    const shouldSearch = (m: string) => mode === 'auto' || mode === m

    // ---------------- Friends search ----------------
    if (shouldSearch('friends') || (mode === 'auto')) {
      try {
        const friendships = await db.friendship.findMany({
          where: { userId: user.id },
          select: { friendId: true },
        })
        const friendIds = friendships.map((f: any) => f.friendId)
        if (friendIds.length > 0) {
          const friends = await db.user.findMany({
            where: { id: { in: friendIds } },
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              dateOfBirth: true,
              personas: {
                where: { isActive: true },
                select: { id: true, name: true, avatarUrl: true, isOnline: true },
                take: 1,
              },
            },
          })
          results.friends = friends
            .filter((u: any) => u.username.toLowerCase().includes(queryLower))
            .filter((u: any) => canInteract(userDob, u.dateOfBirth ?? null))
            .slice(0, limit)
            .map(formatUser)
        }
      } catch (e) { console.error('search friends error', e) }
    }

    // ---------------- Mutual server users search ("@") ----------------
    if (shouldSearch('mutual') || mode === 'all' || mode === 'auto') {
      try {
        // Get storyline IDs the user has joined
        const memberships = await db.storylineMember.findMany({
          where: { userId: user.id },
          select: { storylineId: true },
        })
        const myStorylineIds = memberships.map((m: any) => m.storylineId)
        if (myStorylineIds.length > 0) {
          // Get other members of those storylines
          const otherMembers = await db.storylineMember.findMany({
            where: {
              storylineId: { in: myStorylineIds },
              userId: { not: user.id },
            },
            select: { userId: true, storylineId: true },
          })
          const mutualUserIds = [...new Set(otherMembers.map((m: any) => m.userId))]
          if (mutualUserIds.length > 0) {
            const mutualUsers = await db.user.findMany({
              where: { id: { in: mutualUserIds } },
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                dateOfBirth: true,
                personas: {
                  where: { isActive: true },
                  select: { id: true, name: true, avatarUrl: true, isOnline: true },
                  take: 1,
                },
              },
            })
            const filtered = mutualUsers
              .filter((u: any) => u.username.toLowerCase().includes(queryLower))
              .filter((u: any) => canInteract(userDob, u.dateOfBirth ?? null))
            results.users = filtered.slice(0, limit).map(formatUser)
          }
        }
      } catch (e) { console.error('search mutual error', e) }
    }

    // ---------------- All users search ("@@") ----------------
    if (mode === 'all') {
      try {
        const allUsers = await db.user.findMany({
          where: {
            isBanned: false,
            isSuspended: false,
            isFrozen: false,
          },
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            dateOfBirth: true,
            personas: {
              where: { isActive: true },
              select: { id: true, name: true, avatarUrl: true, isOnline: true },
              take: 1,
            },
          },
        })
        results.users = allUsers
          .filter((u: any) => u.username.toLowerCase().includes(queryLower))
          .filter((u: any) => canInteract(userDob, u.dateOfBirth ?? null))
          .slice(0, limit)
          .map(formatUser)
      } catch (e) { console.error('search all users error', e) }
    }

    // ---------------- Storyline servers search ----------------
    if (shouldSearch('servers') || mode === 'auto') {
      try {
        const storylines = await db.storyline.findMany({
          where: {
            isPublic: true,
            OR: [
              { name: { contains: queryLower } },
              { description: { contains: queryLower } },
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            iconUrl: true,
            bannerUrl: true,
            category: true,
            isAdult: true,
            _count: { select: { members: true } },
          },
          take: limit,
        })
        // Age-gate adult storylines for minors
        results.servers = storylines
          .filter((s: any) => !(userIsMinor && s.isAdult))
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            iconUrl: s.iconUrl,
            bannerUrl: s.bannerUrl,
            category: s.category,
            memberCount: s._count?.members ?? 0,
          }))
      } catch (e) { console.error('search servers error', e) }
    }

    // ---------------- Channels search ("#") ----------------
    if (shouldSearch('channels') || mode === 'auto') {
      try {
        const memberships = await db.storylineMember.findMany({
          where: { userId: user.id },
          select: { storylineId: true },
        })
        const myStorylineIds = memberships.map((m: any) => m.storylineId)
        if (myStorylineIds.length > 0) {
          const channels = await db.storylineChannel.findMany({
            where: {
              storylineId: { in: myStorylineIds },
              name: { contains: queryLower },
            },
            select: {
              id: true,
              name: true,
              topic: true,
              storylineId: true,
              storyline: { select: { id: true, name: true, iconUrl: true } },
            },
            take: limit,
          })
          results.channels = channels.map((c: any) => ({
            id: c.id,
            name: c.name,
            topic: c.topic,
            storylineId: c.storylineId,
            storylineName: c.storyline?.name ?? 'Unknown',
            storylineIcon: c.storyline?.iconUrl ?? null,
          }))
        }
      } catch (e) { console.error('search channels error', e) }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
