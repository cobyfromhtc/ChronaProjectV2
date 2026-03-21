'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore, User, Account } from '@/stores/auth-store'

// Set personas online status
async function setOnlineStatus(isOnline: boolean) {
  try {
    await fetch('/api/personas/online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline }),
    })
  } catch (error) {
    console.error('Failed to update online status:', error)
  }
}

// Set offline using fetch with keepalive (for page unload)
function setOfflineOnExit() {
  fetch('/api/personas/online', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline: false }),
    keepalive: true, // Ensures request completes even if page unloads
  })
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    throw new Error(`Expected JSON response, got ${response.statusText || response.status}: ${text.slice(0, 300)}`)
  }

  return response.json()
}

export function useAuth() {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    accounts,
    setUser, 
    setLoading, 
    logout: storeLogout,
    setAccounts,
    addAccount,
    removeAccount,
    switchAccount,
    getActiveAccount,
  } = useAuthStore()
  
  const hasSetOnline = useRef(false)

  // Fetch current session on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/me')
        
        if (response.ok) {
          const data = await parseJsonResponse(response)
          setUser(data.user)
          
          // Also fetch all accounts
          const accountsResponse = await fetch('/api/auth/accounts')
          if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json()
            if (accountsData.accounts) {
              setAccounts(accountsData.accounts)
            }
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to fetch session:', error)
        setUser(null)
      }
    }
    
    fetchSession()
  }, [setUser, setAccounts])
  
  // Set online status when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !hasSetOnline.current) {
      setOnlineStatus(true)
      hasSetOnline.current = true
    }
  }, [isAuthenticated, user])
  
  // Handle browser close/refresh - set offline
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAuthenticated) {
        setOfflineOnExit()
      }
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isAuthenticated) {
        // Page is hidden, set offline
        setOfflineOnExit()
      } else if (document.visibilityState === 'visible' && isAuthenticated) {
        // Page is visible again, set online
        setOnlineStatus(true)
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated])
  
  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    let data: any
    try {
      data = await parseJsonResponse(response)
    } catch (err) {
      throw new Error(`Login failed: ${err instanceof Error ? err.message : 'Invalid server response'}`)
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Login failed')
    }

    setUser(data.user)
    addAccount(data.user)
    await setOnlineStatus(true)
    hasSetOnline.current = true
    return data
  }
  
  const signup = async (email: string, username: string, password: string, confirmPassword: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password, confirmPassword }),
    })

    let data: any
    try {
      data = await parseJsonResponse(response)
    } catch (err) {
      throw new Error(`Signup failed: ${err instanceof Error ? err.message : 'Invalid server response'}`)
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Signup failed')
    }

    setUser(data.user)
    addAccount(data.user)
    await setOnlineStatus(true)
    hasSetOnline.current = true
    return data
  }
  
  const logout = useCallback(async () => {
    // Set offline before logging out
    await setOnlineStatus(false)
    hasSetOnline.current = false
    
    await fetch('/api/auth/logout', { method: 'POST' })
    storeLogout()
  }, [storeLogout])
  
  // Switch to a different account
  const handleSwitchAccount = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to switch account')
      }
      
      const data = await response.json()
      setUser(data.user)
      switchAccount(userId)
      
      // Set online for the new account
      await setOnlineStatus(true)
      
      return data.user
    } catch (error) {
      console.error('Switch account error:', error)
      throw error
    }
  }, [setUser, switchAccount])
  
  // Remove an account from the accounts list
  const handleRemoveAccount = useCallback(async (userId: string): Promise<{ success: boolean; switchedTo: User | null }> => {
    try {
      const response = await fetch('/api/auth/remove-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove account')
      }
      
      const data = await response.json()
      
      // Update local state
      removeAccount(userId)
      
      if (data.switchedTo) {
        setUser(data.switchedTo)
      } else if (data.loggedOut) {
        storeLogout()
      }
      
      return { success: true, switchedTo: data.switchedTo }
    } catch (error) {
      console.error('Remove account error:', error)
      throw error
    }
  }, [removeAccount, setUser, storeLogout])
  
  // Add an account (after logging in from the "Add Account" modal)
  const handleAddAccount = useCallback((user: User) => {
    addAccount(user)
    setUser(user)
  }, [addAccount, setUser])
  
  return {
    user,
    isLoading,
    isAuthenticated,
    accounts,
    login,
    signup,
    logout,
    setUser,
    switchAccount: handleSwitchAccount,
    removeAccount: handleRemoveAccount,
    addAccount: handleAddAccount,
    getActiveAccount,
  }
}
