---
Task ID: 1
Agent: Main Agent
Task: Archetype Expansion + Scrollable Marketplace List

Work Log:
- Replaced PERSONA_ARCHETYPES in src/lib/constants.ts with new 36-item list (behaviour-based archetypes at top, classic at bottom)
- Expanded ARCHETYPE_CONFIG in src/components/marketplace-page.tsx with all 36 archetypes, each with unique icon/color/bgColor
- Removed .slice(0, 14) from marketplace sidebar archetype list
- Added scrollable container (max-h-[420px] overflow-y-auto) to marketplace sidebar archetype section
- Expanded ARCHETYPE_COLORS in src/components/discover-page.tsx with gradient colors for all 36 archetypes
- Removed local ARCHETYPES array from persona-form.tsx, imported PERSONA_ARCHETYPES from constants
- Removed local ARCHETYPES array from list-on-marketplace-modal.tsx, imported PERSONA_ARCHETYPES from constants
- Added scrollable tag grid container (max-h-[200px] overflow-y-auto) to list-on-marketplace-modal.tsx
- Removed local ARCHETYPES array from advanced-search.tsx (which had a DIFFERENT list with Jester/Magician/Outlaw), imported PERSONA_ARCHETYPES from constants
- All files now use single source of truth from constants.ts
- Lint passes cleanly, dev server running successfully

Stage Summary:
- All 6 files updated per the dev plan
- 36 new archetypes: Morally Grey, Dominant, Protective, Cold & Distant, Obsessive, Brooding, Flirtatious, Tsundere, Yandere, Kuudere, Mysterious, Wholesome, Chaotic, Defiant, Possessive, Devoted, Dark & Gritty, Supernatural, Royalty, Warrior, Scholar, Trauma-Coded, Protector, Street-Smart, Trickster, Rebel, Sage, Lover, Villain, Hero, Antihero, Caregiver, Explorer, Creator, Ruler, Other
- No database migration needed (archetype is plain String field)
- Advanced search previously had divergent archetype list (Jester/Magician/Outlaw) - now unified
