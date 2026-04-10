'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { usePersonaStore } from '@/stores/persona-store'
import { DM_REFRESH_EVENT } from '@/components/dm-sidebar'

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

// Detect if we're in a sandbox environment (with gateway) or local development
function isSandboxEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  // Sandbox environments use space.z.ai or similar domains
  return hostname.includes('space.z.ai') || hostname.includes('.z.ai') || hostname.includes('ngrok')
}

// Socket URL - in development use local, in production use your server
function getSocketConfig(): { url: string; useGateway: boolean } {
  // In production, set NEXT_PUBLIC_SOCKET_URL to your server's URL
  // e.g., https://chat.yourdomain.com or http://your-oracle-ip:3003
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return { url: process.env.NEXT_PUBLIC_SOCKET_URL, useGateway: false }
  }
  
  // In sandbox environment, use gateway routing with XTransformPort
  if (isSandboxEnvironment()) {
    return { url: '', useGateway: true }
  }
  
  // In local development, connect directly to chat service
  return { url: 'http://localhost:3003', useGateway: false }
}

// Singleton socket instance
let socketInstance: Socket | null = null
let socketUsers = 0
let connectionAttempt = 0
let maxRetries = 5

function getSocket(): Socket | null {
  if (!socketInstance) {
    const config = getSocketConfig()
    
    // Configure socket based on environment
    const socketOptions: Parameters<typeof io>[1] = {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000, // Increased timeout
      forceNew: false,
      autoConnect: true,
    }
    
    // For gateway routing - pass XTransformPort as query param
    if (config.useGateway) {
      socketOptions.query = { XTransformPort: '3003' }
    }
    
    socketInstance = io(config.url, socketOptions)
    
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance?.id)
      connectionAttempt = 0 // Reset on successful connection
    })
    
    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })
    
    socketInstance.on('connect_error', (error) => {
      connectionAttempt++
      console.error(`[Socket] Connection error (attempt ${connectionAttempt}):`, error.message)
      
      // If we've failed multiple times, log a more helpful message
      if (connectionAttempt >= maxRetries) {
        console.warn('[Socket] Multiple connection failures. The chat service may not be running.')
      }
    })
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
      connectionAttempt = 0
    })
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnect error:', error.message)
    })
    
    socketInstance.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after maximum attempts')
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

    const handleBlorpMessage = (message: ChatMessage) => {
      console.log('[Chat] Blorp message received:', message)
      onNewMessage?.(message)
      // Trigger DM refresh event
      window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
    }

    const handleDmRefresh = () => {
      console.log('[Chat] DM refresh event received')
      window.dispatchEvent(new CustomEvent(DM_REFRESH_EVENT))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('identified', handleIdentified)
    socket.on('new-message', handleNewMessage)
    socket.on('user-typing', handleTyping)
    socket.on('blorp-message', handleBlorpMessage)
    socket.on('dm-refresh', handleDmRefresh)
    
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
      socket.off('blorp-message', handleBlorpMessage)
      socket.off('dm-refresh', handleDmRefresh)
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