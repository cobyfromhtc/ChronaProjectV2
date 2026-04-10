import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/spotify - Update Spotify status for a persona
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      personaId,
      trackId,
      trackName,
      artistName,
      albumArt,
      isPlaying,
      showStatus
    } = body

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    // Verify persona belongs to user
    const persona = await db.persona.findFirst({
      where: { id: personaId, userId: user.id }
    })

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    const updateData: any = {
      spotifyIsPlaying: isPlaying ?? false,
      showSpotifyStatus: showStatus ?? true
    }

    if (trackId && trackName) {
      updateData.spotifyTrackId = trackId
      updateData.spotifyTrackName = trackName
      updateData.spotifyArtistName = artistName
      updateData.spotifyAlbumArt = albumArt
      updateData.spotifyListeningSince = isPlaying ? new Date() : persona.spotifyListeningSince
    }

    const updatedPersona = await db.persona.update({
      where: { id: personaId },
      data: updateData
    })

    return NextResponse.json({ persona: updatedPersona })
  } catch (error) {
    console.error('Error updating Spotify status:', error)
    return NextResponse.json({ error: 'Failed to update Spotify status' }, { status: 500 })
  }
}

// DELETE /api/spotify - Clear Spotify status
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('personaId')

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 })
    }

    await db.persona.update({
      where: { id: personaId, userId: user.id },
      data: {
        spotifyTrackId: null,
        spotifyTrackName: null,
        spotifyArtistName: null,
        spotifyAlbumArt: null,
        spotifyListeningSince: null,
        spotifyIsPlaying: false
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing Spotify status:', error)
    return NextResponse.json({ error: 'Failed to clear Spotify status' }, { status: 500 })
  }
}
