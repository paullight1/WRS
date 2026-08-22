type Json = Record<string, unknown>

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Data request failed.')
  return body as T
}

export const browserDataClient = {
  recordConsent: (input: {
    purposeSlug: string
    policyVersion: number
    dataCategory: string
    action: 'granted' | 'withdrawn'
    jurisdiction?: string
    context?: Json
  }) => request<{ eventId: number }>('/api/data/consent', { method: 'POST', body: JSON.stringify(input) }),

  createUploadGrant: (input: { purposeSlug: string; dataCategory: string; mimeType: string; sizeBytes: number }) =>
    request<{ assetId: string; signedUrl: string; token: string; path: string; expiresInSeconds: number }>(
      '/api/data/upload-grant',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  uploadToGrant: async (signedUrl: string, file: Blob, mimeType: string) => {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'content-type': mimeType, 'x-upsert': 'false' },
      body: file,
    })
    if (!response.ok) throw new Error('Private upload failed.')
  },

  completeUpload: (assetId: string, checksumSha256?: string) =>
    request<{ assetId: string; status: string; scanStatus: string }>('/api/data/upload-complete', {
      method: 'POST',
      body: JSON.stringify({ assetId, checksumSha256 }),
    }),

  submit: (assetId: string, metadata: Json = {}) =>
    request<{ submissionId: string; status: string }>('/api/data/submissions', {
      method: 'POST',
      body: JSON.stringify({ assetId, metadata }),
    }),

  deleteAsset: (assetId: string, reason?: string) =>
    request<{ requestId: string; status: string; deletedObjects?: number }>('/api/data/delete', {
      method: 'POST',
      body: JSON.stringify({ assetId, reason }),
    }),
  deleteAll: (reason?: string) =>
    request<{ requestId: string; status: string; deletedObjects?: number }>('/api/data/delete', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  exportData: () => request<{ requestId: string; status: string; expiresAt: string; manifest: Json }>('/api/data/export'),
  revenue: () => request<{ allocations: Json[] }>('/api/data/revenue'),
}
