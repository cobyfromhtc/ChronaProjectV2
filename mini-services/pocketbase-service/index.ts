// Pocketbase mini-service supervisor
//
// This is a thin Bun wrapper that spawns and supervises the Pocketbase Go
// binary so that the Caddy gateway can route traffic to it (via XTransformPort=8090).
//
// Why a wrapper?
//   - The sandbox convention requires every mini-service to have a
//     package.json + index.ts entry point and to be started with `bun run dev`.
//   - `bun --hot` will restart *this* supervisor on file change, but we
//     explicitly handle SIGTERM/SIGINT so the spawned Pocketbase child is
//     cleaned up too.
//
// Pocketbase itself hosts a SQLite database file under ./pb_data and exposes
// a REST API + Admin UI on http://127.0.0.1:8090.

import { spawn } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HERE = resolve(__dirname)

const PB_BINARY = resolve(HERE, 'pocketbase')
const PB_DATA_DIR = resolve(HERE, 'pb_data')
const PB_PUBLIC_DIR = resolve(HERE, 'pb_public')
const PB_MIGRATIONS_DIR = resolve(HERE, 'pb_migrations')

const PORT = '8090' // hard-coded per mini-service convention
const HOST = '127.0.0.1'

// Ensure data dirs exist
for (const dir of [PB_DATA_DIR, PB_PUBLIC_DIR, PB_MIGRATIONS_DIR]) {
  mkdirSync(dir, { recursive: true })
}

console.log(`[pocketbase-service] launching Pocketbase on ${HOST}:${PORT}`)
console.log(`[pocketbase-service] binary: ${PB_BINARY}`)
console.log(`[pocketbase-service] data dir: ${PB_DATA_DIR}`)

const args = [
  'serve',
  `--http=${HOST}:${PORT}`,
  `--dir=${PB_DATA_DIR}`,
  `--publicDir=${PB_PUBLIC_DIR}`,
  `--hooksDir=${resolve(HERE, 'pb_hooks')}`,
  `--migrationsDir=${PB_MIGRATIONS_DIR}`,
]

const child = spawn(PB_BINARY, args, {
  stdio: ['ignore', 'inherit', 'inherit'],
  windowsHide: true,
})

child.on('error', (err) => {
  console.error('[pocketbase-service] failed to spawn pocketbase:', err)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  console.log(`[pocketbase-service] pocketbase exited (code=${code} signal=${signal})`)
  // Exit with the same code so the parent / bun --hot can decide what to do.
  process.exit(code ?? 0)
})

function shutdown(sig: string) {
  console.log(`[pocketbase-service] received ${sig}, forwarding to pocketbase child...`)
  if (child.pid) {
    try {
      process.kill(child.pid, sig === 'SIGINT' ? 'SIGINT' : 'SIGTERM')
    } catch {
      /* ignore */
    }
  }
  // Force-exit after grace period in case the child doesn't die.
  setTimeout(() => process.exit(0), 4000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
