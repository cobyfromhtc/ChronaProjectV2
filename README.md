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
| **Realtime** | Socket.io (chat-service mini-service) |
| **State** | Zustand (client) + TanStack Query (server) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion + custom CSS |

## Project Structure

```
ChronaProjectV2/
├── src/
│   ├── app/
│   │   ├── api/              # 70+ API route handlers
│   │   ├── globals.css       # Global CSS + theme variables
│   │   ├── layout.tsx        # Root layout (fonts, toaster, security)
│   │   └── page.tsx          # Main app (6 UI variant shells)
│   ├── components/
│   │   ├── layouts/          # 5 shell variants (chrona-v2/v3, horizon, pulse, nexus)
│   │   ├── storylines/       # StorylineModal, StorylineServerCard
│   │   ├── ui/               # shadcn/ui primitives + custom (toast, empty-state, etc.)
│   │   ├── persona-form.tsx  # 7-tab persona creation form
│   │   ├── storyline-interior.tsx  # Storyline chat/channels view
│   │   ├── storyline-settings.tsx # Storyline management
│   │   ├── wiki-tab.tsx      # Wiki article browser (react-markdown)
│   │   └── ...
│   ├── lib/
│   │   ├── db.ts             # Prisma-compatible adapter → Pocketbase
│   │   ├── pb.ts             # Pocketbase admin client singleton
│   │   ├── auth.ts           # Auth (PB auth-with-password + JWT sessions)
│   │   ├── blorp.ts          # Official bot (Blorp) management
│   │   ├── discord-storage.ts # Legacy image storage (replaced by /api/upload)
│   │   ├── markdown.tsx      # Discord-style markdown parser
│   │   ├── wiki-seed-data.ts # 9 wiki articles for Chrona Community
│   │   └── ...
│   ├── stores/               # Zustand stores (auth, persona, chronos, ui-variant)
│   ├── hooks/                # use-auth, use-chat, use-personas, use-toast
│   └── styles/               # UI variant CSS (chrona-v2, horizon, pulse, etc.)
├── mini-services/
│   ├── pocketbase-service/   # Pocketbase v0.23.4 binary + launch script
│   └── chat-service/         # Socket.io WebSocket service (port 3003)
├── scripts/
│   ├── setup-pocketbase.ts  # Create all 46 PB collections
│   └── clean-database.ts    # Clean test data (preserves seeds)
├── prisma/
│   └── schema.prisma         # Original Prisma schema (reference)
├── public/
│   └── logo.png              # Chrona logo
└── upload/                   # Local image storage directory
```

## Database

Chrona uses **Pocketbase v0.23.4** as its database backend. Pocketbase hosts
a SQLite database file at `mini-services/pocketbase-service/pb_data/data.db`.

### Collections (46 total)

| Category | Collections |
|----------|------------|
| **Auth** | users (auth collection) |
| **Personas** | personas, personaConnections |
| **Messaging** | conversations, messages, dmRequests |
| **Social** | friendRequests, friendships, follows, blocks |
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
- `_count` virtual field auto-population
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

# Start the Next.js dev server
bun run dev

# Start the chat WebSocket service (separate terminal)
cd mini-services/chat-service
bun run dev
```

### Environment Variables

```env
DATABASE_URL=file:/home/z/my-project/db/custom.db
JWT_SECRET=your-jwt-secret-here
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@chrona.local
POCKETBASE_ADMIN_PASSWORD=chrona-admin-pw-2026
```

## Features

### Personas
- Rich character creation with 7 tabs: Overview, Personality, Attributes, Backstory, Connections, RP Preferences, NSFW
- Personality typing systems: MBTI, Big Five, DISC, Enneagram, StrengthsFinder
- 14 archetypes (Hero, Villain, Mentor, etc.)
- 25 free persona slots (more purchasable with Chronos)
- Active persona system (one active at a time)

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
- Real-time WebSocket chat
- Image uploads (saved to local filesystem + PB)

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

### Security
- 2-step login (username/password → security key)
- Age-gating (16+ to use, 18+ for NSFW)
- Context menu + dev tools disabled
- Rate limiting on auth endpoints

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

Switch variants from the profile dropdown.

## License

This project is proprietary. All rights reserved.
