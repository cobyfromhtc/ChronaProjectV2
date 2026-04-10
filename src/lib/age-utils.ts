/**
 * Age Utility Functions for Chrona
 * Handles age calculation, verification, and age gap restrictions
 */

/**
 * Calculate exact age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--
  }
  
  return age
}

/**
 * Check if user is 18 or older
 */
export function isAdult(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= 18
}

/**
 * Check if user is 21 or older
 */
export function isAdult21(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= 21
}

/**
 * Age gap rules for messaging:
 * - 16-17 year olds can talk to each other (16-17 range)
 * - 18 year olds can talk to 17-20 year olds
 * - 19-20 year olds can talk to 18+ (including 21+)
 * - 21+ year olds can talk to anyone 19+ and up (no upper limit)
 */
export function canUsersCommunicate(age1: number, age2: number): boolean {
  // Same age always allowed
  if (age1 === age2) return true
  
  // Both under 16 not allowed to use platform (assuming minimum age is 16)
  if (age1 < 16 || age2 < 16) return false
  
  // Both 16-17: can talk to each other
  if (age1 >= 16 && age1 <= 17 && age2 >= 16 && age2 <= 17) return true
  
  // If one is 16 and other is 18+: NOT allowed
  if ((age1 === 16 && age2 >= 18) || (age2 === 16 && age1 >= 18)) return false
  
  // If one is 17 and other is 18: allowed
  if ((age1 === 17 && age2 === 18) || (age2 === 17 && age1 === 18)) return true
  
  // If one is 17 and other is 19+: NOT allowed
  if ((age1 === 17 && age2 >= 19) || (age2 === 17 && age1 >= 19)) return false
  
  // 18 year olds can talk to 17-20 year olds
  if (age1 === 18) {
    return age2 >= 17 && age2 <= 20
  }
  if (age2 === 18) {
    return age1 >= 17 && age1 <= 20
  }
  
  // 19-20 year olds can talk to 18+ (including 21+)
  if ((age1 >= 19 && age1 <= 20) && age2 >= 18) return true
  if ((age2 >= 19 && age2 <= 20) && age1 >= 18) return true
  
  // 21+ can talk to anyone 19+ (no upper limit)
  if (age1 >= 21) {
    return age2 >= 19
  }
  if (age2 >= 21) {
    return age1 >= 19
  }
  
  // Default: both must be 18+
  return age1 >= 18 && age2 >= 18
}

/**
 * Get the minimum age someone can communicate with
 */
export function getMinCommunicableAge(userAge: number): number {
  if (userAge < 16) return 0 // Not allowed
  if (userAge >= 16 && userAge <= 17) return 16
  if (userAge === 18) return 17
  if (userAge >= 19 && userAge <= 20) return 18
  if (userAge >= 21) return 19
  return 18
}

/**
 * Get the maximum age someone can communicate with
 */
export function getMaxCommunicableAge(userAge: number): number {
  if (userAge >= 16 && userAge <= 17) return 17
  if (userAge === 18) return 20
  if (userAge >= 19) return 99 // No upper limit for 19+
  return 99
}

/**
 * Censor a message for age-restricted communication
 * Converts message to format: "🔒: °°° °°° °°°°"
 */
export function censorMessage(content: string): string {
  // Split into words and replace each with circles
  const words = content.split(/\s+/).filter(w => w.length > 0)
  const censoredWords = words.map(word => {
    const circleCount = Math.ceil(word.length / 2)
    return '°'.repeat(Math.max(3, circleCount))
  })
  
  return `🔒: ${censoredWords.join(' ')}`
}

/**
 * Get age range description for display
 */
export function getAgeRangeDescription(age: number): string {
  if (age < 16) return 'Under 16 (Not allowed)'
  if (age >= 16 && age <= 17) return '16-17 (Minor)'
  if (age === 18) return '18 (Young Adult)'
  if (age >= 19 && age <= 20) return '19-20 (Young Adult)'
  return '21+ (Adult)'
}

/**
 * Validate date of birth
 */
export function validateDateOfBirth(day: number, month: number, year: number): { valid: boolean; error?: string } {
  // Check if date is valid
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { valid: false, error: 'Invalid date' }
  }
  
  // Check if user is at least 16 (Chrona Terms of Service)
  const age = calculateAge(date)
  if (age < 16) {
    return { valid: false, error: 'You must be at least 16 years old to use Chrona' }
  }
  
  // Check if date is in the future
  if (date > new Date()) {
    return { valid: false, error: 'Date of birth cannot be in the future' }
  }
  
  // Check reasonable age limit
  if (age > 120) {
    return { valid: false, error: 'Please enter a valid date of birth' }
  }
  
  return { valid: true }
}

/**
 * Create a Date object from day, month, year
 */
export function createDateFromParts(day: number, month: number, year: number): Date {
  return new Date(year, month - 1, day)
}

/**
 * Get day options for dropdown (1-31)
 */
export function getDayOptions(): number[] {
  return Array.from({ length: 31 }, (_, i) => i + 1)
}

/**
 * Get month options for dropdown
 */
export function getMonthOptions(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]
}

/**
 * Get year options for dropdown (current year - 13 down to 120 years ago)
 */
export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const minYear = currentYear - 120
  const maxYear = currentYear - 16 // Minimum age 16
  return Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
}
