import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateAge, canChatWith, censorMessage } from '@/lib/age-gap'
import { BLORP_USER_ID } from '@/lib/blorp'
import { serializeBigInt } from '@/lib/json-utils'

// GET - Fetch all conversations for current user's active persona
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's personas
    const userPersonas = await db.persona.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const personaIds = userPersonas.map(p => p.id)
    
    // Get all conversations involving these personas
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { personaAId: { in: personaIds } },
          { personaBId: { in: personaIds } },
        ]
      },
      include: {
        personaA: {
          include: { user: { select: { username: true, dateOfBirth: true, isOfficial: true } } }
        },
        personaB: {
          include: { user: { select: { username: true, dateOfBirth: true, isOfficial: true } } }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })
    
    // Get current user's age for age gap filtering
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { dateOfBirth: true }
    })
    const myAge = calculateAge(currentUser?.dateOfBirth || null)
    
    // Transform to include "other persona" info
    // Filter out conversations where BOTH personas belong to the same user (self-conversations)
    const result = conversations
      .filter(conv => {
        // Check if both personas belong to the same user (self-conversation)
        const isPersonaA = personaIds.includes(conv.personaAId)
        const isPersonaB = personaIds.includes(conv.personaBId)
        // Exclude if both belong to current user
        return !(isPersonaA && isPersonaB)
      })
      .map(conv => {
        const isPersonaA = personaIds.includes(conv.personaAId)
        const otherPersona = isPersonaA ? conv.personaB : conv.personaA
        const myPersona = isPersonaA ? conv.personaA : conv.personaB
        
        // Check if this is a conversation with Blorp or official account
        const isOfficialAccount = otherPersona.user?.isOfficial || otherPersona.userId === BLORP_USER_ID
        
        // Check age gap for last message censoring
        let lastMessage = conv.messages[0] || null
        if (lastMessage && !isOfficialAccount && myAge !== null) {
          // Get other user's age
          const otherUser = otherPersona.user
          const otherAge = calculateAge(otherUser?.dateOfBirth || null)
          
          // If we can't determine ages or they can't chat, censor the message preview
          if (otherAge === null || !canChatWith(myAge, otherAge)) {
            lastMessage = {
              ...lastMessage,
              content: censorMessage(lastMessage.content)
            }
          }
        }
        
        return {
          id: conv.id,
          otherPersona: {
            id: otherPersona.id,
            name: otherPersona.name,
            avatarUrl: otherPersona.avatarUrl,
            username: otherPersona.user.username,
            isOnline: otherPersona.isOnline,
            isOfficial: isOfficialAccount,
          },
          myPersona: {
            id: myPersona.id,
            name: myPersona.name,
          },
          lastMessage,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
        }
      })
    
    return NextResponse.json({ 
      success: true,
      conversations: result 
    })
    
  } catch (error) {
    console.error('Fetch conversations error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// POST - Start a new conversation or send DM request
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
    const { targetPersonaId, myPersonaId, firstMessage, imageUrl } = body
    
    if (!targetPersonaId || !myPersonaId) {
      return NextResponse.json(
        { error: 'Missing persona IDs' },
        { status: 400 }
      )
    }
    
    // Verify myPersonaId belongs to user
    const myPersona = await db.persona.findFirst({
      where: { id: myPersonaId, userId: user.id }
    })
    
    if (!myPersona) {
      return NextResponse.json(
        { error: 'Invalid persona' },
        { status: 400 }
      )
    }
    
    // Check if target persona exists
    const targetPersona = await db.persona.findUnique({
      where: { id: targetPersonaId },
      include: { user: { select: { username: true, dateOfBirth: true } } }
    })
    
    if (!targetPersona) {
      return NextResponse.json(
        { error: 'Target persona not found' },
        { status: 404 }
      )
    }
    
    // Age gap validation
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { dateOfBirth: true }
    })
    
    const myAge = calculateAge(currentUser?.dateOfBirth || null)
    const targetAge = calculateAge(targetPersona.user.dateOfBirth)
    
    // Check if both users have valid ages and can chat with each other
    if (myAge !== null && targetAge !== null) {
      if (!canChatWith(myAge, targetAge)) {
        return NextResponse.json({
          error: 'Unable to start conversation due to age restrictions',
          code: 'AGE_GAP_RESTRICTION',
          myAge,
          targetAge,
          ageRangeInfo: `You are ${myAge} years old. Based on our age gap policy, you cannot chat with ${targetAge}-year-old users.`
        }, { status: 403 })
      }
    }
    
    // Check if conversation already exists (in either direction)
    const existingConv = await db.conversation.findFirst({
      where: {
        OR: [
          { personaAId: myPersonaId, personaBId: targetPersonaId },
          { personaAId: targetPersonaId, personaBId: myPersonaId },
        ]
      },
      include: {
        personaA: {
          include: { user: { select: { username: true } } }
        },
        personaB: {
          include: { user: { select: { username: true } } }
        },
      }
    })
    
    if (existingConv) {
      // Return existing conversation with full data
      return NextResponse.json({ 
        success: true,
        conversation: serializeBigInt(existingConv),
        isNew: false
      })
    }
    
    // Check if users are friends (skip DM request if they are)
    const isFriend = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: targetPersona.userId },
          { userId: targetPersona.userId, friendId: user.id }
        ]
      }
    })
    
    // If users are friends, create conversation directly without DM request
    if (isFriend) {
      const conversation = await db.conversation.create({
        data: {
          personaAId: myPersonaId,
          personaBId: targetPersonaId,
        },
        include: {
          personaA: {
            include: { user: { select: { username: true } } }
          },
          personaB: {
            include: { user: { select: { username: true } } }
          },
        }
      })
      
      // If there's a first message, create it
      if (firstMessage || imageUrl) {
        await db.message.create({
          data: {
            conversationId: conversation.id,
            senderId: myPersonaId,
            content: firstMessage?.trim() || '',
            imageUrl: imageUrl || null
          }
        })
      }
      
      return NextResponse.json({ 
        success: true,
        conversation: serializeBigInt(conversation),
        isNew: true,
        isFriend: true
      })
    }
    
    // Check if there's already a pending DM request from this sender to this receiver
    const existingDmRequest = await db.dmRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: myPersonaId,
          receiverId: targetPersonaId
        }
      }
    })
    
    if (existingDmRequest) {
      if (existingDmRequest.status === 'pending') {
        return NextResponse.json({ 
          success: false,
          error: 'DM request already sent',
          code: 'DM_REQUEST_PENDING',
          dmRequest: existingDmRequest
        }, { status: 400 })
      } else if (existingDmRequest.status === 'ignored') {
        // If previously ignored, allow re-sending (update the request)
        if (!firstMessage && !imageUrl) {
          return NextResponse.json({ 
            needsDmRequest: true,
            targetPersona: {
              id: targetPersona.id,
              name: targetPersona.name,
              username: targetPersona.user.username
            }
          })
        }
        
        // Update the existing ignored request with new message
        const updatedRequest = await db.dmRequest.update({
          where: { id: existingDmRequest.id },
          data: {
            firstMessage: firstMessage?.trim() || '',
            imageUrl: imageUrl || null,
            status: 'pending',
            createdAt: new Date()
          }
        })
        
        return NextResponse.json({
          success: true,
          dmRequest: updatedRequest,
          message: 'DM request sent again'
        })
      }
    }
    
    // Check if the TARGET has a pending DM request to the SENDER
    // In this case, we should accept it and create the conversation
    const reverseDmRequest = await db.dmRequest.findFirst({
      where: {
        senderId: targetPersonaId,
        receiverId: myPersonaId,
        status: 'pending'
      }
    })
    
    if (reverseDmRequest) {
      // The target already sent a DM request to us - accept it and create conversation
      const conversation = await db.conversation.create({
        data: {
          personaAId: targetPersonaId,
          personaBId: myPersonaId,
        },
        include: {
          personaA: {
            include: { user: { select: { username: true } } }
          },
          personaB: {
            include: { user: { select: { username: true } } }
          },
        }
      })
      
      // Create the original message from the target
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: targetPersonaId,
          content: reverseDmRequest.firstMessage,
          imageUrl: reverseDmRequest.imageUrl
        }
      })
      
      // If there's a response message, create it too
      if (firstMessage || imageUrl) {
        await db.message.create({
          data: {
            conversationId: conversation.id,
            senderId: myPersonaId,
            content: firstMessage?.trim() || '',
            imageUrl: imageUrl || null
          }
        })
      }
      
      // Mark the DM request as accepted
      await db.dmRequest.update({
        where: { id: reverseDmRequest.id },
        data: { status: 'accepted' }
      })
      
      return NextResponse.json({ 
        success: true,
        conversation: serializeBigInt(conversation),
        isNew: true,
        acceptedDmRequest: true
      })
    }
    
    // No existing conversation or DM request - need to create a DM request
    if (!firstMessage && !imageUrl) {
      // Frontend needs to show the DM request dialog
      return NextResponse.json({ 
        needsDmRequest: true,
        targetPersona: {
          id: targetPersona.id,
          name: targetPersona.name,
          username: targetPersona.user.username
        }
      })
    }
    
    // Create the DM request
    const dmRequest = await db.dmRequest.create({
      data: {
        senderId: myPersonaId,
        receiverId: targetPersonaId,
        firstMessage: firstMessage?.trim() || '',
        imageUrl: imageUrl || null,
        status: 'pending'
      }
    })
    
    return NextResponse.json({
      success: true,
      dmRequest,
      message: 'DM request sent'
    })
    
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}