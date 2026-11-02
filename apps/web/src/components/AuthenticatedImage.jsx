import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthenticatedImage(props) {
  const { user } = useAuth()
  return <PrivateImage key={`${user?.id}:${props.src}`} {...props} />
}

function PrivateImage({ src, alt, className = '', loading = 'lazy' }) {
  const { authFetch } = useAuth()
  const element = useRef(null)
  const [visible, setVisible] = useState(
    () => loading === 'eager' || typeof IntersectionObserver === 'undefined'
  )
  const [image, setImage] = useState(null)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (visible) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(element.current)
    return () => observer.disconnect()
  }, [visible])
  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    let objectUrl
    setError(null)
    setImage(null)
    async function load() {
      try {
        // Never attach account credentials to an arbitrary external image URL.
        if (typeof src !== 'string' || !/^\/api\/(?:photos|chapter-images)\/file\//.test(src))
          throw new Error('Invalid private image location')
        const response = await authFetch(src, { signal: controller.signal })
        if (
          !response.ok ||
          !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
            response.headers.get('content-type')?.split(';')[0]
          )
        )
          throw new Error('This image could not be loaded.')
        const blob = await response.blob()
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setImage(objectUrl)
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message)
      }
    }
    void load()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, authFetch, visible, retry])
  return (
    <div
      ref={element}
      className={`relative overflow-hidden ${className}`}
      aria-busy={visible && !image && !error}
    >
      {image && !error ? (
        <img
          src={image}
          alt={alt}
          loading={loading}
          className="w-full h-full object-cover"
          onError={() => setError('This image could not be displayed.')}
        />
      ) : error ? (
        <div
          className="flex h-full flex-col items-center justify-center gap-1 p-2 bg-sepia/5 text-xs text-sepia"
          role="status"
        >
          <span>{error}</span>
          <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>
            Retry image
          </button>
        </div>
      ) : (
        <span role="img" aria-label={alt} className="block w-full h-full bg-sepia/5" />
      )}
    </div>
  )
}
