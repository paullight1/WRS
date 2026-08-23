import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const secretPatterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['github-token', /gh[pousr]_[A-Za-z0-9]{30,255}/g],
  ['github-fine-grained-token', /github_pat_[A-Za-z0-9_]{50,255}/g],
  ['stripe-live-secret', /sk_live_[A-Za-z0-9]{20,255}/g],
  ['supabase-secret', /sb_secret_[A-Za-z0-9_-]{20,255}/g],
  ['aws-access-key', /AKIA[0-9A-Z]{16}/g],
]

export function scanText(text) {
  const findings = []
  for (const [kind, pattern] of secretPatterns) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      findings.push({ kind, index: match.index ?? 0, preview: `${String(match[0]).slice(0, 6)}…` })
    }
  }
  return findings
}

export function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
}

export function scanRepository(files = trackedFiles()) {
  const findings = []
  for (const file of files) {
    let stat
    try {
      stat = fs.statSync(file)
    } catch {
      continue
    }
    if (!stat.isFile() || stat.size > 1_500_000) continue
    const buffer = fs.readFileSync(file)
    if (buffer.includes(0)) continue
    const text = buffer.toString('utf8')
    for (const finding of scanText(text)) findings.push({ file, ...finding })
  }
  return findings
}

function main() {
  const findings = scanRepository()
  if (findings.length) {
    console.error('Potential committed credentials detected:')
    for (const item of findings) console.error(`- ${item.file}: ${item.kind} (${item.preview})`)
    process.exitCode = 1
    return
  }
  console.log('Repository secret scan passed.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
