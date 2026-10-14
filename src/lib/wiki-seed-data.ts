/**
 * Chrona Community Wiki Seed Data
 * =================================
 * These are the default wiki articles for the official Chrona Community
 * storyline server. They are created by the seed-official route and should
 * NEVER be deleted — even when the database is cleaned.
 *
 * To re-seed: GET /api/storylines/seed-official
 * This endpoint is idempotent — it checks if articles exist before creating.
 */

export interface WikiArticleSeed {
  slug: string
  title: string
  category: string
  content: string
  isPinned: boolean
  position: number
}

export const CHRONA_COMMUNITY_WIKI: WikiArticleSeed[] = [
  {
    slug: 'welcome-to-chrona',
    title: 'Welcome to Chrona',
    category: 'Getting Started',
    isPinned: true,
    position: 0,
    content: `# Welcome to Chrona! 🎭

Chrona is an immersive roleplay universe where you can create unique characters, join collaborative storylines, and craft stories with other creative writers.

## What Can You Do Here?

### 🧙 Create Personas
Design detailed characters with rich personalities, backstories, appearance, and personality typing (MBTI, DISC, Enneagram, Big Five, and more). Your persona is your identity in the Chrona universe.

### 📖 Join Storylines
Storylines are collaborative storytelling servers where multiple writers create narratives together. Join existing storylines or create your own.

### 💬 Direct Messages
Chat one-on-one with other personas in private DMs. Share stories, plan plots, or just hang out.

### 🛒 Marketplace
List your personas on the marketplace for others to adopt, or browse and download personas created by the community.

### 💰 Chronos Economy
Earn Chronos (the in-platform currency) through daily claims, achievements, and marketplace sales. Spend them on customization options, profile themes, and more.

### 🏆 Achievements
Unlock achievements by reaching milestones — creating your first persona, joining storylines, making friends, and more!

## Getting Started

1. **Create your first persona** — Click "Create New Character" in the sidebar
2. **Join the Chrona Community** — You're already a member! Check out the channels
3. **Explore Discover** — Find other personas to chat with
4. **Claim your daily Chronos** — Visit the Chronos wallet daily for free currency

## Need Help?

Check out the other wiki articles in the **Getting Started** and **Guides** categories. If you still have questions, ask in the **#help** channel!

Welcome to the Chrona universe! ✨`,
  },
  {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    category: 'Rules',
    isPinned: true,
    position: 1,
    content: `# Community Guidelines 📜

Last updated: October 2026

## 1. Respect Everyone
- Treat all members with kindness and respect
- No harassment, bullying, or hate speech
- Personal attacks on other members are not tolerated
- Disagreements are fine — personal attacks are not

## 2. Age Requirements
- You must be at least 16 years old to use Chrona
- Users under 18 cannot access NSFW content
- Age-gating is enforced automatically based on your date of birth

## 3. Content Standards
- No explicit, illegal, or harmful content
- Tag NSFW content appropriately
- Respect content rating systems (safe / mature / unrestricted)
- No spamming or flooding channels

## 4. Roleplay Etiquette
- Don't god-mod (control other people's characters without permission)
- Communicate OOC (out of character) when planning plots
- Respect other writers' preferences and limits
- Ask before introducing major plot changes

## 5. Persona Usage
- Don't copy or steal other people's personas
- If you download a persona from the marketplace, credit the original creator
- Personas purchased from the marketplace are yours to customize

## 6. Reporting
- Use the report button to flag inappropriate content
- Provide detailed information when reporting
- False reports may result in moderation action

## Consequences

Violations may result in:
- Warnings
- Temporary suspension
- Permanent ban (for severe violations)

Appeals can be made by contacting a moderator in the **#help** channel.

Thank you for helping make Chrona a welcoming community! 💜`,
  },
  {
    slug: 'persona-creation-guide',
    title: 'Persona Creation Guide',
    category: 'Guides',
    isPinned: false,
    position: 2,
    content: `# Persona Creation Guide 🧙

Your persona is your character in the Chrona universe. This guide will help you create a rich, compelling character.

## The Persona Form

The persona creation form has several sections:

### Overview
- **Name**: Your character's name (required)
- **Avatar**: Upload an image or use a URL
- **Description**: A short tagline or summary
- **Archetype**: Choose from 14 archetypes (Hero, Villain, Mentor, etc.)
- **Gender, Pronouns, Age, Species**: Basic identity details
- **Tags**: Keywords that describe your character (max 20)

### Personality (Merged Tab)
This tab includes both core personality traits AND personality typing systems:

**Core Personality:**
- **Personality Description**: A free-text description of how your character thinks and feels
- **Personality Spectrums**: 5 sliders (Introvert↔Extrovert, Intuitive↔Observant, etc.)
- **Strengths, Flaws, Values, Fears**: Tag-based inputs

**Personality Typing Systems:**
- **MBTI**: 16 personality types (INTJ, ENFP, etc.)
- **Big Five**: 5 trait dimensions (Openness, Conscientiousness, etc.)
- **DISC**: 4 behavioral types (Dominance, Influence, Steadiness, Conscientiousness)
- **Enneagram**: 9 types with wings
- **StrengthsFinder**: Top 5 signature strengths

### Attributes
- **Likes, Dislikes, Hobbies, Skills, Languages, Habits, Speech Patterns**

### Backstory
- **Backstory**: Your character's history
- **Appearance**: Physical description

### Connections
- Define relationships with other characters (family, friends, rivals, etc.)

### RP Preferences
- Writing style (1-liner, semi-literate, literate, novella)
- Preferred genres, themes, limits
- Response time expectations

### NSFW (18+ only)
- Mature content settings (body type, kinks, orientation, etc.)
- Only visible if you're 18+

## Tips for Great Personas

1. **Start simple** — You don't need to fill every field. Start with name, archetype, and description.
2. **Use the Calibrate button** — The MBTI tab has a "Calibrate All" feature that auto-fills personality spectrums based on your MBTI type.
3. **Add tags** — Tags help others find your persona in Discover search.
4. **Write a compelling backstory** — Even a few sentences adds depth.
5. **Set RP preferences** — This helps you find compatible roleplay partners.

## Can I Have Multiple Personas?

Yes! You can create up to 25 personas (more if you purchase additional slots with Chronos). Only one persona can be "active" at a time — this is the persona others see in Discover and the one used for DMs.`,
  },
  {
    slug: 'storylines-guide',
    title: 'How Storylines Work',
    category: 'Guides',
    isPinned: false,
    position: 3,
    content: `# How Storylines Work 📖

Storylines are collaborative storytelling servers — like Discord servers but built specifically for roleplay.

## Creating a Storyline

1. Click the **Storylines** tab in the sidebar
2. Click **Create Storyline**
3. Fill in:
   - **Name**: Your storyline's name
   - **Category**: Romance, Action, Fantasy, Sci-Fi, etc.
   - **Description**: A brief summary
   - **Lore**: World-building background
   - **Icon and Banner**: Visual branding
   - **Accent Color**: Custom color theme
   - **Welcome Message**: Shown to new members

4. Your storyline is created with:
   - **3 default roles**: Owner, Admin, Member
   - **2 categories**: Story, Out of Character
   - **2 channels**: general, ooc

## Managing Your Storyline

As the owner, you can:
- **Create channels and categories** — Organize your storyline
- **Create custom roles** — With specific permissions
- **Invite members** — Share your invite link (chrona.gg/XYZ123)
- **Boost** — Spend Chronos to boost your storyline's visibility
- **Manage settings** — Edit name, description, lore, etc.

## Joining a Storyline

To join a storyline:
1. Get an invite code or link (chrona.gg/XYZ123)
2. Go to the Storylines tab
3. Click **Join** and enter the code
4. Or browse public storylines and click Join

## Storyline Channels

- **Text channels**: For in-character (IC) and out-of-character (OOC) chat
- **Threads**: Create sub-conversations within a channel
- **Pinned messages**: Pin important messages for reference
- **Reactions**: React to messages with emojis
- **Message replies**: Reply to specific messages

## Storyline Roles

| Role | Permissions |
|------|-------------|
| Owner | Full control — manage channels, roles, settings, members |
| Admin | Manage channels, messages, invite, kick |
| Moderator | Manage messages, invite |
| Member | View, send messages, invite |
| Custom | Fully customizable permissions |

## Boosting

Spend Chronos to boost your storyline:
- **Tier 1** (100 Chronos): +1 visibility point
- **Tier 2** (500 Chronos): +5 visibility points
- **Tier 3** (1000 Chronos): +15 visibility points

Boosted storylines appear higher in the browse list and search results.`,
  },
  {
    slug: 'chronos-economy',
    title: 'Chronos Economy Guide',
    category: 'Guides',
    isPinned: false,
    position: 4,
    content: `# Chronos Economy Guide 💰

Chronos (⬗) is the in-platform currency used on Chrona. Here's everything you need to know.

## Earning Chronos

### Daily Claim
- Claim **50 Chronos** every day from the Chronos wallet
- Must wait 24 hours between claims
- Streaks may give bonuses in the future

### Achievements
- Many achievements award Chronos when completed
- Check the Achievements page for available rewards

### Marketplace Sales
- List personas on the marketplace
- When someone purchases your persona, you earn Chronos (minus platform fee)
- Free downloads still count toward your download statistics

### Gifts
- Other users can gift you Chronos
- Gifts are sent through the Chronos wallet's gift feature

### Admin Grants
- Platform administrators can grant Chronos for community contributions

## Spending Chronos

### Persona Slots
- **Free**: 25 persona slots
- **Additional slots**: Purchase more slots with Chronos

### Profile Themes
- Browse the Chronos themes page
- Purchase custom profile themes (background, borders, text colors)
- Themes range from 100 to 1000+ Chronos

### Name Color
- Customize your username color
- Prices vary by color

### Storyline Boosts
- Boost your storyline's visibility (see Storylines Guide)

## Starting Balance

New users receive **100 Chronos** as a welcome bonus when they sign up!

## Transaction History

All Chronos transactions are recorded in your wallet. You can view:
- Transaction type (bonus, gift, purchase, grant, daily)
- Amount
- Balance after transaction
- Date and time

## Tips

- **Claim daily** — Don't miss your free daily Chronos!
- **Create quality personas** — Good personas sell on the marketplace
- **Complete achievements** — Many are easy to unlock and give Chronos
- **Be active** — The more you participate, the more you earn`,
  },
  {
    slug: 'marketplace-guide',
    title: 'Marketplace Guide',
    category: 'Guides',
    isPinned: false,
    position: 5,
    content: `# Marketplace Guide 🛒

The Chrona Marketplace is where you can buy, sell, and trade personas with the community.

## Listing a Persona

1. Go to your persona's profile
2. Click **List on Marketplace**
3. Set:
   - **Price**: Chronos amount (0 for free)
   - **Tags**: Help buyers find your persona
   - **Description**: What makes this persona special?
4. Click **List** — Your persona is now on the marketplace

## Purchasing a Persona

1. Browse the Marketplace tab
2. Filter by tags, archetype, price, or sort by popular/newest
3. Click a persona to view details
4. Click **Purchase** to buy it
5. The persona is copied to your account
6. You can customize the purchased persona — it's yours!

## Free Downloads

Personas listed at 0 Chronos are free. You can download them without spending any currency. The creator still gets credited and sees download counts.

## Revenue Sharing

When you sell a persona:
- **Creator receives**: 80% of the sale price
- **Platform fee**: 20% (supports Chrona development)

## Tips for Sellers

- **Quality sells** — Detailed, well-crafted personas attract more buyers
- **Use good tags** — Help buyers find your persona
- **Set fair prices** — Check similar personas before pricing
- **Be original** — Don't copy existing personas
- **Good avatars help** — A visual representation makes your listing more appealing

## Tips for Buyers

- **Check the tags** — Make sure the persona fits your needs
- **Read the description** — Understand what you're getting
- **Customize after purchase** — Make the persona your own
- **Credit the original creator** — It's good etiquette`,
  },
  {
    slug: 'personality-typing-systems',
    title: 'Personality Typing Systems Explained',
    category: 'Reference',
    isPinned: false,
    position: 6,
    content: `# Personality Typing Systems Explained 🧠

Chrona supports multiple personality typing frameworks. Here's a reference guide for each.

## MBTI (Myers-Briggs Type Indicator)

16 personality types based on 4 dichotomies:

| Dichotomy | Options |
|-----------|---------|
| Energy | Introvert (I) ↔ Extrovert (E) |
| Information | Intuitive (N) ↔ Observant (S) |
| Decision | Thinking (T) ↔ Feeling (F) |
| Lifestyle | Judging (J) ↔ Prospecting (P) |

Example: INTJ = Introvert, Intuitive, Thinking, Judging

## Big Five (OCEAN)

5 trait dimensions, each scored 0-100:

- **Openness** — Curiosity vs. preference for routine
- **Conscientiousness** — Organization vs. spontaneity
- **Extraversion** — Outgoing vs. reserved
- **Agreeableness** — Cooperative vs. competitive
- **Neuroticism** — Emotional sensitivity vs. stability

## DISC

4 behavioral types:

- **Dominance (D)** — Direct, results-oriented, assertive
- **Influence (I)** — Outgoing, enthusiastic, optimistic
- **Steadiness (S)** — Patient, dependable, cooperative
- **Conscientiousness (C)** — Analytical, precise, systematic

## Enneagram

9 personality types with wings (adjacent types):

| Type | Name | Core Motivation |
|------|------|-----------------|
| 1 | Reformer | Perfection, integrity |
| 2 | Helper | Being loved and needed |
| 3 | Achiever | Success and admiration |
| 4 | Individualist | Authentic self-expression |
| 5 | Investigator | Knowledge and understanding |
| 6 | Loyalist | Security and guidance |
| 7 | Enthusiast | Freedom and happiness |
| 8 | Challenger | Control and self-reliance |
| 9 | Peacemaker | Inner peace and harmony |

## StrengthsFinder

Identify your top 5 signature strengths from 34 categories:

- **Executing** — Achiever, Arranger, Belief, Consistency, Deliberative, Discipline, Focus, Responsibility, Restorative
- **Influencing** — Activator, Command, Communication, Competition, Maximizer, Self-Assurance, Significance, Woo
- **Relationship Building** — Adaptability, Connectedness, Developer, Empathy, Harmony, Includer, Individualization, Positivity, Relator
- **Strategic Thinking** — Analytical, Context, Futuristic, Ideation, Input, Intellection, Learner, Strategic

## Using the Calibrate Feature

In the Personality tab, the **Calibrate All** button auto-fills personality spectrums, Big Five, DISC, and Enneagram based on your MBTI type. This is a great starting point — you can then fine-tune each value.

## Do I Need to Fill All of These?

No! These are optional. Fill in what you know about your character. The more you fill, the richer your persona — but even just MBTI + a few tags is enough for a great character.`,
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    category: 'Reference',
    isPinned: false,
    position: 7,
    content: `# Frequently Asked Questions ❓

## General

### How old do I need to be to use Chrona?
You must be at least 16 years old. Users under 18 cannot access NSFW content.

### Is Chrona free?
Yes! Chrona is completely free to use. Chronos (the in-platform currency) can be earned for free through daily claims and achievements.

### Can I have multiple personas?
Yes — you get 25 free persona slots. You can purchase additional slots with Chronos.

### Can I change my username?
Yes — go to Edit Profile → Profile tab → change your username. Usernames must be unique.

## Personas

### How do I set an avatar?
Go to Edit Profile or Persona Form → click the avatar circle → upload an image or paste a URL.

### What is the "active" persona?
Your active persona is the one visible in Discover and used for DMs. Only one persona can be active at a time.

### Can I share personas?
Yes — use the Marketplace to list personas for sale or free download.

## Storylines

### How many storylines can I join?
There's no limit — join as many as you want!

### Can I create my own storyline?
Yes — go to the Storylines tab and click "Create Storyline".

### How do invite links work?
When you create a storyline, invite codes are generated. Share the link (chrona.gg/XYZ123) with others. They enter the code to join.

### Can I leave a storyline?
Yes — go to the storyline settings and click "Leave Storyline".

## Privacy & Safety

### Who can see my persona?
Your active persona is visible in Discover (if you're online) and to your friends. Other personas are only visible to you unless you list them on the marketplace.

### Can I block someone?
Yes — go to Friends → Blocked → add a user. Blocked users cannot DM you or see your personas.

### How do I report someone?
Click the report button on their persona card or profile. Provide details about the issue.

## Troubleshooting

### I can't log in — what do I do?
Make sure you have your security key. It was shown during signup. If you lost it, contact a moderator.

### Images aren't loading
Make sure the image URL is accessible. If uploading, check that the file is an image and under 10MB.

### The app is slow
Try refreshing the page. If issues persist, check the #bug-reports channel.`,
  },
  {
    slug: 'chrona-lore',
    title: 'Chrona Universe Lore',
    category: 'Lore',
    isPinned: false,
    position: 8,
    content: `# Chrona Universe Lore ✨

## The Chronaverse

Chrona exists in a dimension between worlds — a liminal space where stories from every reality converge. Writers, dreamers, and storytellers from across the multiverse are drawn here by the Call of the Narrative.

## The Origin

In the beginning, there was the Word — the first story ever told. That Word echoed through the void, creating ripples that became worlds, characters, and narratives. Chrona is the nexus point where all these ripples meet.

## The Blorp

Blorp is the official Chrona assistant — a being of pure narrative energy given form. Blorp exists to guide new storytellers, deliver messages, and maintain the delicate balance of the Chronaverse. If you receive a message from Blorp, pay attention — it carries important news.

## The Chronos

Chronos (⬗) are crystallized narrative energy. When stories are told, shared, and appreciated, the excess creative energy crystallizes into Chronos. These can be used to:
- Fuel storyline boosts (amplifying visibility)
- Purchase persona templates from other creators
- Customize your presence in the Chronaverse

## The Storylines

Storylines are living, breathing narratives. Each one is a pocket dimension where characters interact, stories unfold, and legends are born. Some storylines are official — maintained by the Chrona Council — while others are created by the community.

## The Archetypes

Every character in Chrona embodies an archetype — a fundamental role in storytelling:
- **Hero** — The one who rises to the challenge
- **Villain** — The one who creates the conflict
- **Mentor** — The one who guides
- **Lover** — The one who connects
- **Explorer** — The one who discovers
- **Creator** — The one who builds
- **Rebel** — The one who defies
- **Trickster** — The one who disrupts
- **Caregiver** — The one who nurtures
- **Sage** — The one who knows
- **Ruler** — The one who commands
- **Innocent** — The one who trusts
- **Everyman** — The one who relates
- **Sidekick** — The one who supports
- **Antihero** — The one who contradicts

## The Marketplace

The Marketplace is a bazaar of identities — a place where creators can share their characters with others. When you purchase a persona, you're adopting a piece of someone else's imagination and making it your own.

## Join the Story

Your story begins now. Create your persona, join a storyline, and let your narrative unfold in the Chronaverse!

*"Every character is a story waiting to be told."*
— The First Word`,
  },
]
