import React from 'react'

// Markdown parser for chat messages
// Supports: **bold**, *italic*, ***bold italic***, ~~strikethrough~~, __underline__, 
// `inline code`, ```code blocks```, > blockquotes, ||spoilers||, # headings

export interface MarkdownToken {
  type: 'text' | 'bold' | 'italic' | 'boldItalic' | 'strikethrough' | 'underline' | 
        'inlineCode' | 'codeBlock' | 'blockquote' | 'spoiler' | 'heading' | 'link'
  content: string
  language?: string // for code blocks
  level?: number // for headings (1-3)
}

export interface ParsedMarkdown {
  tokens: MarkdownToken[]
}

// Parse markdown text into tokens
export function parseMarkdown(text: string): MarkdownToken[] {
  if (!text) return []
  
  const tokens: MarkdownToken[] = []
  let remaining = text
  
  // Patterns ordered by specificity (longest/most specific first)
  const patterns = [
    // Code block with language: ```lang\ncode```
    {
      regex: /^```(\w*)\n?([\s\S]*?)```/,
      type: 'codeBlock' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'codeBlock' as const,
        content: match[2] || '',
        language: match[1] || undefined
      })
    },
    // Bold italic: ***text***
    {
      regex: /^\*\*\*(.+?)\*\*\*/,
      type: 'boldItalic' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'boldItalic' as const,
        content: match[1]
      })
    },
    // Bold: **text**
    {
      regex: /^\*\*(.+?)\*\*/,
      type: 'bold' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'bold' as const,
        content: match[1]
      })
    },
    // Italic with underscores: _text_
    {
      regex: /^_(.+?)_/,
      type: 'italic' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'italic' as const,
        content: match[1]
      })
    },
    // Italic with asterisks: *text*
    {
      regex: /^\*([^*]+?)\*/,
      type: 'italic' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'italic' as const,
        content: match[1]
      })
    },
    // Strikethrough: ~~text~~
    {
      regex: /^~~(.+?)~~/,
      type: 'strikethrough' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'strikethrough' as const,
        content: match[1]
      })
    },
    // Underline: __text__
    {
      regex: /^__(.+?)__/,
      type: 'underline' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'underline' as const,
        content: match[1]
      })
    },
    // Inline code: `code`
    {
      regex: /^`([^`]+?)`/,
      type: 'inlineCode' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'inlineCode' as const,
        content: match[1]
      })
    },
    // Spoiler: ||text||
    {
      regex: /^\|\|(.+?)\|\|/,
      type: 'spoiler' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'spoiler' as const,
        content: match[1]
      })
    },
    // Blockquote: > text (only at start of line)
    {
      regex: /^>\s(.+?)(?:\n|$)/,
      type: 'blockquote' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'blockquote' as const,
        content: match[1]
      })
    },
    // Heading: # text, ## text, ### text (only at start of line)
    {
      regex: /^(#{1,3})\s(.+?)(?:\n|$)/,
      type: 'heading' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'heading' as const,
        content: match[2],
        level: match[1].length
      })
    },
    // Link: [text](url)
    {
      regex: /^\[([^\]]+)\]\(([^)]+)\)/,
      type: 'link' as const,
      extract: (match: RegExpMatchArray) => ({
        type: 'link' as const,
        content: match[1],
        url: match[2]
      })
    }
  ]
  
  while (remaining.length > 0) {
    let matched = false
    
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex)
      if (match) {
        tokens.push(pattern.extract(match))
        remaining = remaining.slice(match[0].length)
        matched = true
        break
      }
    }
    
    if (!matched) {
      // Find the next special character or end of string
      const nextSpecial = remaining.search(/[*_~`>#\[\|]/)
      
      if (nextSpecial === -1) {
        // No more special characters, add rest as text
        tokens.push({ type: 'text', content: remaining })
        break
      } else if (nextSpecial === 0) {
        // Special character at start but didn't match any pattern
        // Check if it's an unmatched pattern (like single * or _)
        tokens.push({ type: 'text', content: remaining[0] })
        remaining = remaining.slice(1)
      } else {
        // Add text before special character
        tokens.push({ type: 'text', content: remaining.slice(0, nextSpecial) })
        remaining = remaining.slice(nextSpecial)
      }
    }
  }
  
  return tokens
}

// Render parsed tokens to React elements
export function renderMarkdownTokens(
  tokens: MarkdownToken[],
  keyPrefix: string = 'md'
): React.ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`
    
    switch (token.type) {
      case 'text':
        return <span key={key}>{token.content}</span>
        
      case 'bold':
        return <strong key={key} className="font-bold">{token.content}</strong>
        
      case 'italic':
        return <em key={key} className="italic">{token.content}</em>
        
      case 'boldItalic':
        return <strong key={key} className="font-bold italic">{token.content}</strong>
        
      case 'strikethrough':
        return <del key={key} className="line-through">{token.content}</del>
        
      case 'underline':
        return <u key={key} className="underline">{token.content}</u>
        
      case 'inlineCode':
        return (
          <code 
            key={key} 
            className="bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded text-sm font-mono border border-purple-500/20"
          >
            {token.content}
          </code>
        )
        
      case 'codeBlock':
        return (
          <pre 
            key={key} 
            className="bg-[#0d0718] text-purple-100 p-3 rounded-lg my-2 overflow-x-auto border border-purple-500/20 font-mono text-sm"
          >
            {token.language && (
              <div className="text-xs text-purple-400 mb-2 border-b border-purple-500/20 pb-2">
                {token.language}
              </div>
            )}
            <code>{token.content}</code>
          </pre>
        )
        
      case 'blockquote':
        return (
          <blockquote 
            key={key} 
            className="border-l-4 border-purple-500 pl-3 my-1 text-purple-200/80 italic"
          >
            {token.content}
          </blockquote>
        )
        
      case 'spoiler':
        return (
          <span 
            key={key} 
            className="spoiler inline-block bg-purple-500/40 text-purple-500/40 rounded px-1 cursor-pointer select-none transition-all hover:bg-purple-500/50"
            onClick={(e) => {
              const target = e.currentTarget
              target.classList.toggle('revealed')
              if (target.classList.contains('revealed')) {
                target.classList.remove('bg-purple-500/40', 'text-purple-500/40')
                target.classList.add('bg-purple-500/20', 'text-purple-200')
              } else {
                target.classList.add('bg-purple-500/40', 'text-purple-500/40')
                target.classList.remove('bg-purple-500/20', 'text-purple-200')
              }
            }}
          >
            {token.content}
          </span>
        )
        
      case 'heading':
        const headingClasses: Record<number, string> = {
          1: 'text-xl font-bold my-2',
          2: 'text-lg font-bold my-1.5',
          3: 'text-base font-bold my-1'
        }
        const HeadingComponent = token.level === 1 ? 'h1' : token.level === 2 ? 'h2' : 'h3'
        return React.createElement(
          HeadingComponent,
          {
            key,
            className: headingClasses[token.level as 1 | 2 | 3] || 'font-bold my-1'
          },
          token.content
        )
        
      case 'link':
        return (
          <a 
            key={key} 
            href={(token as any).url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            {token.content}
          </a>
        )
        
      default:
        return <span key={key}>{token.content}</span>
    }
  })
}

// Combine markdown parsing with mention parsing
export function parseMessageWithMarkdown(
  content: string,
  mentionUsernames: string[] = []
): React.ReactNode[] {
  if (!content) return []
  
  // First handle mentions (they shouldn't be markdown-parsed)
  const mentionRegex = /@(\w+)/g
  const parts: Array<{ type: 'mention' | 'text'; content: string; valid?: boolean }> = []
  let lastIndex = 0
  
  content.replace(mentionRegex, (match, username, offset) => {
    // Add text before this mention
    if (offset > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, offset) })
    }
    // Add the mention
    parts.push({ 
      type: 'mention', 
      content: username,
      valid: mentionUsernames.includes(username)
    })
    lastIndex = offset + match.length
    return match
  })
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }
  
  // If no mentions found, just parse the whole thing as markdown
  if (parts.length === 0) {
    const tokens = parseMarkdown(content)
    return renderMarkdownTokens(tokens)
  }
  
  // Render parts
  const result: React.ReactNode[] = []
  let keyIndex = 0
  
  parts.forEach((part) => {
    if (part.type === 'mention') {
      result.push(
        <span
          key={`mention-${keyIndex++}`}
          className={`font-medium ${part.valid ? 'text-cyan-300 bg-cyan-500/15 px-1 rounded-sm' : 'text-purple-400'}`}
        >
          @{part.content}
        </span>
      )
    } else {
      // Parse this text part as markdown
      const tokens = parseMarkdown(part.content)
      result.push(...renderMarkdownTokens(tokens, `text-${keyIndex++}`))
    }
  })
  
  return result
}

// Utility function to wrap selected text with markdown syntax
export function wrapSelection(text: string, selectionStart: number, selectionEnd: number, syntax: string): { text: string; cursorOffset: number } {
  const before = text.slice(0, selectionStart)
  const selected = text.slice(selectionStart, selectionEnd)
  const after = text.slice(selectionEnd)
  
  // Handle code blocks differently
  if (syntax === '```') {
    const newText = `${before}\`\`\`\n${selected}\n\`\`\`${after}`
    return { text: newText, cursorOffset: before.length + 4 + selected.length }
  }
  
  const newText = `${before}${syntax}${selected}${syntax}${after}`
  return { text: newText, cursorOffset: before.length + syntax.length + selected.length }
}
