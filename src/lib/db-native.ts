// @ts-nocheck
// This file creates a fresh PrismaClient to avoid caching issues

import { PrismaClient } from '@prisma/client'

// Create and export immediately - no caching
export const db = new PrismaClient({
  log: ['query'],
})
