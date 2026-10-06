import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { localApiPlugin } from './scripts/vite/localApiPlugin.js'
import { assertProductionConfig, parseRuntimeConfig } from './src/lib/runtimeConfig.js'

export default defineConfig(({ command, mode }) => {
  // Vite bundles application modules without executing their top-level code,
  // so production safety must also be checked here at build/config time.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  if (!process.env.SUPABASE_URL && env.VITE_PUBLIC_SUPABASE_URL) process.env.SUPABASE_URL = env.VITE_PUBLIC_SUPABASE_URL
  if (!process.env.SUPABASE_PUBLISHABLE_KEY && env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    process.env.SUPABASE_PUBLISHABLE_KEY = env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  }
  Object.assign(process.env, env)
  if (command === 'serve' && mode !== 'production') process.env.WRS_LOCAL_RATE_LIMIT_FALLBACK = 'true'
  if (env.VITE_WRS_MODE === 'staging' && process.env.SUPABASE_SECRET_KEY && !process.env.WRS_SERVER_SIGNING_SECRET) {
    process.env.WRS_SERVER_SIGNING_SECRET = createHash('sha256')
      .update(`wrs-local-signing:${process.env.SUPABASE_SECRET_KEY}`)
      .digest('hex')
  }
  const runtime = parseRuntimeConfig(env)
  assertProductionConfig(runtime)

  return {
    plugins: [react(), localApiPlugin(process.cwd())],
    server: { port: 5173, open: true },
  }
})
