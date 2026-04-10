import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ==================== TYPES ====================
interface User {
  id: string
  personaId?: string
  personaName?: string
}

interface OnlineUser {
  socketId: string
  userId: string
  personaId?: string
  personaName?: string
}

interface TypingData {
  conversationId?: string
  channelId?: string
  isTyping: boolean
  personaName: string
}

// ==================== STATE ====================
const onlineUsers = new Map<string, OnlineUser>()
const conversationRooms = new Map<string, Set<string>>() // conversationId -> Set of socketIds
const channelRooms = new Map<string, Set<string>>() // channelId -> Set of socketIds

// ==================== HELPERS ====================
const getOnlineUsersByUserId = (userId: string): OnlineUser[] => {
  return Array.from(onlineUsers.values()).filter(u => u.userId === userId)
}

const getUsersInConversation = (conversationId: string): OnlineUser[] => {
  const socketIds = conversationRooms.get(conversationId)
  if (!socketIds) return []
  return Array.from(socketIds)
    .map(socketId => onlineUsers.get(socketId))
    .filter((u): u is OnlineUser => u !== undefined)
}

const getUsersInChannel = (channelId: string): OnlineUser[] => {
  const socketIds = channelRooms.get(channelId)
  if (!socketIds) return []
  return Array.from(socketIds)
    .map(socketId => onlineUsers.get(socketId))
    .filter((u): u is OnlineUser => u !== undefined)
}

// ==================== SOCKET HANDLERS ====================
io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`)

  // ==================== IDENTIFICATION ====================
  socket.on('identify', (data: { userId: string; personaId?: string; personaName?: string }) => {
    const { userId, personaId, personaName } = data
    
    const onlineUser: OnlineUser = {
      socketId: socket.id,
      userId,
      personaId,
      personaName
    }
    
    onlineUsers.set(socket.id, onlineUser)
    console.log(`[Socket] User identified: ${userId}, persona: ${personaName || 'none'}`)
    
    socket.emit('identified')
  })

  socket.on('update-persona', (data: { userId: string; personaId: string; personaName: string }) => {
    const { userId, personaId, personaName } = data
    const user = onlineUsers.get(socket.id)
    
    if (user && user.userId === userId) {
      user.personaId = personaId
      user.personaName = personaName
      console.log(`[Socket] Updated persona for ${userId}: ${personaName}`)
    }
  })

  // ==================== CONVERSATIONS (DMs) ====================
  socket.on('join-conversation', (data: { conversationId: string }) => {
    const { conversationId } = data
    
    socket.join(`conversation:${conversationId}`)
    
    if (!conversationRooms.has(conversationId)) {
      conversationRooms.set(conversationId, new Set())
    }
    conversationRooms.get(conversationId)!.add(socket.id)
    
    console.log(`[Socket] ${socket.id} joined conversation: ${conversationId}`)
  })

  socket.on('leave-conversation', (data: { conversationId: string }) => {
    const { conversationId } = data
    
    socket.leave(`conversation:${conversationId}`)
    
    const room = conversationRooms.get(conversationId)
    if (room) {
      room.delete(socket.id)
      if (room.size === 0) {
        conversationRooms.delete(conversationId)
      }
    }
    
    console.log(`[Socket] ${socket.id} left conversation: ${conversationId}`)
  })

  socket.on('message-sent', (data: { conversationId: string; message: any }) => {
    const { conversationId, message } = data
    
    // Broadcast to everyone in the conversation
    io.to(`conversation:${conversationId}`).emit('new-message', message)
    console.log(`[Socket] Message sent in conversation ${conversationId}`)
  })

  socket.on('typing', (data: TypingData) => {
    const { conversationId, isTyping, personaName } = data
    
    if (conversationId) {
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        conversationId,
        isTyping,
        personaName
      })
    }
  })

  // ==================== CHANNELS (Storylines) ====================
  socket.on('join-channel', (data: { channelId: string }) => {
    const { channelId } = data
    
    socket.join(`channel:${channelId}`)
    
    if (!channelRooms.has(channelId)) {
      channelRooms.set(channelId, new Set())
    }
    channelRooms.get(channelId)!.add(socket.id)
    
    console.log(`[Socket] ${socket.id} joined channel: ${channelId}`)
  })

  socket.on('leave-channel', (data: { channelId: string }) => {
    const { channelId } = data
    
    socket.leave(`channel:${channelId}`)
    
    const room = channelRooms.get(channelId)
    if (room) {
      room.delete(socket.id)
      if (room.size === 0) {
        channelRooms.delete(channelId)
      }
    }
    
    console.log(`[Socket] ${socket.id} left channel: ${channelId}`)
  })

  socket.on('channel-message-sent', (data: { channelId: string; message: any }) => {
    const { channelId, message } = data
    
    // Broadcast to everyone in the channel
    io.to(`channel:${channelId}`).emit('new-channel-message', message)
    console.log(`[Socket] Message sent in channel ${channelId}`)
  })

  socket.on('channel-typing', (data: TypingData) => {
    const { channelId, isTyping, personaName } = data
    
    if (channelId) {
      socket.to(`channel:${channelId}`).emit('user-channel-typing', {
        channelId,
        isTyping,
        personaName
      })
    }
  })

  // ==================== ADMIN / ONLINE COUNT ====================
  socket.on('get-online-count', () => {
    const uniqueUsers = new Set(Array.from(onlineUsers.values()).map(u => u.userId))
    socket.emit('online-count', { 
      count: uniqueUsers.size, 
      sockets: onlineUsers.size 
    })
  })

  // ==================== BLORP (BOT) MESSAGES ====================
  socket.on('blorp-message', (data: { targetUserId: string; message: any }) => {
    const { targetUserId, message } = data
    
    // Find all sockets for the target user
    const targetSockets = getOnlineUsersByUserId(targetUserId)
    
    targetSockets.forEach(user => {
      io.to(user.socketId).emit('blorp-message', message)
    })
    
    console.log(`[Socket] Blorp message sent to user ${targetUserId}`)
  })

  // ==================== DM REFRESH ====================
  socket.on('trigger-dm-refresh', (data: { targetUserId: string }) => {
    const { targetUserId } = data
    
    const targetSockets = getOnlineUsersByUserId(targetUserId)
    targetSockets.forEach(user => {
      io.to(user.socketId).emit('dm-refresh')
    })
  })

  // ==================== DISCONNECT ====================
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id)
    
    if (user) {
      console.log(`[Socket] User disconnected: ${user.userId}`)
      
      // Remove from all rooms
      conversationRooms.forEach((sockets, convId) => {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          conversationRooms.delete(convId)
        }
      })
      
      channelRooms.forEach((sockets, chanId) => {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          channelRooms.delete(chanId)
        }
      })
      
      onlineUsers.delete(socket.id)
    } else {
      console.log(`[Socket] Unknown socket disconnected: ${socket.id}`)
    }
  })

  socket.on('error', (error) => {
    console.error(`[Socket] Error on ${socket.id}:`, error)
  })
})

// ==================== START SERVER ====================
const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[Chat Service] Running on port ${PORT}`)
})

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('[Chat Service] Received SIGTERM, shutting down...')
  httpServer.close(() => {
    console.log('[Chat Service] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Chat Service] Received SIGINT, shutting down...')
  httpServer.close(() => {
    console.log('[Chat Service] Server closed')
    process.exit(0)
  })
})
