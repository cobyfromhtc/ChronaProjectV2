/**
 * Age Gap Validation Utilities
 * 
 * Rules:
 * - 16 years old → can chat with ages 16–17
 * - 17 years old → can chat with ages 16–18
 * - 18 years old → can chat with ages 17–20
 * - 19-20 years old → can chat with ages 18–21
 * - 21+ years old → can chat with ages 19+ (no upper limit)
 */

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string | null): number | null {
  if (!dateOfBirth) return null
  
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  const today = new Date()
  
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  
  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  
  return age
}

/**
 * Check if user is 18 or older (adult)
 */
export function isAdult(dateOfBirth: Date | string | null): boolean {
  const age = calculateAge(dateOfBirth)
  return age !== null && age >= 18
}

/**
 * Get the minimum and maximum age a user can chat with based on their age
 * Returns null for no upper limit
 */
export function getChatAgeRange(userAge: number): { min: number; max: number | null } | null {
  // Minimum age to use the platform is 13
  if (userAge < 13) return null
  
  // 16 years old → can chat with 16-17
  if (userAge === 16) {
    return { min: 16, max: 17 }
  }
  
  // 17 years old → can chat with 16-18
  if (userAge === 17) {
    return { min: 16, max: 18 }
  }
  
  // 18 years old → can chat with 17-20
  if (userAge === 18) {
    return { min: 17, max: 20 }
  }
  
  // 19-20 years old → can chat with 18-21
  if (userAge === 19 || userAge === 20) {
    return { min: 18, max: 21 }
  }
  
  // 21+ years old → can chat with 19+ (no upper limit)
  if (userAge >= 21) {
    return { min: 19, max: null }
  }
  
  // 13-15 year olds can only chat with same age group
  return { min: userAge, max: userAge }
}

/**
 * Check if two users can chat with each other based on their ages
 */
export function canChatWith(userAge: number, otherUserAge: number): boolean {
  // Get the allowed age range for the user
  const ageRange = getChatAgeRange(userAge)
  if (!ageRange) return false
  
  // Check if the other user's age falls within the allowed range
  if (otherUserAge < ageRange.min) return false
  if (ageRange.max !== null && otherUserAge > ageRange.max) return false
  
  // Also verify the reverse - the other user should be able to chat with this user
  const otherAgeRange = getChatAgeRange(otherUserAge)
  if (!otherAgeRange) return false
  
  if (userAge < otherAgeRange.min) return false
  if (otherAgeRange.max !== null && userAge > otherAgeRange.max) return false
  
  return true
}

/**
 * Get a human-readable description of who a user can chat with
 */
export function getChatAgeRangeDescription(userAge: number): string {
  const range = getChatAgeRange(userAge)
  if (!range) return "Cannot chat with anyone"
  
  if (range.max === null) {
    return `Can chat with users aged ${range.min}+`
  }
  
  if (range.min === range.max) {
    return `Can only chat with users aged ${range.min}`
  }
  
  return `Can chat with users aged ${range.min}-${range.max}`
}

/**
 * Censor a message for users outside the age gap
 * Returns the censored format: "🔒: °°°°°°°°°°"
 */
export function censorMessage(content: string): string {
  // Count the number of words/characters and create appropriate number of dots
  const length = Math.max(10, Math.min(50, content.length))
  return `🔒: ${'°'.repeat(length)}`
}
