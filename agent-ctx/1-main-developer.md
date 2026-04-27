# Task 1: Add Discord-like Features to Storyline Servers

## Agent: Main Developer
## Date: 2025-03-05
## Status: Completed

### What was done:
- Updated Prisma schema with 4 new models (StorylineThread, StorylineThreadMessage, StorylineChannelMute, StorylineChannelUnread) and extended StorylineMessage with editedAt, replyToId fields
- Created 3 new API routes (threads, mute, unread) and updated existing messages and channels routes
- Completely rewrote storyline-interior.tsx with 12 Discord-like features
- All lint checks pass, app loads successfully

### Files modified:
- `prisma/schema.prisma` — Added Thread, ThreadMessage, ChannelMute, ChannelUnread models; extended StorylineMessage and StorylineChannel
- `src/app/api/storyline-channels/[channelId]/messages/route.ts` — Added search, reply, edit support
- `src/app/api/storyline-channels/[channelId]/threads/route.ts` — New: Thread CRUD
- `src/app/api/storyline-channels/[channelId]/mute/route.ts` — New: Channel mute toggle
- `src/app/api/storyline-channels/[channelId]/unread/route.ts` — New: Unread tracking
- `src/app/api/storylines/[id]/channels/route.ts` — Updated: Channel type support
- `src/components/storyline-interior.tsx` — Complete rewrite with 12 new features

### Key decisions:
- Used `selectChannel` callback pattern to avoid lint violations with setState in effects
- Used `MessageSquareReply` icon as ThreadIcon since lucide-react doesn't export `Thread`
- Thread panel replaces message list when active (instead of a separate panel)
- Voice channels show a placeholder with topic info (no actual voice implementation)
- Search uses debounced API calls with `filteredSearchResults` memo to avoid lint issues
