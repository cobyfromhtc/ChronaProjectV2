import { db } from './db'

// Check if username exists
export async function checkUsernameExists(username: string): Promise<boolean> {
  const user = await db.user.findFirst({
    where: { username }
  })
  return !!user
}

// Check if email exists
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!email) return false
  const user = await db.user.findFirst({
    where: { email }
  })
  return !!user
}

// Authenticate user by username
export async function authenticateByUsername(username: string, password: string): Promise<{
  id: string
  email: string | null
  username: string
  avatarUrl: string | null
  role: string
} | null> {
  const user = await db.user.findFirst({
    where: { username }
  })
  
  if (!user) return null
  
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
  }
}
