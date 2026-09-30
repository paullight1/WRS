import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { assertProductionConfig, parseRuntimeConfig } from './src/lib/runtimeConfig.js'

function localApiRuntimeNotice() {
  return {
    name: 'wrs-local-api-runtime-notice',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.split('?')[0].startsWith('/api/')) return next()
        response.statusCode = 503
        response.setHeader('cache-control', 'no-store')
        response.setHeader('content-type', 'application/json; charset=utf-8')
        response.end(
          JSON.stringify({
            message: 'This local server does not run WRS API functions. Use the API-enabled development runtime.',
          }),
        )
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Vite bundles application modules without executing their top-level code,
  // so production safety must also be checked here at build/config time.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  const runtime = parseRuntimeConfig(env)
  assertProductionConfig(runtime)

  return {
    plugins: [react(), localApiRuntimeNotice()],
    server: { port: 5173, open: true },
  }
})
