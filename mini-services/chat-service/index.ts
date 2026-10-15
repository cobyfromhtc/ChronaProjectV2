import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'

// ===========================================
// Environment Configuration
// ===========================================

const PORT = parseInt(process.env.PORT || process.env.CHAT_SERVICE_PORT || '3003', 10)
const NODE_ENV = process.env.NODE_ENV || 'development'
const isProduction = NODE_ENV === 'production'

// Parse allowed CORS origins from environment
const parseCorsOrigins = (): string[] => {
  const originsEnv = process.env.CHAT_CORS_ORIGINS || process.env.CORS_ORIGINS || ''
  
  if (!originsEnv) {
    if (isProduction) {
      console.error('[CORS] WARNING: No CORS origins specified in production!')
      console.error('[CORS] Set CHAT_CORS_ORIGINS or CORS_ORIGINS environment variable')
      return [] // Block all in production if not configured
    }
    // Development default: no allowlist → all origins allowed. The service
    // sits behind the sandbox gateway (which rewrites Host), so browsers
    // reach it via the gateway host or an external preview URL — a fixed
    // localhost allowlist would reject them.
    return []
  }
  
  return originsEnv.split(',').map(o => o.trim()).filter(Boolean)
}

const allowedOrigins = parseCorsOrigins()

console.log('='.repeat(50))
console.log('Chrona Chat Service')
console.log('='.repeat(50))
console.log(`Environment: ${NODE_ENV}`)
console.log(`Port: ${PORT}`)
console.log(`Allowed CORS Origins: ${allowedOrigins.join(', ') || (isProduction ? 'None (blocked)' : 'All (development default)')}`)
console.log('='.repeat(50))

// ===========================================
// HTTP Server & Socket.io Setup
// ===========================================

// ===========================================
// Internal Emit API (server-to-server)
// ===========================================
// Next.js API routes POST here to broadcast events authoritatively (e.g.
// pushing a new notification to a user's personal room). Guarded by a
// shared internal token — NOT for public use.

const INTERNAL_EMIT_TOKEN = process.env.INTERNAL_EMIT_TOKEN || 'chrona-internal-emit-2026'

interface EmitRequestBody {
  token?: string
  room?: string
  rooms?: string[]
  event?: string
  payload?: unknown
}

function handleEmitRequest(req: IncomingMessage, res: ServerResponse) {
  const sendJson = (status: number, body: Record<string, unknown>) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  if (req.method !== 'POST') {
    sendJson(405, { error: 'Method not allowed' })
    return
  }

  let raw = ''
  req.on('data', (chunk: Buffer) => {
    raw += chunk.toString()
    if (raw.length > 1_000_000) req.destroy() // 1MB guard
  })
  req.on('error', () => {
    /* client aborted — ignore */
  })
  req.on('end', () => {
    try {
      const body = JSON.parse(raw || '{}') as EmitRequestBody
      if (body.token !== INTERNAL_EMIT_TOKEN) {
        sendJson(401, { error: 'Invalid token' })
        return
      }
      const rooms = body.rooms ?? (body.room ? [body.room] : [])
      if (rooms.length === 0 || !body.event) {
        sendJson(400, { error: 'room(s) and event are required' })
        return
      }
      let delivered = 0
      for (const room of rooms) {
        const clients = io.sockets.adapter.rooms.get(room)
        delivered += clients ? clients.size : 0
        io.to(room).emit(body.event, body.payload)
      }
      console.log(`[${new Date().toISOString()}] [emit] ${body.event} → ${rooms.join(', ')} (${delivered} client${delivered === 1 ? '' : 's'})`)
      sendJson(200, { success: true, rooms: rooms.length, delivered })
    } catch (e) {
      sendJson(400, { error: 'Invalid JSON body' })
    }
  })
}

const httpServer = createServer((req, res) => {
  // Only the internal emit endpoint is served over plain HTTP; every
  // other path (notably /socket.io) is handled by socket.io itself.
  if (req.url === '/api/emit') {
    handleEmitRequest(req, res)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})
const io = new Server(httpServer, {
  // Default path is /socket.io - this is required for socket.io protocol
  path: '/socket.io',
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        if (isProduction) {
          // In production, reject requests without origin
          callback(new Error('Origin header required'))
          return
        }
        // Allow in development
        callback(null, true)
        return
      }
      
      // Check if origin is allowed
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`[CORS] Rejected connection from origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8, // 100MB for large messages/images
})

// ===========================================
// Connection Management
// ===========================================

// Store connected users with their persona info
interface ConnectedUser {
  socketId: string
  userId: string
  activePersonaId: string | null
  activePersonaName: string | null
}

const connectedUsers = new Map<string, ConnectedUser>()

// Track users by userId for quick lookup
const userSockets = new Map<string, Set<string>>()

io.on('connection', (socket: Socket) => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`)
  console.log(`Current connections: ${connectedUsers.size + 1}`)

  // User identifies themselves
  socket.on('identify', (data: { userId: string; personaId?: string; personaName?: string }) => {
    const { userId, personaId, personaName } = data
    
    const userInfo: ConnectedUser = {
      socketId: socket.id,
      userId,
      activePersonaId: personaId || null,
      activePersonaName: personaName || null
    }
    connectedUsers.set(socket.id, userInfo)
    
    // Track all sockets for this user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }
    userSockets.get(userId)!.add(socket.id)

    // Personal user room — the server pushes notifications / DM pings
    // here (via the internal emit API). Also join the global broadcast
    // room used for platform-wide announcements.
    socket.join(`user:${userId}`)
    socket.join('broadcast:all')
    
    socket.emit('identified', { success: true, socketId: socket.id })
    console.log(`[${new Date().toISOString()}] User ${userId} identified with persona "${personaName || 'none'}"`)
    console.log(`Total users online: ${userSockets.size}`)
  })

  // Join a DM conversation room
  socket.on('join-conversation', (data: { conversationId: string }) => {
    socket.join(`conversation:${data.conversationId}`)
    socket.emit('joined-conversation', { conversationId: data.conversationId })
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} joined DM conversation ${data.conversationId}`)
  })

  // Leave a DM conversation room
  socket.on('leave-conversation', (data: { conversationId: string }) => {
    socket.leave(`conversation:${data.conversationId}`)
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} left DM conversation ${data.conversationId}`)
  })

  // Join a storyline channel room
  socket.on('join-channel', (data: { channelId: string }) => {
    socket.join(`channel:${data.channelId}`)
    socket.emit('joined-channel', { channelId: data.channelId })
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} joined channel ${data.channelId}`)
  })

  // Leave a storyline channel room
  socket.on('leave-channel', (data: { channelId: string }) => {
    socket.leave(`channel:${data.channelId}`)
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} left channel ${data.channelId}`)
  })

  // Broadcast new message to DM conversation
  // NOTE: the message object is passed through untouched — this includes
  // the `attachments` array (multi-image message metadata) alongside the
  // legacy `imageUrl` field.
  socket.on('message-sent', (data: { 
    conversationId: string
    message: {
      id: string
      conversationId: string
      senderId: string
      sender: { id: string; name: string; avatarUrl: string | null }
      content: string
      imageUrl: string | null
      attachments?: Array<{ url: string; fileName: string; fileType: string; fileSize: number }> | null
      createdAt: string
    }
  }) => {
    const { conversationId, message } = data
    // Broadcast to all other users in the conversation
    socket.to(`conversation:${conversationId}`).emit('new-message', message)
    console.log(`[${new Date().toISOString()}] Message broadcast to DM conversation ${conversationId}`)
  })

  // Broadcast new message to storyline channel
  // (message passed through untouched, same as DM broadcasts)
  socket.on('channel-message-sent', (data: { 
    channelId: string
    message: {
      id: string
      channelId: string
      senderId: string
      sender: { id: string; name: string; avatarUrl: string | null }
      content: string
      imageUrl: string | null
      attachments?: Array<{ url: string; fileName: string; fileType: string; fileSize: number }> | null
      createdAt: string
    }
  }) => {
    const { channelId, message } = data
    // Broadcast to all users in the channel
    socket.to(`channel:${channelId}`).emit('new-channel-message', message)
    console.log(`[${new Date().toISOString()}] Message broadcast to channel ${channelId}`)
  })

  // Typing indicator for DMs
  socket.on('typing', (data: { conversationId: string; isTyping: boolean; personaName: string }) => {
    const { conversationId, isTyping, personaName } = data
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      conversationId,
      isTyping,
      personaName,
    })
  })

  // Typing indicator for channels
  socket.on('channel-typing', (data: { channelId: string; isTyping: boolean; personaName: string }) => {
    const { channelId, isTyping, personaName } = data
    socket.to(`channel:${channelId}`).emit('user-channel-typing', {
      channelId,
      isTyping,
      personaName,
    })
  })

  // ── Thread rooms ──────────────────────────────────────────────────────────
  // Threads live inside channel messages; each thread gets its own room so
  // users with the thread panel open receive replies in real time.

  // Join a storyline thread room
  socket.on('join-thread', (data: { threadId: string }) => {
    socket.join(`thread:${data.threadId}`)
    socket.emit('joined-thread', { threadId: data.threadId })
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} joined thread ${data.threadId}`)
  })

  // Leave a storyline thread room
  socket.on('leave-thread', (data: { threadId: string }) => {
    socket.leave(`thread:${data.threadId}`)
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} left thread ${data.threadId}`)
  })

  // Broadcast a new thread reply to everyone else viewing the thread
  socket.on('thread-message-sent', (data: {
    threadId: string
    message: {
      id: string
      threadId: string
      content: string
      imageUrl: string | null
      attachments?: Array<{ url: string; fileName: string; fileType: string; fileSize: number }> | null
      createdAt: string
      sender: { id: string; name: string; avatarUrl: string | null; username?: string }
    }
  }) => {
    const { threadId, message } = data
    socket.to(`thread:${threadId}`).emit('new-thread-message', message)
    console.log(`[${new Date().toISOString()}] Message broadcast to thread ${threadId}`)
  })

  // Typing indicator for threads
  socket.on('thread-typing', (data: { threadId: string; isTyping: boolean; personaName: string }) => {
    const { threadId, isTyping, personaName } = data
    socket.to(`thread:${threadId}`).emit('user-thread-typing', {
      threadId,
      isTyping,
      personaName,
    })
  })

  // ── Channel live-update relay (reactions, pins, edits) ─────────────────────
  // A client that toggles a reaction / pins / edits a message relays the
  // resulting patch to everyone else in the channel so their UI updates
  // without a refetch. The `update` payload is passed through untouched.
  socket.on('channel-event', (data: {
    channelId: string
    update: {
      type: 'reaction' | 'pin' | 'edit'
      messageId: string
      reactions?: Array<{ emoji: string; count: number; userIds: string[] }>
      isPinned?: boolean
      content?: string
      editedAt?: string | null
    }
  }) => {
    const { channelId, update } = data
    socket.to(`channel:${channelId}`).emit('channel-updated', update)
    console.log(`[${new Date().toISOString()}] ${update.type} update relayed to channel ${channelId} (message ${update.messageId})`)
  })

  // Update active persona
  socket.on('update-persona', (data: { userId: string; personaId: string; personaName: string }) => {
    const userInfo = connectedUsers.get(socket.id)
    if (userInfo && userInfo.userId === data.userId) {
      userInfo.activePersonaId = data.personaId
      userInfo.activePersonaName = data.personaName
      console.log(`[${new Date().toISOString()}] User ${data.userId} switched to persona "${data.personaName}"`)
    }
  })

  // Get online users count
  socket.on('get-online-count', () => {
    socket.emit('online-count', { 
      count: userSockets.size,
      sockets: connectedUsers.size 
    })
  })

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const userInfo = connectedUsers.get(socket.id)
    if (userInfo) {
      // Remove from userSockets map
      const userSocketSet = userSockets.get(userInfo.userId)
      if (userSocketSet) {
        userSocketSet.delete(socket.id)
        if (userSocketSet.size === 0) {
          userSockets.delete(userInfo.userId)
        }
      }
      connectedUsers.delete(socket.id)
      console.log(`[${new Date().toISOString()}] User disconnected: ${userInfo.userId} (reason: ${reason})`)
      console.log(`Total users online: ${userSockets.size}, Total sockets: ${connectedUsers.size}`)
    } else {
      console.log(`[${new Date().toISOString()}] Unknown socket disconnected: ${socket.id} (reason: ${reason})`)
    }
  })

  // Error handling
  socket.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Socket error (${socket.id}):`, error)
  })
})

// ===========================================
// Server Startup
// ===========================================

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Chat WebSocket server running on port ${PORT}`)
  console.log(`Ready to accept connections!`)
})

// ===========================================
// Graceful Shutdown
// ===========================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down server...`)
  
  // Notify all connected clients
  io.emit('server-shutdown', { message: 'Server is shutting down' })
  
  // Close all connections
  io.close(() => {
    console.log('All connections closed')
    httpServer.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('Forcing exit...')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})
