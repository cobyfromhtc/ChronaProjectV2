# Task 3-4: Official Chrona Community Storyline

**Date:** 2025-03-05
**Status:** Completed

## Summary
Made the Official Chrona Community storyline visible in the app by adding an `isOfficial` field, creating a seed mechanism to auto-create the official server, and adding a featured "Official Community" section with badge in the discovery page.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `isOfficial Boolean @default(false)` to the Storyline model
- Ran `bun run db:push` to apply the schema change

### 2. Seed API Route (`src/app/api/storylines/seed-official/route.ts`) — NEW
- **GET** endpoint that creates the official Chrona Community server if it doesn't exist
- Server properties:
  - Name: "Chrona Community"
  - Description: "The official Chrona community server! Join to meet other roleplayers, share your characters, and get the latest news."
  - Category: "Other"
  - isPublic: true, isOfficial: true
  - Accent color: `#14b8a6` (teal)
  - Welcome message: "Welcome to the Chrona Community! 🎉 This is the official gathering place for all Chrona users."
  - Tags: ["official", "community", "chrona", "announcements", "help"]
  - Lore: "The Chrona Community is the central hub for all things Chrona..."
- Pre-made roles: Owner, Admin, Moderator, Member
- Pre-made categories and channels:
  - INFORMATION: #announcements (type: announcement), #rules, #welcome
  - GENERAL: #general, #introductions, #off-topic
  - CREATIVE: #share-your-characters, #art-showcase, #story-sharing
  - HELP: #help-and-support, #bug-reports, #feature-requests
- System user (owner/admin role) is automatically assigned as the server owner

### 3. Storylines API Route (`src/app/api/storylines/route.ts`)
- Added auto-seed check at the start of the GET handler
- If no `isOfficial: true` storyline exists, fires a background fetch to `/api/storylines/seed-official`
- Added `isOfficial` field to the response mapping (line 172)

### 4. Frontend (`src/components/storylines-page.tsx`)
- **StorylineItem interface**: Added `isOfficial?: boolean` field
- **New imports**: Added `ShieldCheck` and `Megaphone` icons from lucide-react
- **Computed values**: Added `officialStoryline` and `regularStorylines` derived from storylines state
- **Featured "Official Community" section** (shown when official storyline exists):
  - Prominent card at the top with teal/cyan gradient theme
  - ShieldCheck "OFFICIAL" badge in banner top-left
  - Crown icon as default server icon
  - Larger icon (w-16 h-16) compared to regular cards
  - Tags shown with teal styling
  - "Announcements" stat with Megaphone icon
  - "Join Community →" CTA with teal color
  - Section header: "Official Community" with ShieldCheck icon
- **"All Storylines" section** below the featured card:
  - Section header: "All Storylines" with Compass icon
  - Regular storyline cards (non-official)
- **Fallback grid** (when no official server exists yet):
  - Shows all storylines with `isOfficial` badge support
  - OFFICIAL badge appears on banner (top-right) and name row
  - Teal border tint for official servers
- **Tags improvement**: Now shows actual tags from the storyline data instead of hardcoded placeholders

### 5. Next.js Config Fix (`next.config.ts`)
- Added `serverExternalPackages: ["bcryptjs"]` to fix "Module not found: Can't resolve 'bcryptjs'" error
- This was a pre-existing issue that prevented the app from loading

### 6. Package Fix
- Installed `bcryptjs@2.4.3` (pure JS version) to replace missing dependency

## Verification
- `bun run lint` passes with no new errors (only pre-existing errors in other files)
- `bun run db:push` applied schema changes successfully
- App loads at GET / with 200 status
- Official community auto-seeds when storylines API is first called
