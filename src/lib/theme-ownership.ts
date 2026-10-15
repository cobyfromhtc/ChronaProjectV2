import { db } from '@/lib/db'

// Server-side theme ownership check (single source of truth, shared by the
// persona create/update routes so users can only APPLY themes they own).
// Ownership model (mirrors /api/chronos/themes + purchase route):
//   - system themes: owned when a chronosTransaction exists with
//     category='theme' + referenceId=themeId for this user
//   - custom themes: owned when the record's ownerId is this user
export async function userOwnsTheme(userId: string, themeId: string): Promise<boolean> {
  if (!userId || !themeId) return false
  const [purchase, custom] = await Promise.all([
    db.chronosTransaction.findFirst({
      where: { userId, category: 'theme', referenceId: themeId },
      select: { id: true },
    }),
    db.profileTheme.findFirst({
      where: { id: themeId, ownerId: userId },
      select: { id: true },
    }),
  ])
  return !!(purchase || custom)
}
