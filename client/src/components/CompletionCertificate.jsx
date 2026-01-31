import { useRef } from 'react'

export default function CompletionCertificate({ userName, completionDate, totalStories, onClose }) {
  const certificateRef = useRef(null)

  const formattedDate = new Date(completionDate || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const handleDownload = async () => {
    // For now, we'll use a simple print-to-PDF approach
    // In production, you could use html2canvas + jspdf
    window.print()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s Life Story Complete!`,
          text: `I just finished writing my memoir with Easy Memoir! ${totalStories} stories preserved for future generations.`,
          url: window.location.origin
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Certificate Content */}
        <div
          ref={certificateRef}
          className="p-8 bg-gradient-to-br from-amber-50 via-cream to-orange-50 print:p-12"
        >
          {/* Decorative Border */}
          <div className="border-4 border-double border-sepia/30 p-6 rounded-lg">
            {/* Header Decoration */}
            <div className="text-center mb-6">
              <div className="text-sepia/40 text-3xl mb-2">✦</div>
              <div className="w-32 h-px bg-gradient-to-r from-transparent via-sepia/40 to-transparent mx-auto" />
            </div>

            {/* Certificate Text */}
            <div className="text-center space-y-4">
              <h2 className="text-sepia/60 text-xs uppercase tracking-[0.3em]">
                Certificate of Completion
              </h2>

              <div className="py-4">
                <p className="text-sepia/70 text-sm mb-2">This certifies that</p>
                <h1 className="font-display text-3xl text-ink mb-2">
                  {userName || 'The Author'}
                </h1>
                <p className="text-sepia/70 text-sm">
                  has completed their life story memoir
                </p>
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-8 py-4">
                <div className="text-center">
                  <div className="text-2xl font-display text-sepia">{totalStories}</div>
                  <div className="text-xs text-sepia/60 uppercase tracking-wider">Stories</div>
                </div>
                <div className="w-px bg-sepia/20" />
                <div className="text-center">
                  <div className="text-2xl font-display text-sepia">10</div>
                  <div className="text-xs text-sepia/60 uppercase tracking-wider">Chapters</div>
                </div>
              </div>

              {/* Message */}
              <div className="py-4 max-w-sm mx-auto">
                <p className="text-sepia/80 text-sm italic leading-relaxed">
                  "Your memories are now preserved for future generations.
                  This is a priceless gift to your family."
                </p>
              </div>

              {/* Date and Seal */}
              <div className="pt-6 flex items-end justify-between">
                <div className="text-left">
                  <div className="w-24 border-b border-sepia/30 mb-1" />
                  <p className="text-xs text-sepia/60">{formattedDate}</p>
                </div>

                {/* Seal */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sepia to-amber-700 flex items-center justify-center shadow-lg">
                    <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="w-24 border-b border-sepia/30 mb-1" />
                  <p className="text-xs text-sepia/60">Easy Memoir</p>
                </div>
              </div>
            </div>

            {/* Footer Decoration */}
            <div className="text-center mt-6">
              <div className="w-32 h-px bg-gradient-to-r from-transparent via-sepia/40 to-transparent mx-auto" />
              <div className="text-sepia/40 text-3xl mt-2">✦</div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Hide in print */}
        <div className="p-4 border-t border-sepia/10 flex gap-3 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sepia/70 hover:text-sepia transition"
          >
            Close
          </button>
          {navigator.share && (
            <button
              onClick={handleShare}
              className="flex-1 px-4 py-2 bg-sepia/10 text-sepia rounded-lg hover:bg-sepia/20 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex-1 px-4 py-2 bg-sepia text-white rounded-lg hover:bg-sepia/90 transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-12,
          .print\\:p-12 * {
            visibility: visible;
          }
          .print\\:p-12 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
