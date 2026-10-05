import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertProductionConfig, parseRuntimeConfig } from './src/lib/runtimeConfig.js'

function localApiPlugin(root) {
  return {
    name: 'wrs-local-api-handlers',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
        if (relativePath.includes('..')) return next()
        const handlerPath = path.resolve(root, `${relativePath}.js`)
        if (!handlerPath.startsWith(path.resolve(root, 'api') + path.sep) || !fs.existsSync(handlerPath)) return next()

        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) headers.set(key, value.join(', '))
            else if (value !== undefined) headers.set(key, value)
          }
          const request = new Request(requestUrl, {
            method: req.method || 'GET',
            headers,
            body: body && body.length ? body : undefined,
            duplex: body && body.length ? 'half' : undefined,
          })
          const module = await import(`${pathToFileURL(handlerPath).href}?t=${fs.statSync(handlerPath).mtimeMs}`)
          const response = await module.default.fetch(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value)
          })
          const cookies = response.headers.getSetCookie?.() || []
          if (cookies.length) res.setHeader('set-cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          res.statusCode = 500
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
  if (!process.env.SUPABASE_URL && env.VITE_PUBLIC_SUPABASE_URL) process.env.SUPABASE_URL = env.VITE_PUBLIC_SUPABASE_URL
  if (!process.env.SUPABASE_PUBLISHABLE_KEY && env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    process.env.SUPABASE_PUBLISHABLE_KEY = env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  }
  Object.assign(process.env, env)
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
