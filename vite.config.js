import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { assertProductionConfig, parseRuntimeConfig } from './src/lib/runtimeConfig.js'

const miningHandlers = {
  '/api/mining': 'api/mining.js',
  '/api/mining/start': 'api/mining/start.js',
  '/api/mining/leaderboard': 'api/mining/leaderboard.js',
}

function localApiPlugin(root) {
  return {
    name: 'wrs-local-api-handlers',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        try {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) headers.set(key, value.join(', '))
            else if (value !== undefined) headers.set(key, value)
          }
          const request = new Request(url, {
            method: req.method || 'GET',
            headers,
            body: body?.length ? body : undefined,
            duplex: body?.length ? 'half' : undefined,
          })

          let response
          const miningFile = miningHandlers[url.pathname]
          if (miningFile) {
            const moduleUrl = pathToFileURL(path.resolve(root, miningFile)).href
            const handler = (await import(moduleUrl)).default
            response = await handler(request)
          } else {
            const gatewayUrl = pathToFileURL(path.resolve(root, 'api/[...path].js')).href
            const gateway = await import(gatewayUrl)
            response = await gateway.default.fetch(request)
          }

          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value)
          })
          const cookies = response.headers.getSetCookie?.() || []
          if (cookies.length) res.setHeader('set-cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('cache-control', 'no-store')
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ message: 'Local API handler failed.' }))
          server.config.logger.error(error instanceof Error ? error.stack || error.message : String(error))
        }
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
    plugins: [react(), localApiPlugin(process.cwd())],
    server: { port: 5173, open: true },
  }
})
