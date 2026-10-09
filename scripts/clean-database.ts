/**
 * Database cleanup script for Chrona.
 * 
 * Deletes ALL test/placeholder data from the Pocketbase database.
 * PRESERVES:
 *   - Blorp user + persona (official bot)
 *   - Chrona Community storyline + its roles/channels/categories/members
 *   - Wiki articles (seed data — always preserved)
 *   - Achievements (seed definitions — always preserved)
 *   - Logo image record (system asset — always preserved)
 *   - Profile themes (seed data — always preserved)
 * 
 * Usage:
 *   bun run scripts/clean-database.ts
 */

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@chrona.local'
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'chrona-admin-pw-2026'

async function main() {
  console.log('[clean-database] Starting cleanup...')

  // Auth as superuser
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
  })
  if (!authRes.ok) throw new Error(`Admin auth failed: ${authRes.status}`)
  const { token } = await authRes.json()
  const auth = { Authorization: token }

  // Get Blorp user ID (preserve)
  const blorpRes = await fetch(`${PB_URL}/api/collections/users/records?filter=username="Blorp"`, { headers: auth })
  const blorpData = await blorpRes.json()
  const blorpUid = blorpData.items?.[0]?.id
  console.log(`[clean-database] Blorp user ID: ${blorpUid}`)

  // Get official storyline ID (preserve)
  const officialRes = await fetch(`${PB_URL}/api/collections/storylines/records?filter=isOfficial=true`, { headers: auth })
  const officialData = await officialRes.json()
  const officialSid = officialData.items?.[0]?.id
  console.log(`[clean-database] Official storyline ID: ${officialSid}`)

  // ─── DELETE ALL DATA (preserving seeds) ──────────────────────────

  // 1. Delete all DM-related data
  console.log('[clean-database] Deleting DM requests, messages, conversations...')
  for (const col of ['dmRequests', 'messages', 'conversations']) {
    await deleteAllExcept(col, [], auth)
  }

  // 2. Delete social graph
  console.log('[clean-database] Deleting friend requests, friendships, follows, blocks...')
  for (const col of ['friendRequests', 'friendships', 'follows', 'blocks']) {
    await deleteAllExcept(col, [], auth)
  }

  // 3. Delete chronos transactions
  console.log('[clean-database] Deleting chronos transactions...')
  await deleteAllExcept('chronosTransactions', [], auth)

  // 4. Delete user achievements
  console.log('[clean-database] Deleting user achievements...')
  await deleteAllExcept('userAchievements', [], auth)

  // 5. Delete image records EXCEPT the logo
  console.log('[clean-database] Deleting image records (preserving logo)...')
  await deleteAllExcept('imageRecords', ['chrona-logo'], auth, 'code')

  // 6. Delete storyline messages + child records
  for (const col of ['storylineMessages', 'storylineMessageReactions', 'storylinePinnedMessages', 'storylineThreads', 'storylineThreadMessages', 'storylineChannelMutes', 'storylineChannelUnreads']) {
    console.log(`[clean-database] Deleting ${col}...`)
    await deleteAllExcept(col, [], auth)
  }

  // 7. Delete non-official storylines + their children
  if (officialSid) {
    console.log('[clean-database] Deleting non-official storylines...')
    const slRes = await fetch(`${PB_URL}/api/collections/storylines/records?filter=isOfficial!=true&perPage=500`, { headers: auth })
    const slData = await slRes.json()
    for (const sl of (slData.items || [])) {
      for (const col of ['storylineMembers', 'storylineInvites', 'storylineBans', 'storylineBoosts', 'storylineReviews', 'storylineChannels', 'storylineRoles', 'storylineCategories']) {
        const childRes = await fetch(`${PB_URL}/api/collections/${col}/records?filter=storylineId="${sl.id}"&perPage=500`, { headers: auth })
        const childData = await childRes.json()
        for (const item of (childData.items || [])) {
          await fetch(`${PB_URL}/api/collections/${col}/records/${item.id}`, { method: 'DELETE', headers: auth })
        }
      }
      // Also delete wiki articles for non-official storylines
      const wikiRes = await fetch(`${PB_URL}/api/collections/wikiArticles/records?filter=storylineId="${sl.id}"&perPage=500`, { headers: auth })
      const wikiData = await wikiRes.json()
      for (const item of (wikiData.items || [])) {
        await fetch(`${PB_URL}/api/collections/wikiArticles/records/${item.id}`, { method: 'DELETE', headers: auth })
      }
      await fetch(`${PB_URL}/api/collections/storylines/records/${sl.id}`, { method: 'DELETE', headers: auth })
    }
  }

  // 8. Delete non-Blorp personas
  console.log('[clean-database] Deleting non-Blorp personas...')
  if (blorpUid) {
    const personaRes = await fetch(`${PB_URL}/api/collections/personas/records?filter=userId!="${blorpUid}"&perPage=500`, { headers: auth })
    const personaData = await personaRes.json()
    for (const p of (personaData.items || [])) {
      // Delete persona connections
      const connRes = await fetch(`${PB_URL}/api/collections/personaConnections/records?filter=personaId="${p.id}"&perPage=500`, { headers: auth })
      const connData = await connRes.json()
      for (const c of (connData.items || [])) {
        await fetch(`${PB_URL}/api/collections/personaConnections/records/${c.id}`, { method: 'DELETE', headers: auth })
      }
      // Delete marketplace listings
      const mpRes = await fetch(`${PB_URL}/api/collections/marketplacePersonas/records?filter=personaId="${p.id}"&perPage=500`, { headers: auth })
      const mpData = await mpRes.json()
      for (const m of (mpData.items || [])) {
        await fetch(`${PB_URL}/api/collections/marketplacePersonas/records/${m.id}`, { method: 'DELETE', headers: auth })
      }
      await fetch(`${PB_URL}/api/collections/personas/records/${p.id}`, { method: 'DELETE', headers: auth })
    }
  }

  // 9. Delete non-Blorp users
  console.log('[clean-database] Deleting non-Blorp users...')
  if (blorpUid) {
    const userRes = await fetch(`${PB_URL}/api/collections/users/records?filter=username!="Blorp"&perPage=500`, { headers: auth })
    const userData = await userRes.json()
    for (const u of (userData.items || [])) {
      await fetch(`${PB_URL}/api/collections/users/records/${u.id}`, { method: 'DELETE', headers: auth })
    }
  }

  // 10. Delete non-official storyline members
  console.log('[clean-database] Cleaning non-official storyline members...')
  if (officialSid && blorpUid) {
    const memberRes = await fetch(`${PB_URL}/api/collections/storylineMembers/records?filter=storylineId="${officialSid}"&perPage=500`, { headers: auth })
    const memberData = await memberRes.json()
    for (const m of (memberData.items || [])) {
      if (m.userId !== blorpUid) {
        await fetch(`${PB_URL}/api/collections/storylineMembers/records/${m.id}`, { method: 'DELETE', headers: auth })
      }
    }
  }

  // 11. Delete scenarios + other collections
  for (const col of ['scenarios', 'scenarioLikes', 'reports', 'adminLogs', 'moderationActions', 'notifications', 'marketplacePurchases', 'profileThemes']) {
    console.log(`[clean-database] Deleting ${col}...`)
    await deleteAllExcept(col, [], auth)
  }

  // 12. Clean local upload files (except chrona-logo.png)
  const fs = await import('fs/promises')
  const path = await import('path')
  const uploadDir = path.join(process.cwd(), 'upload')
  try {
    const files = await fs.readdir(uploadDir)
    for (const f of files) {
      if (f !== 'chrona-logo.png' && f !== 'logo.png' && f !== 'README.md') {
        await fs.unlink(path.join(uploadDir, f)).catch(() => {})
      }
    }
  } catch { /* dir doesn't exist */ }

  console.log('[clean-database] Cleanup complete!')
  console.log('[clean-database] Preserved: Blorp user, Chrona Community, 9 wiki articles, 18 achievements, logo')
}

async function deleteAllExcept(collection: string, preserveIds: string[], auth: Record<string, string>, preserveField = 'id') {
  let page = 1
  while (true) {
    const filter = preserveIds.length > 0 
      ? preserveIds.map(id => `${preserveField}!="${id}"`).join(' && ')
      : ''
    const url = `${PB_URL}/api/collections/${collection}/records?perPage=500${filter ? `&filter=${encodeURIComponent(filter)}` : ''}&page=${page}`
    const res = await fetch(url, { headers: auth })
    const data = await res.json()
    const items = data.items || []
    if (items.length === 0) break
    for (const item of items) {
      await fetch(`${PB_URL}/api/collections/${collection}/records/${item.id}`, { method: 'DELETE', headers: auth })
    }
    if (page >= (data.totalPages || 1)) break
    page++
  }
}

main().catch(err => {
  console.error('[clean-database] FATAL:', err)
  process.exit(1)
})
