import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function localApiPlugin(projectRoot) {
  return {
    name: 'wrs-local-api-handlers',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
        if (relativePath.includes('..')) return next()
        const handlerPath = path.resolve(projectRoot, 'api/gateway.js')
        if (!handlerPath.startsWith(path.resolve(projectRoot, 'api') + path.sep) || !fs.existsSync(handlerPath)) return next()

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
