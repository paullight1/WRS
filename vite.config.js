import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { assertProductionConfig, parseRuntimeConfig } from './src/lib/runtimeConfig.js'

export default defineConfig(({ mode }) => {
  // Vite bundles application modules without executing their top-level code,
  // so production safety must also be checked here at build/config time.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  const runtime = parseRuntimeConfig(env)
  assertProductionConfig(runtime)

  return {
    plugins: [react()],
    server: { port: 5173, open: true },
  }
})
