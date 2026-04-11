import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// Profile update endpoint

export async function POST(request: Request) {
  try {
    const sessionUser = await getSession()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      avatarUrl,
      availabilityStatus,
      statusMessage,
      hiatusUntil,
      oocShowProfile,
      oocDisplayName,
      oocBio,
      oocPronouns,
      oocTimezone,
      oocAge,
      oocLinks,
      notifyDMs,
      notifyMentions,
      notifyFriendRequests,
      notifyStorylineMessages,
      notifyMarketplace,
    } = body

    // Build update data object
    const updateData: Record<string, unknown> = {}

    // Handle avatar URL update
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl
    }

    // Handle availability status update
    if (availabilityStatus !== undefined) {
      const validStatuses = ['online', 'away', 'busy', 'hiatus']
      if (!validStatuses.includes(availabilityStatus)) {
        return NextResponse.json(
          { error: 'Invalid availability status' },
          { status: 400 }
        )
      }
      updateData.availabilityStatus = availabilityStatus
    }

    // Handle status message update
    if (statusMessage !== undefined) {
      if (statusMessage && statusMessage.length > 100) {
        return NextResponse.json(
          { error: 'Status message must be 100 characters or less' },
          { status: 400 }
        )
      }
      updateData.statusMessage = statusMessage
    }

    // Handle hiatus until date
    if (hiatusUntil !== undefined) {
      updateData.hiatusUntil = hiatusUntil ? new Date(hiatusUntil) : null
    }

    // Handle OOC profile settings
    if (oocShowProfile !== undefined) {
      updateData.oocShowProfile = oocShowProfile
    }

    if (oocDisplayName !== undefined) {
      if (oocDisplayName && oocDisplayName.length > 50) {
        return NextResponse.json(
          { error: 'Display name must be 50 characters or less' },
          { status: 400 }
        )
      }
      updateData.oocDisplayName = oocDisplayName
    }

    if (oocBio !== undefined) {
      if (oocBio && oocBio.length > 1000) {
        return NextResponse.json(
          { error: 'Bio must be 1000 characters or less' },
          { status: 400 }
        )
      }
      updateData.oocBio = oocBio
    }

    if (oocPronouns !== undefined) {
      if (oocPronouns && oocPronouns.length > 30) {
        return NextResponse.json(
          { error: 'Pronouns must be 30 characters or less' },
          { status: 400 }
        )
      }
      updateData.oocPronouns = oocPronouns
    }

    if (oocTimezone !== undefined) {
      updateData.oocTimezone = oocTimezone
    }

    if (oocAge !== undefined) {
      if (oocAge !== null) {
        const age = parseInt(oocAge)
        if (isNaN(age) || age < 13 || age > 120) {
          return NextResponse.json(
            { error: 'Age must be between 13 and 120' },
            { status: 400 }
          )
        }
        updateData.oocAge = age
      } else {
        updateData.oocAge = null
      }
    }

    if (oocLinks !== undefined) {
      if (oocLinks) {
        // Validate links
        if (!Array.isArray(oocLinks)) {
          return NextResponse.json(
            { error: 'Links must be an array' },
            { status: 400 }
          )
        }
        for (const link of oocLinks) {
          if (!link.name || !link.url) {
            return NextResponse.json(
              { error: 'Each link must have a name and URL' },
              { status: 400 }
            )
          }
          if (link.name.length > 30) {
            return NextResponse.json(
              { error: 'Link name must be 30 characters or less' },
              { status: 400 }
            )
          }
          if (link.url.length > 500) {
            return NextResponse.json(
              { error: 'Link URL must be 500 characters or less' },
              { status: 400 }
            )
          }
        }
        updateData.oocLinks = JSON.stringify(oocLinks)
      } else {
        updateData.oocLinks = null
      }
    }

    // Handle notification preferences
    if (notifyDMs !== undefined) {
      updateData.notifyDMs = notifyDMs
    }

    if (notifyMentions !== undefined) {
      updateData.notifyMentions = notifyMentions
    }

    if (notifyFriendRequests !== undefined) {
      updateData.notifyFriendRequests = notifyFriendRequests
    }

    if (notifyStorylineMessages !== undefined) {
      updateData.notifyStorylineMessages = notifyStorylineMessages
    }

    if (notifyMarketplace !== undefined) {
      updateData.notifyMarketplace = notifyMarketplace
    }

    // If no fields to update, return current user
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update the user
    const updatedUser = await db.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        chronos: true,
        customTag: true,
        availabilityStatus: true,
        statusMessage: true,
        hiatusUntil: true,
        oocDisplayName: true,
        oocBio: true,
        oocPronouns: true,
        oocTimezone: true,
        oocAge: true,
        oocLinks: true,
        oocShowProfile: true,
        notifyDMs: true,
        notifyMentions: true,
        notifyFriendRequests: true,
        notifyStorylineMessages: true,
        notifyMarketplace: true,
      },
    })

    // Parse oocLinks from JSON string to array
    const userResponse = {
      ...updatedUser,
      oocLinks: updatedUser.oocLinks ? JSON.parse(updatedUser.oocLinks) : null,
      hiatusUntil: updatedUser.hiatusUntil?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      user: userResponse,
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current user profile
export async function GET() {
  try {
    const sessionUser = await getSession()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        chronos: true,
        customTag: true,
        availabilityStatus: true,
        statusMessage: true,
        hiatusUntil: true,
        oocDisplayName: true,
        oocBio: true,
        oocPronouns: true,
        oocTimezone: true,
        oocAge: true,
        oocLinks: true,
        oocShowProfile: true,
        notifyDMs: true,
        notifyMentions: true,
        notifyFriendRequests: true,
        notifyStorylineMessages: true,
        notifyMarketplace: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse oocLinks from JSON string to array
    const userResponse = {
      ...user,
      oocLinks: user.oocLinks ? JSON.parse(user.oocLinks) : null,
      hiatusUntil: user.hiatusUntil?.toISOString() || null,
    }

    return NextResponse.json({
      user: userResponse,
    })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
