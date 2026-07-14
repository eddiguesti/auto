import { Link, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconBook2, IconHome } from '@tabler/icons-react'
import { Button } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center page-enter">
      <Link
        to="/"
        className="font-display text-xl text-ink hover:text-bronze-700 transition-colors mb-10"
      >
        Easy&nbsp;Memoir
      </Link>

      {/* Decorative open book */}
      <div className="w-16 h-16 mb-8 rounded-full bg-sepia-100 text-sepia-500 flex items-center justify-center">
        <IconBook2 size={32} stroke={1.5} />
      </div>

      {/* 404 number in display font */}
      <p className="font-display text-8xl text-sepia-200 mb-2 leading-none" aria-hidden="true">
        404
      </p>

      <h1 className="font-display text-3xl sm:text-4xl text-ink mb-3">
        This page is still unwritten
      </h1>
      <p className="text-sepia-600 text-base sm:text-lg max-w-md mb-10 leading-relaxed">
        Every memoir has a few blank pages. The one you were looking for doesn&apos;t exist — but
        there&apos;s still a story worth telling.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button to="/home" size="lg" icon={<IconHome size={20} stroke={1.75} />}>
          Go Home
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate(-1)}
          icon={<IconArrowLeft size={20} stroke={1.75} />}
        >
          Go Back
        </Button>
      </div>
    </div>
  )
}
