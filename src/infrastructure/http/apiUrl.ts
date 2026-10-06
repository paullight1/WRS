type ViteImportMeta = ImportMeta & {
  env?: { VITE_WRS_API_ORIGIN?: string }
}

export function apiUrl(path: string, origin?: string): string {
  const configuredOrigin = origin ?? (import.meta as ViteImportMeta).env?.VITE_WRS_API_ORIGIN ?? ''
  if (!configuredOrigin) return path

  let parsedOrigin: URL
  try {
    parsedOrigin = new URL(configuredOrigin)
  } catch {
    throw new Error('VITE_WRS_API_ORIGIN must be an absolute HTTP origin.')
  }

  if (
    !['http:', 'https:'].includes(parsedOrigin.protocol) ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    parsedOrigin.pathname !== '/' ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new Error('VITE_WRS_API_ORIGIN must be an absolute HTTP origin without a path.')
  }

  return new URL(path, `${parsedOrigin.origin}/`).toString()
}
