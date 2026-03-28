'use client'

import { CustomTag as CustomTagType } from '@/stores/auth-store'

interface CustomTagProps {
  tag: CustomTagType | null | string
  className?: string
}

export function CustomTag({ tag, className = '' }: CustomTagProps) {
  if (!tag) return null
  
  // Parse if string
  const parsedTag: CustomTagType = typeof tag === 'string' ? JSON.parse(tag) : tag
  
  if (!parsedTag.text || !parsedTag.color) return null
  
  const { text, color, style } = parsedTag
  
  // Generate style based on style type
  const getTagStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      color: color,
    }
    
    switch (style) {
      case 'glossy':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${color}20 0%, ${color}40 50%, ${color}20 100%)`,
          boxShadow: `0 2px 8px ${color}30, inset 0 1px 0 ${color}50`,
          borderColor: `${color}60`,
        }
      case 'radiant':
        return {
          ...baseStyle,
          background: `radial-gradient(ellipse at center, ${color}30 0%, ${color}15 50%, transparent 100%)`,
          boxShadow: `0 0 15px ${color}40, 0 0 30px ${color}20`,
          borderColor: `${color}50`,
        }
      case 'shadowy':
        return {
          ...baseStyle,
          background: `linear-gradient(180deg, ${color}15 0%, ${color}05 100%)`,
          boxShadow: `0 4px 12px ${color}20, inset 0 -2px 4px ${color}30`,
          borderColor: `${color}40`,
        }
      default:
        return {
          ...baseStyle,
          background: `${color}20`,
          borderColor: `${color}40`,
        }
    }
  }
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${className}`}
      style={getTagStyle()}
    >
      {text}
    </span>
  )
}
