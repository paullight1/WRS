import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { localApiPlugin } from '../scripts/vite/localApiPlugin.js'
import { assertProductionConfig, parseRuntimeConfig } from '../src/lib/runtimeConfig.js'

const adminRoot = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = path.resolve(adminRoot, '..')

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, projectRoot, ''), ...process.env }
  Object.assign(process.env, env)
  if (command === 'serve' && mode !== 'production') process.env.WRS_LOCAL_RATE_LIMIT_FALLBACK = 'true'
  if (command === 'build' && mode === 'production' && !env.VITE_WRS_API_ORIGIN?.trim()) {
    throw new Error('VITE_WRS_API_ORIGIN is required to build the standalone admin app.')
  }
  if (command === 'build' && mode === 'production') {
    if (env.VITE_WRS_MODE !== 'production') {
      throw new Error('VITE_WRS_MODE=production is required to build the admin app for production.')
    }
    const requiredServices = [
      'VITE_WRS_PAYMENT_SERVICE', 'VITE_WRS_IDENTITY_SERVICE', 'VITE_WRS_ROBOT_SERVICE',
      'VITE_WRS_DATA_SERVICE', 'VITE_WRS_REWARD_SERVICE', 'VITE_WRS_DEPLOYMENT_SERVICE', 'VITE_WRS_SUPPORT_SERVICE',
    ]
    const enabledValues = new Set(['1', 'true', 'enabled', 'on'])
    const disabledServices = requiredServices.filter((key) => !enabledValues.has(String(env[key] || '').trim().toLowerCase()))
    if (disabledServices.length) {
      throw new Error(`Admin production build requires explicit enabled WRS service flags: ${disabledServices.join(', ')}.`)
    }
    assertProductionConfig(parseRuntimeConfig(env))
    let apiUrl
    try { apiUrl = new URL(env.VITE_WRS_API_ORIGIN) } catch {
      throw new Error('VITE_WRS_API_ORIGIN must be an absolute HTTP(S) origin.')
    }
    if (!['http:', 'https:'].includes(apiUrl.protocol) || apiUrl.username || apiUrl.password || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
      throw new Error('VITE_WRS_API_ORIGIN must contain only an HTTP(S) origin, without credentials or a path.')
    }
    const configuredOrigin = apiUrl.origin
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(adminRoot, 'vercel.json'), 'utf8'))
    const csp = vercelConfig.headers?.flatMap((entry) => entry.headers || []).find((header) => header.key === 'Content-Security-Policy')?.value || ''
    const connectSource = csp.split(';').map((directive) => directive.trim()).find((directive) => directive.startsWith('connect-src ')) || ''
    if (!connectSource.split(/\s+/).includes(configuredOrigin)) {
      throw new Error(`VITE_WRS_API_ORIGIN (${configuredOrigin}) must be included in admin/vercel.json connect-src.`)
    }
  }

  return {
    root: adminRoot,
    envDir: projectRoot,
    plugins: [react(), localApiPlugin(projectRoot)],
    build: { outDir: path.join(adminRoot, 'dist'), emptyOutDir: true },
    server: { host: '127.0.0.1', port: 5175, fs: { allow: [projectRoot] } },
  }
})
