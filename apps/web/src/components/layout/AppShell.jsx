import { Link, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconSettings } from '@tabler/icons-react'

/**
 * Persistent frame for authenticated app pages.
 * Top bar: contextual back action on subpages, wordmark home link, settings.
 * Content sits in a consistent reading-width column.
 *
 * @param {string}  [back]     Route for the back button; omit to hide it.
 * @param {string}  [title]    Optional bar title shown centered on subpages.
 * @param {node}    [actions]  Optional right-side bar content (replaces settings).
 * @param {boolean} [wide]     Use a wider content column (e.g. book preview).
 */
export default function AppShell({ back, title, actions, wide = false, children }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-parchment/85 backdrop-blur-md border-b border-sepia-200/50">
        <div
          className={`mx-auto flex items-center justify-between h-14 px-4 sm:px-6 ${
            wide ? 'max-w-5xl' : 'max-w-page'
          }`}
        >
          <div className="flex items-center gap-1 w-24">
            {back ? (
              <button
                type="button"
                onClick={() => (back === -1 ? navigate(-1) : navigate(back))}
                className="flex items-center gap-1.5 -ml-2 px-2 py-1.5 rounded-full text-sepia-600 hover:text-ink hover:bg-sepia-100/70 transition-colors text-sm font-medium"
              >
                <IconArrowLeft size={18} stroke={1.75} />
                <span className="hidden sm:inline">Back</span>
              </button>
            ) : (
              <Wordmark />
            )}
          </div>

          <div className="flex-1 text-center min-w-0">
            {back && title ? (
              <span className="text-sm font-medium text-ink truncate block">{title}</span>
            ) : back ? (
              <Wordmark center />
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-1 w-24">
            {actions || (
              <Link
                to="/settings"
                aria-label="Settings"
                className="p-2 rounded-full text-sepia-500 hover:text-ink hover:bg-sepia-100/70 transition-colors"
              >
                <IconSettings size={20} stroke={1.6} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 ${wide ? 'max-w-5xl' : 'max-w-page'}`}>
        {children}
      </main>
    </div>
  )
}

function Wordmark({ center = false }) {
  return (
    <Link
      to="/home"
      className={`font-display text-lg text-ink hover:text-bronze-700 transition-colors whitespace-nowrap ${
        center ? 'inline-block' : ''
      }`}
    >
      Easy&nbsp;Memoir
    </Link>
  )
}
