#!/usr/bin/env node
/**
 * dsh-settings-search release helper.
 *
 * Keeps git tags and GitHub Releases in sync on every version bump, with a
 * bilingual (Chinese / English) body built from CHANGELOG.md + CHANGELOG.en.md.
 * Always include both "新功能 / Features" and "修复 / Fixes" sections.
 *
 * Usage:
 *   node scripts/release.mjs --version 1.8.0            # validate + print preview
 *   node scripts/release.mjs --version 1.8.0 --publish  # tag + push + gh release
 *   node scripts/release.mjs --version 1.8.0 --dry-run  # same as default, explicit
 *
 * --publish requires `gh` CLI and a git remote named `origin`.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function arg(name) {
  const at = process.argv.indexOf(name)
  return at >= 0 ? process.argv[at + 1] : undefined
}

const version = process.argv.includes('--version') ? arg('--version') : undefined
const publish = process.argv.includes('--publish')
const dryRun = process.argv.includes('--dry-run')

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const target = version ?? pkg.version
if (pkg.version !== target) {
  console.error(`version mismatch: package.json=${pkg.version}, requested=${target}`)
  process.exit(1)
}
const tag = `v${target}`
const repo = pkg.repository?.url?.replace(/^git\+/, '').replace(/\.git$/, '') ?? 'https://github.com/objectivex666/dsh-settings-search'

function section(file, version) {
  const text = readFileSync(join(ROOT, file), 'utf8')
  const target = `## v${version}`
  const lines = text.split(/\r?\n/)
  let start = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === target) { start = i; break }
  }
  if (start === -1) return ''
  const out = []
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^## v/.test(line) || line.trim() === '---') break
    out.push(line)
  }
  return out.join('\n').trim()
}

const zh = section('CHANGELOG.md', target)
const en = section('CHANGELOG.en.md', target)
if (!zh || !en) {
  console.error(`missing changelog section for v${target} in CHANGELOG.md / CHANGELOG.en.md`)
  process.exit(1)
}
if (!/新功能|修复/.test(zh) || !/Features|Fixes/.test(en)) {
  console.error('changelog must include both Features and Fixes sections (新功能/修复, Features/Fixes)')
  process.exit(1)
}

const body = [
  `# v${target}`,
  '',
  `> ${repo}`,
  '',
  zh,
  '',
  '---',
  '',
  en,
  '',
].join('\n')

console.log('===== release body =====')
console.log(body)
console.log('========================')

function run(cmd, args) {
  if (!publish || dryRun) {
    console.log(`[preview] ${cmd} ${args.join(' ')} (not executed)`)
    return undefined
  }
  console.log(`+ ${cmd} ${args.join(' ')}`)
  return execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' })
}

let tagExists = false
try {
  const out = execFileSync('git', ['tag', '--list', tag], { cwd: ROOT, encoding: 'utf8' })
  tagExists = out.split('\n').map((line) => line.trim()).includes(tag)
} catch {}
if (!tagExists) {
  run('git', ['tag', tag])
} else {
  console.log(`tag ${tag} already exists`)
}

if (publish && !dryRun) {
  if (!tagExists) run('git', ['push', 'origin', tag])
  const notes = join(mkdtempSync(join(tmpdir(), 'sss-release-')), 'notes.md')
  writeFileSync(notes, body, 'utf8')
  run('gh', ['release', 'create', tag, '--title', `v${target}`, '--notes-file', notes])
  rmSync(dirname(notes), { recursive: true, force: true })
} else if (!publish) {
  console.log('\n(no --publish: nothing was created/pushed. Re-run with --publish to tag + release.)')
}

console.log(`ok: release preview for ${tag} (tagExists=${tagExists}, publish=${publish})`)
