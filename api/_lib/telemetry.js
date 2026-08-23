import { redactTelemetry, requestId } from './security.js'

function write(level, event, fields = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactTelemetry(fields),
  }
  const line = JSON.stringify(record)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function requestTelemetry(request) {
  const id = requestId(request)
  const startedAt = Date.now()
  const route = (() => {
    try {
      return new URL(request.url).pathname
    } catch {
      return 'unknown'
    }
  })()
  return {
    requestId: id,
    info(event, fields = {}) {
      write('info', event, { requestId: id, route, ...fields })
    },
    warn(event, fields = {}) {
      write('warn', event, { requestId: id, route, ...fields })
    },
    error(event, error, fields = {}) {
      write('error', event, { requestId: id, route, error, ...fields })
    },
    durationMs() {
      return Date.now() - startedAt
    },
  }
}

// Never emit raw password, token, email, phone, financial amount/wallet details,
// biometric, voice, face or movement payloads. redactTelemetry enforces this at
// the shared boundary before structured logs reach Vercel runtime telemetry.
export function telemetryEvent(level, event, fields = {}) {
  write(level, event, fields)
}
