// Storyline categories available for selection
export const STORYLINE_CATEGORIES = [
  'Romance',
  'Action',
  'Horror',
  'Fantasy',
  'Sci-Fi',
  'Slice of Life',
  'Mystery',
  'Comedy',
  'Drama',
  'Adventure',
  'Thriller',
  'Historical',
  'Supernatural',
  'Other'
] as const

export type StorylineCategory = typeof STORYLINE_CATEGORIES[number]
