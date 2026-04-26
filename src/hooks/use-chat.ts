'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { usePersonaStore } from '@/stores/persona-store'

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

interface UseChannelChatOptions {
  channelId: string | null
  onNewMessage?: (message: ChannelMessage) => void
  onTyping?: (data: { channelId: string; isTyping: boolean; personaName: string }) => void
}

// Socket URL - in development use local, in production use your server
function getSocketUrl(): string {
  // In production, set NEXT_PUBLIC_SOCKET_URL to your server's URL
  // e.g., https://chat.yourdomain.com or http://your-oracle-ip:3003
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL
  }
  
  // In development, use the gateway with XTransformPort
  return ''
}

// Singleton socket instance
let socketInstance: Socket | null = null
let socketUsers = 0

function getSocket(): Socket | null {
  if (!socketInstance) {
    const socketUrl = getSocketUrl()
    
    // Check if we're using relative path (gateway) or absolute URL
    const isRelative = !socketUrl || socketUrl.startsWith('/')
    
    // For gateway routing, we need to pass XTransformPort in query
    // The path should be '/' to match what the server expects
    socketInstance = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      // For gateway routing - pass as query param
      query: { XTransformPort: '3003' },
    })
    
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance?.id)
    })
    
    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })
    
    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
    })
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
    })
  }
  return socketInstance
}

function releaseSocket() {
  socketUsers--
  if (socketUsers <= 0 && socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
    socketUsers = 0
  }
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
    sendTyping,
  }
}

// Hook for storyline channels
export function useChannelChat({ channelId, onNewMessage, onTyping }: UseChannelChatOptions) {
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
  
  // Listen for new channel messages
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
    
    socket.on('new-channel-message', handleNewMessage)
    socket.on('user-channel-typing', handleTyping)
    
    return () => {
      socket.off('new-channel-message', handleNewMessage)
      socket.off('user-channel-typing', handleTyping)
    }
  }, [channelId, onNewMessage, onTyping])
  
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
    sendTyping,
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
