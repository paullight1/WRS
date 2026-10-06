import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const configUrl = pathToFileURL(path.join(process.cwd(), 'admin/vite.config.js')).href
const originalApiOrigin = process.env.VITE_WRS_API_ORIGIN

afterEach(() => {
  if (originalApiOrigin === undefined) delete process.env.VITE_WRS_API_ORIGIN
  else process.env.VITE_WRS_API_ORIGIN = originalApiOrigin
})

function readConfig({ command, mode, apiOrigin } = {}) {
  const script = `
    const { default: loadConfig } = await import(${JSON.stringify(configUrl)});
    const config = await loadConfig({ command: ${JSON.stringify(command)}, mode: ${JSON.stringify(mode)} });
    console.log(JSON.stringify({ root: config.root, outDir: config.build?.outDir, envDir: config.envDir, fsAllow: config.server?.fs?.allow, plugins: config.plugins.flat(Infinity).map((plugin) => plugin?.name) }));
  `
  const env = { ...process.env }
  if (apiOrigin === undefined) delete env.VITE_WRS_API_ORIGIN
  else env.VITE_WRS_API_ORIGIN = apiOrigin
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: process.cwd(), env, encoding: 'utf8' }))
}

describe('standalone admin build configuration', () => {
  it('uses admin as the Vite root and writes to its own dist directory', () => {
    const config = readConfig({ command: 'build', mode: 'production', apiOrigin: 'https://worldroboticsystem.com' })

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
    delete env.VITE_WRS_API_ORIGIN

    expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: process.cwd(), env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })).toThrow(/VITE_WRS_API_ORIGIN/)
  })

  it('allows explicit imports from the shared root and registers local API middleware', () => {
    const config = readConfig({ command: 'serve', mode: 'development' })

    expect(config.fsAllow).toContain(process.cwd())
    expect(config.plugins).toContain('wrs-local-api-handlers')
  })
})
