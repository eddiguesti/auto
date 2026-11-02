// API base URL - in development uses relative path (proxy), in production uses full URL
export const API_URL = import.meta.env.VITE_API_URL || ''

// Public GIS client. Keep the browser and API audiences aligned when deploying.
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
  '965574659024-9s7hved45v1626q8ljh5h92h0gvhps6q.apps.googleusercontent.com'
