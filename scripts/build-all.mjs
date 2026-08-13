import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = join(root, 'dist')

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'admin'), { recursive: true })

function build(dir, base) {
  execSync('npm ci', { cwd: dir, stdio: 'inherit' })
  execSync('npm run build', {
    cwd: dir,
    stdio: 'inherit',
    env: { ...process.env, VITE_BASE: base },
  })
  console.log(`\nBuilt ${dir}\n`)
}

build(join(root, 'client-user'), '/')
build(join(root, 'client-admin'), '/admin/')

cpSync(join(root, 'client-user', 'dist'), out, { recursive: true })
cpSync(join(root, 'client-admin', 'dist'), join(out, 'admin'), { recursive: true })

console.log('Combined build written to dist/')
