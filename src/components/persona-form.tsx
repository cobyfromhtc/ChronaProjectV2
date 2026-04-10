'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, VisuallyHidden } from '@/components/ui/dialog'
import {
  Camera, Loader2, Sparkles, X, Plus, User, Heart, Shield,
  BookOpen, Users, Brain, ChevronLeft, ChevronRight,
  Trash2, Flame, AlertTriangle, Edit2, Zap, Settings, Palette, Wand2, Eye,
  Download, Upload
} from 'lucide-react'
import { Persona, PersonaConnection, PersonalitySpectrums, BigFiveTraits, HexacoTraits, defaultBigFive, defaultHexaco } from '@/stores/persona-store'
import { ConnectionFormModal, ExtendedConnection } from '@/components/connection-form-modal'
import { PERSONA_ARCHETYPES } from '@/lib/constants'

// Constants
const GENDERS = ['Male', 'Female', 'Non-binary', 'Genderfluid', 'Agender', 'Other', 'Prefer not to say']
const PRONOUNS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'any/all', 'xe/xem', 'ze/zir', 'Other']
const RELATIONSHIP_TYPES = ['Family', 'Friend', 'Romance', 'Rival', 'Ally', 'Enemy', 'Acquaintance', 'Colleague', 'Mentor', 'Student', 'Other']
const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']

// RP Preference Constants
const RP_STYLES = [
  { value: 'one_liner', label: 'One-liner', description: 'Short, quick responses (1-2 sentences)' },
  { value: 'semi_lit', label: 'Semi-literate', description: 'Moderate length (1-2 paragraphs)' },
  { value: 'literate', label: 'Literate', description: 'Detailed responses (2-4 paragraphs)' },
  { value: 'novella', label: 'Novella', description: 'Long, story-like responses (5+ paragraphs)' },
]
const RP_GENDERS = ['Male', 'Female', 'Non-binary', 'Other']
const RP_GENRES = ['Romance', 'Action', 'Fantasy', 'Sci-Fi', 'Horror', 'Mystery', 'Slice of Life', 'Drama', 'Comedy', 'Adventure', 'Thriller', 'Historical', 'Supernatural', 'Modern', 'Other']
const RP_EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to roleplay' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced roleplayer' },
  { value: 'veteran', label: 'Veteran', description: 'Many years of experience' },
]
const RP_RESPONSE_TIMES = [
  { value: 'instant', label: 'Instant', description: 'Responds within minutes' },
  { value: 'same_day', label: 'Same Day', description: 'Responds within hours' },
  { value: 'few_days', label: 'Few Days', description: 'Responds within 2-3 days' },
  { value: 'weekly', label: 'Weekly', description: 'Responds once a week or less' },
]

// NSFW Constants
const NSFW_ROLE_PREFERENCES = [
  { value: 'dominant', label: 'Dominant', description: 'Takes the lead in intimate scenarios' },
  { value: 'submissive', label: 'Submissive', description: "Prefers to follow partner's lead" },
  { value: 'switch', label: 'Switch', description: 'Comfortable with either role' },
  { value: 'versatile', label: 'Versatile', description: 'Open to various dynamics' },
]
const NSFW_ORIENTATIONS = ['Heterosexual', 'Homosexual', 'Bisexual', 'Pansexual', 'Asexual', 'Demisexual', 'Queer', 'Questioning', 'Other']
const NSFW_BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Petite', 'Tall', 'Plus-size', 'Other']

const SPECTRUM_LABELS: Record<keyof PersonalitySpectrums, { left: string; right: string }> = {
  introvertExtrovert: { left: 'Introvert', right: 'Extrovert' },
  intuitiveObservant: { left: 'Intuitive', right: 'Observant' },
  thinkingFeeling: { left: 'Thinking', right: 'Feeling' },
  judgingProspecting: { left: 'Judging', right: 'Prospecting' },
  assertiveTurbulent: { left: 'Assertive', right: 'Turbulent' },
}

const BIG_FIVE_LABELS: Record<keyof BigFiveTraits, { left: string; right: string; description: string }> = {
  openness: { left: 'Practical', right: 'Open', description: 'Openness to Experience — creativity, curiosity, appreciation for art' },
  conscientiousness: { left: 'Flexible', right: 'Organized', description: 'Conscientiousness — self-discipline, dutifulness, organization' },
  extraversion: { left: 'Reserved', right: 'Social', description: 'Extraversion — sociability, assertiveness, positive emotions' },
  agreeableness: { left: 'Competitive', right: 'Cooperative', description: 'Agreeableness — compassion, cooperation, trust' },
  neuroticism: { left: 'Stable', right: 'Reactive', description: 'Neuroticism — emotional sensitivity, anxiety, mood swings' },
}

const HEXACO_LABELS: Record<keyof HexacoTraits, { left: string; right: string; description: string }> = {
  honestyHumility: { left: 'Self-Serving', right: 'Genuine', description: 'Honesty-Humility — sincerity, fairness, modesty, avoiding greed' },
  emotionality: { left: 'Detached', right: 'Sensitive', description: 'Emotionality — emotional sensitivity, sentimentality, fearfulness' },
  extraversion: { left: 'Reserved', right: 'Expressive', description: 'Extraversion — sociability, expressiveness, optimism' },
  agreeableness: { left: 'Critical', right: 'Tolerant', description: 'Agreeableness — patience, tolerance, forgiveness vs. competitiveness' },
  conscientiousness: { left: 'Impulsive', right: 'Disciplined', description: 'Conscientiousness — organization, diligence, perfectionism' },
  opennessToExperience: { left: 'Conventional', right: 'Creative', description: 'Openness to Experience — creativity, unconventionality, intellectual curiosity' },
}

const MAX_DESCRIPTION_LENGTH = 12000
const MAX_BACKSTORY_LENGTH = 12000

const MBTI_CALIBRATION: Record<string, {
  spectrums: PersonalitySpectrums
  bigFive: BigFiveTraits
  hexaco: HexacoTraits
  likes: string[]
  dislikes: string[]
  hobbies: string[]
  habits: string[]
  skills: string[]
  speechPatterns: string[]
}> = {
  INTJ: {
    spectrums: { introvertExtrovert: 15, intuitiveObservant: 25, thinkingFeeling: 20, judgingProspecting: 25, assertiveTurbulent: 35 },
    bigFive: { openness: 85, conscientiousness: 80, extraversion: 15, agreeableness: 25, neuroticism: 35 },
    hexaco: { honestyHumility: 45, emotionality: 20, extraversion: 15, agreeableness: 25, conscientiousness: 85, opennessToExperience: 85 },
    likes: ['Strategic games', 'Deep intellectual discussions', 'Efficiency', 'Learning new systems', 'Alone time', 'Well-organized spaces', 'Complex problems', 'Long-term planning'],
    dislikes: ['Small talk', 'Inefficiency', 'Unexpected changes', 'Disorganization', 'Authority without competence', 'Repetitive tasks', 'Emotional displays', 'Being interrupted'],
    hobbies: ['Chess and strategy games', 'Reading non-fiction', 'Coding or programming', 'Research', 'Strategic planning', 'System optimization', 'Science documentaries'],
    habits: ['Plans everything in advance', 'Maintains detailed schedules', 'Researches extensively before decisions', 'Regularly analyzes and optimizes routines'],
    skills: ['Strategic planning', 'Systems analysis', 'Long-term vision', 'Problem-solving', 'Independent research'],
    speechPatterns: ['Speaks precisely and directly', 'Uses technical terminology', 'Pauses to think before responding', 'Avoids small talk', 'States conclusions before explanations']
  },
  INTP: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 20, thinkingFeeling: 25, judgingProspecting: 80, assertiveTurbulent: 55 },
    bigFive: { openness: 90, conscientiousness: 25, extraversion: 20, agreeableness: 30, neuroticism: 55 },
    hexaco: { honestyHumility: 50, emotionality: 55, extraversion: 20, agreeableness: 30, conscientiousness: 25, opennessToExperience: 90 },
    likes: ['Theoretical discussions', 'Complex puzzles', 'Learning for its own sake', 'Abstract concepts', 'Freedom to explore ideas', 'Unconventional topics', 'Late nights'],
    dislikes: ['Strict schedules', 'Repetitive practical tasks', 'Social rituals', 'Being micromanaged', 'Small talk', 'Enforcing rules', 'Closure before ready'],
    hobbies: ['Video games', 'Reading philosophy', 'Online debates', 'Learning random facts', 'Science fiction', 'Coding experiments', 'Thought experiments'],
    habits: ['Gets lost in thought', 'Stays up late exploring ideas', 'Collects information on diverse topics', 'Procrastinates on practical tasks'],
    skills: ['Theoretical analysis', 'Pattern recognition', 'Logical reasoning', 'Creative problem-solving', 'Abstract thinking'],
    speechPatterns: ['Uses qualifiers like "possibly" and "theoretically"', 'Goes on tangents', 'Asks many questions', 'Struggles with small talk', 'Explains concepts in depth']
  },
  ENTJ: {
    spectrums: { introvertExtrovert: 85, intuitiveObservant: 30, thinkingFeeling: 25, judgingProspecting: 20, assertiveTurbulent: 25 },
    bigFive: { openness: 75, conscientiousness: 85, extraversion: 85, agreeableness: 25, neuroticism: 25 },
    hexaco: { honestyHumility: 35, emotionality: 25, extraversion: 85, agreeableness: 25, conscientiousness: 85, opennessToExperience: 75 },
    likes: ['Leadership roles', 'Ambitious projects', 'Recognition for achievements', 'Competition', 'Efficient systems', 'Being in control', 'Goal-setting', 'Networking'],
    dislikes: ['Inefficiency', 'Incompetence', 'Lack of ambition', 'Being challenged by subordinates', 'Wasting time', 'Emotional decision-making', 'Failure'],
    hobbies: ['Competitive sports', 'Business ventures', 'Public speaking', 'Reading biographies of leaders', 'Strategic gaming', 'Networking events', 'Goal tracking'],
    habits: ['Sets ambitious goals', 'Takes charge in group situations', 'Efficiently manages time', 'Constantly seeks self-improvement'],
    skills: ['Leadership', 'Strategic planning', 'Decision-making', 'Public speaking', 'Organization'],
    speechPatterns: ['Speaks confidently and assertively', 'Gives direct commands', 'Focuses on efficiency', 'Uses decisive language', 'Challenges others ideas']
  },
  ENTP: {
    spectrums: { introvertExtrovert: 80, intuitiveObservant: 25, thinkingFeeling: 30, judgingProspecting: 85, assertiveTurbulent: 45 },
    bigFive: { openness: 88, conscientiousness: 30, extraversion: 80, agreeableness: 30, neuroticism: 45 },
    hexaco: { honestyHumility: 40, emotionality: 40, extraversion: 80, agreeableness: 30, conscientiousness: 30, opennessToExperience: 88 },
    likes: ['Intellectual debates', 'New ideas', 'Breaking rules constructively', 'Brainstorming', 'Being unconventional', 'Spontaneous adventures', 'Challenging assumptions'],
    dislikes: ['Routine', 'Traditional approaches', 'Being told what to do', 'Boring conversations', 'Strict hierarchies', 'Following through on details', 'Repetition'],
    hobbies: ['Debate clubs', 'Start-up projects', 'Improv comedy', 'Inventing things', 'Philosophy discussions', 'Entrepreneurship', 'Trying new restaurants'],
    habits: ['Starts many projects', 'Debates for fun', 'Seeks novel experiences', 'Quickly loses interest in routine'],
    skills: ['Debate and persuasion', 'Brainstorming', 'Improvisation', 'Seeing multiple perspectives', 'Innovation'],
    speechPatterns: ['Plays devil advocate', 'Uses witty remarks', 'Jumps between topics', 'Challenges assumptions', 'Asks provocative questions']
  },
  INFJ: {
    spectrums: { introvertExtrovert: 25, intuitiveObservant: 20, thinkingFeeling: 80, judgingProspecting: 30, assertiveTurbulent: 60 },
    bigFive: { openness: 80, conscientiousness: 75, extraversion: 25, agreeableness: 80, neuroticism: 60 },
    hexaco: { honestyHumility: 75, emotionality: 70, extraversion: 25, agreeableness: 80, conscientiousness: 75, opennessToExperience: 80 },
    likes: ['Deep meaningful conversations', 'Helping others grow', 'Quiet reflection', 'Creative expression', 'Authenticity', 'Personal growth', 'Understanding people', 'Solitude'],
    dislikes: ['Small talk', 'Conflict', 'Superficiality', 'Crowds', 'Being misunderstood', 'Injustice', 'Rushed decisions', 'Insincerity'],
    hobbies: ['Writing', 'Reading literature', 'Meditation', 'Counseling friends', 'Art', 'Journaling', 'Nature walks', 'Volunteering'],
    habits: ['Reflects deeply on conversations', 'Keeps a journal', 'Seeks meaningful connections', 'Plans for the future'],
    skills: ['Understanding others motivations', 'Writing', 'Counseling', 'Long-term planning', 'Seeing patterns in human behavior'],
    speechPatterns: ['Speaks thoughtfully and carefully', 'Uses metaphors', 'Focuses on deeper meaning', 'Listens more than talks', 'Asks about feelings']
  },
  INFP: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 25, thinkingFeeling: 85, judgingProspecting: 75, assertiveTurbulent: 70 },
    bigFive: { openness: 85, conscientiousness: 35, extraversion: 20, agreeableness: 85, neuroticism: 70 },
    hexaco: { honestyHumility: 80, emotionality: 75, extraversion: 20, agreeableness: 85, conscientiousness: 35, opennessToExperience: 85 },
    likes: ['Creative expression', 'Authentic connections', 'Daydreaming', 'Music and art', 'Personal growth', 'Nature', 'Fantasy and imagination', 'Being understood'],
    dislikes: ['Conflict', 'Inauthenticity', 'Strict routines', 'Being judged', 'Superficial relationships', 'Pressure to conform', 'Harsh criticism', 'Small talk'],
    hobbies: ['Creative writing', 'Poetry', 'Art', 'Music', 'Reading fantasy', 'Nature photography', 'Daydreaming', 'Collecting meaningful items'],
    habits: ['Daydreams frequently', 'Creates art or writes', 'Seeks authentic experiences', 'Reflects on personal values'],
    skills: ['Creative writing', 'Empathy', 'Artistic expression', 'Seeing potential in others', 'Mediating conflicts'],
    speechPatterns: ['Uses poetic language', 'Speaks about feelings and values', 'Avoids conflict', 'Goes on tangents about ideas', 'Expresses individuality']
  },
  ENFJ: {
    spectrums: { introvertExtrovert: 85, intuitiveObservant: 30, thinkingFeeling: 80, judgingProspecting: 25, assertiveTurbulent: 40 },
    bigFive: { openness: 75, conscientiousness: 80, extraversion: 85, agreeableness: 85, neuroticism: 40 },
    hexaco: { honestyHumility: 70, emotionality: 50, extraversion: 85, agreeableness: 85, conscientiousness: 80, opennessToExperience: 75 },
    likes: ['Helping others succeed', 'Social gatherings', 'Meaningful connections', 'Personal development', 'Teaching', 'Community events', 'Collaboration', 'Appreciation'],
    dislikes: ['Conflict', 'Seeing others struggle', 'Selfishness', 'Disharmony', 'Being alone for too long', 'Criticism of loved ones', 'Injustice'],
    hobbies: ['Volunteering', 'Mentoring', 'Organizing social events', 'Public speaking', 'Group activities', 'Coaching', 'Community theater', 'Book clubs'],
    habits: ['Organizes social events', 'Checks in on friends regularly', 'Mentors others', 'Volunteers for causes'],
    skills: ['Leadership', 'Public speaking', 'Empathy', 'Mediating conflicts', 'Motivating others'],
    speechPatterns: ['Uses encouraging language', 'Asks about others wellbeing', 'Gives compliments freely', 'Speaks warmly', 'Inspires action']
  },
  ENFP: {
    spectrums: { introvertExtrovert: 80, intuitiveObservant: 20, thinkingFeeling: 80, judgingProspecting: 85, assertiveTurbulent: 60 },
    bigFive: { openness: 85, conscientiousness: 35, extraversion: 80, agreeableness: 80, neuroticism: 55 },
    hexaco: { honestyHumility: 65, emotionality: 60, extraversion: 80, agreeableness: 80, conscientiousness: 35, opennessToExperience: 85 },
    likes: ['New experiences', 'Creative projects', 'Connecting with people', 'Spontaneous adventures', 'Deep conversations', 'Possibilities', 'Humor', 'Freedom'],
    dislikes: ['Routine', 'Feeling trapped', 'Conflict', 'Detailed administrative work', 'Boring tasks', 'Being alone', 'Strict rules', 'Negativity'],
    hobbies: ['Travel', 'Creative writing', 'Social events', 'Trying new hobbies', 'Photography', 'Music festivals', 'Improv classes', 'Starting new projects'],
    habits: ['Starts new hobbies frequently', 'Connects people together', 'Shares ideas enthusiastically', 'Seeks new experiences'],
    skills: ['Brainstorming', 'Networking', 'Storytelling', 'Improvisation', 'Motivating others'],
    speechPatterns: ['Speaks enthusiastically', 'Uses exclamation points', 'Jumps between topics excitedly', 'Shares personal stories', 'Uses humor']
  },
  ISTJ: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 80, thinkingFeeling: 35, judgingProspecting: 15, assertiveTurbulent: 30 },
    bigFive: { openness: 30, conscientiousness: 90, extraversion: 20, agreeableness: 45, neuroticism: 30 },
    hexaco: { honestyHumility: 70, emotionality: 30, extraversion: 20, agreeableness: 45, conscientiousness: 90, opennessToExperience: 30 },
    likes: ['Structure and order', 'Clear expectations', 'Reliability', 'Tradition', 'Thorough preparation', 'Written documentation', 'Routine', 'Peace and quiet'],
    dislikes: ['Unexpected changes', 'Disorganization', 'Unreliability', 'Vague instructions', 'Chaos', 'Being rushed', 'Breaking traditions', 'Impractical ideas'],
    hobbies: ['Collecting', 'Genealogy', 'Historical research', 'Puzzles', 'Organizing', 'Reading history', 'DIY projects', 'Fishing'],
    habits: ['Follows strict routines', 'Keeps detailed records', 'Fulfills duties reliably', 'Prepares thoroughly'],
    skills: ['Organization', 'Attention to detail', 'Reliability', 'Data analysis', 'Following procedures'],
    speechPatterns: ['Speaks factually', 'References past experiences', 'Uses precise language', 'Avoids speculation', 'Sticks to the point']
  },
  ISFJ: {
    spectrums: { introvertExtrovert: 25, intuitiveObservant: 80, thinkingFeeling: 85, judgingProspecting: 20, assertiveTurbulent: 55 },
    bigFive: { openness: 35, conscientiousness: 85, extraversion: 25, agreeableness: 85, neuroticism: 55 },
    hexaco: { honestyHumility: 80, emotionality: 60, extraversion: 25, agreeableness: 85, conscientiousness: 85, opennessToExperience: 35 },
    likes: ['Helping others', 'Tradition', 'Quiet environments', 'Close relationships', 'Routine', 'Practical tasks', 'Being appreciated', 'Comfort'],
    dislikes: ['Conflict', 'Change', 'Being in the spotlight', 'Criticism', 'Unexpected disruptions', 'Ingratitude', 'Theory without application', 'Pressure'],
    hobbies: ['Cooking', 'Crafting', 'Gardening', 'Volunteering', 'Reading', 'Spending time with family', 'Home improvement', 'Baking'],
    habits: ['Remembers important dates', 'Helps others practically', 'Maintains traditions', 'Creates comfortable environments'],
    skills: ['Attention to detail', 'Supporting others', 'Remembering details about people', 'Creating harmony', 'Practical problem-solving'],
    speechPatterns: ['Speaks warmly but quietly', 'Asks about others needs', 'Uses supportive language', 'Avoids conflict', 'Remembers past conversations']
  },
  ESTJ: {
    spectrums: { introvertExtrovert: 85, intuitiveObservant: 80, thinkingFeeling: 35, judgingProspecting: 15, assertiveTurbulent: 25 },
    bigFive: { openness: 30, conscientiousness: 90, extraversion: 85, agreeableness: 40, neuroticism: 25 },
    hexaco: { honestyHumility: 55, emotionality: 25, extraversion: 85, agreeableness: 40, conscientiousness: 90, opennessToExperience: 30 },
    likes: ['Order and structure', 'Leadership', 'Tradition', 'Efficiency', 'Clear hierarchies', 'Results', 'Being in charge', 'Accomplishment'],
    dislikes: ['Inefficiency', 'Chaos', 'Rebellion', 'Unreliability', 'Wasting time', 'Disrespect for authority', 'Vague expectations', 'Laziness'],
    hobbies: ['Team sports', 'Community leadership', 'Organizing events', 'Competitive games', 'Mentoring', 'Business networking', 'Home organization', 'Volunteering'],
    habits: ['Organizes others', 'Follows and enforces rules', 'Takes responsibility seriously', 'Plans social activities'],
    skills: ['Management', 'Organization', 'Decision-making', 'Efficiency', 'Traditional leadership'],
    speechPatterns: ['Gives clear instructions', 'Speaks authoritatively', 'Values tradition and order', 'Expects compliance', 'Focuses on facts']
  },
  ESFJ: {
    spectrums: { introvertExtrovert: 90, intuitiveObservant: 80, thinkingFeeling: 85, judgingProspecting: 20, assertiveTurbulent: 45 },
    bigFive: { openness: 35, conscientiousness: 85, extraversion: 90, agreeableness: 85, neuroticism: 45 },
    hexaco: { honestyHumility: 70, emotionality: 55, extraversion: 90, agreeableness: 85, conscientiousness: 85, opennessToExperience: 35 },
    likes: ['Social gatherings', 'Helping others', 'Tradition', 'Harmony', 'Being appreciated', 'Community', 'Celebrations', 'Close relationships'],
    dislikes: ['Conflict', 'Criticism', 'Being alone', 'Unpredictability', 'Ingratitude', 'Disruption of tradition', 'Theory without practical application', 'Tension'],
    hobbies: ['Hosting parties', 'Volunteering', 'Crafting', 'Shopping', 'Event planning', 'Church activities', 'Social clubs', 'Cooking for others'],
    habits: ['Plans social gatherings', 'Checks on friends and family', 'Volunteers in community', 'Remembers everyones preferences'],
    skills: ['Social coordination', 'Empathy', 'Event planning', 'Creating harmony', 'Supporting others'],
    speechPatterns: ['Speaks warmly and inclusively', 'Uses we language', 'Asks about others feelings', 'Gives praise freely', 'Avoids controversial topics']
  },
  ISTP: {
    spectrums: { introvertExtrovert: 25, intuitiveObservant: 80, thinkingFeeling: 35, judgingProspecting: 85, assertiveTurbulent: 35 },
    bigFive: { openness: 55, conscientiousness: 30, extraversion: 25, agreeableness: 30, neuroticism: 35 },
    hexaco: { honestyHumility: 45, emotionality: 35, extraversion: 25, agreeableness: 30, conscientiousness: 30, opennessToExperience: 55 },
    likes: ['Hands-on projects', 'Freedom', 'Problem-solving', 'Action', 'Tools and machines', 'Efficiency', 'Risk-taking', 'Independence'],
    dislikes: ['Theory without application', 'Being controlled', 'Excessive rules', 'Emotional discussions', 'Long meetings', 'Micromanagement', 'Routine', 'Commitment pressure'],
    hobbies: ['Mechanics', 'Woodworking', 'Extreme sports', 'Video games', 'Hiking', 'Motorcycling', 'Archery', 'DIY projects'],
    habits: ['Takes things apart to understand them', 'Enjoys hands-on activities', 'Acts spontaneously', 'Problem-solves practically'],
    skills: ['Troubleshooting', 'Technical skills', 'Crisis management', 'Practical problem-solving', 'Working with tools'],
    speechPatterns: ['Speaks sparingly', 'Uses concise language', 'Focuses on facts', 'Avoids emotional topics', 'Goes straight to the point']
  },
  ISFP: {
    spectrums: { introvertExtrovert: 20, intuitiveObservant: 80, thinkingFeeling: 85, judgingProspecting: 80, assertiveTurbulent: 65 },
    bigFive: { openness: 60, conscientiousness: 30, extraversion: 20, agreeableness: 80, neuroticism: 60 },
    hexaco: { honestyHumility: 75, emotionality: 70, extraversion: 20, agreeableness: 80, conscientiousness: 30, opennessToExperience: 60 },
    likes: ['Art and beauty', 'Freedom', 'Nature', 'Authenticity', 'Quiet environments', 'Personal expression', 'Sensory experiences', 'Living in the moment'],
    dislikes: ['Conflict', 'Strict schedules', 'Being controlled', 'Inauthenticity', 'Pressure to decide', 'Harsh environments', 'Criticism', 'Rigid rules'],
    hobbies: ['Art', 'Music', 'Photography', 'Nature walks', 'Cooking', 'Fashion', 'Dancing', 'Crafts'],
    habits: ['Creates art or music', 'Appreciates beauty', 'Lives in the moment', 'Follows personal values'],
    skills: ['Artistic expression', 'Noticing aesthetic details', 'Adapting to situations', 'Understanding others feelings', 'Hands-on creativity'],
    speechPatterns: ['Speaks quietly and gently', 'Avoids confrontation', 'Uses sensory descriptions', 'Expresses through actions not words', 'Values authenticity']
  },
  ESTP: {
    spectrums: { introvertExtrovert: 90, intuitiveObservant: 80, thinkingFeeling: 40, judgingProspecting: 90, assertiveTurbulent: 30 },
    bigFive: { openness: 50, conscientiousness: 25, extraversion: 90, agreeableness: 30, neuroticism: 30 },
    hexaco: { honestyHumility: 30, emotionality: 30, extraversion: 90, agreeableness: 30, conscientiousness: 25, opennessToExperience: 50 },
    likes: ['Action and excitement', 'Living in the moment', 'Risk-taking', 'Socializing', 'Competition', 'Physical activities', 'New experiences', 'Being noticed'],
    dislikes: ['Sitting still', 'Abstract theory', 'Long-term planning', 'Boredom', 'Rules and restrictions', 'Being alone', 'Slow pace', 'Detailed paperwork'],
    hobbies: ['Extreme sports', 'Racing', 'Team sports', 'Nightlife', 'Gambling', 'Martial arts', 'Adventure travel', 'Motorcycles'],
    habits: ['Seeks thrills', 'Acts before thinking', 'Enjoys physical activities', 'Lives in the moment'],
    skills: ['Quick thinking', 'Negotiation', 'Physical coordination', 'Improvisation', 'Risk assessment'],
    speechPatterns: ['Speaks quickly and directly', 'Uses action-oriented language', 'Makes quick decisions', 'Enjoys banter', 'Focuses on the present']
  },
  ESFP: {
    spectrums: { introvertExtrovert: 95, intuitiveObservant: 85, thinkingFeeling: 80, judgingProspecting: 90, assertiveTurbulent: 50 },
    bigFive: { openness: 55, conscientiousness: 30, extraversion: 95, agreeableness: 75, neuroticism: 45 },
    hexaco: { honestyHumility: 55, emotionality: 50, extraversion: 95, agreeableness: 75, conscientiousness: 30, opennessToExperience: 55 },
    likes: ['Being the center of attention', 'Entertainment', 'Socializing', 'Fun and excitement', 'New experiences', 'Making others happy', 'Spontaneity', 'Fashion'],
    dislikes: ['Boredom', 'Being alone', 'Criticism', 'Routine', 'Abstract discussions', 'Long-term planning', 'Conflict', 'Feeling left out'],
    hobbies: ['Performing arts', 'Dancing', 'Party planning', 'Fashion', 'Social media', 'Travel', 'Comedy', 'Music festivals'],
    habits: ['Loves being center of attention', 'Plans spontaneous adventures', 'Enjoys entertaining others', 'Lives for the moment'],
    skills: ['Performance', 'Social skills', 'Improvization', 'Making others happy', 'Hands-on activities'],
    speechPatterns: ['Speaks enthusiastically', 'Uses expressive body language', 'Tells engaging stories', 'Focuses on fun', 'Inclusive language']
  }
}

interface PersonaFormProps {
  isOpen: boolean
  onClose: () => void
  persona?: Persona | null
  onSave: (data: FormData) => Promise<void>
  isAdult?: boolean // Age verification: 18+ can access NSFW features
}

interface FormData {
  name: string
  title: string[]
  avatarUrl: string | null
  bannerUrl: string | null
  description: string | null
  archetype: string | null
  secondaryArchetype: string | null  // Secondary archetype for dual archetype system
  gender: string | null
  pronouns: string | null
  age: number | null
  tags: string[]
  personalityDescription: string | null
  personalitySpectrums: PersonalitySpectrums
  bigFive: BigFiveTraits
  hexaco: HexacoTraits
  strengths: string[]
  flaws: string[]
  values: string[]
  fears: string[]
  species: string | null
  likes: string[]
  dislikes: string[]
  hobbies: string[]
  skills: string[]
  languages: string[]
  habits: string[]
  speechPatterns: string[]
  backstory: string | null
  appearance: string | null
  mbtiType: string | null
  themeEnabled: boolean
  rpStyle: string | null
  rpPreferredGenders: string[]
  rpGenres: string[]
  rpLimits: string[]
  rpThemes: string[]
  rpExperienceLevel: string | null
  rpResponseTime: string | null
  nsfwEnabled: boolean
  nsfwBodyType: string | null
  nsfwKinks: string[]
  nsfwContentWarnings: string[]
  nsfwOrientation: string | null
  nsfwRolePreference: string | null
  characterQuote: string | null
  psychologySurface: string | null
  psychologyBeneath: string | null
  occupation: string | null
  status: string | null
  orientation: string | null
  height: string | null
  dialogueLog: { type: string; content: string; mood?: string }[]
  characterScenarios: { title: string; description: string }[]
  galleryUrls: string[]
  alternateImageUrl: string | null
  connections?: {
    characterName: string
    relationshipType: string
    specificRole: string | null
    characterAge: number | null
    description: string | null
  }[]
}

const defaultSpectrums: PersonalitySpectrums = {
  introvertExtrovert: 50,
  intuitiveObservant: 50,
  thinkingFeeling: 50,
  judgingProspecting: 50,
  assertiveTurbulent: 50,
}

const defaultFormData: FormData = {
  name: '',
  title: [],
  avatarUrl: null,
  bannerUrl: null,
  description: null,
  archetype: null,
  secondaryArchetype: null,  // Secondary archetype for dual archetype system
  gender: null,
  pronouns: null,
  age: null,
  tags: [],
  personalityDescription: null,
  personalitySpectrums: defaultSpectrums,
  bigFive: defaultBigFive,
  hexaco: defaultHexaco,
  strengths: [],
  flaws: [],
  values: [],
  fears: [],
  species: null,
  likes: [],
  dislikes: [],
  hobbies: [],
  skills: [],
  languages: [],
  habits: [],
  speechPatterns: [],
  backstory: null,
  appearance: null,
  mbtiType: null,
  themeEnabled: false,
  rpStyle: null,
  rpPreferredGenders: [],
  rpGenres: [],
  rpLimits: [],
  rpThemes: [],
  rpExperienceLevel: null,
  rpResponseTime: null,
  nsfwEnabled: false,
  nsfwBodyType: null,
  nsfwKinks: [],
  nsfwContentWarnings: [],
  nsfwOrientation: null,
  nsfwRolePreference: null,
  characterQuote: null,
  psychologySurface: null,
  psychologyBeneath: null,
  occupation: null,
  status: null,
  orientation: null,
  height: null,
  dialogueLog: [],
  characterScenarios: [],
  galleryUrls: [],
  alternateImageUrl: null,
}

const navItemsBase = [
  { id: 'basic', label: 'Basic Info', icon: User, description: 'Name, gender, age' },
  { id: 'personality', label: 'Personality', icon: Heart, description: 'Traits & spectrums' },
  { id: 'attributes', label: 'Attributes', icon: Shield, description: 'Likes, skills, habits' },
  { id: 'backstory', label: 'Backstory', icon: BookOpen, description: 'History & appearance' },
  { id: 'connections', label: 'Connections', icon: Users, description: 'Relationships' },
  { id: 'mbti', label: 'MBTI', icon: Brain, description: 'Personality type' },
  { id: 'rp', label: 'RP Prefs', icon: Sparkles, description: 'Roleplay settings' },
  { id: 'enhanced', label: 'Profile+', icon: Palette, description: 'Extended profile' },
  { id: 'nsfw', label: 'NSFW', icon: Flame, description: 'Adult content', requiresAdult: true },
]

function TagInput({ 
  label, 
  tags, 
  onChange, 
  placeholder = 'Type and press Enter...',
  description
}: { 
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  description?: string
}) {
  const [input, setInput] = useState('')
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput('')
    }
  }
  
  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-200">{label}</Label>
        {description && <span className="text-xs text-gray-500">{description}</span>}
      </div>
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-white/20 min-h-[48px] focus-within:border-white/30 focus-within:bg-white/5 transition-all">
        {tags.map((tag, i) => (
          <span 
            key={i} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-white/10 to-gray-300/10 text-gray-200 border border-white/20"
          >
            {tag}
            <button 
              onClick={() => removeTag(i)} 
              className="w-4 h-4 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-sm text-gray-200 placeholder:text-gray-500"
        />
      </div>
    </div>
  )
}

function SpectrumSlider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
  colorScheme = 'gray',
}: {
  label?: string
  value: number
  onChange: (value: number) => void
  leftLabel: string
  rightLabel: string
  colorScheme?: 'gray' | 'cyan' | 'emerald' | 'amber'
}) {
  const colorClasses = {
    gray: 'from-white to-gray-300',
    cyan: 'from-cyan-500 to-teal-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
  }
  
  const bgColorClasses = {
    gray: 'from-white/10 via-gray-300/10 to-white/10',
    cyan: 'from-cyan-500/20 via-teal-500/20 to-cyan-500/20',
    emerald: 'from-emerald-500/20 via-teal-500/20 to-emerald-500/20',
    amber: 'from-amber-500/20 via-orange-500/20 to-amber-500/20',
  }
  
  return (
    <div className="space-y-3">
      {label && <Label className="text-sm font-medium text-gray-200">{label}</Label>}
      <div className="flex items-center justify-between text-xs text-gray-400/70 font-medium px-1">
        <span className="flex-shrink-0 truncate max-w-[38%]">{leftLabel}</span>
        <span className="text-gray-300/80 px-2 flex-shrink-0">{value}%</span>
        <span className="flex-shrink-0 truncate max-w-[38%] text-right">{rightLabel}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-2.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r ${bgColorClasses[colorScheme]} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:${colorClasses[colorScheme]} [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-white/10 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20`}
      />
    </div>
  )
}

function StyledSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  description
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  description?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-200">{label}</Label>
        {description && <span className="text-xs text-gray-500">{description}</span>}
      </div>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 px-4 pr-10 rounded-xl bg-white/5 border border-white/20 text-gray-200 text-sm appearance-none cursor-pointer focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all group-hover:border-white/30 truncate"
        >
          <option value="" className="bg-black text-gray-400 truncate">{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-black text-gray-200">{opt}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400/60 group-focus-within:text-white transition-colors">
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>
    </div>
  )
}

export function PersonaForm({ isOpen, onClose, persona, onSave, isAdult = false }: PersonaFormProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [connections, setConnections] = useState<ExtendedConnection[]>([])
  const [editingConnection, setEditingConnection] = useState<ExtendedConnection | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const isFileInputOpenRef = useRef(false) // Track if file dialog is open to prevent modal close
  
  // Export persona data as JSON file
  const handleExportPersona = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      persona: {
        ...formData,
        connections,
      }
    }
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${formData.name || 'persona'}_export.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  // Import persona data from JSON file
  const handleImportPersona = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Reset the file input open flag
    isFileInputOpenRef.current = false
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        
        // Validate the imported data structure
        if (!data.persona) {
          throw new Error('Invalid persona file format')
        }
        
        const imported = data.persona
        
        // Merge imported data with default values to handle missing fields
        setFormData({
          name: imported.name || '',
          title: imported.title || [],
          avatarUrl: imported.avatarUrl || null,
          bannerUrl: imported.bannerUrl || null,
          description: imported.description || null,
          archetype: imported.archetype || null,
          secondaryArchetype: imported.secondaryArchetype || null,
          gender: imported.gender || null,
          pronouns: imported.pronouns || null,
          age: imported.age || null,
          tags: imported.tags || [],
          personalityDescription: imported.personalityDescription || null,
          personalitySpectrums: imported.personalitySpectrums || defaultSpectrums,
          bigFive: imported.bigFive || defaultBigFive,
          hexaco: imported.hexaco || defaultHexaco,
          strengths: imported.strengths || [],
          flaws: imported.flaws || [],
          values: imported.values || [],
          fears: imported.fears || [],
          species: imported.species || null,
          likes: imported.likes || [],
          dislikes: imported.dislikes || [],
          hobbies: imported.hobbies || [],
          skills: imported.skills || [],
          languages: imported.languages || [],
          habits: imported.habits || [],
          speechPatterns: imported.speechPatterns || [],
          backstory: imported.backstory || null,
          appearance: imported.appearance || null,
          mbtiType: imported.mbtiType || null,
          themeEnabled: imported.themeEnabled ?? false,
          rpStyle: imported.rpStyle || null,
          rpPreferredGenders: imported.rpPreferredGenders || [],
          rpGenres: imported.rpGenres || [],
          rpLimits: imported.rpLimits || [],
          rpThemes: imported.rpThemes || [],
          rpExperienceLevel: imported.rpExperienceLevel || null,
          rpResponseTime: imported.rpResponseTime || null,
          nsfwEnabled: imported.nsfwEnabled ?? false,
          nsfwBodyType: imported.nsfwBodyType || null,
          nsfwKinks: imported.nsfwKinks || [],
          nsfwContentWarnings: imported.nsfwContentWarnings || [],
          nsfwOrientation: imported.nsfwOrientation || null,
          nsfwRolePreference: imported.nsfwRolePreference || null,
          characterQuote: imported.characterQuote || null,
          psychologySurface: imported.psychologySurface || null,
          psychologyBeneath: imported.psychologyBeneath || null,
          occupation: imported.occupation || null,
          status: imported.status || null,
          orientation: imported.orientation || null,
          height: imported.height || null,
          dialogueLog: imported.dialogueLog || [],
          characterScenarios: imported.characterScenarios || [],
          galleryUrls: imported.galleryUrls || [],
          alternateImageUrl: imported.alternateImageUrl || null,
        })
        
        if (imported.connections) {
          setConnections(imported.connections)
        }
        
        setError('')
      } catch (err) {
        setError('Failed to import persona: Invalid file format')
        console.error('Import error:', err)
      }
    }
    reader.readAsText(file)
    
    // Reset the input so the same file can be imported again
    e.target.value = ''
  }
  
  // Filter navItems based on age - NSFW only for 18+
  const navItems = useMemo(() => {
    return navItemsBase.filter(item => !item.requiresAdult || isAdult)
  }, [isAdult])
  
  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name,
        title: persona.title ? (Array.isArray(persona.title) ? persona.title : JSON.parse(persona.title)) : [],
        avatarUrl: persona.avatarUrl,
        bannerUrl: persona.bannerUrl || null,
        description: persona.description,
        archetype: persona.archetype,
        secondaryArchetype: persona.secondaryArchetype,
        gender: persona.gender,
        pronouns: persona.pronouns || null,
        age: persona.age,
        tags: persona.tags || [],
        personalityDescription: persona.personalityDescription,
        personalitySpectrums: persona.personalitySpectrums || defaultSpectrums,
        bigFive: persona.bigFive || defaultBigFive,
        hexaco: persona.hexaco || defaultHexaco,
        strengths: persona.strengths || [],
        flaws: persona.flaws || [],
        values: persona.values || [],
        fears: persona.fears || [],
        species: persona.species,
        likes: persona.likes || [],
        dislikes: persona.dislikes || [],
        hobbies: persona.hobbies || [],
        skills: persona.skills || [],
        languages: persona.languages || [],
        habits: persona.habits || [],
        speechPatterns: persona.speechPatterns || [],
        backstory: persona.backstory,
        appearance: persona.appearance,
        mbtiType: persona.mbtiType,
        themeEnabled: persona.themeEnabled ?? false,
        rpStyle: persona.rpStyle || null,
        rpPreferredGenders: persona.rpPreferredGenders || [],
        rpGenres: persona.rpGenres || [],
        rpLimits: persona.rpLimits || [],
        rpThemes: persona.rpThemes || [],
        rpExperienceLevel: persona.rpExperienceLevel || null,
        rpResponseTime: persona.rpResponseTime || null,
        nsfwEnabled: persona.nsfwEnabled ?? false,
        nsfwBodyType: persona.nsfwBodyType || null,
        nsfwKinks: persona.nsfwKinks || [],
        nsfwContentWarnings: persona.nsfwContentWarnings || [],
        nsfwOrientation: persona.nsfwOrientation || null,
        nsfwRolePreference: persona.nsfwRolePreference || null,
        characterQuote: persona.characterQuote || null,
        psychologySurface: persona.psychologySurface || null,
        psychologyBeneath: persona.psychologyBeneath || null,
        occupation: persona.occupation || null,
        status: persona.status || null,
        orientation: persona.orientation || null,
        height: persona.height || null,
        dialogueLog: persona.dialogueLog || [],
        characterScenarios: persona.characterScenarios || [],
        galleryUrls: persona.galleryUrls || [],
        alternateImageUrl: persona.alternateImageUrl || null,
      })
      setConnections(persona.connections || [])
    } else {
      setFormData(defaultFormData)
      setConnections([])
    }
    setActiveTab('preview')
    setError('')
  }, [persona, isOpen])
  
  // Reset file input flag when window regains focus (handles cancelled file dialogs)
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to ensure the file dialog close event has been processed
      setTimeout(() => {
        isFileInputOpenRef.current = false
      }, 100)
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    // Reset the file input open flag
    isFileInputOpenRef.current = false
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setError('')
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
      if (response.ok) {
        const data = await response.json()
        if (type === 'avatar') {
          setFormData(prev => ({ ...prev, avatarUrl: data.url || data.avatarUrl }))
        } else {
          setFormData(prev => ({ ...prev, bannerUrl: data.url || data.bannerUrl }))
        }
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required')
      setActiveTab('preview')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const connectionsData = connections
        .filter(c => c.characterName && c.relationshipType)
        .map(c => ({
          id: c.id,
          characterName: c.characterName,
          relationshipType: c.relationshipType,
          specificRole: c.specificRole || null,
          characterAge: c.characterAge || null,
          description: c.description || null,
          avatarUrl: c.avatarUrl || null,
          bannerUrl: c.bannerUrl || null,
          gender: c.gender || null,
          pronouns: c.pronouns || null,
          species: c.species || null,
          archetype: c.archetype || null,
          mbtiType: c.mbtiType || null,
          tags: c.tags || [],
          personalityDescription: c.personalityDescription || null,
          personalitySpectrums: c.personalitySpectrums || defaultSpectrums,
          bigFive: c.bigFive || defaultBigFive,
          hexaco: c.hexaco || defaultHexaco,
          strengths: c.strengths || [],
          flaws: c.flaws || [],
          values: c.values || [],
          fears: c.fears || [],
          likes: c.likes || [],
          dislikes: c.dislikes || [],
          hobbies: c.hobbies || [],
          skills: c.skills || [],
          languages: c.languages || [],
          habits: c.habits || [],
          speechPatterns: c.speechPatterns || [],
          backstory: c.backstory || null,
          appearance: c.appearance || null,
          rpStyle: c.rpStyle || null,
          rpPreferredGenders: c.rpPreferredGenders || [],
          rpGenres: c.rpGenres || [],
          rpLimits: c.rpLimits || [],
          rpThemes: c.rpThemes || [],
          rpExperienceLevel: c.rpExperienceLevel || null,
          rpResponseTime: c.rpResponseTime || null,
          nsfwEnabled: c.nsfwEnabled || false,
          nsfwBodyType: c.nsfwBodyType || null,
          nsfwKinks: c.nsfwKinks || [],
          nsfwContentWarnings: c.nsfwContentWarnings || [],
          nsfwOrientation: c.nsfwOrientation || null,
          nsfwRolePreference: c.nsfwRolePreference || null,
        }))
      await onSave({ ...formData, connections: connectionsData })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }
  
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const addNewConnection = () => {
    setEditingConnection({ isNew: true, characterName: '', relationshipType: '' })
  }
  
  const editConnection = (connection: ExtendedConnection) => {
    setEditingConnection(connection)
  }
  
  const saveConnection = (connection: ExtendedConnection) => {
    if (connection.isNew) {
      setConnections(prev => [...prev, { ...connection, isNew: false, id: connection.id || `new-${Date.now()}` }])
    } else {
      setConnections(prev => prev.map(c => c.id === connection.id ? connection : c))
    }
    setEditingConnection(null)
  }
  
  const removeConnection = (connectionId: string | undefined) => {
    if (!connectionId) return
    setConnections(prev => prev.filter(c => c.id !== connectionId))
  }
  
  const calculateCompletion = () => {
    const fields = [
      formData.name,
      formData.description,
      formData.archetype,
      formData.gender,
      formData.age,
      formData.backstory,
      formData.mbtiType,
    ]
    const filled = fields.filter(f => f !== null && f !== '' && f !== undefined).length
    return Math.round((filled / fields.length) * 100)
  }
  
  const completion = calculateCompletion()
  const currentIndex = navItems.findIndex(item => item.id === activeTab)
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Don't close the dialog if a file input dialog is open
        if (!open && isFileInputOpenRef.current) {
          return
        }
        if (!open) {
          onClose()
        }
      }}>
        <DialogContent showCloseButton={false} className="!max-w-[1100px] sm:!max-w-[1100px] w-[90vw] max-h-[90vh] p-0 overflow-hidden flex flex-col bg-gradient-to-br from-[#0a0512] via-[#12081f] to-[#0d0718] border border-white/20 rounded-2xl shadow-2xl shadow-white/5">
          <VisuallyHidden>
            <DialogTitle>{persona ? 'Edit Character' : 'Create Character'}</DialogTitle>
          </VisuallyHidden>
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400/50 to-transparent" />
          </div>
          
          <div className="relative flex flex-1 min-h-0 min-w-0 overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 flex-shrink-0 bg-black/30 border-r border-white/10 flex flex-col overflow-hidden backdrop-blur-sm">
              <div className="p-5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-14 h-14 border-2 border-white/30">
                      <AvatarImage src={formData.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-white to-gray-300 text-white text-lg font-bold">
                        {formData.name.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => {
                        isFileInputOpenRef.current = true
                        fileInputRef.current?.click()
                      }} 
                      disabled={isUploading} 
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{formData.name || 'New Character'}</h3>
                    <p className="text-xs text-gray-400/60 truncate">{formData.archetype || 'No archetype'}{formData.secondaryArchetype ? ` / ${formData.secondaryArchetype}` : ''}</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500/60 text-center mt-2">Recommended Avatar Size: 256×256</p>
                
                {/* FIX 3: Progress bar — shows a subtle sliver at 0% instead of being invisible */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400/60 mb-1.5">
                    <span>Profile completion</span>
                    <span className="text-gray-300 font-medium">{completion}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-white to-gray-300 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(completion, 0)}%`,
                        minWidth: completion > 0 ? undefined : '2px',
                        opacity: completion > 0 ? 1 : 0.3,
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all group ${
                        isActive 
                          ? 'bg-gradient-to-r from-white/20 to-gray-400/20 text-white border border-white/20' 
                          : 'text-gray-400/70 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? 'bg-white/15' : 'bg-white/5 group-hover:bg-white/10'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className={`text-[10px] ${isActive ? 'text-gray-300/60' : 'text-gray-400/40'}`}>{item.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              <div className="p-3 border-t border-white/10 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-white/20 to-gray-400/20 hover:from-white/30 hover:to-gray-400/30 text-gray-200 text-sm font-medium transition-all border border-white/20 hover:border-white/30 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Overview
                </button>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden bg-black/10">
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar min-h-0">
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    {error}
                  </div>
                )}
                
                {/* Preview Tab */}
                {activeTab === 'preview' && (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-full max-w-xl space-y-5">
                      {/* Character Preview Card */}
                      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1230] via-[#15102a] to-[#0d0a1a] border border-white/20 shadow-2xl shadow-white/5">
                        {/* Banner */}
                        <div className="h-32 relative overflow-hidden">
                          {formData.bannerUrl ? (
                            <img src={formData.bannerUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-600/40 via-gray-300/30 to-cyan-500/30" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1230] via-transparent to-transparent" />
                          {/* Archetype badge */}
                          <div className="absolute top-3 right-3">
                            <div className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs text-gray-200 border border-white/10">
                              {formData.archetype || 'No Archetype'}{formData.secondaryArchetype ? ` / ${formData.secondaryArchetype}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Avatar & Name Section */}
                        <div className="relative px-5 -mt-14">
                          <div className="flex items-end gap-4">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-[#1a1230] bg-gradient-to-br from-white/60 to-gray-400/60 shadow-xl shadow-white/10 ring-2 ring-white/15">
                              {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-600/30 to-gray-500/30">
                                  <User className="w-10 h-10 text-gray-300/60" />
                                </div>
                              )}
                            </div>
                            <div className="pb-2 flex-1 min-w-0">
                              <h3 className="text-xl font-bold text-white truncate">{formData.name || 'Untitled Character'}</h3>
                              {formData.title && formData.title.length > 0 && (
                                <p className="text-sm text-gray-300/80 truncate mt-0.5">{formData.title.join(' • ')}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 pt-4 space-y-4">
                          {/* Tags */}
                          {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {formData.tags.slice(0, 4).map((tag, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-white/10 text-gray-200 border border-white/15 font-medium">{tag}</span>
                              ))}
                              {formData.tags.length > 4 && (
                                <span className="px-2.5 py-1 rounded-full text-xs bg-gray-500/15 text-gray-200 border border-white/15 font-medium">+{formData.tags.length - 4}</span>
                              )}
                            </div>
                          )}

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {formData.gender && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                                <User className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-xs text-gray-200">{formData.gender}</span>
                              </div>
                            )}
                            {formData.age && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                                <Heart className="w-3.5 h-3.5 text-pink-400" />
                                <span className="text-xs text-gray-200">{formData.age} years old</span>
                              </div>
                            )}
                            {formData.mbtiType && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                                <Brain className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs text-gray-200">{formData.mbtiType}</span>
                              </div>
                            )}
                            {formData.species && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs text-gray-200">{formData.species}</span>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {formData.description && (
                            <p className="text-sm text-gray-200/70 line-clamp-3 leading-relaxed">{formData.description}</p>
                          )}

                          {/* Stats Bar */}
                          <div className="pt-3 border-t border-white/10">
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="group">
                                <div className="text-2xl font-bold bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent">{formData.likes.length}</div>
                                <div className="text-[10px] text-gray-400/50 uppercase tracking-wider mt-0.5">Likes</div>
                              </div>
                              <div className="group">
                                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">{formData.skills.length}</div>
                                <div className="text-[10px] text-gray-400/50 uppercase tracking-wider mt-0.5">Skills</div>
                              </div>
                              <div className="group">
                                <div className="text-2xl font-bold bg-gradient-to-r from-pink-300 to-rose-300 bg-clip-text text-transparent">{connections.length}</div>
                                <div className="text-[10px] text-gray-400/50 uppercase tracking-wider mt-0.5">Connections</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Profile Completion Card */}
                      <div className="relative p-5 rounded-2xl bg-gradient-to-br from-white/10 to-gray-400/5 border border-white/15 overflow-hidden">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl" />

                        <div className="relative">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                                <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              Profile Status
                            </h4>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              completion >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              completion >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-white/10 text-gray-300 border border-white/20'
                            }`}>
                              {completion}% Complete
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-5">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                completion >= 80 ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' :
                                completion >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                                'bg-gradient-to-r from-white to-gray-300'
                              }`}
                              style={{ width: `${completion}%` }}
                            />
                          </div>

                          {/* Status Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Brain className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] text-gray-400/60 uppercase tracking-wider">Personality</span>
                              </div>
                              <div className="text-sm font-medium text-white">{formData.mbtiType || 'Not set'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-[10px] text-gray-400/60 uppercase tracking-wider">Backstory</span>
                              </div>
                              <div className="text-sm font-medium text-white">
                                {formData.backstory ? `${formData.backstory.length.toLocaleString()} chars` : 'Not written'}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Palette className="w-3.5 h-3.5 text-pink-400" />
                                <span className="text-[10px] text-gray-400/60 uppercase tracking-wider">Appearance</span>
                              </div>
                              <div className="text-sm font-medium text-white">{formData.appearance ? 'Described' : 'Not set'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Users className="w-3.5 h-3.5 text-violet-400" />
                                <span className="text-[10px] text-gray-400/60 uppercase tracking-wider">Connections</span>
                              </div>
                              <div className="text-sm font-medium text-white">{connections.length} defined</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setActiveTab('basic')}
                          className="group relative py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-medium transition-all border border-white/15 hover:border-white/30 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-gray-400/10 to-gray-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          <span className="relative flex items-center justify-center gap-2">
                            <Edit2 className="w-4 h-4" />
                            Edit Info
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveTab('personality')}
                          className="group relative py-3 px-4 rounded-xl bg-gradient-to-r from-white/20 to-gray-400/20 hover:from-white/30 hover:to-gray-400/30 text-white text-sm font-medium transition-all border border-white/20 hover:border-white/30 overflow-hidden shadow-lg shadow-white/5"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-gray-300/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          <span className="relative flex items-center justify-center gap-2">
                            <Heart className="w-4 h-4" />
                            Edit Personality
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    <div className="relative group">
                      <div 
                        className="h-32 rounded-2xl overflow-hidden bg-gradient-to-r from-white/20 via-gray-300/20 to-cyan-500/20 border border-white/15 cursor-pointer"
                        onClick={() => {
                          isFileInputOpenRef.current = true
                          bannerInputRef.current?.click()
                        }}
                      >
                        {formData.bannerUrl && <img src={formData.bannerUrl} alt="" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-2 text-white">
                            <Camera className="w-5 h-5" />
                            <span className="text-sm font-medium">Add Banner</span>
                          </div>
                        </div>
                      </div>
                      <input ref={bannerInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
                      <p className="text-[10px] text-gray-500/60 text-center mt-2">Recommended Banner Size: 1200×400</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-sm font-medium text-white">Character Name *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          placeholder="Enter character name"
                          maxLength={50}
                          className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl"
                        />
                      </div>
                      
                      <StyledSelect
                        label="Primary Archetype"
                        value={formData.archetype || ''}
                        onChange={(v) => updateField('archetype', v || null)}
                        options={[...PERSONA_ARCHETYPES]}
                        placeholder="Select primary archetype..."
                      />
                      
                      <StyledSelect
                        label="Secondary Archetype"
                        value={formData.secondaryArchetype || ''}
                        onChange={(v) => updateField('secondaryArchetype', v || null)}
                        options={[...PERSONA_ARCHETYPES]}
                        placeholder="Select secondary archetype (optional)..."
                        description="Adds depth & nuance"
                      />
                      
                      <StyledSelect
                        label="Gender"
                        value={formData.gender || ''}
                        onChange={(v) => updateField('gender', v || null)}
                        options={GENDERS}
                        placeholder="Select gender..."
                      />
                      
                      {/* FIX 1: Age placeholder shortened — was "Character age (e.g., 25)" which truncated to "Character a" */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Age</Label>
                        <Input
                          type="number"
                          value={formData.age ?? ''}
                          onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="e.g., 25"
                          className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                        />
                      </div>
                      
                      <StyledSelect
                        label="Pronouns"
                        value={formData.pronouns || ''}
                        onChange={(v) => updateField('pronouns', v || null)}
                        options={PRONOUNS}
                        placeholder="Select pronouns..."
                      />
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Species</Label>
                        <Input
                          value={formData.species || ''}
                          onChange={(e) => updateField('species', e.target.value || null)}
                          placeholder="e.g., Human, Elf, Vampire..."
                          className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                        />
                      </div>
                    </div>
                    
                    {/* FIX 2: Custom Titles placeholder shortened — was too long and clipped mid-word */}
                    <div className="col-span-2">
                      <TagInput
                        label="Custom Titles"
                        tags={formData.title}
                        onChange={(tags) => updateField('title', tags)}
                        placeholder="Add title like 'The Golden Champion'..."
                        description="Press Enter to add"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-white">Description</Label>
                        <span className="text-xs text-gray-400/50">{(formData.description || '').length}/{MAX_DESCRIPTION_LENGTH}</span>
                      </div>
                      <Textarea
                        value={formData.description || ''}
                        onChange={(e) => updateField('description', e.target.value || null)}
                        placeholder="Describe your character..."
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        rows={4}
                        className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl"
                      />
                    </div>
                    
                    <TagInput
                      label="Tags"
                      tags={formData.tags}
                      onChange={(tags) => updateField('tags', tags)}
                      placeholder="Add tags like Fantasy, Modern..."
                    />
                    
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/15">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Palette className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Profile Theme</p>
                          <p className="text-xs text-gray-400/60">Enable custom styling for this character</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateField('themeEnabled', !formData.themeEnabled)}
                        className={`w-12 h-6 rounded-full transition-all ${formData.themeEnabled ? 'bg-gradient-to-r from-white to-gray-300' : 'bg-white/10'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${formData.themeEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Personality Tab */}
                {activeTab === 'personality' && (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-white">Personality Description</Label>
                      <Textarea
                        value={formData.personalityDescription || ''}
                        onChange={(e) => updateField('personalityDescription', e.target.value || null)}
                        placeholder="Describe your character's personality..."
                        maxLength={2000}
                        rows={4}
                        className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Personality Spectrums</h4>
                        <p className="text-xs text-gray-400/60">Drag sliders to position your character</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        {(Object.keys(SPECTRUM_LABELS) as (keyof PersonalitySpectrums)[]).map(key => (
                          <SpectrumSlider
                            key={key}
                            value={formData.personalitySpectrums[key]}
                            onChange={(v) => updateField('personalitySpectrums', { ...formData.personalitySpectrums, [key]: v })}
                            leftLabel={SPECTRUM_LABELS[key].left}
                            rightLabel={SPECTRUM_LABELS[key].right}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Big Five (OCEAN)</h4>
                        <p className="text-xs text-gray-400/60">Five Factor Model personality traits</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        {(Object.keys(BIG_FIVE_LABELS) as (keyof BigFiveTraits)[]).map(key => (
                          <div key={key} className="space-y-2">
                            <SpectrumSlider
                              value={formData.bigFive[key]}
                              onChange={(v) => updateField('bigFive', { ...formData.bigFive, [key]: v })}
                              leftLabel={BIG_FIVE_LABELS[key].left}
                              rightLabel={BIG_FIVE_LABELS[key].right}
                              colorScheme="cyan"
                            />
                            <p className="text-[10px] text-gray-400/40 px-1">{BIG_FIVE_LABELS[key].description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">HEXACO Model</h4>
                        <p className="text-xs text-gray-400/60">Six-factor model with Honesty-Humility</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        {(Object.keys(HEXACO_LABELS) as (keyof HexacoTraits)[]).map(key => (
                          <div key={key} className="space-y-2">
                            <SpectrumSlider
                              value={formData.hexaco[key]}
                              onChange={(v) => updateField('hexaco', { ...formData.hexaco, [key]: v })}
                              leftLabel={HEXACO_LABELS[key].left}
                              rightLabel={HEXACO_LABELS[key].right}
                              colorScheme="emerald"
                            />
                            <p className="text-[10px] text-gray-400/40 px-1">{HEXACO_LABELS[key].description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <TagInput label="Strengths" tags={formData.strengths} onChange={(strengths) => updateField('strengths', strengths)} placeholder="Add strength..." />
                      <TagInput label="Flaws" tags={formData.flaws} onChange={(flaws) => updateField('flaws', flaws)} placeholder="Add flaw..." />
                      <TagInput label="Values" tags={formData.values} onChange={(values) => updateField('values', values)} placeholder="Add value..." />
                      <TagInput label="Fears" tags={formData.fears} onChange={(fears) => updateField('fears', fears)} placeholder="Add fear..." />
                    </div>
                  </div>
                )}
                
                {/* Attributes Tab */}
                {activeTab === 'attributes' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <TagInput label="Likes" tags={formData.likes} onChange={(likes) => updateField('likes', likes)} placeholder="Add like..." />
                      <TagInput label="Dislikes" tags={formData.dislikes} onChange={(dislikes) => updateField('dislikes', dislikes)} placeholder="Add dislike..." />
                      <TagInput label="Hobbies" tags={formData.hobbies} onChange={(hobbies) => updateField('hobbies', hobbies)} placeholder="Add hobby..." />
                      <TagInput label="Skills" tags={formData.skills} onChange={(skills) => updateField('skills', skills)} placeholder="Add skill..." />
                      <TagInput label="Languages" tags={formData.languages} onChange={(languages) => updateField('languages', languages)} placeholder="Add language..." />
                      <TagInput label="Habits" tags={formData.habits} onChange={(habits) => updateField('habits', habits)} placeholder="Add habit..." />
                    </div>
                    <TagInput
                      label="Speech Patterns"
                      tags={formData.speechPatterns}
                      onChange={(speechPatterns) => updateField('speechPatterns', speechPatterns)}
                      placeholder="Add speech patterns like 'speaks softly', 'uses formal language'..."
                    />
                  </div>
                )}
                
                {/* Backstory Tab */}
                {activeTab === 'backstory' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-white">Backstory</Label>
                        <span className="text-xs text-gray-400/50">{(formData.backstory || '').length}/{MAX_BACKSTORY_LENGTH}</span>
                      </div>
                      <Textarea
                        value={formData.backstory || ''}
                        onChange={(e) => updateField('backstory', e.target.value || null)}
                        placeholder="Write your character's backstory..."
                        maxLength={MAX_BACKSTORY_LENGTH}
                        rows={10}
                        className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-white">Appearance</Label>
                        <span className="text-xs text-gray-400/50">{(formData.appearance || '').length}/5000</span>
                      </div>
                      <Textarea
                        value={formData.appearance || ''}
                        onChange={(e) => updateField('appearance', e.target.value || null)}
                        placeholder="Describe your character's physical appearance..."
                        maxLength={5000}
                        rows={8}
                        className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl"
                      />
                    </div>
                  </div>
                )}
                
                {/* Connections Tab */}
                {activeTab === 'connections' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Character Connections</h4>
                        <p className="text-xs text-gray-400/60 mt-1">Add relationships with other characters</p>
                      </div>
                      <Button
                        onClick={addNewConnection}
                        className="flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-white to-gray-300 hover:from-gray-200 hover:to-gray-400 text-white shadow-lg shadow-white/10"
                      >
                        <Plus className="w-4 h-4" />
                        Add Connection
                      </Button>
                    </div>
                    
                    {connections.length === 0 ? (
                      <div className="text-center py-16 rounded-2xl border-2 border-dashed border-white/20 bg-white/5">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <Users className="w-8 h-8 text-gray-400/60" />
                        </div>
                        <p className="text-gray-200 font-medium">No connections yet</p>
                        <p className="text-sm text-gray-400/50 mt-1 mb-6">Add relationships to build your character's world</p>
                        <Button onClick={addNewConnection} variant="ghost" className="text-gray-400 hover:text-gray-300 hover:bg-white/5">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Connection
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {connections.map((connection) => (
                          <div 
                            key={connection.id}
                            className="group p-4 rounded-xl bg-white/5 border border-white/15 hover:border-white/30 transition-all cursor-pointer"
                            onClick={() => editConnection(connection)}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="w-12 h-12 border border-white/20">
                                <AvatarImage src={connection.avatarUrl || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-white/50 to-gray-400/50 text-white font-semibold">
                                  {connection.characterName?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-white truncate">{connection.characterName || 'Unnamed'}</h5>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-gray-300 flex-shrink-0">
                                    {connection.relationshipType}
                                  </span>
                                </div>
                                {connection.specificRole && <p className="text-xs text-gray-400/60">{connection.specificRole}</p>}
                                {connection.description && <p className="text-xs text-gray-400/40 line-clamp-2 mt-1">{connection.description}</p>}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); editConnection(connection) }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400/60 hover:text-gray-300 hover:bg-white/5 transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeConnection(connection.id) }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={addNewConnection}
                          className="p-4 rounded-xl border-2 border-dashed border-white/20 hover:border-white/30 flex items-center justify-center gap-3 text-gray-400/60 hover:text-gray-300 transition-all min-h-[100px]"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="font-medium">Add Connection</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* MBTI Tab */}
                {activeTab === 'mbti' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">MBTI Personality Type</h4>
                      <p className="text-xs text-gray-400/60">Select the Myers-Briggs Type that best fits your character</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {MBTI_TYPES.map(type => (
                        <button
                          key={type}
                          onClick={() => updateField('mbtiType', type === formData.mbtiType ? null : type)}
                          className={`p-3 rounded-xl text-center font-bold text-sm transition-all ${
                            formData.mbtiType === type 
                              ? 'bg-gradient-to-br from-white to-gray-300 text-white shadow-lg shadow-white/10 scale-105' 
                              : 'bg-white/5 border border-white/15 text-gray-300 hover:border-white/30 hover:bg-white/5'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    
                    {formData.mbtiType && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/15">
                          <h5 className="font-medium text-white mb-2">{formData.mbtiType} Profile</h5>
                          <p className="text-sm text-gray-400/70">
                            {formData.mbtiType.startsWith('I') ? 'Introverted' : 'Extroverted'},{' '}
                            {formData.mbtiType[1] === 'N' ? 'Intuitive' : 'Observant'},{' '}
                            {formData.mbtiType[2] === 'T' ? 'Thinking' : 'Feeling'},{' '}
                            {formData.mbtiType[3] === 'J' ? 'Judging' : 'Prospecting'}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-r from-white/10 to-gray-400/10 border border-white/15">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="font-medium text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-gray-400" />
                                Auto-Calibration
                              </h5>
                              <p className="text-xs text-gray-400/60 mt-1">Apply {formData.mbtiType} traits to all personality settings</p>
                            </div>
                            <Button
                              onClick={() => {
                                const calibration = MBTI_CALIBRATION[formData.mbtiType!]
                                if (calibration) {
                                  setFormData(prev => ({
                                    ...prev,
                                    personalitySpectrums: calibration.spectrums,
                                    bigFive: calibration.bigFive,
                                    hexaco: calibration.hexaco,
                                    likes: calibration.likes,
                                    dislikes: calibration.dislikes,
                                    hobbies: calibration.hobbies,
                                    habits: calibration.habits,
                                    skills: calibration.skills,
                                    speechPatterns: calibration.speechPatterns,
                                  }))
                                }
                              }}
                              className="h-10 px-5 rounded-xl bg-gradient-to-r from-white to-gray-300 hover:from-gray-200 hover:to-gray-400 text-white"
                            >
                              <Wand2 className="w-4 h-4 mr-2" />
                              Apply
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-xs">
                            <div className="p-3 rounded-lg bg-black/20">
                              <span className="text-gray-400/60 block mb-1">Personality</span>
                              <span className="text-gray-200 font-medium">5 spectrums + 11 traits</span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/20">
                              <span className="text-gray-400/60 block mb-1">Likes/Dislikes</span>
                              <span className="text-gray-200 font-medium">{MBTI_CALIBRATION[formData.mbtiType]?.likes.length || 0} + {MBTI_CALIBRATION[formData.mbtiType]?.dislikes.length || 0}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/20">
                              <span className="text-gray-400/60 block mb-1">Hobbies</span>
                              <span className="text-gray-200 font-medium">{MBTI_CALIBRATION[formData.mbtiType]?.hobbies.length || 0} activities</span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/20">
                              <span className="text-gray-400/60 block mb-1">Other</span>
                              <span className="text-gray-200 font-medium">Habits, Skills, Speech</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* RP Preferences Tab */}
                {activeTab === 'rp' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">RP Style</Label>
                        <select
                          value={formData.rpStyle || ''}
                          onChange={(e) => updateField('rpStyle', e.target.value || null)}
                          className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-white/30"
                        >
                          <option value="" className="bg-[#1a1230] text-gray-400">Select style...</option>
                          {RP_STYLES.map(style => (
                            <option key={style.value} value={style.value} className="bg-[#1a1230]">{style.label} - {style.description}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Experience Level</Label>
                        <select
                          value={formData.rpExperienceLevel || ''}
                          onChange={(e) => updateField('rpExperienceLevel', e.target.value || null)}
                          className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-white/30"
                        >
                          <option value="" className="bg-[#1a1230] text-gray-400">Select level...</option>
                          {RP_EXPERIENCE_LEVELS.map(level => (
                            <option key={level.value} value={level.value} className="bg-[#1a1230]">{level.label} - {level.description}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <TagInput label="Preferred Genders" tags={formData.rpPreferredGenders} onChange={(tags) => updateField('rpPreferredGenders', tags)} placeholder="Add preferred gender..." />
                    <TagInput label="Preferred Genres" tags={formData.rpGenres} onChange={(tags) => updateField('rpGenres', tags)} placeholder="Add genre..." />
                    <TagInput label="Limits & Triggers" tags={formData.rpLimits} onChange={(tags) => updateField('rpLimits', tags)} placeholder="Add limit..." />
                    <TagInput label="Preferred Themes" tags={formData.rpThemes} onChange={(tags) => updateField('rpThemes', tags)} placeholder="Add theme..." />
                  </div>
                )}
                
                {/* Enhanced Profile Tab */}
                {activeTab === 'enhanced' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Character Quote</Label>
                        <Input
                          value={formData.characterQuote || ''}
                          onChange={(e) => updateField('characterQuote', e.target.value || null)}
                          placeholder="A memorable quote from your character"
                          className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Occupation</Label>
                        <Input
                          value={formData.occupation || ''}
                          onChange={(e) => updateField('occupation', e.target.value || null)}
                          placeholder="Character's occupation or career"
                          className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Status</Label>
                        <Input
                          value={formData.status || ''}
                          onChange={(e) => updateField('status', e.target.value || null)}
                          placeholder="Current status..."
                          className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-white">Height</Label>
                        <Input
                          value={formData.height || ''}
                          onChange={(e) => updateField('height', e.target.value || null)}
                          placeholder="Character's height..."
                          className="h-12 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-white">Surface Psychology</Label>
                      <Textarea
                        value={formData.psychologySurface || ''}
                        onChange={(e) => updateField('psychologySurface', e.target.value || null)}
                        placeholder="How the character presents themselves on the surface..."
                        rows={3}
                        className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-white">Hidden Psychology</Label>
                      <Textarea
                        value={formData.psychologyBeneath || ''}
                        onChange={(e) => updateField('psychologyBeneath', e.target.value || null)}
                        placeholder="What lies beneath the surface..."
                        rows={3}
                        className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-white">Gallery URLs</Label>
                      <Textarea
                        value={(formData.galleryUrls || []).join('\n')}
                        onChange={(e) => updateField('galleryUrls', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                        placeholder="Add image URLs (one per line)..."
                        rows={4}
                        className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 font-mono text-sm rounded-xl"
                      />
                    </div>
                  </div>
                )}
                
                {/* NSFW Tab */}
                {activeTab === 'nsfw' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/10 to-gray-300/10 border border-white/15">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                          <Flame className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Enable NSFW Content</h4>
                          <p className="text-xs text-gray-400/60">Unlock mature content options (18+ only)</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateField('nsfwEnabled', !formData.nsfwEnabled)}
                        className={`w-14 h-7 rounded-full transition-all ${formData.nsfwEnabled ? 'bg-gradient-to-r from-gray-500 to-gray-400' : 'bg-white/10'}`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${formData.nsfwEnabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    
                    {formData.nsfwEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-white">Body Type / Description</Label>
                          <Textarea
                            value={formData.nsfwBodyType || ''}
                            onChange={(e) => updateField('nsfwBodyType', e.target.value || null)}
                            placeholder="Describe physical attributes..."
                            rows={4}
                            maxLength={12000}
                            className="resize-none bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 rounded-xl"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <StyledSelect
                            label="Orientation"
                            value={formData.nsfwOrientation || ''}
                            onChange={(v) => updateField('nsfwOrientation', v || null)}
                            options={NSFW_ORIENTATIONS}
                            placeholder="Select orientation..."
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-white">Role Preference</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {NSFW_ROLE_PREFERENCES.map(role => (
                              <button
                                key={role.value}
                                onClick={() => updateField('nsfwRolePreference', formData.nsfwRolePreference === role.value ? null : role.value)}
                                className={`p-4 rounded-xl text-left transition-all ${
                                  formData.nsfwRolePreference === role.value 
                                    ? 'bg-gradient-to-br from-white/10 to-gray-500/20 border-white/30 text-white border' 
                                    : 'bg-white/5 border border-white/15 text-gray-300 hover:border-white/30'
                                }`}
                              >
                                <p className="font-medium text-sm">{role.label}</p>
                                <p className="text-xs text-gray-400/60 mt-1 leading-relaxed">{role.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                        <TagInput label="Kinks & Interests" tags={formData.nsfwKinks} onChange={(tags) => updateField('nsfwKinks', tags)} placeholder="Add interests..." />
                        <TagInput label="Content Warnings" tags={formData.nsfwContentWarnings} onChange={(tags) => updateField('nsfwContentWarnings', tags)} placeholder="Add warnings..." />
                      </>
                    )}
                    
                    {!formData.nsfwEnabled && (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <Flame className="w-10 h-10 text-gray-400/40" />
                        </div>
                        <p className="text-gray-400/60">Enable NSFW content to access mature options</p>
                        <p className="text-xs text-gray-400/40 mt-2">You must be 18+ to use these features</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="flex-shrink-0 p-4 border-t border-white/15 bg-black/40 backdrop-blur-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const prevIndex = currentIndex - 1
                      if (prevIndex >= 0) setActiveTab(navItems[prevIndex].id)
                    }}
                    disabled={currentIndex === 0}
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 h-9 px-3 rounded-xl transition-all border border-transparent hover:border-white/20"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 px-4">
                  {navItems.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentIndex 
                          ? 'w-8 h-2 bg-gradient-to-r from-white to-gray-300 shadow-lg shadow-white/10' 
                          : i < currentIndex 
                            ? 'w-2 h-2 bg-gray-400 hover:bg-gray-300' 
                            : 'w-2 h-2 bg-white/15 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Import/Export Buttons */}
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportPersona}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => {
                      isFileInputOpenRef.current = true
                      importInputRef.current?.click()
                    }} 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white hover:bg-white/5 h-9 px-3 rounded-xl transition-all border border-white/15 hover:border-white/20 gap-1.5"
                    title="Import persona from JSON file"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                  <Button 
                    onClick={handleExportPersona} 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white hover:bg-white/5 h-9 px-3 rounded-xl transition-all border border-white/15 hover:border-white/20 gap-1.5"
                    title="Export persona to JSON file"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  
                  <div className="w-px h-6 bg-white/10" />
                  
                  <Button 
                    onClick={onClose} 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white hover:bg-white/5 h-9 px-3 rounded-xl transition-all border border-white/15 hover:border-white/20"
                  >
                    Cancel
                  </Button>
                  {currentIndex < navItems.length - 1 ? (
                    <Button 
                      onClick={() => {
                        const nextIndex = currentIndex + 1
                        if (nextIndex < navItems.length) setActiveTab(navItems[nextIndex].id)
                      }} 
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-white to-gray-300 hover:from-gray-200 hover:to-gray-400 text-white shadow-lg shadow-white/10 hover:shadow-white/20 transition-all font-medium"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving || !formData.name.trim()} 
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {persona ? 'Save Changes' : 'Create Character'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ConnectionFormModal
        isOpen={!!editingConnection}
        onClose={() => setEditingConnection(null)}
        connection={editingConnection}
        onSave={saveConnection}
        isAdult={isAdult}
      />
    </>
  )
}