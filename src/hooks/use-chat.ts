'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { usePersonaStore } from '@/stores/persona-store'
import type { MessageAttachment } from '@/lib/attachments'

export interface ChatAttachment {
  url: string
  /** 'image' | 'file' — legacy UI hint; newer payloads carry fileType */
  type?: string
  name?: string
  /** Full attachment metadata (messages API shape) */
  fileName?: string
  fileType?: string
  fileSize?: number
}

export interface MessageReaction {
  emoji: string
  count: number
  personas: { id: string; name: string }[]
  reactedByMe: boolean
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  sender: {
    id: string
    name: string
    avatarUrl: string | null
    isOfficial?: boolean
  }
  content: string
  imageUrl: string | null
  editedAt?: string | null
  readAt?: string | null
  forwardedFromName?: string | null
  forwardedFromPersonaName?: string | null
  editHistory?: Array<{ content: string; editedAt: string }> | null
  attachments?: ChatAttachment[] | null
  replyToId?: string | null
  replyTo?: {
    id: string
    content: string
    imageUrl?: string | null
    senderName: string
  } | null
  reactions?: MessageReaction[] | null
  createdAt: string
}

export interface ChannelMessage {
  id: string
  channelId: string
  senderId: string
  sender: {
    id: string
    name: string
    avatarUrl: string | null
    isOfficial?: boolean
  }
  content: string
  imageUrl: string | null
  createdAt: string
}

interface UseChatOptions {
  conversationId: string | null
  onNewMessage?: (message: ChatMessage) => void
  onTyping?: (data: { isTyping: boolean; personaName: string }) => void
}

/** Options for the `sendMessage` helper returned by `useChat`. */
export interface SendMessageOptions {
  /** Message text (may be empty when sending attachment-only messages) */
  content: string
  /** Persona sending the message (must belong to the caller and the conversation) */
  senderPersonaId: string
  /** Legacy single-image field — still fully supported */
  imageUrl?: string | null
  /** Multi-image attachments (max 5; validated server-side) */
  attachments?: MessageAttachment[] | null
  /** Message being replied to, if any */
  replyToId?: string | null
}

/** Live patch for a channel message (reactions, pins, edits) relayed
 *  through the socket service so other members' UIs update in realtime. */
export interface ChannelUpdate {
  type: 'reaction' | 'pin' | 'edit'
  messageId: string
  /** Reaction groups (present for `reaction` updates) */
  reactions?: Array<{ emoji: string; count: number; userIds: string[] }>
  /** New pinned state (present for `pin` updates) */
  isPinned?: boolean
  /** Edited content (present for `edit` updates) */
  content?: string
  /** Edit timestamp (present for `edit` updates) */
  editedAt?: string | null
}

interface UseChannelChatOptions {
  channelId: string | null
  onNewMessage?: (message: ChannelMessage) => void
  onTyping?: (data: { channelId: string; isTyping: boolean; personaName: string }) => void
  /** Called when another member toggles a reaction / pins / edits a message */
  onUpdate?: (update: ChannelUpdate) => void
}

// ── Connection Status Tracking ────────────────────────────────────────────────
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

type StatusListener = (status: ConnectionStatus) => void

const statusListeners = new Set<StatusListener>()
let currentStatus: ConnectionStatus = 'disconnected'

function setConnectionStatus(status: ConnectionStatus) {
  if (currentStatus === status) return
  currentStatus = status
  statusListeners.forEach((listener) => listener(status))
}

export function getConnectionStatus(): ConnectionStatus {
  return currentStatus
}

export function onConnectionStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener)
  // Immediately call with current status
  listener(currentStatus)
  return () => {
    statusListeners.delete(listener)
  }
}

// ── Socket URL ────────────────────────────────────────────────────────────────
function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL
  }
  // In development, use the gateway with XTransformPort
  return ''
}

// ── Singleton Socket Instance ─────────────────────────────────────────────────
let socketInstance: Socket | null = null
let socketUsers = 0
let healthCheckInterval: ReturnType<typeof setInterval> | null = null
let isReconnectingManually = false

function startHealthCheck() {
  if (healthCheckInterval) return

  // Poll every 10s to detect if the chat service has come online
  healthCheckInterval = setInterval(() => {
    if (socketInstance && !socketInstance.connected && currentStatus === 'failed') {
      console.log('[Socket] Health check: chat service may be back online, attempting reconnect...')
      isReconnectingManually = true
      socketInstance.connect()
    }
  }, 10000)
}

function stopHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
}

function getSocket(): Socket | null {
  if (!socketInstance) {
    const socketUrl = getSocketUrl()

    // For gateway routing, we need to pass XTransformPort in query
    socketInstance = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 30000,
      forceNew: false,
      query: { XTransformPort: '3003' },
    })

    setConnectionStatus('connecting')

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance?.id)
      setConnectionStatus('connected')
      isReconnectingManually = false
    })

    socketInstance.on('disconnect', (reason: Socket.DisconnectReason) => {
      console.log('[Socket] Disconnected:', reason)
      // Only set to disconnected if it's a clean disconnect (not the server
      // dropping us — socket.io will auto-reconnect in that case)
      if (reason === 'io client disconnect') {
        setConnectionStatus('disconnected')
        stopHealthCheck()
      } else {
        setConnectionStatus('reconnecting')
      }
    })

    socketInstance.on('connect_error', (error: Error) => {
      const isTimeout = error.message === 'timeout'

      if (isTimeout) {
        console.warn(
          '[Socket] Connection timeout — the chat service may not be running yet. ' +
          'Will retry automatically.'
        )
      } else {
        console.warn('[Socket] Connection error:', error.message)
      }

      // If socket.io has exhausted its reconnection attempts, mark as failed
      // and start our own health-check loop so we reconnect when the service
      // comes back online.
      if (
        socketInstance &&
        !socketInstance.connected &&
        !socketInstance.active
      ) {
        setConnectionStatus('failed')
        startHealthCheck()
      } else if (currentStatus !== 'failed') {
        setConnectionStatus('reconnecting')
      }
    })

    socketInstance.on('reconnect', (attemptNumber: number) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
      setConnectionStatus('connected')
      isReconnectingManually = false
    })

    socketInstance.on('reconnect_failed', () => {
      console.warn('[Socket] All reconnection attempts exhausted. Starting health check...')
      setConnectionStatus('failed')
      startHealthCheck()
    })

    socketInstance.on('reconnect_attempt', (attempt: number) => {
      console.log('[Socket] Reconnection attempt', attempt)
      setConnectionStatus('reconnecting')
    })

    // Start the health check right away in case the chat service isn't running yet
    startHealthCheck()
  }
  return socketInstance
}

function releaseSocket() {
  socketUsers--
  if (socketUsers <= 0 && socketInstance) {
    stopHealthCheck()
    socketInstance.disconnect()
    socketInstance = null
    socketUsers = 0
    setConnectionStatus('disconnected')
  }
}

// ── Manual Reconnect Helper ───────────────────────────────────────────────────
export function reconnectSocket() {
  if (socketInstance) {
    console.log('[Socket] Manual reconnect triggered')
    isReconnectingManually = true
    socketInstance.disconnect().connect()
    setConnectionStatus('connecting')
  } else {
    // No instance yet — calling getSocket() will create one
    getSocket()
  }
}

// ── useConnectionStatus Hook ──────────────────────────────────────────────────
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(currentStatus)

  useEffect(() => {
    return onConnectionStatusChange(setStatus)
  }, [])

  return status
}

// Hook for DM conversations
export function useChat({ conversationId, onNewMessage, onTyping }: UseChatOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [isIdentified, setIsIdentified] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { user } = useAuthStore()
  const { activePersona } = usePersonaStore()

  // Connect to socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socketUsers++
    socketRef.current = socket

    const handleConnect = () => {
      setIsConnected(true)
      console.log('[Chat] Socket connected')

      // Identify ourselves
      if (user && activePersona) {
        socket.emit('identify', {
          userId: user.id,
          personaId: activePersona.id,
          personaName: activePersona.name
        })
      } else if (user) {
        socket.emit('identify', { userId: user.id })
      }
    }

    const handleDisconnect = () => {
      setIsConnected(false)
      setIsIdentified(false)
      console.log('[Chat] Socket disconnected')
    }

    const handleIdentified = () => {
      setIsIdentified(true)
      console.log('[Chat] Socket identified')
    }

    const handleNewMessage = (message: ChatMessage) => {
      console.log('[Chat] New message received:', message)
      onNewMessage?.(message)
    }

    const handleTyping = (data: { conversationId: string; isTyping: boolean; personaName: string }) => {
      onTyping?.(data)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('identified', handleIdentified)
    socket.on('new-message', handleNewMessage)
    socket.on('user-typing', handleTyping)

    // If already connected, trigger connect handler
    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('identified', handleIdentified)
      socket.off('new-message', handleNewMessage)
      socket.off('user-typing', handleTyping)
      releaseSocket()
    }
  }, [user?.id])

  // Join/leave conversation
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !isConnected || !conversationId) return

    // Join the conversation room
    socket.emit('join-conversation', { conversationId })
    console.log('[Chat] Joined conversation:', conversationId)

    return () => {
      socket.emit('leave-conversation', { conversationId })
      console.log('[Chat] Left conversation:', conversationId)
    }
  }, [isConnected, conversationId])

  // Update identity when activePersona changes
  useEffect(() => {
    const socket = socketRef.current
    if (socket && isConnected && user && activePersona) {
      socket.emit('update-persona', {
        userId: user.id,
        personaId: activePersona.id,
        personaName: activePersona.name
      })
    }
  }, [isConnected, activePersona?.id, user?.id])

  // Broadcast message to conversation
  const broadcastMessage = useCallback((message: ChatMessage) => {
    const socket = socketRef.current
    if (socket && isConnected) {
      socket.emit('message-sent', {
        conversationId: message.conversationId,
        message
      })
      console.log('[Chat] Message broadcast:', message.id)
    }
  }, [isConnected])

  // Send a message via the REST API, then broadcast the saved message
  // (including its attachments) to the other participants over the socket.
  // `imageUrl` keeps working for single-image sends; `attachments` enables
  // multi-image messages.
  const sendMessage = useCallback(async (options: SendMessageOptions): Promise<ChatMessage | null> => {
    if (!conversationId) return null
    const { content, senderPersonaId, imageUrl, attachments, replyToId } = options
    if (
      (!content || !content.trim()) &&
      !imageUrl &&
      (!attachments || attachments.length === 0)
    ) {
      return null
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          senderPersonaId,
          imageUrl: imageUrl || null,
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
          replyToId: replyToId || null,
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        console.error('[Chat] Failed to send message:', response.status, text)
        return null
      }

      const data = await response.json()
      const message: ChatMessage = data.message
      // Realtime echo to the other participant(s) — the payload includes
      // the message's attachments array
      broadcastMessage(message)
      return message
    } catch (error) {
      console.error('[Chat] Send message error:', error)
      return null
    }
  }, [conversationId, broadcastMessage])

  // Typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current
    if (socket && isConnected && activePersona && conversationId) {
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      socket.emit('typing', {
        conversationId,
        isTyping,
        personaName: activePersona.name
      })

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', {
            conversationId,
            isTyping: false,
            personaName: activePersona.name
          })
        }, 3000)
      }
    }
  }, [isConnected, activePersona, conversationId])

  return {
    isConnected,
    isIdentified,
    broadcastMessage,
    sendMessage,
    sendTyping,
  }
}

// Hook for storyline channels
export function useChannelChat({ channelId, onNewMessage, onTyping, onUpdate }: UseChannelChatOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { user } = useAuthStore()
  const { activePersona } = usePersonaStore()

  // Connect to socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socketUsers++
    socketRef.current = socket

    const handleConnect = () => {
      setIsConnected(true)

      if (user && activePersona) {
        socket.emit('identify', {
          userId: user.id,
          personaId: activePersona.id,
          personaName: activePersona.name
        })
      } else if (user) {
        socket.emit('identify', { userId: user.id })
      }
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      releaseSocket()
    }
  }, [user?.id])

  // Join/leave channel
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !isConnected || !channelId) return

    socket.emit('join-channel', { channelId })
    console.log('[Channel] Joined channel:', channelId)

    return () => {
      socket.emit('leave-channel', { channelId })
      console.log('[Channel] Left channel:', channelId)
    }
  }, [isConnected, channelId])

  // Listen for new channel messages + typing + live updates
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !channelId) return

    const handleNewMessage = (message: ChannelMessage) => {
      console.log('[Channel] New message received:', message)
      onNewMessage?.(message)
    }

    const handleTyping = (data: { channelId: string; isTyping: boolean; personaName: string }) => {
      onTyping?.(data)
    }

    const handleUpdate = (update: ChannelUpdate) => {
      console.log('[Channel] Live update received:', update.type, update.messageId)
      onUpdate?.(update)
    }

    socket.on('new-channel-message', handleNewMessage)
    socket.on('user-channel-typing', handleTyping)
    socket.on('channel-updated', handleUpdate)

    return () => {
      socket.off('new-channel-message', handleNewMessage)
      socket.off('user-channel-typing', handleTyping)
      socket.off('channel-updated', handleUpdate)
    }
  }, [channelId, onNewMessage, onTyping, onUpdate])

  // Broadcast a live update (reaction toggle / pin / edit) to the channel.
  // The socket service relays this to everyone else in the room.
  const broadcastEvent = useCallback((update: ChannelUpdate) => {
    const socket = socketRef.current
    if (socket && isConnected && channelId) {
      socket.emit('channel-event', { channelId, update })
    }
  }, [isConnected, channelId])

  // Broadcast message to channel
  const broadcastMessage = useCallback((message: ChannelMessage) => {
    const socket = socketRef.current
    if (socket && isConnected) {
      socket.emit('channel-message-sent', {
        channelId: message.channelId,
        message
      })
    }
  }, [isConnected])

  // Typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current
    if (socket && isConnected && activePersona && channelId) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      socket.emit('channel-typing', {
        channelId,
        isTyping,
        personaName: activePersona.name
      })

      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('channel-typing', {
            channelId,
            isTyping: false,
            personaName: activePersona.name
          })
        }, 3000)
      }
    }
  }, [isConnected, activePersona, channelId])

  return {
    isConnected,
    broadcastMessage,
    broadcastEvent,
    sendTyping,
  }
}

/** A reply inside a storyline thread (structural type — the API response
 *  shape flows through the socket untouched). */
export interface ThreadChatMessage {
  id: string
  threadId?: string
  content: string
  imageUrl: string | null
  attachments?: ChatAttachment[] | null
  createdAt: string
  sender: {
    id: string
    name: string
    avatarUrl: string | null
    username?: string
  }
}

interface UseThreadChatOptions {
  threadId: string | null
  onNewMessage?: (message: ThreadChatMessage) => void
  onTyping?: (data: { threadId: string; isTyping: boolean; personaName: string }) => void
}

// Hook for storyline threads (the side panel). Joins a per-thread room so
// replies from other members stream in live while the panel is open.
export function useThreadChat({ threadId, onNewMessage, onTyping }: UseThreadChatOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { user } = useAuthStore()
  const { activePersona } = usePersonaStore()

  // Connect to socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socketUsers++
    socketRef.current = socket

    const handleConnect = () => {
      setIsConnected(true)

      if (user && activePersona) {
        socket.emit('identify', {
          userId: user.id,
          personaId: activePersona.id,
          personaName: activePersona.name
        })
      } else if (user) {
        socket.emit('identify', { userId: user.id })
      }
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      releaseSocket()
    }
  }, [user?.id])

  // Join/leave the thread room
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !isConnected || !threadId) return

    socket.emit('join-thread', { threadId })
    console.log('[Thread] Joined thread:', threadId)

    return () => {
      socket.emit('leave-thread', { threadId })
      console.log('[Thread] Left thread:', threadId)
    }
  }, [isConnected, threadId])

  // Listen for new thread replies + typing
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !threadId) return

    const handleNewMessage = (message: ThreadChatMessage) => {
      console.log('[Thread] New reply received:', message)
      onNewMessage?.(message)
    }

    const handleTyping = (data: { threadId: string; isTyping: boolean; personaName: string }) => {
      onTyping?.(data)
    }

    socket.on('new-thread-message', handleNewMessage)
    socket.on('user-thread-typing', handleTyping)

    return () => {
      socket.off('new-thread-message', handleNewMessage)
      socket.off('user-thread-typing', handleTyping)
    }
  }, [threadId, onNewMessage, onTyping])

  // Broadcast a new reply to the thread room
  const broadcastThreadMessage = useCallback((message: ThreadChatMessage) => {
    const socket = socketRef.current
    if (socket && isConnected && threadId) {
      socket.emit('thread-message-sent', {
        threadId,
        message
      })
    }
  }, [isConnected, threadId])

  // Typing indicator for the thread panel
  const sendThreadTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current
    if (socket && isConnected && activePersona && threadId) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      socket.emit('thread-typing', {
        threadId,
        isTyping,
        personaName: activePersona.name
      })

      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('thread-typing', {
            threadId,
            isTyping: false,
            personaName: activePersona.name
          })
        }, 3000)
      }
    }
  }, [isConnected, activePersona, threadId])

  return {
    isConnected,
    broadcastThreadMessage,
    sendThreadTyping,
  }
}

// Utility to get online users count (admin use)
export function useOnlineCount() {
  const [count, setCount] = useState(0)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socketRef.current = socket

    const handleCount = (data: { count: number; sockets: number }) => {
      setCount(data.count)
    }

    socket.on('online-count', handleCount)

    // Request count periodically
    const interval = setInterval(() => {
      socket.emit('get-online-count')
    }, 30000)

    // Initial request
    if (socket.connected) {
      socket.emit('get-online-count')
    }

    return () => {
      clearInterval(interval)
      socket.off('online-count', handleCount)
    }
  }, [])

  return count
}

// ── Realtime notification / DM-activity push ─────────────────────────────────
// Subscribes to the user's PERSONAL socket room (joined server-side on
// identify) for backend-pushed events:
//   • notification:new — a notification was just created for this user
//     (friend request, gift, DM request, admin action, broadcast…)
//   • dm:new-message  — a new DM message arrived in one of the user's
//     conversations (drives live unread badges / sidebar refreshes)
// The socket singleton is shared with the chat hooks; identify is re-emitted
// on (re)connect so the personal room membership is always current.

/** Payload pushed by the backend for a freshly-created notification. */
export interface RealtimeNotification {
  id?: string
  userId?: string
  type: string
  title: string
  message: string
  data?: string | null
  isRead?: boolean
  isDismissed?: boolean
  createdAt?: string
  /** Bulk pushes (broadcasts) don't carry per-user ids — clients refetch */
  bulk?: boolean
}

/** Payload pushed when a new DM message arrives for the user. */
export interface RealtimeDmActivity {
  conversationId: string
  preview?: string
  fromPersonaName?: string
}

interface UseRealtimeNotificationsOptions {
  /** Render-gate: only subscribe while authenticated */
  enabled: boolean
  /** Fires when a notification is created for this user */
  onNotification?: (notification: RealtimeNotification) => void
  /** Fires when DM activity happens in one of the user's conversations */
  onDmActivity?: (activity: RealtimeDmActivity) => void
}

export function useRealtimeNotifications({
  enabled,
  onNotification,
  onDmActivity,
}: UseRealtimeNotificationsOptions) {
  const { user } = useAuthStore()
  const { activePersona } = usePersonaStore()
  const onNotificationRef = useRef(onNotification)
  const onDmActivityRef = useRef(onDmActivity)

  // Keep the callbacks fresh without resubscribing the socket listeners
  useEffect(() => {
    onNotificationRef.current = onNotification
    onDmActivityRef.current = onDmActivity
  })

  useEffect(() => {
    if (!enabled || !user) return

    const socket = getSocket()
    if (!socket) return

    socketUsers++
    let identifiedThisSession = false

    const identifyNow = () => {
      if (activePersona) {
        socket.emit('identify', {
          userId: user.id,
          personaId: activePersona.id,
          personaName: activePersona.name,
        })
      } else {
        socket.emit('identify', { userId: user.id })
      }
      identifiedThisSession = true
    }

    const handleConnect = () => {
      // (Re)identify so the server keeps this socket in our personal room
      identifyNow()
    }

    const handleNotification = (payload: RealtimeNotification) => {
      onNotificationRef.current?.(payload)
    }

    const handleDmActivity = (payload: RealtimeDmActivity) => {
      if (payload && typeof payload.conversationId === 'string') {
        onDmActivityRef.current?.(payload)
      }
    }

    socket.on('connect', handleConnect)
    socket.on('notification:new', handleNotification)
    socket.on('dm:new-message', handleDmActivity)

    // If the socket is already connected we may have missed the connect
    // event — identify immediately (idempotent).
    if (socket.connected && !identifiedThisSession) {
      identifyNow()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('notification:new', handleNotification)
      socket.off('dm:new-message', handleDmActivity)
      releaseSocket()
    }
  }, [enabled, user, activePersona?.id])
}
