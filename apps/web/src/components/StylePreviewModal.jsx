import { IconArrowRight, IconCheck, IconRefresh } from '@tabler/icons-react'
import { Modal, Button, Skeleton } from './ui'

function StylePreviewModal({
  isOpen,
  onClose,
  originalText,
  transformedText,
  isLoading,
  error,
  styleDescription,
  onApply,
  onRetry
}) {
  if (!isOpen) return null

  return (
    <Modal onClose={onClose} title="Style Preview" size="xl" className="lg:max-w-4xl">
      {styleDescription && (
        <p className="text-sm text-sepia-600 -mt-2 mb-6">Style: {styleDescription}</p>
      )}

      {isLoading ? (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <p className="text-sepia-600 text-sm text-center mt-6">Transforming your story...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-center">
            <p className="font-medium text-error-strong">Something went wrong</p>
            <p className="text-sm text-sepia-600 mt-1">{error}</p>
          </div>
          {onRetry && (
            <Button
              variant="secondary"
              onClick={onRetry}
              icon={<IconRefresh size={20} stroke={1.75} />}
            >
              Try Again
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original */}
          <div>
            <p className="eyebrow mb-3">Original</p>
            <div className="bg-sepia-50 rounded-xl p-5 border border-sepia-100 min-h-[200px]">
              <p className="text-ink-soft font-serif leading-relaxed whitespace-pre-wrap">
                {originalText || 'No original text available'}
              </p>
            </div>
          </div>

          {/* Arrow indicator (mobile) */}
          <div className="flex lg:hidden justify-center -my-2">
            <div className="w-9 h-9 rounded-full bg-bronze-100 text-bronze-700 flex items-center justify-center rotate-90">
              <IconArrowRight size={20} stroke={1.75} />
            </div>
          </div>

          {/* Transformed */}
          <div>
            <p className="eyebrow mb-3 !text-bronze-700">Transformed</p>
            <div className="bg-bronze-50 rounded-xl p-5 border border-bronze-200/70 min-h-[200px]">
              <p className="text-ink-soft font-serif leading-relaxed whitespace-pre-wrap">
                {transformedText || 'Transformation result will appear here'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!isLoading && !error && transformedText && (
        <div className="mt-6 pt-5 border-t border-sepia-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
              Keep Browsing
            </Button>
            {onApply && (
              <Button
                size="lg"
                className="flex-1"
                onClick={onApply}
                icon={<IconCheck size={20} stroke={1.75} />}
              >
                Apply to All Stories
              </Button>
            )}
          </div>
          <p className="text-xs text-sepia-500 text-center mt-3">
            Applying will transform all your memoir stories. Original versions are saved and can be
            reverted.
          </p>
        </div>
      )}
    </Modal>
  )
}

export default StylePreviewModal
