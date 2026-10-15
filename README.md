# Chrona — Roleplay Universe

An immersive **user-to-user** roleplay platform where you create unique characters (personas), join collaborative storylines, direct-message other personas, buy/sell characters on the marketplace, and earn Chronos (in-platform currency) through achievements and daily claims.

> Chrona is roleplay between **people** — personas belong to real users. Scenarios are setups users create for their own personas (never "AI character" content).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16.4 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Database** | Pocketbase v0.23.4 (SQLite-backed) |
| **Auth** | Pocketbase auth collection + JWT (jose) |
| **Realtime** | Socket.io (chat-service mini-service) + PocketBase SSE |
| **State** | Zustand (client) + TanStack Query (server) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion + custom CSS |

## What's New (October 2026 overhaul)

- **3 polished UI variants** (Chrona V1 classic, Chrona V2 glass dock, Chrona V3 zen) — horizon/pulse/nexus removed; V2/V3 rebuilt with glassmorphism, violet/fuchsia accents, and framer-motion micro-animations.
- **Theme system fully reworked** — Dark / Midnight / Forest / Light now style every surface (sidebar, DM items, inputs, modals, context menus, tooltips, badges, message bubbles, tabs, scrollbars, empty states) with persistence on `<html>` classes + server-side profile sync.
- **First-login onboarding** — pick your UI (V1/V2/V3) with live mini-previews, a 7-step tutorial (personas, navigation, messaging, storylines & SI.FY invites, scenarios, safety), then **Blorp** (the official Chrona bot) welcomes you via DM and explains its job: guidance, tips, announcements, support, and moderation appeals.
- **Message attachments** — send up to 5 images (PNG/JPG/GIF/WebP, 8 MB) with a text message. Attachments render as a **collapsible dropdown** on the message (collapsed by default, expand to view thumbnails, click for a lightbox, collapse to hide).
- **SI.FY:// storyline invites** — `SI.FY://XXXXXXX` (7-char code, letters+digits, unambiguous alphabet). Codes are globally unique among active invites and only free up for reuse after expiry. Accepts `SI.FY://`, `SI.FY/`, or bare code, case-insensitive. Configurable expiry (1h/1d/7d/30d/never) + max uses, with active/expired/exhausted status.
- **Scenario discovery** — "🔥 Trending This Week" and "⭐ Persona of the Week" (auto-rotating the persona's top scenarios every 5 seconds, pause on hover). Both are strictly **opt-in**: the `allowTrending` toggle on each scenario (off by default) controls inclusion; no scenario is featured without its creator's consent.
- **Scenario create flow** rebuilt — two-pane modal with step nav, drag & drop image upload, live preview card, and an Advanced & Visibility step containing the trending opt-in.
- **Legal refreshed** — Terms of Service, Privacy Policy, and Terms & Rules rewritten (Last updated: October 2026) covering SI.FY invites, the trending opt-in consent, attachments policy, age gating, Chronos economy, and the moderation ladder.
- **Dev-server fix for sandboxed/gateway deployments** — `allowedDevOrigins` in `next.config.ts` (Next 16.4 blocks the `/_next/hmr` websocket on origin mismatch, which otherwise prevents client hydration entirely).
- **Profile customization economy (end-to-end)** — 8 system profile themes (self-healing catalog) with **per-user, ledger-backed ownership**; apply owned themes to any persona for themed banners, borders, glows, and name colors across discovery rows/cards, My Personas, and profile modals. Purchased **name colors** render in the sidebar, top bar, and profiles. First Chronos purchase is refunded in full as bonus Chronos (net-zero first buy).
- **Theme Designer + creator marketplace** — mint custom 5-color designs (6 starter presets, hue-locked "Surprise me" randomizer, live persona-card + shop-tile preview) for 200 Chronos and optionally list them publicly at 100–600 Chronos; other users buy public designs and **creators earn 90% of every sale** instantly, with sale notifications and "by @creator" attribution in the shop.
- **Richer realtime feedback** — new instant notification types (new follower, purchase complete, you made a sale, achievement unlocked) pushed over Socket.io, and **per-conversation mute honored server-side**: muted DMs are stored and delivered but never ping (no toast, title badge, or sidebar flash).

## Project Structure

```
ChronaProjectV2/
├── src/
│   ├── app/
│   │   ├── api/                     # 120+ API route handlers
│   │   │   ├── auth/                # signup, login, logout, switch-account, security-key (payloads include onboarded + preferredVariant)
│   │   │   ├── onboarding/          # POST complete → marks onboarded, stores preferredVariant, triggers Blorp welcome DM
│   │   │   ├── conversations/       # CRUD + messages (multi-attachment support) + read receipts + pin/forward/bookmark
│   │   │   │   └── [id]/
│   │   │   │       ├── messages/    # GET/POST/PATCH/DELETE + read + pins + reactions (attachments: [{url,fileName,fileType,fileSize}])
│   │   │   │       │   └── [messageId]/
│   │   │   │       │       ├── reactions/    # Emoji reaction toggle
│   │   │   │       │       ├── forward/      # Forward (copies attachments)
│   │   │   │       │       ├── pin/          # Pin/unpin toggle + check
│   │   │   │       │       └── bookmark/     # Personal bookmark toggle
│   │   │   │       ├── pins/                # List all pinned messages
│   │   │   │       └── preferences/         # Server-side mute/archive prefs
│   │   │   ├── search/              # Unified search (friends, mutual, all, servers, channels, messages)
│   │   │   ├── personas/            # CRUD + online status + activate + public profile
│   │   │   ├── storylines/          # Browse, join, members, channels, wiki, boosts
│   │   │   │   ├── [id]/invites/    # GET list + POST generate SI.FY:// code (unique among active, 1h–never expiry, maxUses)
│   │   │   │   │   └── [inviteId]/  # DELETE revoke (frees the code immediately)
│   │   │   │   └── seed-official/   # Idempotent: official server + wiki + logo + Blorp demo scenarios
│   │   │   ├── join/[code]/         # Resolve + join via SI.FY://, SI.FY/, or bare code (case-insensitive; 404/410/409 semantics)
│   │   │   ├── storyline-channels/  # Messages, mute, unread, threads, pins, reactions
│   │   │   ├── friends/             # Add, remove, block, search, requests, favourites
│   │   │   ├── notifications/       # List + dismiss (mark read, mark all, dismiss)
│   │   │   ├── marketplace/         # List, purchase, single listing
│   │   │   ├── chronos/             # Balance, purchase, daily, gift, themes (GET catalog + POST mint custom design)
│   │   │   ├── ai/                  # LLM-powered generation endpoints
│   │   │   ├── threads/             # Storyline thread messages
│   │   │   ├── scenarios/           # List, CRUD (allowTrending toggle), like toggle
│   │   │   │   ├── trending/        # GET — opted-in public scenarios ranked by weekly engagement (top 8)
│   │   │   │   └── showcase/        # GET — deterministic weekly persona pick + their opted-in scenarios
│   │   │   ├── upload/              # POST multipart image upload (auth + rate limit + MIME/8MB validation) → imageRecords
│   │   │   ├── images/[code]/       # GET — serve uploaded images
│   │   │   ├── admin/               # First-setup, stats, users, reports, commands, chronos
│   │   │   └── ...                  # blorp, discovery, dm-requests, follow, scenario-requests, reports, bookmarks, user(s), cron, etc.
│   │   ├── globals.css              # Global CSS + complete 4-theme variable sets + component overrides
│   │   ├── layout.tsx               # Root layout (fonts, theme init script, toaster, ContextMenuProvider)
│   │   └── page.tsx                 # Main app: AuthPage + onboarding gate + ChatView + 3 UI variant shells
│   ├── components/
│   │   ├── layouts/                 # 3 shell variants: chrona (V1), chrona-v2 (glass dock), chrona-v3 (zen centered)
│   │   ├── onboarding-flow.tsx      # First-login flow: UI picker (live mini-previews) → 7-step tutorial → finish
│   │   ├── attachment-composer.tsx  # Paperclip picker, pending chips, per-file upload progress (usePendingAttachments)
│   │   ├── attachment-lightbox.tsx  # Full-screen image viewer (Open/Download)
│   │   ├── message-attachments.tsx  # Collapsible per-message attachment dropdown (aria-expanded, framer-motion)
│   │   ├── trending-scenarios-section.tsx  # 🔥 Trending This Week (opt-in only, horizontal scroll)
│   │   ├── scenario-showcase.tsx    # ⭐ Persona of the Week (5s auto-rotation, hover-pause, dots + arrows)
│   │   ├── scenario-create-modal.tsx  # Two-pane stepped flow + live preview + drag&drop uploads + trending opt-in
│   │   ├── scenario-edit-modal.tsx    # Visibility step with the allowTrending toggle
│   │   ├── legal-modal.tsx         # ToS / Privacy Policy / Terms & Rules — Last updated: October 2026
│   │   ├── context-menu-system.tsx  # Global right-click menus (replies, edit, delete, forward, pin, bookmark, reactions, report)
│   │   ├── search-modal.tsx         # Unified search modal (@, @@, #, m: prefixes) — guarded result groups
│   │   ├── settings-panel.tsx        # 4-tab settings (appearance: 3 variants + 4 themes + nav mode)
│   │   ├── dm-sidebar.tsx / sidebar.tsx / navigation-topbar.tsx
│   │   ├── storyline-interior.tsx   # Storyline chat + SI.FY invite modal (1h–never expiry)
│   │   ├── storyline-settings.tsx   # Invite management (SI.FY:// display, status chips, countdown, revoke)
│   │   ├── storylines-page.tsx      # Browse + join modal ("SI.FY:// invite code") + Scenarios tab (trending + showcase)
│   │   ├── persona-form.tsx / persona-card.tsx / persona-hover-card.tsx   # form includes the owned-themes picker
│   │   ├── friends-page.tsx / marketplace-page.tsx / wallet-page.tsx (theme shop + Theme Designer) / admin-panel.tsx
│   │   └── ui/                      # 51 shadcn/ui primitives + custom components
│   ├── hooks/
│   │   ├── use-auth.ts              # Auth + throttled online status pinging
│   │   ├── use-chat.ts              # Socket.io chat — sendMessage now accepts attachments[]
│   │   ├── use-realtime-chat.ts     # PocketBase SSE realtime (uniform attachments shape)
│   │   ├── use-personas.ts / use-toast.ts / use-mobile.ts / use-keyboard-shortcuts.ts
│   ├── lib/
│   │   ├── db.ts                    # Prisma-compatible adapter → Pocketbase (50 collections)
│   │   ├── pb.ts                    # Pocketbase admin client singleton
│   │   ├── auth.ts                  # PB auth-with-password + JWT sessions (payloads include onboarded/preferredVariant)
│   │   ├── invites.ts               # SI.FY helpers: parse/format/generate (unambiguous alphabet, WebCrypto)
│   │   ├── attachments.ts           # Attachment rules + validateAttachment + server sanitizer (≤5, image MIME, ≤8MB)
│   │   ├── blorp.ts                 # Blorp bot: ensureBlorpExists + sendOnboardingWelcome (double-send-safe, deferred to first persona)
│   │   ├── theme-presets.ts         # 8 system profile themes (stable PB-safe ids, self-healing seed)
│   │   ├── theme-ownership.ts       # Per-user theme ownership via the Chronos transaction ledger
│   │   ├── markdown.tsx / mentions.ts / ui-variant-styles.ts (3 variants) / age-utils.ts / roles.ts
│   │   ├── rate-limit.ts / achievements.ts / boost-tiers.ts / constants.ts / scenario-constants.ts
│   │   ├── wiki-seed-data.ts / storage.ts / api-client.ts / api-config.ts / env.ts / utils.ts
│   ├── stores/                      # Zustand stores (auth, persona, chronos, ui-variant: 3 variants + migration)
│   └── styles/                      # ui-chrona-v2.css, ui-chrona-v3.css, chrona-polish (V1 uses globals)
├── mini-services/
│   ├── pocketbase-service/          # Pocketbase v0.23.4 binary + launch.sh + 50 collections (pb_data gitignored in the repo; the release zip ships a pre-seeded pb_data snapshot)
│   └── chat-service/                # Socket.io WebSocket service (port 3003)
├── scripts/
│   ├── setup-pocketbase.ts          # Create all 50 PB collections (admin REST fallback)
│   ├── patch-schema.ts              # Idempotent field additions (messages.attachments, users.onboarded*, scenarios.allowTrending*)
│   └── clean-database.ts            # Clean test data (preserves seeds)
├── prisma/schema.prisma             # Full reference schema (incl. attachments, onboarded, allowTrending fields)
├── upload/                          # Uploaded image files (gitignored) — served via /api/images/[code]
├── public/                          # logo.png, logo.svg, robots.txt
├── .env                             # Runtime env (gitignored)
├── .gitignore                       # Includes pb_data/, pb_public/, upload/, db/, *.log
├── Caddyfile                        # Gateway config (XTransformPort routing)
├── next.config.ts                   # allowedDevOrigins (sandbox/gateway HMR fix)
├── package.json / tsconfig.json / tailwind.config.ts / eslint.config.mjs
├── AGENT-WORKLOG.md                # Full engineering worklog (all development rounds)
└── README.md
```

## Database

Chrona uses **Pocketbase v0.23.4** as its database backend. Pocketbase hosts
a SQLite database file at `mini-services/pocketbase-service/pb_data/data.db`.

### Collections (50 total)

| Category | Collections |
|----------|------------|
| **Auth** | users (auth collection — includes `onboarded`, `onboardingCompletedAt`, `preferredVariant`) |
| **Personas** | personas, personaConnections |
| **Messaging** | conversations, messages (incl. `attachments` JSON), dmRequests, messageReactions, pinnedMessages, messageBookmarks |
| **Social** | friendRequests, friendships, follows, blocks |
| **Conversation Prefs** | conversationPreferences |
| **Storylines** | storylines, storylineMembers, storylineRoles, storylineChannels, storylineCategories, storylineChannelPermissions, storylineInvites (SI.FY codes: `code`, `expiresAt`, `maxUses`, `uses`), storylineBans, storylineMessages, storylineMessageReactions, storylinePinnedMessages, storylineBoosts, storylineReviews, storylineThreads, storylineThreadMessages, storylineChannelMutes, storylineChannelUnreads |
| **Marketplace** | marketplacePersonas, marketplacePurchases |
| **Economy** | chronosTransactions |
| **Scenarios** | scenarios (incl. `allowTrending`, `trendingOptInAt`), scenarioLikes |
| **Wiki** | wikiArticles |
| **System** | achievements, userAchievements, notifications, reports, adminLogs, moderationActions, profileThemes, imageRecords |

### Prisma-Compatible Adapter

The app uses a Prisma-compatible adapter (`src/lib/db.ts`) that translates
Prisma client API calls (`db.user.findUnique()`, `db.persona.findMany()`,
etc.) into Pocketbase admin REST requests. This allows the original
Prisma-based code to work without modification.

Key adapter features: `findUnique`, `findFirst` (tolerates no-arg calls),
`findMany`, `create`, `update`, `updateMany`, `delete`, `deleteMany`, `count`,
`upsert`, `aggregate`, `groupBy`, `createMany`; where clauses (equality, `not`,
`in`, `notIn`, `contains`, `startsWith`, `gt`/`gte`/`lt`/`lte`, `isSet`,
`AND`/`OR`/`NOT`); compound unique flattening; `_via_` back-relation expand;
JSON field re-stringification; `_count` virtual fields; `requestKey` per call.

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Pocketbase binary (included in `mini-services/pocketbase-service/`)

### Installation

> **Running from the release zip?** It ships a pre-seeded `pb_data` (owner account `chronaowner`, the Blorp bot, the official Chrona Community storyline + wiki, demo scenarios, and the 8-theme catalog) — you can skip the collection-setup and seeding steps below. For a completely fresh install, delete `mini-services/pocketbase-service/pb_data` first.

```bash
# Install dependencies
bun install

# Start the Socket.io chat service (realtime DM/storyline pings; port 3003)
# Without it the app still works — realtime falls back to PocketBase SSE.
cd mini-services/chat-service && bun install && bun run dev &
cd ../..

# Start Pocketbase
cd mini-services/pocketbase-service
./launch.sh

# Create admin account (first run)
./pocketbase superuser upsert admin@chrona.local chrona-admin-pw-2026

# Create all collections + new feature fields
cd ../..
bun run scripts/setup-pocketbase.ts   # 50 collections (migrations also auto-run)
bun run scripts/patch-schema.ts       # attachments/onboarded/allowTrending fields (idempotent)

# Seed the official community server + wiki + logo + Blorp demo scenarios
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
Write-Host "[1/5] Starting Pocketbase..." -ForegroundColor Yellow
Start-Process -FilePath $PB -ArgumentList "serve","--http=127.0.0.1:8090","--dir=$PBDIR\pb_data","--publicDir=$PBDIR\pb_public","--migrationsDir=$PBDIR\pb_migrations" -WindowStyle Minimized
Start-Sleep -Seconds 3
Write-Host "  Done." -ForegroundColor Green

# 2. Start the Socket.io chat service (realtime pings; app falls back to PB SSE without it)
Write-Host "[2/5] Starting chat-service..." -ForegroundColor Yellow
Push-Location "$PROJECT\mini-services\chat-service"
bun install
Start-Process -FilePath "bun" -ArgumentList "run","dev" -WindowStyle Minimized
Pop-Location
Write-Host "  Done." -ForegroundColor Green

# 3. Create collections + fields (only first run)
Write-Host "[3/5] Setting up collections..." -ForegroundColor Yellow
Set-Location $PROJECT
bun run scripts/setup-pocketbase.ts 2>&1 | Select-Object -Last 3
bun run scripts/patch-schema.ts 2>&1 | Select-Object -Last 3
Write-Host "  Done." -ForegroundColor Green

# 4. Seed wiki + logo + demo scenarios
Write-Host "[4/5] Seeding..." -ForegroundColor Yellow
try { Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/storylines/seed-official" -TimeoutSec 10 | Out-Null; Write-Host "  Done." -ForegroundColor Green } catch { Write-Host "  Skipped (start Next.js first, then re-run)." -ForegroundColor DarkGray }

# 5. Start Next.js
Write-Host "[5/5] Starting Next.js...`n" -ForegroundColor Yellow
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
    $body = @{ setupKey=$FirstSetupKey; username=$username; password=$plainPass; dateOfBirth="1995-01-15T00:00:00.000Z" }
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
# Run this in PowerShell from the project folder
# ============================================================

Write-Host "`n=== ChronaProjectV2 GitHub Upload ===`n" -ForegroundColor Cyan

Set-Location "$env:USERPROFILE\Downloads\ChronaProjectV2"
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Green

if (-not (Test-Path ".git")) {
    Write-Host "`n[1/6] Initializing git repository..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "`n[1/6] Git repository already exists." -ForegroundColor DarkGray
}

git checkout -b main 2>$null
git branch -M main

Write-Host "[3/6] Adding remote..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/cobyfromhtc/ChronaProjectV2.git

Write-Host "[4/6] Staging files..." -ForegroundColor Yellow
git add -A

Write-Host "[5/6] Committing..." -ForegroundColor Yellow
git commit -m "Update: 3-variant UI overhaul + onboarding + SI.FY invites + attachments + scenario discovery + legal refresh"

Write-Host "[6/6] Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "https://github.com/cobyfromhtc/ChronaProjectV2`n" -ForegroundColor Green
} else {
    Write-Host "`n=== Auth error? Try: ===" -ForegroundColor Yellow
    Write-Host "  git remote set-url origin https://<TOKEN>@github.com/cobyfromhtc/ChronaProjectV2.git" -ForegroundColor White
}
```

### Environment Variables

```env
DATABASE_URL=file:./db/custom.db
JWT_SECRET=your-jwt-secret-here
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@chrona.local
POCKETBASE_ADMIN_PASSWORD=chrona-admin-pw-2026
FIRST_SETUP_KEY=chrona-owner-setup-2026
NEXT_PUBLIC_POCKETBASE_URL=            # empty = SSE falls back to http://127.0.0.1:8090
CHAT_SERVICE_PORT=3003
```

## Features

### Onboarding (first login)
- UI picker: Chrona V1 / V2 / V3 with live CSS mini-previews (applies instantly)
- 7-step tutorial: Welcome → Personas (7-tab form, 25 slots) → Navigation (Discover/Friends/Storylines/Chronos/Marketplace) → Messaging → Storylines & SI.FY invites → Scenarios (trending opt-in is optional) → Safety & settings
- Skippable ("Skip — use default" / "Skip tutorial"), keyboard navigable, reduced-motion aware
- On finish: `POST /api/onboarding/complete` → Blorp sends the welcome DM (deferred until the first persona exists if none at completion time; double-send-safe)

### Personas
- Rich character creation with 7 tabs: Overview, Personality, Attributes, Backstory, Connections, RP Preferences, NSFW
- Personality typing systems: MBTI, Big Five, DISC, Enneagram, StrengthsFinder
- 14 archetypes; 25 free persona slots (more purchasable with Chronos)
- Active persona system; persona hover cards on avatars
- **Per-persona profile themes** — apply any owned theme in the persona editor (ownership validated server-side) for themed banner, border, glow, and name color on cards, discovery rows, and modals

### Storylines & SI.FY Invites
- Collaborative storytelling servers (Discord-like) with channels + categories + permissions + custom roles
- **Invite format: `SI.FY://XXXXXXX`** (SI.FY = Server Invite For You; 7-char code mixed letters+digits from an unambiguous alphabet)
- Codes are globally unique among **active** invites; a code frees up for reuse only after its invite expires or is revoked
- Expiry options: 1 hour / 1 day / 7 days (default) / 30 days / never; optional max uses; status chips (Active/Expired/Maxed out) + countdown; revoke frees the code immediately
- Join accepts `SI.FY://code`, `SI.FY/code`, or bare `code` (case-insensitive); proper 404/410/409 semantics
- Boosting system, reviews + ratings, wiki articles (full markdown)

### Messaging & Attachments
- Direct messages between personas; DM request system (accept/ignore)
- **Attachments: up to 5 images per message** (PNG/JPG/GIF/WebP, 8 MB each) sent alongside text
- Attachments render as a **collapsible dropdown** on the message bubble — collapsed by default; expand for a thumbnail grid; click a thumbnail for the lightbox (Open/Download); collapse to hide
- Composer: paperclip multi-file picker with validation toasts, pending chips with per-file upload progress, remove buttons, max-5 disable
- Real-time WebSocket chat (Socket.io) + PocketBase SSE sync
- Message reactions, pinning (shared, jump-to-message), bookmarks (personal), forwarding (with attribution + attachments), editing (history viewer), replies, read receipts, typing indicators, in-conversation search, DM sidebar filter
- Conversation settings (mute — honored server-side: muted DMs deliver but never ping — archive, clear history, block user) with cross-device sync

### Scenario Discovery (strictly opt-in)
- **🔥 Trending This Week** — opted-in public scenarios ranked by weekly engagement (likes + views + chats)
- **⭐ Persona of the Week** — deterministic weekly pick among opted-in creators' personas; the persona's top scenarios auto-rotate every **5 seconds** (pause on hover, dot indicators, prev/next arrows)
- The `allowTrending` toggle lives in the scenario create/edit flow — off by default, revocable anytime; opting in never affects ranking guarantees and is documented in the ToS
- Scenario create flow: two-pane stepped modal (Basics / Details & Mood / Images / Advanced & Visibility) with drag & drop upload and a live preview card

### Marketplace & Economy
- List personas for sale or free download (tiered platform fee; creator credit preserved)
- Browse by tags, archetype, price; daily Chronos claims; achievement rewards; gifting
- **Persona slots, profile themes, and name colors** purchasable with Chronos — your first purchase is refunded in full as bonus Chronos (net-zero first buy)
- Theme ownership is **per-user and ledger-backed** — everyone can own and apply the same system theme independently
- **Theme Designer** (wallet → Shop → "Create your own"): name a design, tune 5 colors (6 starter presets + hue-locked "Surprise me" randomizer), watch a live persona-card + shop-tile preview, mint for 200 Chronos, and optionally list it publicly at 100–600 Chronos (step 25)
- **Creator revenue share**: every sale of your public design instantly credits you 90% (ledger `theme_sale` entry + "You made a sale!" notification); shop tiles carry "by @creator" attribution and "Your design" chips
- Applied themes render everywhere — persona cards (banner + sheen + glow), discovery rows, My Personas chips, character + user profile modals; purchased name colors appear in the sidebar, top bar, and profiles

### Search
- Unified search modal with prefixes: plain text → friends + servers; `@` → mutual users; `@@` → all users; `#` → channels; `m:` → message content
- Highlighted matches (`<mark>` tags)

### Context Menus
- Right-click menus on messages, DMs, storylines, channels, friends
- Message actions: Reply, Copy, Forward, Pin, Bookmark, Edit, Delete, Report + quick emoji reactions (👍 ❤️ 😂 🔥)

### Notifications & Settings
- Bell dropdown with unread badge, per-item mark-read/dismiss, mark-all
- **Instant realtime notifications** — new follower, purchase complete, you made a sale (marketplace), achievement unlocked — pushed over Socket.io the moment they happen
- 4-tab settings panel: Appearance (3 UI variants, 4 themes, nav mode), Notifications, Privacy, Account (security key reveal + logout)
- Keyboard shortcuts (`?` overlay; `/` search, `,` settings, `G+H/F/S/C/M` navigation)

### Security
- 2-step login (username/password → security key); safe JSON parsing; age gating (16+ platform, 18+ NSFW); rate limiting on auth; throttled online pings

## Database Cleanup

```bash
# Remove all test/placeholder data (preserves seeds)
bun run db:clean

# Re-seed official server + wiki + demo scenarios
curl http://localhost:8090/api/storylines/seed-official
```

## UI Variants

Chrona supports 3 polished shell variants:
1. **Chrona V1** (default) — classic navigation rail + glass panels + home dashboard
2. **Chrona V2** — glassmorphic floating dock + command palette
3. **Chrona V3** — zen centered column, calm and focused

Switch from the onboarding picker (first login) or Settings → Appearance. Old
horizon/pulse/nexus selections migrate to Chrona V1 automatically.

## Theme Support

Four fully-coded themes (applied via `<html>` classes + CSS variables, persisted to localStorage + user profile):
1. **Dark** — Cyan/teal on dark navy (#00CDBD / #0D1016)
2. **Midnight** — Violet on deep purple-black
3. **Forest** — Emerald on deep green
4. **Light** — Teal on clean white

Every theme covers all surfaces: sidebars, nav items, DM items, inputs, buttons, cards, modals, dropdowns, context menus, tooltips, toasts, badges, status dots, message bubbles, tabs, scrollbars, skeletons, and empty states.

## Legal

- Terms of Service (Last updated: October 2026)
- Privacy Policy (Last updated: October 2026)
- Terms & Rules / Community Guidelines (Last updated: October 2026)
- All accessible from the auth page footer and the settings/profile menu; cover SI.FY invites (licensed, expiring), the `allowTrending` opt-in consent, attachments policy, age gating, Chronos economy, and the moderation ladder with Blorp appeals.

## License

This project is proprietary. All rights reserved.
