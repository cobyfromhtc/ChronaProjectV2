import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get a user's public profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // Get current user (optional — profile is public, but some fields depend on who's asking)
    const currentUser = await getSession()

    // Fetch the target user (compute follower/following/persona/scenario counts
    // via separate count queries — PB back-relations for `followers`/`following`
    // both point to the `follows` collection and can't be disambiguated via
    // the Prisma relation name).
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        status: true,
        pronouns: true,
        location: true,
        socialLinks: true,
        chronos: true,
        createdAt: true,
        personas: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            mbtiType: true,
            archetype: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        scenarios: {
          where: { isPublic: true },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            bannerUrl: true,
            category: true,
            likeCount: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Compute counts via explicit count queries ( Pocketbase can't expand
    // self-referential back-relations like `followers`/`following` via Prisma's
    // relation name — both live on the `follows` collection).
    const [followerCount, followingCount, personaCount, scenarioCount] = await Promise.all([
      db.follow.count({ where: { followingId: userId } }),
      db.follow.count({ where: { followerId: userId } }),
      db.persona.count({ where: { userId } }),
      db.scenario.count({ where: { creatorId: userId, isPublic: true } }),
    ])

    const isOwnProfile = currentUser?.id === userId

    // Check follow status (only if authenticated and not own profile)
    let isFollowing = false
    if (currentUser && !isOwnProfile) {
      const followRecord = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: userId,
          },
        },
      })
      isFollowing = !!followRecord
    }

    // Check friend status (only if authenticated and not own profile)
    let isFriend = false
    let hasSentFriendRequest = false
    let hasPendingFriendRequest = false
    if (currentUser && !isOwnProfile) {
      const friendship = await db.friendship.findFirst({
        where: {
          OR: [
            { userId: currentUser.id, friendId: userId },
            { userId, friendId: currentUser.id },
          ],
        },
      })
      isFriend = !!friendship

      if (!isFriend) {
        const pendingRequest = await db.friendRequest.findFirst({
          where: {
            OR: [
              { senderId: currentUser.id, receiverId: userId },
              { senderId: userId, receiverId: currentUser.id },
            ],
            status: 'pending',
          },
        })
        hasSentFriendRequest = pendingRequest?.senderId === currentUser.id
        hasPendingFriendRequest = pendingRequest?.receiverId === currentUser.id
      }
    }

    // Parse social links from JSON
    let socialLinks: unknown[] = []
    try {
      socialLinks = user.socialLinks ? JSON.parse(user.socialLinks) : []
    } catch {
      socialLinks = []
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        status: user.status,
        pronouns: user.pronouns,
        location: user.location,
        socialLinks,
        followerCount: followerCount,
        followingCount: followingCount,
        isFollowing,
        isFriend,
        hasSentFriendRequest,
        hasPendingFriendRequest,
        isOwnProfile,
        chronos: isOwnProfile ? user.chronos : undefined,
        createdAt: user.createdAt,
        personas: user.personas,
        scenarios: user.scenarios,
        personaCount: personaCount,
        scenarioCount: scenarioCount,
      },
    })
  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
