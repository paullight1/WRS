import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const loadAudit = () => import('../../scripts/plan11/supabase-live-audit.mjs')

test('repository migrations use sorted filenames and suffix names', async () => {
  const { repositoryMigrationNames } = await loadAudit()
  assert.deepEqual(repositoryMigrationNames(['20261002000000_second.sql', '20261001000000_first_name.sql']), ['first_name', 'second'])
  assert.throws(() => repositoryMigrationNames([]), /No repository migrations/)
  assert.throws(() => repositoryMigrationNames(['not-a-migration.sql']), /Invalid repository migration/)
  assert.throws(() => repositoryMigrationNames(['20261001000000_same.sql', '20261002000000_same.sql']), /Duplicate repository migration name/)
})

test('remote names match repository suffixes regardless of applied timestamps or row order', async () => {
  const { assertMigrationParity } = await loadAudit()
  const rows = [{ version: '20990101000000', name: 'second' }, { version: '19990101000000', name: 'first_name' }]
  assert.deepEqual(assertMigrationParity(['first_name', 'second'], rows), ['first_name', 'second'])
})

test('missing, unexpected, duplicate and unnamed remote migrations are rejected', async () => {
  const { assertMigrationParity } = await loadAudit()
  assert.throws(() => assertMigrationParity(['first', 'second'], [{ name: 'first' }]), /missing.*second/i)
  assert.throws(() => assertMigrationParity(['first'], [{ name: 'first' }, { name: 'extra' }]), /unexpected.*extra/i)
  assert.throws(() => assertMigrationParity(['first'], [{ name: 'first' }, { name: 'first' }]), /Duplicate applied migration name/)
  assert.throws(() => assertMigrationParity(['first'], [{ version: '20261001000000' }]), /Invalid applied migration name/)
})

test('database CI applies every discovered SQL file and asserts its discovered count', () => {
  const source = fs.readFileSync('.github/workflows/plan11-database-gate.yml', 'utf8')
  assert.doesNotMatch(source, /test "\$\{count\}" -eq 25/)
  assert.match(source, /image: postgres:17/)
  assert.match(source, /pull_request:/)
  const block = source.split('- name: Apply all WRS migrations in timestamp order')[1].split('      - name:')[0]
  const script = block.split('run: |')[1].split('\n').map((line) => line.replace(/^          /, '')).join('\n')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-task1-count-'))
  try {
    fs.mkdirSync(path.join(root, 'supabase/migrations'), { recursive: true })
    fs.mkdirSync(path.join(root, 'bin'))
    fs.writeFileSync(path.join(root, 'bin/psql'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$WRS_TASK1_APPLIED"\n', { mode: 0o755 })
    for (const count of [0, 1, 3, 35]) {
      for (const file of fs.readdirSync(path.join(root, 'supabase/migrations'))) fs.unlinkSync(path.join(root, 'supabase/migrations', file))
      for (let i = 0; i < count; i++) fs.writeFileSync(path.join(root, 'supabase/migrations', `${String(i).padStart(14, '0')}_fixture.sql`), '-- synthetic fixture')
      const applied = path.join(root, 'applied.txt')
      fs.writeFileSync(applied, '')
      const result = spawnSync('bash', ['-c', script], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, WRS_TASK1_APPLIED: applied } })
      assert.equal(result.status, count === 0 ? 1 : 0, result.stderr)
      assert.equal(fs.readFileSync(applied, 'utf8').trim().split('\n').filter(Boolean).length, count)
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
