import { useEffect, memo } from 'react'
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react'
import { useBookRenderer } from '../hooks/useBookRenderer'
import { STYLES } from './BookPreview.styles'

function BookPreview({ userName, totalProgress, onClose }) {
  const {
    containerRef,
    loading,
    view,
    sheetCount,
    viewLabels,
    handlePrev,
    handleNext,
    title,
    storyCount,
    chapterCount
  } = useBookRenderer(userName)

  // Escape key to close
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="bp3-overlay" onClick={onClose}>
      <div
        className="bp3-modal"
        role="dialog"
        aria-modal="true"
        aria-label="3D Book Preview"
        onClick={e => e.stopPropagation()}
      >
        <Header
          title={title}
          loading={loading}
          storyCount={storyCount}
          chapterCount={chapterCount}
          view={view}
          sheetCount={sheetCount}
          viewLabels={viewLabels}
          onPrev={handlePrev}
          onNext={handleNext}
          onClose={onClose}
        />

        <div className="bp3-shell">
          {loading && (
            <div className="bp3-loader">
              <div className="bp3-spin" />
              <p>Preparing your memoir...</p>
            </div>
          )}
          <div
            ref={containerRef}
            className="bp3-canvas"
            role="img"
            aria-label={`Interactive 3D preview of ${title || 'your memoir'}`}
          />
        </div>

        <p className="bp3-hint">
          Click book halves or use arrow keys to navigate {'\u00b7'} Move mouse for 3D parallax
        </p>
        {totalProgress > 0 && (
          <div className="bp3-prog">
            <div className="bp3-prog-fill" style={{ width: `${totalProgress}%` }} />
            <span className="bp3-prog-t">{totalProgress}%</span>
          </div>
        )}
      </div>
      <style>{STYLES}</style>
    </div>
  )
}

function Header({
  title,
  loading,
  storyCount,
  chapterCount,
  view,
  sheetCount,
  viewLabels,
  onPrev,
  onNext,
  onClose
}) {
  return (
    <div className="bp3-head">
      <div className="bp3-brand">
        <span className="bp3-dot" />
        <div>
          <div className="bp3-bname">{title}</div>
          <div className="bp3-bmeta">
            {loading ? 'Loading...' : `${storyCount} stories \u00b7 ${chapterCount} chapters`}
          </div>
        </div>
      </div>
      <div className="bp3-nav">
        <button className="bp3-btn" onClick={onPrev} disabled={view === 0}>
          <IconChevronLeft size={14} stroke={2} />
          Prev
        </button>
        <span className="bp3-cnt">{viewLabels[view] || ''}</span>
        <button className="bp3-btn" onClick={onNext} disabled={view >= sheetCount}>
          Next
          <IconChevronRight size={14} stroke={2} />
        </button>
        <button className="bp3-x" onClick={onClose} aria-label="Close">
          <IconX size={16} stroke={2} />
        </button>
      </div>
    </div>
  )
}

export default memo(BookPreview)
