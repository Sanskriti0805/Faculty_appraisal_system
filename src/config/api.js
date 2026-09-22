// All browser-to-server URLs are configured here. Vite substitutes VITE_API_URL at build time.
// In production, use a public HTTPS URL ending in /api, for example:
// VITE_API_URL=https://appraisal.college.edu/api
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_BASE_URL = (configuredApiUrl || (import.meta.env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:5001/api`
  : '/api')).replace(/\/+$/, '')

// Uploads are served by the same backend origin as the API.
const apiUrl = new URL(API_BASE_URL, window.location.origin)
export const UPLOADS_BASE_URL = `${apiUrl.origin}/uploads/`

export const getUploadUrl = (fileName = '') => `${UPLOADS_BASE_URL}${String(fileName).replace(/^\/+/, '')}`
