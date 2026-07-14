import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

/** Render a private API image without exposing the session token in a URL. */
export default function AuthenticatedImage({ src, alt, loading, ...props }) {
  const { authFetch } = useAuth()
  const [objectUrl, setObjectUrl] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let currentUrl

    async function load() {
      const response = await authFetch(src, { signal: controller.signal })
      if (!response.ok) throw new Error(`Image request failed with status ${response.status}`)
      currentUrl = URL.createObjectURL(await response.blob())
      setObjectUrl(currentUrl)
    }

    setObjectUrl(null)
    load().catch(error => {
      if (error.name !== 'AbortError') console.error('Private image failed to load', error)
    })

    return () => {
      controller.abort()
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [authFetch, src])

  if (!objectUrl) return <span role="img" aria-label={alt} {...props} />
  return <img src={objectUrl} alt={alt} loading={loading} {...props} />
}
