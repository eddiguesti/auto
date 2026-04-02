import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Decorative open book */}
      <div className="w-24 h-24 mb-8 flex items-center justify-center">
        <svg
          className="w-24 h-24 text-sepia/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={0.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>

      {/* 404 number in display font */}
      <p className="font-display text-8xl font-bold text-sepia/20 mb-2 leading-none">404</p>

      <h1 className="font-display text-2xl sm:text-3xl text-ink mb-3">
        This page is still unwritten
      </h1>
      <p className="text-sepia/60 text-base sm:text-lg max-w-md mb-10 leading-relaxed">
        Every memoir has a few blank pages. The one you were looking for doesn&apos;t exist — but
        there&apos;s still a story worth telling.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/home"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sepia text-white rounded-xl font-medium hover:bg-sepia/90 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Go Home
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-sepia/20 text-sepia rounded-xl font-medium hover:border-sepia/40 hover:bg-sepia/5 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Go Back
        </button>
      </div>
    </div>
  )
}
