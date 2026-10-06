import { apiUrl } from '../../../src/infrastructure/http/apiUrl.ts'

export const securitySettingsUrl = import.meta.env.VITE_WRS_API_ORIGIN
  ? apiUrl('/settings/security')
  : 'http://127.0.0.1:5190/settings/security'
