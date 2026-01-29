// API base URL - in development uses relative path (proxy), in production uses full URL
export const API_URL = import.meta.env.VITE_API_URL || ''

// Google Client ID - hardcoded to avoid Railway env var corruption
export const GOOGLE_CLIENT_ID = '965574659024-9s7hved45v1626q8ljh5h92h0gvhps6q.apps.googleusercontent.com'
