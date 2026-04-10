'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api-client'
import { 
  Camera, Loader2, Sparkles, X, Plus, User, Heart, Shield, 
  BookOpen, Users, Brain, ChevronLeft, ChevronRight,
  Trash2, Flame, AlertTriangle, Wand2
} from 'lucide-react'
import { PersonalitySpectrums, BigFiveTraits, HexacoTraits, defaultBigFive, defaultHexaco } from '@/stores/persona-store'

// Constants (same as PersonaForm)
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
const RP_EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to roleplay' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced roleplayer' },
  { value: 'veteran', label: 'Veteran', description: 'Many years of experience' },
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

// MBTI Calibration Data - Auto-populates personality traits based on MBTI type
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

// Extended Connection interface
export interface ExtendedConnection {
  id?: string
  characterName: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  relationshipType: string
  specificRole?: string | null
  characterAge?: number | null
  description?: string | null
  gender?: string | null
  pronouns?: string | null
  species?: string | null
  archetype?: string | null
  mbtiType?: string | null
  tags?: string[]
  personalityDescription?: string | null
  personalitySpectrums?: PersonalitySpectrums
  bigFive?: BigFiveTraits
  hexaco?: HexacoTraits
  strengths?: string[]
  flaws?: string[]
  values?: string[]
  fears?: string[]
  likes?: string[]
  dislikes?: string[]
  hobbies?: string[]
  skills?: string[]
  languages?: string[]
  habits?: string[]
  speechPatterns?: string[]
  backstory?: string | null
  appearance?: string | null
  rpStyle?: string | null
  rpPreferredGenders?: string[]
  rpGenres?: string[]
  rpLimits?: string[]
  rpThemes?: string[]
  rpExperienceLevel?: string | null
  rpResponseTime?: string | null
  nsfwEnabled?: boolean
  nsfwBodyType?: string | null
  nsfwKinks?: string[]
  nsfwContentWarnings?: string[]
  nsfwOrientation?: string | null
  nsfwRolePreference?: string | null
  isNew?: boolean
}

interface ConnectionFormModalProps {
  isOpen: boolean
  onClose: () => void
  connection: ExtendedConnection | null
  onSave: (connection: ExtendedConnection) => void
  isAdult?: boolean // Age verification: 18+ can access NSFW features
}

const defaultSpectrums: PersonalitySpectrums = {
  introvertExtrovert: 50,
  intuitiveObservant: 50,
  thinkingFeeling: 50,
  judgingProspecting: 50,
  assertiveTurbulent: 50,
}

const defaultConnection: ExtendedConnection = {
  characterName: '',
  avatarUrl: null,
  bannerUrl: null,
  relationshipType: '',
  specificRole: null,
  characterAge: null,
  description: null,
  gender: null,
  pronouns: null,
  species: null,
  archetype: null,
  mbtiType: null,
  tags: [],
  personalityDescription: null,
  personalitySpectrums: defaultSpectrums,
  bigFive: defaultBigFive,
  hexaco: defaultHexaco,
  strengths: [],
  flaws: [],
  values: [],
  fears: [],
  likes: [],
  dislikes: [],
  hobbies: [],
  skills: [],
  languages: [],
  habits: [],
  speechPatterns: [],
  backstory: null,
  appearance: null,
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
  isNew: true,
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
      <Label className="text-sm font-medium text-white">{label}</Label>
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-white/15 min-h-[48px] focus-within:border-white/30 focus-within:bg-white/5 transition-all">
        {tags.map((tag, i) => (
          <span 
            key={i} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-white/20 to-gray-400/20 text-white border border-white/20"
          >
            {tag}
            <button 
              onClick={() => removeTag(i)} 
              className="w-4 h-4 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
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
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-400/40"
        />
      </div>
    </div>
  )
}

// FIX: Spectrum Slider — matches persona-form inline style (left | value% | right), no wrapping label header
function SpectrumSlider({
  value,
  onChange,
  leftLabel,
  rightLabel,
  colorScheme = 'gray',
}: {
  value: number
  onChange: (value: number) => void
  leftLabel: string
  rightLabel: string
  colorScheme?: 'gray' | 'cyan' | 'emerald'
}) {
  const bgColorClasses = {
    gray: 'from-gray-400/20 via-gray-300/20 to-gray-500/20',
    cyan: 'from-cyan-500/20 via-teal-500/20 to-cyan-500/20',
    emerald: 'from-emerald-500/20 via-teal-500/20 to-emerald-500/20',
  }

  return (
    <div className="space-y-2">
      {/* FIX: Single-line inline labels — no wrapping, matches persona-form */}
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
        className={`w-full h-2.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r ${bgColorClasses[colorScheme]} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-white [&::-webkit-slider-thumb]:to-gray-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-white/10 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20`}
      />
    </div>
  )
}

// Styled Select Component — full-width, no truncation on long placeholders
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
      <Label className="text-sm font-medium text-white">{label}</Label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 px-4 pr-10 rounded-xl bg-white/5 border border-white/15 text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all group-hover:border-white/20"
        >
          <option value="" className="bg-[#1a1230] text-gray-400">{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-[#1a1230] text-white">{opt}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400/60 group-focus-within:text-gray-400 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>
    </div>
  )
}

const tabsBase = [
  { name: 'Overview', icon: User },
  { name: 'Personality', icon: Heart },
  { name: 'Attributes', icon: Shield },
  { name: 'Backstory', icon: BookOpen },
  { name: 'MBTI', icon: Brain },
  { name: 'NSFW', icon: Flame, requiresAdult: true },
]

export function ConnectionFormModal({ isOpen, onClose, connection, onSave, isAdult = false }: ConnectionFormModalProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState<ExtendedConnection>(defaultConnection)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  
  // Filter tabs based on age - NSFW only for 18+
  const tabs = useMemo(() => {
    return tabsBase.filter(tab => !tab.requiresAdult || isAdult)
  }, [isAdult])
  
  useEffect(() => {
    if (connection) {
      setFormData({
        ...defaultConnection,
        ...connection,
        tags: connection.tags || [],
        personalitySpectrums: connection.personalitySpectrums || defaultSpectrums,
        bigFive: connection.bigFive || defaultBigFive,
        hexaco: connection.hexaco || defaultHexaco,
        strengths: connection.strengths || [],
        flaws: connection.flaws || [],
        values: connection.values || [],
        fears: connection.fears || [],
        likes: connection.likes || [],
        dislikes: connection.dislikes || [],
        hobbies: connection.hobbies || [],
        skills: connection.skills || [],
        languages: connection.languages || [],
        habits: connection.habits || [],
        speechPatterns: connection.speechPatterns || [],
        rpPreferredGenders: connection.rpPreferredGenders || [],
        rpGenres: connection.rpGenres || [],
        rpLimits: connection.rpLimits || [],
        rpThemes: connection.rpThemes || [],
        nsfwEnabled: connection.nsfwEnabled ?? false,
        nsfwKinks: connection.nsfwKinks || [],
        nsfwContentWarnings: connection.nsfwContentWarnings || [],
      })
    } else {
      setFormData({ ...defaultConnection, isNew: true })
    }
    setActiveTab(0)
    setError('')
  }, [connection, isOpen])
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }
      
      const data = await response.json()
      if (type === 'avatar') {
        setFormData(prev => ({ ...prev, avatarUrl: data.url }))
      } else {
        setFormData(prev => ({ ...prev, bannerUrl: data.url }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleSave = async () => {
    if (!formData.characterName.trim()) {
      setError('Character name is required')
      return
    }
    if (!formData.relationshipType) {
      setError('Relationship type is required')
      return
    }
    
    setIsSaving(true)
    setError('')
    
    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connection')
    } finally {
      setIsSaving(false)
    }
  }
  
  const updateField = <K extends keyof ExtendedConnection>(field: K, value: ExtendedConnection[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const updateSpectrum = (field: keyof PersonalitySpectrums, value: number) => {
    setFormData(prev => ({
      ...prev,
      personalitySpectrums: { ...(prev.personalitySpectrums || defaultSpectrums), [field]: value }
    }))
  }
  
  const updateBigFive = (field: keyof BigFiveTraits, value: number) => {
    setFormData(prev => ({
      ...prev,
      bigFive: { ...(prev.bigFive || defaultBigFive), [field]: value }
    }))
  }
  
  const updateHexaco = (field: keyof HexacoTraits, value: number) => {
    setFormData(prev => ({
      ...prev,
      hexaco: { ...(prev.hexaco || defaultHexaco), [field]: value }
    }))
  }

  // Handle MBTI type selection with auto-calibration
  const handleMbtiChange = (mbtiType: string | null) => {
    if (!mbtiType) {
      // If clearing the MBTI type, just update the field
      updateField('mbtiType', null)
      return
    }

    // Get calibration data for the selected MBTI type
    const calibration = MBTI_CALIBRATION[mbtiType]
    
    if (calibration) {
      // Auto-calibrate all personality traits based on MBTI type
      setFormData(prev => ({
        ...prev,
        mbtiType,
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
    } else {
      // If no calibration data, just update the MBTI type
      updateField('mbtiType', mbtiType)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="!max-w-[900px] sm:!max-w-[900px] w-[90vw] max-h-[85vh] p-0 overflow-hidden flex flex-col bg-gradient-to-br from-[#0a0512] via-[#12081f] to-[#0d0718] border border-white/20 rounded-2xl shadow-2xl shadow-white/5">
        <VisuallyHidden>
          <DialogTitle>{formData.isNew ? 'Create Connection' : 'Edit Connection'}</DialogTitle>
        </VisuallyHidden>
        
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        </div>
        
        <div className="relative flex flex-1 min-h-0 min-w-0 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-52 flex-shrink-0 bg-black/20 border-r border-white/10 flex flex-col overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/30 to-gray-400/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {formData.characterName || 'New Connection'}
                  </h3>
                  <p className="text-xs text-gray-400/60 truncate">
                    {formData.relationshipType || 'Select relationship'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {tabs.map((tab, index) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    activeTab === index 
                      ? 'bg-gradient-to-r from-white/20 to-gray-400/20 text-white border border-white/20' 
                      : 'text-gray-400/60 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activeTab === index ? 'bg-white/15' : 'bg-white/5'
                  }`}>
                    <tab.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden bg-black/10">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-5 custom-scrollbar min-h-0">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              {/* Overview Tab */}
              {activeTab === 0 && (
                <>
                  {/* FIX: Avatar and Banner — balanced proportions, banner fills remaining space */}
                  <div className="flex gap-4 items-start">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="relative group">
                        <Avatar className="w-24 h-24 border-2 border-white/20 rounded-2xl">
                          <AvatarImage src={formData.avatarUrl || undefined} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-white to-gray-300 text-white text-2xl font-bold rounded-2xl">
                            {formData.characterName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5 text-white" />
                          )}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
                      </div>
                      <span className="text-xs text-gray-400/60">Avatar</span>
                    </div>
                    
                    {/* FIX: Banner takes the remaining horizontal space and matches avatar height */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div 
                        className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-r from-gray-400/20 via-gray-300/20 to-cyan-500/20 border border-white/15 group cursor-pointer"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        {formData.bannerUrl && (
                          <img src={formData.bannerUrl} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-2 text-white">
                            <Camera className="w-4 h-4" />
                            <span className="text-sm font-medium">Add Banner</span>
                          </div>
                        </div>
                        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
                      </div>
                      <span className="text-xs text-gray-400/60">Banner Image</span>
                    </div>
                  </div>
                  
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* FIX: Character name always full-width */}
                    <div className="col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-white">Character Name *</Label>
                      <Input
                        value={formData.characterName}
                        onChange={(e) => updateField('characterName', e.target.value)}
                        placeholder="Enter character name"
                        className="h-11 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl"
                      />
                    </div>
                    
                    {/* FIX: Relationship Type full-width so placeholder never truncates */}
                    <div className="col-span-2">
                      <StyledSelect
                        label="Relationship Type *"
                        value={formData.relationshipType}
                        onChange={(v) => updateField('relationshipType', v)}
                        options={RELATIONSHIP_TYPES}
                        placeholder="Select relationship type..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-white">Specific Role</Label>
                      <Input
                        value={formData.specificRole || ''}
                        onChange={(e) => updateField('specificRole', e.target.value || null)}
                        placeholder="e.g., Father, Ex-boyfriend..."
                        className="h-11 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-white">Age</Label>
                      <Input
                        type="number"
                        value={formData.characterAge || ''}
                        onChange={(e) => updateField('characterAge', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Age"
                        className="h-11 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl w-full"
                      />
                    </div>
                    
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
                      <Label className="text-sm font-medium text-white">Species</Label>
                      <Input
                        value={formData.species || ''}
                        onChange={(e) => updateField('species', e.target.value || null)}
                        placeholder="e.g., Human, Elf, Vampire..."
                        className="h-11 bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 rounded-xl w-full"
                      />
                    </div>
                    
                    <StyledSelect
                      label="Archetype"
                      value={formData.archetype || ''}
                      onChange={(v) => updateField('archetype', v || null)}
                      options={ARCHETYPES}
                      placeholder="Select archetype..."
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white">Description</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => updateField('description', e.target.value || null)}
                      placeholder="Brief description of this character and their relationship..."
                      className="bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 min-h-[100px] resize-none rounded-xl"
                    />
                  </div>
                  
                  {/* Tags */}
                  <TagInput
                    label="Tags"
                    tags={formData.tags || []}
                    onChange={(tags) => updateField('tags', tags)}
                    placeholder="Add tags..."
                  />
                </>
              )}
              
              {/* Personality Tab */}
              {activeTab === 1 && (
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
                  
                  {/* Personality Spectrums */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Personality Spectrums</h4>
                      <p className="text-xs text-gray-400/60">Drag sliders to position your character</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      {(Object.keys(SPECTRUM_LABELS) as (keyof PersonalitySpectrums)[]).map(key => (
                        <SpectrumSlider
                          key={key}
                          value={formData.personalitySpectrums?.[key] ?? 50}
                          onChange={(v) => updateSpectrum(key, v)}
                          leftLabel={SPECTRUM_LABELS[key].left}
                          rightLabel={SPECTRUM_LABELS[key].right}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Big Five (OCEAN) */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">Big Five (OCEAN)</h4>
                      <p className="text-xs text-gray-400/60">Five Factor Model personality traits</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      {(Object.keys(BIG_FIVE_LABELS) as (keyof BigFiveTraits)[]).map(key => (
                        <div key={key} className="space-y-2">
                          <SpectrumSlider
                            value={formData.bigFive?.[key] ?? 50}
                            onChange={(v) => updateBigFive(key, v)}
                            leftLabel={BIG_FIVE_LABELS[key].left}
                            rightLabel={BIG_FIVE_LABELS[key].right}
                            colorScheme="cyan"
                          />
                          <p className="text-[10px] text-gray-400/40 px-1">{BIG_FIVE_LABELS[key].description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* HEXACO Model */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">HEXACO Model</h4>
                      <p className="text-xs text-gray-400/60">Six-factor model with Honesty-Humility</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      {(Object.keys(HEXACO_LABELS) as (keyof HexacoTraits)[]).map(key => (
                        <div key={key} className="space-y-2">
                          <SpectrumSlider
                            value={formData.hexaco?.[key] ?? 50}
                            onChange={(v) => updateHexaco(key, v)}
                            leftLabel={HEXACO_LABELS[key].left}
                            rightLabel={HEXACO_LABELS[key].right}
                            colorScheme="emerald"
                          />
                          <p className="text-[10px] text-gray-400/40 px-1">{HEXACO_LABELS[key].description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Traits */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <TagInput label="Strengths" tags={formData.strengths || []} onChange={(tags) => updateField('strengths', tags)} placeholder="Add strength..." />
                    <TagInput label="Flaws" tags={formData.flaws || []} onChange={(tags) => updateField('flaws', tags)} placeholder="Add flaw..." />
                    <TagInput label="Values" tags={formData.values || []} onChange={(tags) => updateField('values', tags)} placeholder="Add value..." />
                    <TagInput label="Fears" tags={formData.fears || []} onChange={(tags) => updateField('fears', tags)} placeholder="Add fear..." />
                  </div>
                </div>
              )}
              
              {/* Attributes Tab */}
              {activeTab === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TagInput label="Likes" tags={formData.likes || []} onChange={(tags) => updateField('likes', tags)} placeholder="Add like..." />
                    <TagInput label="Dislikes" tags={formData.dislikes || []} onChange={(tags) => updateField('dislikes', tags)} placeholder="Add dislike..." />
                    <TagInput label="Hobbies" tags={formData.hobbies || []} onChange={(tags) => updateField('hobbies', tags)} placeholder="Add hobby..." />
                    <TagInput label="Skills" tags={formData.skills || []} onChange={(tags) => updateField('skills', tags)} placeholder="Add skill..." />
                    <TagInput label="Languages" tags={formData.languages || []} onChange={(tags) => updateField('languages', tags)} placeholder="Add language..." />
                    <TagInput label="Habits" tags={formData.habits || []} onChange={(tags) => updateField('habits', tags)} placeholder="Add habit..." />
                  </div>
                  {/* FIX: Speech Patterns full-width, consistent with persona-form */}
                  <TagInput label="Speech Patterns" tags={formData.speechPatterns || []} onChange={(tags) => updateField('speechPatterns', tags)} placeholder="Add speech patterns like 'speaks softly', 'uses formal language'..." />
                </div>
              )}
              
              {/* Backstory Tab */}
              {activeTab === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white">Backstory</Label>
                    <Textarea
                      value={formData.backstory || ''}
                      onChange={(e) => updateField('backstory', e.target.value || null)}
                      placeholder="Write the character's backstory..."
                      className="bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 min-h-[200px] resize-none rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white">Appearance</Label>
                    <Textarea
                      value={formData.appearance || ''}
                      onChange={(e) => updateField('appearance', e.target.value || null)}
                      placeholder="Describe their physical appearance..."
                      className="bg-white/5 border-white/15 text-white placeholder:text-gray-400/40 focus:border-white/30 min-h-[150px] resize-none rounded-xl"
                    />
                  </div>
                </div>
              )}
              
              {/* MBTI Tab */}
              {activeTab === 4 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">MBTI Personality Type</h4>
                    <p className="text-xs text-gray-400/60">Select the Myers-Briggs Type that best fits this character</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {MBTI_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => handleMbtiChange(type === formData.mbtiType ? null : type)}
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
              
              {/* NSFW Tab */}
              {activeTab === 5 && (
                <div className="space-y-6">
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/10 to-gray-300/10 border border-white/15">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Flame className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Enable NSFW Content</h4>
                        <p className="text-xs text-gray-400/60 mt-0.5">Unlock mature content options (18+ only)</p>
                      </div>
                    </div>
                    {/* FIX: Toggle switch instead of checkbox — consistent with persona-form */}
                    <button
                      onClick={() => updateField('nsfwEnabled', !formData.nsfwEnabled)}
                      className={`w-14 h-7 rounded-full transition-all flex-shrink-0 ${formData.nsfwEnabled ? 'bg-gradient-to-r from-gray-500 to-gray-400' : 'bg-white/10'}`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${formData.nsfwEnabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  
                  {formData.nsfwEnabled && (
                    <div className="space-y-5">
                      <StyledSelect
                        label="Orientation"
                        value={formData.nsfwOrientation || ''}
                        onChange={(v) => updateField('nsfwOrientation', v || null)}
                        options={NSFW_ORIENTATIONS}
                        placeholder="Select orientation..."
                      />
                      
                      {/* FIX: Body Type — dropdown consistent with connection modal's pattern */}
                      <StyledSelect
                        label="Body Type"
                        value={formData.nsfwBodyType || ''}
                        onChange={(v) => updateField('nsfwBodyType', v || null)}
                        options={NSFW_BODY_TYPES}
                        placeholder="Select body type..."
                      />
                      
                      {/* FIX: Role Preference — 2-col grid with full cards + descriptions, no cramped 4-col */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-white">Role Preference</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {NSFW_ROLE_PREFERENCES.map(pref => (
                            <button
                              key={pref.value}
                              onClick={() => updateField('nsfwRolePreference', formData.nsfwRolePreference === pref.value ? null : pref.value)}
                              className={`p-4 rounded-xl text-left transition-all ${
                                formData.nsfwRolePreference === pref.value
                                  ? 'bg-gradient-to-br from-white/10 to-gray-500/20 border border-white/30 text-white'
                                  : 'bg-white/5 border border-white/15 text-gray-300 hover:border-white/30 hover:bg-white/5'
                              }`}
                            >
                              <p className="font-medium text-sm">{pref.label}</p>
                              <p className="text-xs text-gray-400/60 mt-1 leading-relaxed">{pref.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <TagInput label="Kinks & Interests" tags={formData.nsfwKinks || []} onChange={(tags) => updateField('nsfwKinks', tags)} placeholder="Add interests..." />
                      <TagInput label="Content Warnings" tags={formData.nsfwContentWarnings || []} onChange={(tags) => updateField('nsfwContentWarnings', tags)} placeholder="Add warning..." />
                    </div>
                  )}

                  {!formData.nsfwEnabled && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Flame className="w-8 h-8 text-gray-400/40" />
                      </div>
                      <p className="text-gray-400/60 text-sm">Enable NSFW content to access mature options</p>
                      <p className="text-xs text-gray-400/40 mt-2">You must be 18+ to use these features</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* FIX: Footer — relative positioning for decorative line, guaranteed button visibility */}
            <div className="relative flex-shrink-0 p-4 border-t border-white/15 bg-black/40 backdrop-blur-xl flex items-center justify-between gap-3 min-w-0">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400/30 to-transparent" />
              
              {/* Left: character preview */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {formData.avatarUrl && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={formData.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-white to-gray-300 text-white text-sm">
                      {formData.characterName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm text-gray-400/60 truncate">
                  {formData.characterName || 'Unnamed Connection'}
                </span>
              </div>
              
              {/* FIX: Right buttons — flex-shrink-0 on group prevents clipping */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-white/5 h-9 px-4 rounded-xl transition-all border border-white/15 hover:border-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !formData.characterName.trim() || !formData.relationshipType}
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-white to-gray-300 hover:from-gray-200 hover:to-gray-400 text-white shadow-lg shadow-white/10 hover:shadow-white/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    formData.isNew ? 'Create Connection' : 'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}