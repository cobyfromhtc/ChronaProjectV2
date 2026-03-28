'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Camera, Loader2, Sparkles, X, Plus, User, Heart, Shield, 
  BookOpen, Users, Brain, ChevronLeft, ChevronRight,
  Trash2, Flame, AlertTriangle, Edit2
} from 'lucide-react'
import { Persona, PersonaConnection, PersonalitySpectrums, BigFiveTraits, HexacoTraits, defaultBigFive, defaultHexaco } from '@/stores/persona-store'
import { ConnectionFormModal, ExtendedConnection } from '@/components/connection-form-modal'

// Constants
const ARCHETYPES = ['Hero', 'Villain', 'Antihero', 'Mentor', 'Sidekick', 'Trickster', 'Lover', 'Everyman', 'Rebel', 'Creator', 'Caregiver', 'Explorer', 'Sage', 'Innocent', 'Ruler', 'Other']
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
  { value: 'submissive', label: 'Submissive', description: 'Prefers to follow partner\'s lead' },
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

// Big Five (OCEAN) personality trait labels
const BIG_FIVE_LABELS: Record<keyof BigFiveTraits, { left: string; right: string; description: string }> = {
  openness: { 
    left: 'Practical', 
    right: 'Open', 
    description: 'Openness to Experience — creativity, curiosity, appreciation for art' 
  },
  conscientiousness: { 
    left: 'Flexible', 
    right: 'Organized', 
    description: 'Conscientiousness — self-discipline, dutifulness, organization' 
  },
  extraversion: { 
    left: 'Reserved', 
    right: 'Social', 
    description: 'Extraversion — sociability, assertiveness, positive emotions' 
  },
  agreeableness: { 
    left: 'Competitive', 
    right: 'Cooperative', 
    description: 'Agreeableness — compassion, cooperation, trust' 
  },
  neuroticism: { 
    left: 'Stable', 
    right: 'Reactive', 
    description: 'Neuroticism — emotional sensitivity, anxiety, mood swings' 
  },
}

// HEXACO personality trait labels (6-factor model)
const HEXACO_LABELS: Record<keyof HexacoTraits, { left: string; right: string; description: string }> = {
  honestyHumility: { 
    left: 'Self-Serving', 
    right: 'Genuine', 
    description: 'Honesty-Humility — sincerity, fairness, modesty, avoiding greed' 
  },
  emotionality: { 
    left: 'Detached', 
    right: 'Sensitive', 
    description: 'Emotionality — emotional sensitivity, sentimentality, fearfulness' 
  },
  extraversion: { 
    left: 'Reserved', 
    right: 'Expressive', 
    description: 'Extraversion — sociability, expressiveness, optimism' 
  },
  agreeableness: { 
    left: 'Critical', 
    right: 'Tolerant', 
    description: 'Agreeableness — patience, tolerance, forgiveness vs. competitiveness' 
  },
  conscientiousness: { 
    left: 'Impulsive', 
    right: 'Disciplined', 
    description: 'Conscientiousness — organization, diligence, perfectionism' 
  },
  opennessToExperience: { 
    left: 'Conventional', 
    right: 'Creative', 
    description: 'Openness to Experience — creativity, unconventionality, intellectual curiosity' 
  },
}

// Character limits
const MAX_DESCRIPTION_LENGTH = 12000
const MAX_BACKSTORY_LENGTH = 12000

// MBTI Calibration Data
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
}

interface FormData {
  name: string
  title: string[]  // Changed to array for custom archetypes
  avatarUrl: string | null
  description: string | null
  archetype: string | null
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
  // NSFW Fields
  nsfwEnabled: boolean
  nsfwBodyType: string | null
  nsfwKinks: string[]
  nsfwContentWarnings: string[]
  nsfwOrientation: string | null
  nsfwRolePreference: string | null
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
  description: null,
  archetype: null,
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
  // NSFW defaults
  nsfwEnabled: false,
  nsfwBodyType: null,
  nsfwKinks: [],
  nsfwContentWarnings: [],
  nsfwOrientation: null,
  nsfwRolePreference: null,
}

// Tag Input Component
function TagInput({ 
  label, 
  tags, 
  onChange, 
  placeholder = 'Type and press Enter...' 
}: { 
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
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
      <Label className="text-purple-200/80">{label}</Label>
      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 min-h-[44px]">
        {tags.map((tag, i) => (
          <span 
            key={i} 
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-purple-500/20 text-purple-200 border border-purple-500/30"
          >
            {tag}
            <button 
              onClick={() => removeTag(i)} 
              className="w-4 h-4 rounded-full hover:bg-purple-500/30 flex items-center justify-center"
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
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-purple-100 placeholder:text-purple-400/40"
        />
      </div>
    </div>
  )
}

// Spectrum Slider Component
function SpectrumSlider({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  leftLabel: string
  rightLabel: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-purple-200/80">{label}</Label>
      <div className="flex items-center justify-between text-xs text-purple-400/60 mb-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-purple-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-fuchsia-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
      />
      <div className="text-center text-xs text-purple-400/40">{value}%</div>
    </div>
  )
}

// Styled Select Component
function StyledSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...'
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-purple-200/80">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 px-3 pr-10 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-100 text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/40 transition-colors"
        >
          <option value="" className="bg-[#1a1230] text-purple-400">{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-[#1a1230] text-purple-100">{opt}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronRight className="w-4 h-4 text-purple-400 rotate-90" />
        </div>
      </div>
    </div>
  )
}

const tabs = [
  { name: 'Overview', icon: User },
  { name: 'Personality', icon: Heart },
  { name: 'Attributes', icon: Shield },
  { name: 'Backstory', icon: BookOpen },
  { name: 'Connections', icon: Users },
  { name: 'MBTI', icon: Brain },
  { name: 'RP Prefs', icon: Sparkles },
  { name: 'NSFW', icon: Flame },
]

// Main Form Component
export function PersonaForm({ isOpen, onClose, persona, onSave }: PersonaFormProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [connections, setConnections] = useState<ExtendedConnection[]>([])
  const [editingConnection, setEditingConnection] = useState<ExtendedConnection | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Initialize form with persona data
  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name,
        title: persona.title ? (Array.isArray(persona.title) ? persona.title : JSON.parse(persona.title)) : [],
        avatarUrl: persona.avatarUrl,
        description: persona.description,
        archetype: persona.archetype,
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
        // NSFW fields
        nsfwEnabled: persona.nsfwEnabled ?? false,
        nsfwBodyType: persona.nsfwBodyType || null,
        nsfwKinks: persona.nsfwKinks || [],
        nsfwContentWarnings: persona.nsfwContentWarnings || [],
        nsfwOrientation: persona.nsfwOrientation || null,
        nsfwRolePreference: persona.nsfwRolePreference || null,
      })
      setConnections(persona.connections || [])
    } else {
      setFormData(defaultFormData)
      setConnections([])
    }
    setActiveTab(0)
    setError('')
  }, [persona, isOpen])
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    setError('')
    
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, avatarUrl: data.url || data.avatarUrl }))
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
      setActiveTab(0)
      return
    }
    
    setIsSaving(true)
    setError('')
    
    try {
      // Pass full connection data
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
          personalitySpectrums: c.personalitySpectrums || null,
          bigFive: c.bigFive || null,
          hexaco: c.hexaco || null,
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
      
      await onSave({
        ...formData,
        connections: connectionsData,
      })
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
  
  // Open modal for new connection
  const addNewConnection = () => {
    setEditingConnection({
      isNew: true,
      characterName: '',
      relationshipType: '',
    })
  }
  
  // Open modal to edit existing connection
  const editConnection = (connection: ExtendedConnection) => {
    setEditingConnection(connection)
  }
  
  // Save connection from modal
  const saveConnection = (connection: ExtendedConnection) => {
    if (connection.isNew) {
      // Add new connection
      setConnections(prev => [...prev, { ...connection, isNew: false, id: connection.id || `new-${Date.now()}` }])
    } else {
      // Update existing connection
      setConnections(prev => prev.map(c => c.id === connection.id ? connection : c))
    }
    setEditingConnection(null)
  }
  
  // Remove connection
  const removeConnection = (connectionId: string | undefined) => {
    if (!connectionId) return
    setConnections(prev => prev.filter(c => c.id !== connectionId))
  }
  
  const nextTab = () => setActiveTab(prev => Math.min(prev + 1, tabs.length - 1))
  const prevTab = () => setActiveTab(prev => Math.max(prev - 1, 0))
  
  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="persona-modal max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col bg-[#0d0718] border-purple-500/20">
        {/* Modern Header */}
        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between flex-shrink-0 border-b border-purple-500/15 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                {persona ? 'Edit Character' : 'Create Character'}
              </DialogTitle>
              <DialogDescription className="text-purple-400/60 text-xs">
                {persona ? 'Update your character identity.' : 'Create a new character to roleplay as.'}
              </DialogDescription>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 flex items-center justify-center text-purple-400 hover:text-purple-200 transition-all border border-purple-500/20"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        {/* Tabs - Modern pill style */}
        <div className="px-6 py-3 flex items-center gap-1 overflow-x-auto flex-shrink-0 border-b border-purple-500/10 bg-[#0d0718]/50">
          {tabs.map((tab, i) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === i 
                    ? 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-200 border border-purple-500/30' 
                    : 'text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/5 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.name}
              </button>
            )
          })}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex-shrink-0 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {/* Content - Scrollable with custom scrollbar */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
          {/* Overview Tab */}
          {activeTab === 0 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Avatar and Name Row */}
              <div className="flex items-start gap-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-colors" />
                    <Avatar className="w-24 h-24 border-2 border-purple-500/40 relative persona-avatar-glow">
                      <AvatarImage src={formData.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-2xl font-semibold">
                        {formData.name.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isUploading} 
                      className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg hover:scale-110 border-2 border-[#0d0718]"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Camera className="w-4 h-4 text-white" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                  <p className="text-[10px] text-purple-400/50">Click camera to upload</p>
                </div>
                
                {/* Name and Description */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-purple-200/80 text-sm">Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Enter character name"
                      maxLength={50}
                      className="h-11 bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <TagInput
                      label="Custom Archetypes"
                      tags={formData.title}
                      onChange={(tags) => updateField('title', tags)}
                      placeholder="Type and press Enter to add archetypes..."
                    />
                    <p className="text-[10px] text-purple-400/50 -mt-1">Add custom archetype tags like "The Golden Goose", "The Socialite", etc.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-purple-200/80 text-sm">Description</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => updateField('description', e.target.value || null)}
                      placeholder="Describe your character..."
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      rows={3}
                      className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 focus:border-purple-500/40"
                    />
                    <p className="text-[10px] text-purple-400/50">{(formData.description || '').length}/{MAX_DESCRIPTION_LENGTH} characters</p>
                  </div>
                </div>
              </div>
              
              {/* Form Grid - 3 columns for wider modal */}
              <div className="grid grid-cols-3 gap-4">
                <StyledSelect
                  label="Archetype"
                  value={formData.archetype || ''}
                  onChange={(v) => updateField('archetype', v || null)}
                  options={ARCHETYPES}
                  placeholder="Select archetype..."
                />
                
                <StyledSelect
                  label="Gender"
                  value={formData.gender || ''}
                  onChange={(v) => updateField('gender', v || null)}
                  options={GENDERS}
                  placeholder="Select gender..."
                />
                
                <StyledSelect
                  label="Pronouns"
                  value={formData.pronouns || ''}
                  onChange={(v) => updateField('pronouns', v || null)}
                  options={PRONOUNS}
                  placeholder="Select pronouns..."
                />
                
                <div className="space-y-2">
                  <Label className="text-purple-200/80 text-sm">Age</Label>
                  <Input
                    type="number"
                    value={formData.age ?? ''}
                    onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Character age"
                    className="h-11 bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-purple-200/80 text-sm">Species</Label>
                  <Input
                    value={formData.species || ''}
                    onChange={(e) => updateField('species', e.target.value || null)}
                    placeholder="e.g., Human, Elf..."
                    className="h-11 bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                  />
                </div>
                
                {/* Profile Theme Toggle */}
                <div className="space-y-2">
                  <Label className="text-purple-200/80 text-sm">Profile Theme</Label>
                  <div className="flex items-center justify-between p-3 h-11 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <span className="text-xs text-purple-300">Enable theme</span>
                    <button
                      onClick={() => updateField('themeEnabled', !formData.themeEnabled)}
                      className={`w-10 h-5 rounded-full transition-all ${
                        formData.themeEnabled ? 'bg-purple-500' : 'bg-purple-500/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all ${
                        formData.themeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
              
              <TagInput
                label="Tags"
                tags={formData.tags}
                onChange={(tags) => updateField('tags', tags)}
                placeholder="Add tags (e.g., Fantasy, Modern...)"
              />
            </div>
          )}
          
          {/* Personality Tab */}
          {activeTab === 1 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="space-y-2">
                <Label className="text-purple-200/80 text-sm">Personality Description</Label>
                <Textarea
                  value={formData.personalityDescription || ''}
                  onChange={(e) => updateField('personalityDescription', e.target.value || null)}
                  placeholder="Describe your character's personality..."
                  maxLength={2000}
                  rows={3}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
              </div>
              
              {/* Personality Spectrums - 2 columns */}
              <div className="space-y-3">
                <Label className="text-purple-200/80 text-sm">Personality Spectrums</Label>
                <p className="text-[10px] text-purple-400/60 -mt-2">Drag the sliders to position your character on each spectrum</p>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {(Object.keys(SPECTRUM_LABELS) as (keyof PersonalitySpectrums)[]).map(key => (
                    <SpectrumSlider
                      key={key}
                      label=""
                      value={formData.personalitySpectrums[key]}
                      onChange={(v) => updateField('personalitySpectrums', { ...formData.personalitySpectrums, [key]: v })}
                      leftLabel={SPECTRUM_LABELS[key].left}
                      rightLabel={SPECTRUM_LABELS[key].right}
                    />
                  ))}
                </div>
              </div>
              
              {/* Big Five (OCEAN) Personality Traits - 2 columns */}
              <div className="space-y-3 pt-4 border-t border-purple-500/10">
                <div>
                  <Label className="text-purple-200/80 text-sm">Big Five (OCEAN) Personality Traits</Label>
                  <p className="text-[10px] text-purple-400/60 mt-1">Based on the Five Factor Model — scientifically validated personality dimensions</p>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {(Object.keys(BIG_FIVE_LABELS) as (keyof BigFiveTraits)[]).map(key => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-purple-400/60">
                        <span>{BIG_FIVE_LABELS[key].left}</span>
                        <span className="text-purple-300/80 font-medium text-xs">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        <span>{BIG_FIVE_LABELS[key].right}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.bigFive[key]}
                        onChange={(e) => updateField('bigFive', { ...formData.bigFive, [key]: parseInt(e.target.value) })}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-fuchsia-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-purple-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                      />
                      <div className="text-center text-[10px] text-purple-400/40">{formData.bigFive[key]}%</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* HEXACO Personality Traits - 2 columns */}
              <div className="space-y-3 pt-4 border-t border-purple-500/10">
                <div>
                  <Label className="text-purple-200/80 text-sm">HEXACO Personality Traits</Label>
                  <p className="text-[10px] text-purple-400/60 mt-1">Six-factor model — includes Honesty-Humility dimension not found in Big Five</p>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {(Object.keys(HEXACO_LABELS) as (keyof HexacoTraits)[]).map(key => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-purple-400/60">
                        <span>{HEXACO_LABELS[key].left}</span>
                        <span className="text-purple-300/80 font-medium text-xs">
                          {key === 'honestyHumility' ? 'Honesty-Humility' : 
                           key === 'emotionality' ? 'Emotionality' : 
                           key === 'extraversion' ? 'eXtraversion' : 
                           key === 'agreeableness' ? 'Agreeableness' : 
                           key === 'conscientiousness' ? 'Conscientiousness' : 
                           'Openness'}
                        </span>
                        <span>{HEXACO_LABELS[key].right}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.hexaco[key]}
                        onChange={(e) => updateField('hexaco', { ...formData.hexaco, [key]: parseInt(e.target.value) })}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-emerald-400 [&::-webkit-slider-thumb]:to-teal-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-teal-500/30 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                      />
                      <div className="text-center text-[10px] text-purple-400/40">{formData.hexaco[key]}%</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Strengths, Flaws, Values, Fears - 2x2 grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-500/10">
                <TagInput label="Strengths" tags={formData.strengths} onChange={(strengths) => updateField('strengths', strengths)} placeholder="Add strengths..." />
                <TagInput label="Flaws" tags={formData.flaws} onChange={(flaws) => updateField('flaws', flaws)} placeholder="Add flaws..." />
                <TagInput label="Values" tags={formData.values} onChange={(values) => updateField('values', values)} placeholder="Add values..." />
                <TagInput label="Fears" tags={formData.fears} onChange={(fears) => updateField('fears', fears)} placeholder="Add fears..." />
              </div>
            </div>
          )}
          
          {/* Attributes Tab */}
          {activeTab === 2 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-4">
                <TagInput label="Likes" tags={formData.likes} onChange={(likes) => updateField('likes', likes)} placeholder="Add likes..." />
                <TagInput label="Dislikes" tags={formData.dislikes} onChange={(dislikes) => updateField('dislikes', dislikes)} placeholder="Add dislikes..." />
                <TagInput label="Hobbies" tags={formData.hobbies} onChange={(hobbies) => updateField('hobbies', hobbies)} placeholder="Add hobbies..." />
                <TagInput label="Skills" tags={formData.skills} onChange={(skills) => updateField('skills', skills)} placeholder="Add skills..." />
                <TagInput label="Languages" tags={formData.languages} onChange={(languages) => updateField('languages', languages)} placeholder="Add languages..." />
                <TagInput label="Habits" tags={formData.habits} onChange={(habits) => updateField('habits', habits)} placeholder="Add habits..." />
              </div>
              
              <TagInput
                label="Speech Patterns"
                tags={formData.speechPatterns}
                onChange={(speechPatterns) => updateField('speechPatterns', speechPatterns)}
                placeholder="Add speech patterns (e.g., speaks softly...)"
              />
            </div>
          )}
          
          {/* Backstory Tab */}
          {activeTab === 3 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="space-y-2">
                <Label className="text-purple-200/80 text-sm">Backstory</Label>
                <Textarea
                  value={formData.backstory || ''}
                  onChange={(e) => updateField('backstory', e.target.value || null)}
                  placeholder="Write your character's backstory..."
                  maxLength={MAX_BACKSTORY_LENGTH}
                  rows={8}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-[10px] text-purple-400/50">{(formData.backstory || '').length}/{MAX_BACKSTORY_LENGTH} characters</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-purple-200/80 text-sm">Appearance</Label>
                <Textarea
                  value={formData.appearance || ''}
                  onChange={(e) => updateField('appearance', e.target.value || null)}
                  placeholder="Describe your character's physical appearance..."
                  maxLength={5000}
                  rows={6}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-[10px] text-purple-400/50">{(formData.appearance || '').length}/5000 characters</p>
              </div>
            </div>
          )}
          
          {/* Connections Tab */}
          {activeTab === 4 && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-purple-200/80 text-sm">Character Connections</Label>
                  <p className="text-[10px] text-purple-400/60 mt-1">Add relationships with other characters - each connection can have its own detailed profile</p>
                </div>
                <Button
                  onClick={addNewConnection}
                  className="btn-persona flex items-center gap-2 h-9"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Connection
                </Button>
              </div>
              
              {connections.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-purple-500/30 bg-purple-500/5">
                  <Users className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
                  <p className="text-purple-300/80 font-medium">No connections yet</p>
                  <p className="text-xs text-purple-400/50 mt-1">Add relationships to build your character's world</p>
                  <Button
                    onClick={addNewConnection}
                    variant="ghost"
                    className="mt-4 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Connection
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {connections.map((connection) => (
                    <div 
                      key={connection.id}
                      className="group persona-card p-4 hover:border-purple-500/40 transition-all cursor-pointer"
                      onClick={() => editConnection(connection)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <Avatar className="w-12 h-12 border border-purple-500/30 flex-shrink-0">
                          <AvatarImage src={connection.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500/50 to-fuchsia-500/50 text-white font-semibold">
                            {connection.characterName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-purple-100 truncate">{connection.characterName || 'Unnamed'}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                              {connection.relationshipType}
                            </span>
                          </div>
                          
                          {connection.specificRole && (
                            <p className="text-xs text-purple-400/60 mb-1">{connection.specificRole}</p>
                          )}
                          
                          {connection.description && (
                            <p className="text-xs text-purple-400/50 line-clamp-2">{connection.description}</p>
                          )}
                          
                          {/* Quick stats */}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-purple-400/40">
                            {connection.characterAge && <span>{connection.characterAge}y</span>}
                            {connection.gender && <span>{connection.gender}</span>}
                            {connection.archetype && <span>{connection.archetype}</span>}
                            {connection.mbtiType && <span className="text-fuchsia-400/60">{connection.mbtiType}</span>}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); editConnection(connection) }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                            title="Edit connection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeConnection(connection.id) }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Remove connection"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add new connection card */}
                  <button
                    onClick={addNewConnection}
                    className="persona-card p-4 border-dashed border-purple-500/30 hover:border-purple-500/50 flex items-center justify-center gap-2 text-purple-400/60 hover:text-purple-300 transition-all min-h-[88px]"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-sm font-medium">Add Connection</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* MBTI Tab */}
          {activeTab === 5 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="space-y-2">
                <Label className="text-purple-200/80 text-sm">MBTI Personality Type</Label>
                <p className="text-[10px] text-purple-400/60">Select the Myers-Briggs Type that best fits your character</p>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {MBTI_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => updateField('mbtiType', type === formData.mbtiType ? null : type)}
                    className={`p-3 rounded-xl text-center font-bold text-base transition-all ${
                      formData.mbtiType === type 
                        ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/25' 
                        : 'persona-card text-purple-300 hover:border-purple-500/40 text-sm'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              {formData.mbtiType && (
                <div className="space-y-4">
                  <div className="persona-card p-4 rounded-xl">
                    <h4 className="font-medium text-purple-200 mb-2">{formData.mbtiType} Profile</h4>
                    <p className="text-sm text-purple-400/70">
                      {formData.mbtiType.startsWith('I') ? 'Introverted' : 'Extroverted'}, {' '}
                      {formData.mbtiType[1] === 'N' ? 'Intuitive' : 'Observant'}, {' '}
                      {formData.mbtiType[2] === 'T' ? 'Thinking' : 'Feeling'}, {' '}
                      {formData.mbtiType[3] === 'J' ? 'Judging' : 'Prospecting'}
                    </p>
                  </div>
                  
                  <div className="persona-card p-4 rounded-xl border-purple-500/30 bg-purple-500/5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-purple-200 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-fuchsia-400" />
                          Auto-Calibration
                        </h4>
                        <p className="text-xs text-purple-400/60 mt-1">
                          Apply {formData.mbtiType} traits to Personality, Big Five, HEXACO & Attributes
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          const calibration = MBTI_CALIBRATION[formData.mbtiType!]
                          if (calibration) {
                            // Replace ALL calibration data (don't merge with old values)
                            setFormData(prev => ({
                              ...prev,
                              // Replace personality spectrums
                              personalitySpectrums: calibration.spectrums,
                              // Replace Big Five (OCEAN) traits
                              bigFive: calibration.bigFive,
                              // Replace HEXACO traits
                              hexaco: calibration.hexaco,
                              // Replace all attributes (remove old MBTI suggestions, apply new ones)
                              likes: calibration.likes,
                              dislikes: calibration.dislikes,
                              hobbies: calibration.hobbies,
                              habits: calibration.habits,
                              skills: calibration.skills,
                              speechPatterns: calibration.speechPatterns,
                            }))
                          }
                        }}
                        className="btn-persona"
                        size="sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Apply Calibration
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-purple-400/60">Personality</span>
                        <p className="text-purple-300 mt-1">5 spectrums + 11 traits</p>
                      </div>
                      <div>
                        <span className="text-purple-400/60">Likes/Dislikes</span>
                        <p className="text-purple-300 mt-1">{MBTI_CALIBRATION[formData.mbtiType]?.likes.length || 0} likes, {MBTI_CALIBRATION[formData.mbtiType]?.dislikes.length || 0} dislikes</p>
                      </div>
                      <div>
                        <span className="text-purple-400/60">Hobbies</span>
                        <p className="text-purple-300 mt-1">{MBTI_CALIBRATION[formData.mbtiType]?.hobbies.length || 0} activities</p>
                      </div>
                      <div>
                        <span className="text-purple-400/60">Attributes</span>
                        <p className="text-purple-300 mt-1">Habits, Skills, Speech</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* RP Preferences Tab */}
          {activeTab === 6 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="space-y-2">
                <Label className="text-purple-200/80 text-sm">Roleplay Preferences</Label>
                <p className="text-[10px] text-purple-400/60">Set your roleplay style and preferences to help find compatible partners</p>
              </div>
              
              {/* RP Style */}
              <div className="space-y-3">
                <Label className="text-purple-200/80 text-sm">Writing Style</Label>
                <div className="grid grid-cols-4 gap-3">
                  {RP_STYLES.map(style => (
                    <button
                      key={style.value}
                      onClick={() => updateField('rpStyle', formData.rpStyle === style.value ? null : style.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.rpStyle === style.value 
                          ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/50 text-purple-100 border' 
                          : 'persona-card text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      <p className="font-medium text-sm">{style.label}</p>
                      <p className="text-[10px] text-purple-400/60 mt-1">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Preferred Genders for RP */}
              <div className="space-y-3">
                <Label className="text-purple-200/80">Preferred Character Genders</Label>
                <p className="text-xs text-purple-400/60">Select which gender characters you prefer to RP with</p>
                <div className="flex flex-wrap gap-2">
                  {RP_GENDERS.map(gender => (
                    <button
                      key={gender}
                      onClick={() => {
                        const current = formData.rpPreferredGenders
                        if (current.includes(gender)) {
                          updateField('rpPreferredGenders', current.filter(g => g !== gender))
                        } else {
                          updateField('rpPreferredGenders', [...current, gender])
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        formData.rpPreferredGenders.includes(gender)
                          ? 'bg-purple-500/30 border border-purple-500/50 text-purple-100'
                          : 'bg-purple-500/5 border border-purple-500/20 text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Preferred Genres */}
              <TagInput
                label="Preferred Genres"
                tags={formData.rpGenres}
                onChange={(tags) => updateField('rpGenres', tags)}
                placeholder="Add genres (e.g., Fantasy, Romance...)"
              />
              
              {/* Limits/Triggers */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-purple-200/80">Limits & Triggers</Label>
                  <span className="text-xs text-red-400/60 bg-red-500/10 px-2 py-0.5 rounded-full">Avoid</span>
                </div>
                <Textarea
                  value={formData.rpLimits.join(', ')}
                  onChange={(e) => updateField('rpLimits', e.target.value.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean))}
                  placeholder="Topics/themes you want to avoid..."
                  rows={2}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-xs text-purple-400/50">Separate items with commas (e.g., gore, violence, non-con)</p>
              </div>
              
              {/* Themes & Topics */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-purple-200/80">Themes & Topics</Label>
                  <span className="text-xs text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">Prefer</span>
                </div>
                <Textarea
                  value={formData.rpThemes.join(', ')}
                  onChange={(e) => updateField('rpThemes', e.target.value.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean))}
                  placeholder="Themes and topics you enjoy in RP..."
                  rows={2}
                  className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                />
                <p className="text-xs text-purple-400/50">Separate items with commas (e.g., romance, adventure, mystery)</p>
              </div>
              
              {/* Experience Level */}
              <div className="space-y-3">
                <Label className="text-purple-200/80 text-sm">Experience Level</Label>
                <div className="grid grid-cols-4 gap-3">
                  {RP_EXPERIENCE_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => updateField('rpExperienceLevel', formData.rpExperienceLevel === level.value ? null : level.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.rpExperienceLevel === level.value 
                          ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/50 text-purple-100 border' 
                          : 'persona-card text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      <p className="font-medium text-sm">{level.label}</p>
                      <p className="text-[10px] text-purple-400/60">{level.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Response Time */}
              <div className="space-y-3">
                <Label className="text-purple-200/80 text-sm">Typical Response Time</Label>
                <div className="grid grid-cols-4 gap-3">
                  {RP_RESPONSE_TIMES.map(time => (
                    <button
                      key={time.value}
                      onClick={() => updateField('rpResponseTime', formData.rpResponseTime === time.value ? null : time.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        formData.rpResponseTime === time.value 
                          ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-purple-500/50 text-purple-100 border' 
                          : 'persona-card text-purple-300 hover:border-purple-500/40'
                      }`}
                    >
                      <p className="font-medium text-sm">{time.label}</p>
                      <p className="text-[10px] text-purple-400/60">{time.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* NSFW Tab */}
          {activeTab === 7 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* NSFW Toggle */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-purple-100 text-sm">Enable NSFW Content</h3>
                      <p className="text-[10px] text-purple-400/60">Unlock mature content options (18+ only)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateField('nsfwEnabled', !formData.nsfwEnabled)}
                    className={`w-12 h-6 rounded-full transition-all ${
                      formData.nsfwEnabled 
                        ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                        : 'bg-purple-500/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
                      formData.nsfwEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
              
              {formData.nsfwEnabled && (
                <>
                  {/* Body Type */}
                  <div className="space-y-2">
                    <Label className="text-purple-200/80">Body Type / Physical Description</Label>
                    <Textarea
                      value={formData.nsfwBodyType || ''}
                      onChange={(e) => updateField('nsfwBodyType', e.target.value || null)}
                      placeholder="Describe physical attributes, body type, measurements, distinctive features..."
                      rows={4}
                      maxLength={12000}
                      className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                    />
                    <div className="flex justify-between text-xs text-purple-400/40">
                      <span>Detailed physical description</span>
                      <span>{(formData.nsfwBodyType || '').length}/12000</span>
                    </div>
                  </div>
                  
                  {/* Orientation */}
                  <div className="space-y-3">
                    <Label className="text-purple-200/80">Sexual Orientation</Label>
                    <div className="flex flex-wrap gap-2">
                      {NSFW_ORIENTATIONS.map(orientation => (
                        <button
                          key={orientation}
                          onClick={() => updateField('nsfwOrientation', formData.nsfwOrientation === orientation ? null : orientation)}
                          className={`px-4 py-2 rounded-lg text-sm transition-all ${
                            formData.nsfwOrientation === orientation
                              ? 'bg-red-500/30 border border-red-500/50 text-purple-100'
                              : 'bg-purple-500/5 border border-purple-500/20 text-purple-300 hover:border-purple-500/40'
                          }`}
                        >
                          {orientation}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Role Preference */}
                  <div className="space-y-3">
                    <Label className="text-purple-200/80 text-sm">Role Preference</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {NSFW_ROLE_PREFERENCES.map(role => (
                        <button
                          key={role.value}
                          onClick={() => updateField('nsfwRolePreference', formData.nsfwRolePreference === role.value ? null : role.value)}
                          className={`p-3 rounded-xl text-left transition-all ${
                            formData.nsfwRolePreference === role.value 
                              ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/50 text-purple-100 border' 
                              : 'persona-card text-purple-300 hover:border-purple-500/40'
                          }`}
                        >
                          <p className="font-medium text-sm">{role.label}</p>
                          <p className="text-[10px] text-purple-400/60 mt-1">{role.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Kinks/Interests */}
                  <TagInput
                    label="Kinks & Interests"
                    tags={formData.nsfwKinks}
                    onChange={(tags) => updateField('nsfwKinks', tags)}
                    placeholder="Add interests (e.g., BDSM, Voyeurism...)"
                  />
                  
                  {/* Content Warnings */}
                  <div className="space-y-2">
                    <Label className="text-purple-200/80">Content Themes</Label>
                    <p className="text-xs text-purple-400/60">What mature themes you're comfortable with in RP</p>
                    <Textarea
                      value={formData.nsfwContentWarnings.join(', ')}
                      onChange={(e) => updateField('nsfwContentWarnings', e.target.value.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean))}
                      placeholder="Themes you're comfortable with..."
                      rows={3}
                      className="resize-none bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40"
                    />
                    <p className="text-xs text-purple-400/50">Separate items with commas (e.g., romance, slice of life, drama)</p>
                  </div>
                </>
              )}
              
              {!formData.nsfwEnabled && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <Flame className="w-8 h-8 text-purple-400/40" />
                  </div>
                  <p className="text-purple-400/60">Enable NSFW content to access mature customization options</p>
                  <p className="text-xs text-purple-400/40 mt-2">You must be 18+ to use these features</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer - Fixed at bottom */}
        <div className="border-t border-purple-500/15 px-6 py-4 flex items-center justify-between bg-black/20 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              onClick={prevTab}
              disabled={activeTab === 0}
              variant="ghost"
              className="text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 disabled:opacity-30 h-9"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          </div>
          
          {/* Tab progress indicator */}
          <div className="flex items-center gap-1.5">
            {tabs.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeTab ? 'w-6 bg-gradient-to-r from-purple-500 to-fuchsia-500' : 
                  i < activeTab ? 'w-1.5 bg-purple-500/50' : 'w-1.5 bg-purple-500/20'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="ghost" className="text-purple-400 hover:text-purple-200 hover:bg-purple-500/10 h-9">
              Cancel
            </Button>
            {activeTab < tabs.length - 1 ? (
              <Button onClick={nextTab} className="btn-persona h-9">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()} className="btn-persona h-9">
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
      </DialogContent>
    </Dialog>
    
    {/* Connection Form Modal - Rendered outside the parent Dialog to avoid z-index issues */}
    <ConnectionFormModal
      isOpen={!!editingConnection}
      onClose={() => setEditingConnection(null)}
      connection={editingConnection}
      onSave={saveConnection}
    />
  </>
  )
}
