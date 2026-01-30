import { IconX, IconArrowRight, IconLoader2, IconCheck, IconRefresh } from '@tabler/icons-react'

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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-cream w-full sm:max-w-4xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-sepia/10">
          <div>
            <h2 className="text-xl font-semibold text-sepia">Style Preview</h2>
            {styleDescription && (
              <p className="text-sm text-sepia/60 mt-1">
                Style: {styleDescription}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-sepia/10 text-sepia/60 transition"
          >
            <IconX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <IconLoader2 size={48} className="text-accent animate-spin" />
              <p className="text-sepia/60">Transforming your story...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="text-red-500 text-center">
                <p className="font-medium">Something went wrong</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-sepia/10 hover:bg-sepia/20 rounded-lg text-sepia transition"
                >
                  <IconRefresh size={18} />
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <h3 className="text-sm font-medium text-sepia/60 uppercase tracking-wider mb-3">
                  Original
                </h3>
                <div className="bg-white rounded-xl p-5 border border-sepia/10 min-h-[200px]">
                  <p className="text-sepia leading-relaxed whitespace-pre-wrap">
                    {originalText || 'No original text available'}
                  </p>
                </div>
              </div>

              {/* Arrow indicator (desktop) */}
              <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
                  <IconArrowRight size={20} className="text-white" />
                </div>
              </div>

              {/* Arrow indicator (mobile) */}
              <div className="flex lg:hidden justify-center -my-2">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow rotate-90">
                  <IconArrowRight size={16} className="text-white" />
                </div>
              </div>

              {/* Transformed */}
              <div>
                <h3 className="text-sm font-medium text-accent uppercase tracking-wider mb-3">
                  Transformed
                </h3>
                <div className="bg-accent/5 rounded-xl p-5 border-2 border-accent/20 min-h-[200px]">
                  <p className="text-sepia leading-relaxed whitespace-pre-wrap">
                    {transformedText || 'Transformation result will appear here'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && transformedText && (
          <div className="p-4 sm:p-6 border-t border-sepia/10 bg-white/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 border-2 border-sepia/20 hover:border-sepia/40 text-sepia font-medium rounded-xl transition-colors"
              >
                Keep Browsing
              </button>
              {onApply && (
                <button
                  onClick={onApply}
                  className="flex-1 py-3 px-6 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <IconCheck size={20} />
                  Apply to All Stories
                </button>
              )}
            </div>
            <p className="text-xs text-sepia/50 text-center mt-3">
              Applying will transform all your memoir stories. Original versions are saved and can be reverted.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StylePreviewModal
