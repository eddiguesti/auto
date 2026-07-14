import { useRef } from 'react'
import { IconCheck, IconDownload, IconShare } from '@tabler/icons-react'
import { Button } from './ui'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-modal animate-scale-in">
        {/* Certificate Content */}
        <div
          ref={certificateRef}
          className="p-8 bg-gradient-to-br from-cream via-parchment to-bronze-50 print:p-12"
        >
          {/* Decorative Border */}
          <div className="border-4 border-double border-sepia-300 p-6 rounded-xl">
            {/* Header Decoration */}
            <div className="text-center mb-6">
              <div className="text-bronze-400 text-3xl mb-2">✦</div>
              <div className="w-32 h-px bg-gradient-to-r from-transparent via-sepia-300 to-transparent mx-auto" />
            </div>

            {/* Certificate Text */}
            <div className="text-center space-y-4">
              <h2 className="eyebrow tracking-[0.3em]">Certificate of Completion</h2>

              <div className="py-4">
                <p className="text-sepia-600 text-sm mb-2">This certifies that</p>
                <h1 className="font-display text-3xl text-ink mb-2">{userName || 'The Author'}</h1>
                <p className="text-sepia-600 text-sm">has completed their life story memoir</p>
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-8 py-4">
                <div className="text-center">
                  <div className="text-2xl font-display text-bronze-700">{totalStories}</div>
                  <div className="text-xs text-sepia-500 uppercase tracking-wider">Stories</div>
                </div>
                <div className="w-px bg-sepia-200" />
                <div className="text-center">
                  <div className="text-2xl font-display text-bronze-700">10</div>
                  <div className="text-xs text-sepia-500 uppercase tracking-wider">Chapters</div>
                </div>
              </div>

              {/* Message */}
              <div className="py-4 max-w-sm mx-auto">
                <p className="text-sepia-700 text-sm font-serif italic leading-relaxed">
                  "Your memories are now preserved for future generations. This is a priceless gift
                  to your family."
                </p>
              </div>

              {/* Date and Seal */}
              <div className="pt-6 flex items-end justify-between">
                <div className="text-left">
                  <div className="w-24 border-b border-sepia-300 mb-1" />
                  <p className="text-xs text-sepia-500">{formattedDate}</p>
                </div>

                {/* Seal */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-bronze-500 to-bronze-700 flex items-center justify-center shadow-lifted">
                    <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center">
                      <IconCheck size={24} stroke={2} className="text-white" />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="w-24 border-b border-sepia-300 mb-1" />
                  <p className="text-xs text-sepia-500">Easy Memoir</p>
                </div>
              </div>
            </div>

            {/* Footer Decoration */}
            <div className="text-center mt-6">
              <div className="w-32 h-px bg-gradient-to-r from-transparent via-sepia-300 to-transparent mx-auto" />
              <div className="text-bronze-400 text-3xl mt-2">✦</div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Hide in print */}
        <div className="p-4 border-t border-sepia-100 flex gap-3 print:hidden">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Close
          </Button>
          {navigator.share && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleShare}
              icon={<IconShare size={20} stroke={1.75} />}
            >
              Share
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={handleDownload}
            icon={<IconDownload size={20} stroke={1.75} />}
          >
            Download
          </Button>
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
