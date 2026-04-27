# Task 6: Add Discover Page Sections

**Agent**: main-developer
**Date**: 2025-03-05
**Status**: Completed

## Summary
Added 4 new Netflix-style horizontal scroll sections to the Discover page: "Continue Chatting", "For You", "Relate-able Personas", and "Mutual Friends". Both backend API and frontend were updated.

## Backend Changes (`src/app/api/discovery/route.ts`)

### New `parsePersonaRow` helper
- Extracted common persona data transformation + age gating into a shared helper function
- Used by both original discovery endpoint and new section handlers

### New query param: `section`
- Added `section` query parameter to GET handler
- Routes to dedicated handler functions for each section type
- When `section` is not provided, original behavior is preserved

### Section: `continue-chatting`
- `handleContinueChatting()` - Returns user's 10 most recent conversations
- Each item includes: conversationId, other persona info (id, name, avatarUrl, isOnline, username), last message (content, createdAt, senderId), lastMessageAt
- Filters out self-conversations and applies age gating

### Section: `for-you`
- `handleForYou()` - Personalized recommendations based on active persona
- Scoring algorithm:
  - Same archetype: +5 points
  - Shared tags (≥2): +2 per shared tag
  - Shared RP genres (≥1): +1 per shared genre
  - Same MBTI: +3 points
  - Fellow storyline member: +4 points
- Returns top 10 scored personas with `matchReasons` array
- Returns empty array if user has no active persona

### Section: `relatable`
- `handleRelatable()` - Personas with similar personality profiles
- Scoring algorithm:
  - Personality spectrums (≥3 axes within 30%): +2 per close axis
  - Big Five similarity (≥3 axes within 30%): +1 per close axis
  - Same archetype + shared tags: +6 points
  - ≥3 shared tags alone: +4 points
  - Same MBTI: +3 points
- Returns top 10 with `matchReasons` array

### Section: `mutual-friends`
- `handleMutualFriends()` - Friends-of-friends personas
- Gets user's direct friends from Friendship table
- Gets friends of those friends, excluding current user and direct friends
- Counts mutual friend connections per friend-of-friend
- Returns top 10 personas sorted by mutual friend count with `mutualFriendCount` field
- Deduplicates personas (one per user)

## Frontend Changes (`src/components/storylines-page.tsx`)

### New interfaces
- `ContinueChatItem` - conversationId, persona (id, name, avatarUrl, isOnline, username), lastMessage, lastMessageAt
- Extended `OnlinePersona` with `bannerUrl`, `rpStyle`, `matchReasons`, `mutualFriendCount` optional fields

### New state
- `continueChatting`, `forYouPersonas`, `relatablePersonas`, `mutualFriends` state arrays
- `sectionsLoaded` boolean for loading skeleton

### New icons imported
- `ChevronRight`, `Heart`, `Brain`, `UserCheck`, `ArrowRight`

### `fetchDiscoverySections()` callback
- Fetches all 4 sections in parallel via `Promise.allSettled`
- Called once on mount via useEffect

### `formatTimeAgo()` helper
- Formats timestamps as "now", "Xm", "Xh", "Xd", "Xw"

### UI: Netflix-style horizontal scroll sections
Only shown when `activeTab === 'discover'`. Each section:
- **Continue Chatting**: Horizontal card row with avatar, name, username, online indicator, time ago, last message preview. Clickable to open conversation.
- **For You**: Rose/pink themed cards with mini banner, avatar, name, username, match reason tags (rose colored badges)
- **Relate-able Personas**: Amber/orange themed cards with personality similarity match reasons
- **Mutual Friends**: Teal/emerald themed cards with mutual friend count label

Each section:
- Has a header with colored gradient icon and title
- "See all" button (placeholder)
- Horizontal scrollable row with custom scrollbar styling
- Cards that are clickable (set selectedPersona or open conversation)
- Only renders when data exists (empty sections hidden)
- Loading skeleton when sections not yet loaded

### Verification
- `bun run lint` passes with no new errors in our files
- App returns 200 at GET /
- TypeScript compilation has no errors in our files
- All existing functionality preserved
