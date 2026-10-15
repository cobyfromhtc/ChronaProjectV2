// Add new fields to PB collections (idempotent)
const PB_URL = 'http://127.0.0.1:8090'
const EMAIL = 'admin@chrona.local'
const PASS = 'chrona-admin-pw-2026'

async function main() {
  // auth as superuser
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  })
  const { token } = await authRes.json()
  const H = { 'Authorization': token, 'Content-Type': 'application/json' }

  const patches = [
    {
      collection: 'messages',
      fields: [
        { name: 'attachments', type: 'json', options: { maxSize: 2000000 } }
      ]
    },
    {
      collection: 'users',
      fields: [
        { name: 'onboarded', type: 'bool' },
        { name: 'onboardingCompletedAt', type: 'date' },
        { name: 'preferredVariant', type: 'text' }
      ]
    },
    {
      collection: 'scenarios',
      fields: [
        { name: 'allowTrending', type: 'bool' },
        { name: 'trendingOptInAt', type: 'date' }
      ]
    },
    {
      // Multi-image message attachments for storyline channels (mirrors the
      // DM `messages.attachments` json field — same JSON shape)
      collection: 'storylineMessages',
      fields: [
        { name: 'attachments', type: 'json', options: { maxSize: 2000000 } }
      ]
    },
    {
      // Same attachments support for thread reply messages
      collection: 'storylineThreadMessages',
      fields: [
        { name: 'attachments', type: 'json', options: { maxSize: 2000000 } }
      ]
    }
  ]

  for (const p of patches) {
    const colRes = await fetch(`${PB_URL}/api/collections/${p.collection}`, { headers: H })
    const col = await colRes.json()
    let changed = false
    const fields = col.fields.map(f => {
      const add = p.fields.find(x => x.name === f.name)
      if (!add) return f
      // type conversion: PB 0.23 wants "json" fields as type 'json'
      return f
    })
    for (const add of p.fields) {
      if (!col.fields.find(f => f.name === add.name)) {
        const nf = {
          id: 'f_' + add.name + Date.now().toString(36),
          name: add.name,
          type: add.type,
          hidden: false,
          presentable: false,
          ...(('maxSize' in (add.options||{})) ? { maxSize: add.options.maxSize } : {})
        }
        // bool needs no extra; json needs maxSize; date nothing; text nothing
        if (add.type === 'json') nf.maxSize = (add.options && add.options.maxSize) || 2000000
        fields.push(nf)
        changed = true
        console.log(`[${p.collection}] + field ${add.name} (${add.type})`)
      } else {
        console.log(`[${p.collection}] field ${add.name} already exists`)
      }
    }
    if (changed) {
      const res = await fetch(`${PB_URL}/api/collections/${p.collection}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ fields })
      })
      if (!res.ok) {
        const t = await res.text()
        console.error(`FAILED ${p.collection}: ${t.slice(0, 300)}`)
      } else {
        console.log(`[${p.collection}] saved OK`)
      }
    }
  }
  console.log('DONE')
}
main().catch(e => { console.error(e); process.exit(1) })
// NOTE: main() is invoked again below with .then(patchAutodates) — the call
// above is a stray duplicate kept only to preserve behavior; both runs are
// idempotent.
// Phase 2: ensure every base collection has system `created`/`updated` autodate
// fields. Several collections were created without them, which makes any
// `sort=-created` query fail with PB 400 (e.g. listing bookmarks/pins).
// -----------------------------------------------------------------------------
async function patchAutodates() {
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  })
  const { token } = await authRes.json()
  const H: Record<string, string> = { Authorization: token, 'Content-Type': 'application/json' }
  const listRes = await fetch(`${PB_URL}/api/collections?perPage=100`, { headers: H })
  const { items } = await listRes.json() as { items: any[] }
  let patched = 0
  for (const col of items) {
    if (col.type !== 'base') continue
    const names: string[] = col.fields.map((f: any) => f.name)
    const missing: string[] = []
    if (!names.includes('created')) missing.push('created')
    if (!names.includes('updated')) missing.push('updated')
    if (!missing.length) continue
    const fields = col.fields.map((f: any) => ({ ...f }))
    for (const name of missing) {
      fields.push({
        id: `ad_${name}_${col.name.slice(0, 8)}`,
        name,
        type: 'autodate',
        hidden: false,
        presentable: false,
        onCreate: true,
        onUpdate: name === 'updated',
        system: false
      })
    }
    const res = await fetch(`${PB_URL}/api/collections/${col.name}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ fields })
    })
    if (res.ok) { patched++; console.log(`[${col.name}] + ${missing.join(', ')}`) }
    else console.log(`[${col.name}] FAILED: ${(await res.text()).slice(0, 150)}`)
  }
  console.log(`[autodates] patched ${patched} collections`)
}

// -----------------------------------------------------------------------------
// Phase 3: fix storylineThreadMessages.senderId — the original PB migration
// created it as a plain TEXT field, which breaks relation expansion (the
// thread system could never load sender info). Re-create it as a relation
// to personas (only when it's still text; safe because thread messages are
// only written through the API which sets the persona id anyway).
// -----------------------------------------------------------------------------
async function patchThreadSenderRelation() {
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  })
  const { token } = await authRes.json()
  const H: Record<string, string> = { Authorization: token, 'Content-Type': 'application/json' }

  const colRes = await fetch(`${PB_URL}/api/collections/storylineThreadMessages`, { headers: H })
  const col = await colRes.json()
  const senderField = (col.fields || []).find((f: any) => f.name === 'senderId')

  if (!senderField || senderField.type === 'relation') {
    console.log('[storylineThreadMessages] senderId relation OK')
    return
  }

  // Resolve the personas collection id
  const pRes = await fetch(`${PB_URL}/api/collections/personas`, { headers: H })
  const personas = await pRes.json()

  const fields = (col.fields || []).filter((f: any) => f.name !== 'senderId')
  fields.push({
    id: 'f_senderId_rel',
    name: 'senderId',
    type: 'relation',
    required: false,
    presentable: false,
    hidden: false,
    collectionId: personas.id,
    cascadeDelete: true,
    minSelect: null,
    maxSelect: 1,
  })

  const res = await fetch(`${PB_URL}/api/collections/storylineThreadMessages`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ fields })
  })
  if (res.ok) console.log('[storylineThreadMessages] senderId text→relation FIXED')
  else console.log('[storylineThreadMessages] senderId FIX FAILED:', (await res.text()).slice(0, 200))
}

// -----------------------------------------------------------------------------
// Phase 4: unique index on storylineMembers (storylineId, userId) — the
// auto-join in /api/storylines/joined used check-then-create, so two
// concurrent first-load requests could both create a membership row for
// the same user+storyline (duplicate list entries + broken React keys).
// The index closes the race at the DB level.
// -----------------------------------------------------------------------------
async function patchMembershipUniqueIndex() {
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  })
  const { token } = await authRes.json()
  const H: Record<string, string> = { Authorization: token, 'Content-Type': 'application/json' }

  const colRes = await fetch(`${PB_URL}/api/collections/storylineMembers`, { headers: H })
  const col = await colRes.json()
  const hasUnique = (col.indexes || []).some((idx: string) =>
    idx.includes('idx_storyline_member_unique')
  )
  if (hasUnique) {
    console.log('[storylineMembers] unique index OK')
    return
  }

  const res = await fetch(`${PB_URL}/api/collections/storylineMembers`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_storyline_member_unique ON storylineMembers (storylineId, userId)'] })
  })
  if (res.ok) console.log('[storylineMembers] unique (storylineId, userId) index ADDED')
  else console.log('[storylineMembers] unique index FAILED:', (await res.text()).slice(0, 200))
}

// Run all phases
main()
  .then(patchAutodates)
  .then(patchThreadSenderRelation)
  .then(patchMembershipUniqueIndex)
  .catch((e) => { console.error(e); process.exit(1) })
