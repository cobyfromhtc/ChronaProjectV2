# Chrona — Roleplay Universe

An immersive roleplay platform where you can create unique characters (personas), join collaborative storylines, direct-message other personas, buy/sell characters on the marketplace, and earn Chronos (in-platform currency) through achievements and daily claims.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Database** | Pocketbase v0.23.4 (SQLite-backed) |
| **Auth** | Pocketbase auth collection + JWT (jose) |
| **Realtime** | Socket.io (chat-service mini-service) + PocketBase SSE |
| **State** | Zustand (client) + TanStack Query (server) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion + custom CSS |

## Project Structure

```
ChronaProjectV2/
├── src/
│   ├── app/
│   │   ├── api/                    # 106 API route handlers
│   │   │   ├── auth/               # signup, login, logout, switch-account, security-key
│   │   │   ├── conversations/       # CRUD + messages + read receipts + pin/forward/bookmark
│   │   │   │   └── [id]/
│   │   │   │       ├── messages/   # GET/POST/PATCH/DELETE + read + pins + reactions
│   │   │   │       │   └── [messageId]/
│   │   │   │       │       ├── reactions/    # Emoji reaction toggle
│   │   │   │       │       ├── forward/      # Forward message to another conversation
│   │   │   │       │       ├── pin/          # Pin/unpin toggle + check
│   │   │   │       │       └── bookmark/     # Personal bookmark toggle
│   │   │   │       ├── pins/               # List all pinned messages
│   │   │   │       └── preferences/         # Server-side mute/archive prefs
│   │   │   ├── search/              # Unified search (friends, mutual, all, servers, channels)
│   │   │   │   └── messages/       # Global message search across all DMs
│   │   │   ├── bookmarks/           # List personal bookmarked messages
│   │   │   ├── personas/           # CRUD + online status + activate + public profile
│   │   │   ├── storylines/         # Browse, join, leave, members, channels, wiki, boosts
│   │   │   ├── storyline-channels/ # Messages, mute, unread, threads, pins, reactions
│   │   │   ├── friends/            # Add, remove, block, search, requests, favourites
│   │   │   ├── notifications/      # List + dismiss (mark read, mark all, dismiss)
│   │   │   ├── marketplace/        # List, purchase, single listing
│   │   │   ├── chronos/            # Balance, purchase, daily, gift, themes
│   │   │   ├── scenarios/          # List, CRUD, like toggle
│   │   │   ├── admin/              # First-setup, stats, users, reports, commands, chronos
│   │   │   └── ...                 # auth, blorp, discovery, dm-requests, follow, reports, etc.
│   │   ├── globals.css             # Global CSS + theme variables + 1500+ lines of styling
│   │   ├── layout.tsx              # Root layout (fonts, toaster, security, ContextMenuProvider)
│   │   └── page.tsx                # Main app (6 UI variant shells + ChatView + AuthPage + HomePage)
│   ├── components/
│   │   ├── layouts/                # 5 shell variants (chrona-v2/v3, horizon, pulse, nexus)
│   │   ├── storylines/             # StorylineModal, StorylineServerCard
│   │   ├── ui/                     # 51 shadcn/ui primitives + custom components
│   │   │   ├── (standard shadcn)   # accordion, button, dialog, tabs, tooltip, etc.
│   │   │   ├── persona-hover-card.tsx  # Hover preview card for personas
│   │   │   ├── gradient-text.tsx        # Gradient text component
│   │   │   ├── skeleton-card.tsx        # Skeleton loading card
│   │   │   └── empty-state.tsx          # Reusable empty state component
│   │   ├── context-menu-system.tsx       # Global right-click context menu (replies, edit, delete, forward, pin, bookmark, reactions, report)
│   │   ├── search-modal.tsx              # Unified search modal (@, @@, #, m: prefixes)
│   │   ├── settings-panel.tsx            # 4-tab settings (appearance, notifications, privacy, account)
│   │   ├── notifications-bell.tsx        # Bell dropdown with mark-as-read + dismiss
│   │   ├── forward-message-dialog.tsx    # Forward message to another conversation
│   │   ├── pinned-messages-bar.tsx       # Collapsible pinned messages bar + jump-to-message
│   │   ├── conversation-settings-dropdown.tsx # Mute/archive/clear-history/block user
│   │   ├── keyboard-shortcuts-overlay.tsx# Press ? overlay (/ , G+H/F/S/C/M shortcuts)
│   │   ├── dm-sidebar.tsx                # DM list with search filter + typing indicator
│   │   ├── sidebar.tsx                   # Main sidebar (nav, storylines, profile, settings)
│   │   ├── navigation-topbar.tsx         # Top bar (nav + notifications bell + search + avatar)
│   │   ├── persona-card.tsx              # Persona display card
│   │   ├── persona-form.tsx              # 7-tab persona creation form
│   │   ├── storyline-interior.tsx        # Storyline chat/channels view with message grouping
│   │   ├── storyline-settings.tsx        # Storyline management
│   │   ├── friends-page.tsx              # Friends list with online status + skeleton loading
│   │   ├── storylines-page.tsx           # Storyline browse with empty states
│   │   ├── marketplace-page.tsx          # Marketplace browse + purchase
│   │   ├── wallet-page.tsx               # Chronos wallet
│   │   ├── admin-panel.tsx               # Admin dashboard
│   │   ├── wiki-tab.tsx                  # Wiki article browser (react-markdown)
│   │   ├── featured-storylines-banner.tsx# Auto-rotating featured storyline banner
│   │   ├── legal-modal.tsx               # Terms of Service / Privacy Policy / Terms & Rules
│   │   └── ...                           # 46 total component files
│   ├── hooks/
│   │   ├── use-auth.ts                  # Auth + throttled online status pinging
│   │   ├── use-chat.ts                  # Socket.io chat (messages, typing, reactions, edit history)
│   │   ├── use-realtime-chat.ts         # PocketBase SSE realtime (messages + reactions sync)
│   │   ├── use-keyboard-shortcuts.ts    # Global keyboard shortcuts (/, comma, G+H/F/S/C/M)
│   │   ├── use-personas.ts              # Persona CRUD + online status
│   │   ├── use-toast.ts                 # Toast notifications
│   │   └── use-mobile.ts                # Mobile detection
│   ├── lib/
│   │   ├── db.ts                        # Prisma-compatible adapter → Pocketbase (50 collections)
│   │   ├── pb.ts                        # Pocketbase admin client singleton
│   │   ├── auth.ts                      # Auth (PB auth-with-password + JWT sessions)
│   │   ├── api-client.ts               # apiFetch, session token, stored accounts
│   │   ├── env.ts                       # Environment variable access
│   │   ├── blorp.ts                     # Official bot (Blorp) management
│   │   ├── markdown.tsx                 # Discord-style markdown parser
│   │   ├── mentions.ts                  # @mention extraction + parsing
│   │   ├── ui-variant-styles.ts         # Per-variant accent colors
│   │   ├── age-utils.ts                 # Age gating (minor/adult check)
│   │   ├── roles.ts                     # Storyline role hierarchy
│   │   ├── rate-limit.ts                # API rate limiting
│   │   ├── achievements.ts              # Achievement definitions + unlock logic
│   │   ├── boost-tiers.ts               # Storyline boost tier config
│   │   ├── constants.ts                 # Storyline categories, app constants
│   │   ├── scenario-constants.ts        # Scenario categories, moods, ratings, icons
│   │   ├── wiki-seed-data.ts            # 9 wiki articles for Chrona Community
│   │   ├── mbti-calibration-data.ts     # MBTI trait calibration data
│   │   ├── modCommands.ts               # Moderation command definitions
│   │   ├── discord-storage.ts           # Legacy image storage (replaced by /api/upload)
│   │   ├── postimages.ts                # PostImages upload utility
│   │   ├── storage.ts                   # File storage helpers
│   │   ├── cron.ts                      # Cron job definitions
│   │   └── utils.ts                     # cn() class merge utility
│   ├── stores/                          # Zustand stores (auth, persona, chronos, ui-variant)
│   └── styles/                          # 10 UI variant CSS files (chrona-v2/v3, horizon, pulse, nexus, bold, elegant, minimal)
├── mini-services/
│   ├── pocketbase-service/              # Pocketbase v0.23.4 binary + launch script + 50 collections
│   │   ├── pocketbase                   # Binary
│   │   ├── launch.sh                    # Double-fork launcher
│   │   ├── pb_data/                     # SQLite database files
│   │   ├── pb_migrations/               # PB migration scripts
│   │   └── package.json
│   └── chat-service/                    # Socket.io WebSocket service (port 3003)
│       ├── index.ts                     # Chat server (typing, messages, health check)
│       └── package.json
├── scripts/
│   ├── setup-pocketbase.ts             # Create all 50 PB collections
│   └── clean-database.ts               # Clean test data (preserves seeds)
├── prisma/
│   └── schema.prisma                    # Full Prisma schema (reference, includes all new models)
├── public/
│   ├── logo.png                         # Chrona logo
│   ├── logo.svg                         # Chrona logo (SVG)
│   └── robots.txt                       # Robots
├── Caddyfile                            # Gateway config (XTransformPort routing)
├── package.json                         # Dependencies (Next.js 16, PocketBase, Socket.io, etc.)
├── tsconfig.json                        # TypeScript config (@/* → ./src/*)
├── tailwind.config.ts                   # Tailwind CSS 4 config
├── eslint.config.mjs                    # ESLint config
├── next.config.ts                       # Next.js config (standalone output, devIndicators: false)
└── README.md                            # Project documentation
```

## Database

Chrona uses **Pocketbase v0.23.4** as its database backend. Pocketbase hosts
a SQLite database file at `mini-services/pocketbase-service/pb_data/data.db`.

### Collections (50 total)

| Category | Collections |
|----------|------------|
| **Auth** | users (auth collection) |
| **Personas** | personas, personaConnections |
| **Messaging** | conversations, messages, dmRequests, messageReactions, pinnedMessages, messageBookmarks |
| **Social** | friendRequests, friendships, follows, blocks |
| **Conversation Prefs** | conversationPreferences |
| **Storylines** | storylines, storylineMembers, storylineRoles, storylineChannels, storylineCategories, storylineChannelPermissions, storylineInvites, storylineBans, storylineMessages, storylineMessageReactions, storylinePinnedMessages, storylineBoosts, storylineReviews, storylineThreads, storylineThreadMessages, storylineChannelMutes, storylineChannelUnreads |
| **Marketplace** | marketplacePersonas, marketplacePurchases |
| **Economy** | chronosTransactions |
| **Scenarios** | scenarios, scenarioLikes |
| **Wiki** | wikiArticles |
| **System** | achievements, userAchievements, notifications, reports, adminLogs, moderationActions, profileThemes, imageRecords |

### Prisma-Compatible Adapter

The app uses a Prisma-compatible adapter (`src/lib/db.ts`) that translates
Prisma client API calls (`db.user.findUnique()`, `db.persona.findMany()`,
etc.) into Pocketbase admin REST requests. This allows the original
Prisma-based code to work without modification.

Key adapter features:
- `findUnique`, `findFirst`, `findMany`, `create`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `upsert`, `aggregate`, `groupBy`, `createMany`
- Where clauses: equality, `not`, `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `gt`/`gte`/`lt`/`lte`, `isSet`, `AND`/`OR`/`NOT`
- Compound unique constraint flattening (`senderId_receiverId: { senderId, receiverId }`)
- Back-relation expand via `_via_` syntax (`storylineMembers_via_storylineId`)
- JSON field re-stringification for legacy `JSON.parse()` compatibility
- Date conversion (Date ↔ ISO string)
- Default value injection
- `_count` virtual field auto-population (with fallback to 0)
- `requestKey` per SDK call (bypasses auto-cancellation)

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Pocketbase binary (included in `mini-services/pocketbase-service/`)

### Installation

```bash
# Install dependencies
bun install

# Start Pocketbase
cd mini-services/pocketbase-service
./launch.sh

# Create admin account
./pocketbase admin create admin@chrona.local chrona-admin-pw-2026

# Create all collections
cd ../..
bun run scripts/setup-pocketbase.ts

# Seed the official community server + wiki + logo
curl http://localhost:8090/api/storylines/seed-official
```

### Starting Chrona (PowerShell)

```powershell
# STARTING THE WHOLE PROCESS [[ 
$PROJECT = "C:\Users\User\Downloads\ChronaProjectV2-main"
 $PB = "$PROJECT\mini-services\pocketbase-service\pocketbase.exe"
 $PBDIR = "$PROJECT\mini-services\pocketbase-service"

Write-Host "`n=== Starting Chrona ===`n" -ForegroundColor Cyan

# 1. Start Pocketbase in background
Write-Host "[1/4] Starting Pocketbase..." -ForegroundColor Yellow
Start-Process -FilePath $PB -ArgumentList "serve","--http=127.0.0.1:8090","--dir=$PBDIR\pb_data","--publicDir=$PBDIR\pb_public","--migrationsDir=$PBDIR\pb_migrations" -WindowStyle Minimized
Start-Sleep -Seconds 3
Write-Host "  Done." -ForegroundColor Green

# 2. Create collections (only first run)
Write-Host "[2/4] Setting up collections..." -ForegroundColor Yellow
Set-Location $PROJECT
bun run scripts/setup-pocketbase.ts 2>&1 | Select-Object -Last 3
Write-Host "  Done." -ForegroundColor Green

# 3. Seed wiki + logo
Write-Host "[3/4] Seeding wiki + logo..." -ForegroundColor Yellow
try { Invoke-RestMethod -Uri "http://127.0.0.1:8090/api/storylines/seed-official" -TimeoutSec 10 | Out-Null; Write-Host "  Done." -ForegroundColor Green } catch { Write-Host "  Skipped." -ForegroundColor DarkGray }

# 4. Start Next.js
Write-Host "[4/4] Starting Next.js...`n" -ForegroundColor Yellow
Write-Host "App will be at http://localhost:3000`n" -ForegroundColor Cyan
npx next dev -p 3000
# END OF SCRIPT ]]
```

### To stop everything:

```powershell
Get-Process bun,pocketbase,node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Creating an Owner Account

```powershell
# ============================================================
#  CHRONA — CREATE OWNER ACCOUNT
#  Save as: create-owner.ps1
#  Run:     .\create-owner.ps1
# ============================================================

 $BaseUrl       = "http://localhost:3000"
 $PbUrl         = "http://127.0.0.1:8090"
 $PbAdminEmail  = "admin@chrona.local"
 $PbAdminPass   = "chrona-admin-pw-2026"
 $FirstSetupKey = "chrona-owner-setup-2026"

# ── Prompts ──
 $username  = Read-Host "Enter username (3-20 chars)"
 $password  = Read-Host "Enter password (min 6 chars)" -AsSecureString
 $plainPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
 $email     = Read-Host "Enter email (optional)"

# ── Try first-setup (fresh deployments) ──
 $checkResp = try { Invoke-RestMethod "$BaseUrl/api/admin/first-setup" -TimeoutSec 15 } catch { $null }

if ($checkResp.setupAvailable) {
    $body = @{ setupKey=$FirstSetupKey; username=$username; password=$plainPass }
    if ($email) { $body.email = $email }
    $r = Invoke-RestMethod "$BaseUrl/api/admin/first-setup" -Method Post `
        -ContentType "application/json" -Body ($body|ConvertTo-Json) -TimeoutSec 30
    Write-Host "✓ OWNER CREATED! Security Key: $($r.securityKey)" -ForegroundColor Green
    exit 0
}

# ── Signup + Promote (owner exists, e.g. Blorp bot) ──
 $signup = @{ username=$username; password=$plainPass; confirmPassword=$plainPass; dateOfBirth="1995-01-15T00:00:00.000Z" }
try {
    $r = Invoke-RestMethod "$BaseUrl/api/auth/signup" -Method Post `
        -ContentType "application/json" -Body ($signup|ConvertTo-Json) -TimeoutSec 30
    Write-Host "✓ User created! Security Key: $($r.securityKey)" -ForegroundColor Green
    $userId = $r.user.id
} catch {
    # Username exists — find via PocketBase
    $pbAuth = Invoke-RestMethod "$PbUrl/api/collections/_superusers/auth-with-password" -Method Post `
        -ContentType "application/json" -Body (@{identity=$PbAdminEmail;password=$PbAdminPass}|ConvertTo-Json) -TimeoutSec 15
    $found = Invoke-RestMethod "$PbUrl/api/collections/users/records?filter=username='$username'" `
        -Headers @{Authorization=$pbAuth.token} -TimeoutSec 15
    $userId = $found.items[0].id
}

# Promote to owner via PocketBase admin API
 $pbAuth = Invoke-RestMethod "$PbUrl/api/collections/_superusers/auth-with-password" -Method Post `
    -ContentType "application/json" -Body (@{identity=$PbAdminEmail;password=$PbAdminPass}|ConvertTo-Json) -TimeoutSec 15
 $update = @{role="owner"; chronos=10000} | ConvertTo-Json
Invoke-RestMethod "$PbUrl/api/collections/users/records/$userId" -Method Patch `
    -ContentType "application/json" -Headers @{Authorization=$pbAuth.token} -Body $update -TimeoutSec 15

Write-Host "✓ USER PROMOTED TO OWNER!" -ForegroundColor Green
Write-Host "  Username: $username | Role: owner | Chronos: 10,000"
Write-Host "  Login at $BaseUrl with your security key"
```

### Uploading to GitHub

```powershell
# ChronaProjectV2 — Upload to GitHub Repo
# Run this in PowerShell from C:\Users\User\Downloads\ChronaProjectV2
# ============================================================

Write-Host "`n=== ChronaProjectV2 GitHub Upload ===`n" -ForegroundColor Cyan

# Navigate to the project folder
Set-Location "$env:USERPROFILE\Downloads\ChronaProjectV2"
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Green

# Initialize git if not already a repo
if (-not (Test-Path ".git")) {
    Write-Host "`n[1/6] Initializing git repository..." -ForegroundColor Yellow
    git init
    Write-Host "Done." -ForegroundColor Green
} else {
    Write-Host "`n[1/6] Git repository already exists." -ForegroundColor DarkGray
}

# Make sure we're on the main branch
Write-Host "[2/6] Setting up branch..." -ForegroundColor Yellow
git checkout -b main 2>$null
git branch -M main

# Add the GitHub remote
Write-Host "[3/6] Adding remote..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/cobyfromhtc/ChronaProjectV2.git

# Stage all files
Write-Host "[4/6] Staging files..." -ForegroundColor Yellow
git add -A

# Commit with detailed message
Write-Host "[5/6] Committing..." -ForegroundColor Yellow
git commit -m "Update: Pocketbase SQLite migration + UI fixes + Wiki + README"

# Push to GitHub (force push to overwrite)
Write-Host "[6/6] Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "https://github.com/cobyfromhtc/ChronaProjectV2`n" -ForegroundColor Green
} else {
    Write-Host "`n=== Auth error? Try: ===" -ForegroundColor Yellow
    Write-Host "  git remote set-url origin https://<TOKEN>@github.com/cobyfromhtc/ChronaProjectV2.git" -ForegroundColor White
    Write-Host "  (replace <TOKEN> with your GitHub Personal Access Token)`n" -ForegroundColor White
}
```

### Environment Variables

```env
DATABASE_URL=file:/home/z/my-project/db/custom.db
JWT_SECRET=your-jwt-secret-here
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@chrona.local
POCKETBASE_ADMIN_PASSWORD=chrona-admin-pw-2026
FIRST_SETUP_KEY=chrona-owner-setup-2026
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
CHAT_SERVICE_PORT=3003
```

## Features

### Personas
- Rich character creation with 7 tabs: Overview, Personality, Attributes, Backstory, Connections, RP Preferences, NSFW
- Personality typing systems: MBTI, Big Five, DISC, Enneagram, StrengthsFinder
- 14 archetypes (Hero, Villain, Mentor, etc.)
- 25 free persona slots (more purchasable with Chronos)
- Active persona system (one active at a time)
- Persona hover cards on avatars

### Storylines
- Collaborative storytelling servers (Discord-like)
- Channels + categories with permissions
- Custom roles with granular permissions
- Invite links (chrona.gg/XYZ123)
- Boosting system (Chronos → visibility)
- Reviews + ratings
- Wiki articles (full markdown support)

### Messaging
- Direct messages between personas
- DM request system (accept/ignore)
- Real-time WebSocket chat (Socket.io) + PocketBase SSE sync
- Image uploads (saved to local filesystem + PB)
- Message reactions (emoji toggle with persistence)
- Message pinning (shared pins with jump-to-message)
- Message bookmarks (personal saved messages)
- Message forwarding (with attribution)
- Message editing (with edit history viewer)
- Reply system (with reply previews)
- Read receipts (double checkmark)
- Typing indicators (header + DM sidebar)
- In-conversation search (with text highlighting)
- Collapsible attachment dropdowns
- Conversation settings (mute, archive, clear history, block user)
- Server-side conversation preferences (cross-device sync)
- DM sidebar search filter

### Marketplace
- List personas for sale or free download
- 80/20 revenue split (creator/platform)
- Browse by tags, archetype, price

### Economy
- Daily Chronos claims
- Achievement rewards
- Gift Chronos to other users
- Purchase persona slots, profile themes, name colors

### Achievements
- 18 seed achievements across 6 categories
- Progress tracking
- Automatic awarding

### Search
- Unified search modal with prefixes:
  - Plain text → friends + storyline servers
  - `@keyword` → mutual server users
  - `@@keyword` → all users globally
  - `#keyword` → channels in joined storylines
  - `m:keyword` → message content across all DMs
- Global message search with highlighted results
- Search match highlighting (`<mark>` tags)

### Context Menus
- Right-click context menu system on messages, DMs, storylines, channels, friends
- Message actions: Reply, Copy, Forward, Pin, Bookmark, Edit, Delete, Report
- Quick emoji reactions (👍 ❤️ 😂 🔥)
- DM actions: Open, Mark Read, Pin, Mute, View Profile, Close DM
- Storyline actions: Open, Notifications, Copy Invite, Settings, Leave, Report
- Channel actions: Open, Copy Link, Mark Read, Mute, Edit Topic, Delete, Report
- Friend actions: Message, View Profile, Favourite, Block, Remove, Report

### Notifications
- Bell dropdown with unread count badge
- Per-notification mark-as-read + dismiss
- Mark all as read
- Type-specific icons and colored badges

### Settings
- 4-tab settings panel: Appearance, Notifications, Privacy, Account
- UI variant selector (6 variants with icons + descriptions)
- Theme color picker (Dark, Midnight, Forest, Light)
- Navigation mode toggle (Sidebar / Topbar)
- Content maturity selector (with age-gating)
- Notification preference toggles
- Security key reveal + logout

### Keyboard Shortcuts
- Press `?` to show shortcuts overlay
- `/` — Open Search modal
- `,` — Open Settings panel
- `G` then `H` — Go to Discover
- `G` then `F` — Go to Friends
- `G` then `S` — Go to Storylines
- `G` then `C` — Go to Chronos
- `G` then `M` — Go to Marketplace

### Security
- 2-step login (username/password → security key)
- Safe JSON parsing (no JSON.parse errors on server failures)
- Age-gating (16+ to use, 18+ for NSFW)
- Context menu + dev tools shortcuts disabled
- Rate limiting on auth endpoints
- Throttled online status pinging (60s cooldown)

## Database Cleanup

```bash
# Remove all test/placeholder data (preserves seeds)
bun run db:clean

# Re-seed official server + wiki + logo
curl http://localhost:8090/api/storylines/seed-official
```

## UI Variants

Chrona supports 6 UI shell variants:
1. **Chrona** (default) — sidebar + topbar
2. **Chrona V2** — floating dock
3. **Chrona V3** — zen centered
4. **Horizon** — wide sidebar
5. **Pulse** — card-based
6. **Nexus** — narrow sidebar

Switch variants from the profile dropdown → Settings → Appearance.

## Theme Support

Four color themes (applied globally via CSS variables):
1. **Dark** — Cyan/teal on dark navy (#00CDBD / #0D1016)
2. **Midnight** — Purple/indigo on deep purple
3. **Forest** — Emerald/green on deep green
4. **Light** — Teal on clean white

All themes include full component overrides (sidebar, inputs, nav items, DM items, modals, badges, status dots, messages, cards, buttons, etc.).

## Legal

- Terms of Service (last updated: October 2026)
- Privacy Policy (last updated: October 2026)
- Terms & Rules (Community Guidelines, last updated: October 2026)
- All accessible from the auth page footer and the sidebar profile menu

## License

This project is proprietary. All rights reserved.
