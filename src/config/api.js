// All browser-to-server URLs are configured here. Vite substitutes VITE_API_URL at build time.
// In production, use a public HTTPS URL ending in /api, for example:
// VITE_API_URL=https://appraisal.college.edu/api
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

if (!configuredApiUrl) {
  throw new Error('VITE_API_URL is required. Set it in the frontend .env file before starting or building the app.')
}

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '')

// Uploads are served by the same backend origin as the API.
const apiUrl = new URL(API_BASE_URL, window.location.origin)
export const UPLOADS_BASE_URL = `${apiUrl.origin}/uploads/`

export const getUploadUrl = (fileName = '') => `${UPLOADS_BASE_URL}${String(fileName).replace(/^\/+/, '')}`
