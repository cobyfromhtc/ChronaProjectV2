'use client'

import { useEffect } from 'react'

/**
 * Disables the right-click context menu on the website
 * This prevents users from easily accessing browser context menus
 */
export function DisableContextMenu() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    // Disable right-click context menu
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  return null
}