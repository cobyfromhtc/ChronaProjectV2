import PocketBase from 'pocketbase'

// =============================================================
// Pocketbase server-side client (admin auth singleton)
// =============================================================
//
// Chrona's data layer has been migrated from Prisma+SQLite to Pocketbase
// (which itself hosts a SQLite file under mini-services/pocketbase-service/pb_data).
//
// This module provides:
//   - `getPb()`            : a singleton admin-authenticated Pocketbase client,
//                            used by the `db.ts` Prisma-compat wrapper for
//                            server-side data access (create/update/delete/
//                            findUnique/findMany etc.).
//   - `getPbForUser(token)` : a per-request Pocketbase client authenticated
//                            as the current user (used for actions that the
//                            user's own permissions should govern, e.g.
//                            auth-with-password login).
//
// Admin credentials live in the environment (defaults below are dev-only).
// =============================================================

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@chrona.local'
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'chrona-admin-pw-2026'

// Singleton instance, kept across hot reloads
const globalForPb = globalThis as unknown as { __pbAdmin?: PocketBase; __pbAdminPromise?: Promise<PocketBase> | null }

let pbInstance: PocketBase | null = globalForPb.__pbAdmin ?? null
let authPromise: Promise<PocketBase> | null = globalForPb.__pbAdminPromise ?? null

async function authenticateAsAdmin(): Promise<PocketBase> {
  // Re-use cached instance if the token is still valid
  // Note: PB SDK 0.23+ removed `pb.adminAuthStore` in favor of `pb.authStore`
  // (since admins are now just an auth collection named `_superusers`).
  if (pbInstance && pbInstance.authStore.isValid) {
    return pbInstance
  }
  // If a re-auth is already in flight, await it (prevents N parallel logins)
  if (authPromise) return authPromise

  authPromise = (async () => {
    const pb = new PocketBase(PB_URL)
    // CRITICAL: disable auto-cancellation, otherwise parallel SDK calls (e.g.
    // Promise.all of N findMany on the same collection) abort each other.
    // The property name is `enableAutoCancellation` in the SDK source
    // (the `autoCancellation` alias is the chained setter method).
    pb.autoCancellation(false)
    // Pocketbase 0.23+ replaced the `admins` API with the `_superusers`
    // auth collection. Use the standard collection auth endpoint.
    await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
    pbInstance = pb
    authPromise = null
    globalForPb.__pbAdmin = pb
    return pb
  })()

  try {
    return await authPromise
  } finally {
    globalForPb.__pbAdminPromise = null
  }
}

/**
 * Returns a Pocketbase admin client (singleton, auto-refreshes token).
 * Use this for server-side data operations that require admin
 * privileges (creating users, looking up arbitrary records, etc.).
 */
export async function getPb(): Promise<PocketBase> {
  const pb = await authenticateAsAdmin()
  // Safety net: in case the cached instance was created before the
  // autoCancellation(false) fix, ensure it's disabled on every fetch too.
  try {
    pb.autoCancellation(false)
  } catch {
    /* ignore */
  }
  return pb
}

/**
 * Returns a fresh Pocketbase client bound to a user's auth token.
 * Use this for user-scoped operations. The client does NOT share
 * state with the admin singleton.
 */
export function getPbForUser(token?: string): PocketBase {
  const pb = new PocketBase(PB_URL)
  // Disable auto-cancellation for the same reason as the admin client.
  pb.autoCancellation(false)
  if (token) {
    // We don't have the full user record here, just the JWT. The SDK will
    // treat the client as authenticated for the duration of the token.
    pb.authStore.save(token, null)
  }
  return pb
}

export const PB_URL_EXPORTED = PB_URL
