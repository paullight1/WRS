import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { pathToFileURL } from 'node:url'

const configUrl = pathToFileURL(path.join(process.cwd(), 'admin/vite.config.js')).href
const originalApiOrigin = process.env.VITE_WRS_API_ORIGIN
const productionEnv = {
  VITE_WRS_MODE: 'production',
  VITE_WRS_AUTHORITY_URL: 'https://example.supabase.co',
  ...Object.fromEntries(
    ['PAYMENT', 'IDENTITY', 'ROBOT', 'DATA', 'REWARD', 'DEPLOYMENT', 'SUPPORT'].map((service) => [
      `VITE_WRS_${service}_SERVICE`,
      'enabled',
    ]),
  ),
}

afterEach(() => {
  if (originalApiOrigin === undefined) delete process.env.VITE_WRS_API_ORIGIN
  else process.env.VITE_WRS_API_ORIGIN = originalApiOrigin
})

function readConfig({ command, mode, apiOrigin, overrides = {} } = {}) {
  const script = `
    const { default: loadConfig } = await import(${JSON.stringify(configUrl)});
    const config = await loadConfig({ command: ${JSON.stringify(command)}, mode: ${JSON.stringify(mode)} });
    console.log(JSON.stringify({ root: config.root, outDir: config.build?.outDir, envDir: config.envDir, fsAllow: config.server?.fs?.allow, plugins: config.plugins.flat(Infinity).map((plugin) => plugin?.name) }));
  `
  const env = { ...process.env, ...productionEnv, ...overrides, VITE_WRS_API_ORIGIN: apiOrigin || '' }
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
    }),
  )
}

describe('standalone admin build configuration', () => {
  it('builds with the checked-in public production configuration in a clean checkout', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-admin-clean-'))
    try {
      for (const file of [
        'admin/vite.config.js',
        'admin/vercel.json',
        'scripts/vite/localApiPlugin.js',
        'src/lib/runtimeConfig.js',
        'package.json',
      ]) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
        fs.copyFileSync(path.join(process.cwd(), file), path.join(root, file))
      }
      const productionConfig = 'admin/production.config.json'
      if (fs.existsSync(productionConfig)) fs.copyFileSync(productionConfig, path.join(root, productionConfig))
      fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(root, 'node_modules'), 'dir')
      const config = pathToFileURL(path.join(root, 'admin/vite.config.js')).href
      const script = `const {default:load}=await import(${JSON.stringify(config)}); await load({command:'build',mode:'production'}); console.log(JSON.stringify({origin:process.env.VITE_WRS_API_ORIGIN,mode:process.env.VITE_WRS_MODE,identity:process.env.VITE_WRS_IDENTITY_SERVICE}))`
      const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: root,
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      expect(JSON.parse(output)).toEqual({
        origin: 'https://www.worldroboticsystem.com',
        mode: 'production',
        identity: 'true',
      })
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('uses admin as the Vite root and writes to its own dist directory', () => {
    const config = readConfig({ command: 'build', mode: 'production', apiOrigin: 'https://www.worldroboticsystem.com' })

    expect(config.root).toMatch(/[/\\]admin[/\\]?$/)
    expect(config.outDir).toMatch(/[/\\]admin[/\\]dist$/)
    expect(config.envDir).toMatch(/WORLD ROBOTIC SYSTEM$/)
  })

  it('fails production configuration when the API origin is missing', () => {
    const script = `
      const { default: loadConfig } = await import(${JSON.stringify(configUrl)});
      await loadConfig({ command: 'build', mode: 'production' });
    `
    const env = { ...process.env }
    env.VITE_WRS_API_ORIGIN = ''

    expect(() =>
      execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: process.cwd(),
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    ).toThrow(/VITE_WRS_API_ORIGIN/)
  })

  it('keeps the explicit production mode and service requirements', () => {
    expect(() =>
      readConfig({
        command: 'build',
        mode: 'production',
        apiOrigin: 'https://www.worldroboticsystem.com',
        overrides: { VITE_WRS_MODE: 'staging' },
      }),
    ).toThrow(/VITE_WRS_MODE=production/)
    expect(() =>
      readConfig({
        command: 'build',
        mode: 'production',
        apiOrigin: 'https://www.worldroboticsystem.com',
        overrides: { VITE_WRS_DATA_SERVICE: 'disabled' },
      }),
    ).toThrow(/VITE_WRS_DATA_SERVICE/)
  })

  it('allows explicit imports from the shared root and registers local API middleware', () => {
    const config = readConfig({ command: 'serve', mode: 'development' })

    expect(config.fsAllow).toContain(process.cwd())
    expect(config.plugins).toContain('wrs-local-api-handlers')
  })
})
