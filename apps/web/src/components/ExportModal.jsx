import { useRef } from 'react'
import BookOrderWizard from './BookOrderWizard'
import ExportOptionCard from './export/ExportOptionCard'
import VoiceSetupModal from './export/VoiceSetupModal'
import { useExportModal } from '../hooks/useExportModal'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  CloseIcon,
  ChevronRightIcon,
  DownloadIcon,
  StyleIcon,
  BookIcon,
  PackageIcon,
  SpeakerIcon,
  CheckCircleIcon
} from './export/ExportIcons'

export default function ExportModal({ onClose, userName }) {
  const modal = useExportModal({ onClose, userName })
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)

  if (modal.showBookOrder) {
    return (
      <BookOrderWizard
        userName={userName}
        pageCount={50}
        onClose={() => modal.setShowBookOrder(false)}
      />
    )
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 ease-out ${
        modal.shown ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Export Your Memoir"
        className={`bg-gradient-to-b from-stone-50 to-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-300 ease-out ${
          modal.shown ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
        }`}
      >
        <ModalHeader onClose={modal.handleClose} />
        <ErrorBanner error={modal.error} onDismiss={() => modal.setError(null)} />

        <div className="p-6 grid sm:grid-cols-2 gap-4">
          <StyleCard
            visible={modal.shown}
            exportStatus={modal.exportStatus}
            onClick={modal.handleStyleMemoir}
          />
          <EbookCard
            visible={modal.shown}
            exportStatus={modal.exportStatus}
            downloading={modal.downloading}
            onClick={modal.handleDownloadEpub}
          />
          <PrintedBookCard visible={modal.shown} onClick={() => modal.setShowBookOrder(true)} />
          <AudiobookCard
            visible={modal.shown}
            audiobookStatus={modal.audiobookStatus}
            generatingAudiobook={modal.generatingAudiobook}
            onGenerate={modal.handleGenerateAudiobook}
            onSetupVoice={() => modal.setShowVoiceSetup(true)}
          />
        </div>

        <ModalFooter storyCount={modal.exportStatus?.storyCount || 0} />
      </div>

      {modal.showVoiceSetup && (
        <VoiceSetupModal
          voice={modal.voice}
          consent={modal.voiceConsent}
          onConsentChange={modal.setVoiceConsent}
          onUpload={modal.uploadVoiceSample}
          uploading={modal.uploadingVoice}
          onClose={() => modal.setShowVoiceSetup(false)}
        />
      )}
    </div>
  )
}

function StyleCard({ visible, exportStatus, onClick }) {
  return (
    <ExportOptionCard
      title="Style Your Memoir"
      badge="AI"
      badgeClass="bg-amber-200 text-amber-800"
      description="Transform your writing in the style of Hemingway, Jane Austen, Maya Angelou & more"
      className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-300 hover:shadow-lg"
      iconWrapperClass="bg-gradient-to-br from-amber-500 to-orange-500 shadow-md group-hover:scale-105 transition"
      icon={<StyleIcon />}
      priceOrStatus={
        exportStatus?.canExport ? (
          <span className="text-green-600 font-medium">Included</span>
        ) : (
          <span className="font-semibold text-ink">£4.99</span>
        )
      }
      actionIcon={
        <ChevronRightIcon className="text-amber-600 group-hover:translate-x-1 transition" />
      }
      visible={visible}
      delay="100ms"
      onClick={onClick}
    />
  )
}

function EbookCard({ visible, exportStatus, downloading, onClick }) {
  return (
    <ExportOptionCard
      title="eBook (EPUB)"
      description="Download for Kindle, iPad, or any e-reader. Share digitally with family."
      className="bg-white border border-stone-200 hover:border-sepia/50 hover:shadow-lg"
      iconWrapperClass="bg-sepia/10 group-hover:bg-sepia/20 transition"
      icon={<BookIcon />}
      priceOrStatus={
        exportStatus?.canExport ? (
          <span className="text-green-600 font-medium">
            {downloading ? 'Downloading...' : 'Download Now'}
          </span>
        ) : (
          <span className="font-semibold text-ink">£7.99</span>
        )
      }
      actionIcon={<DownloadIcon className="text-sepia group-hover:translate-x-1 transition" />}
      visible={visible}
      delay="150ms"
      onClick={onClick}
    />
  )
}

function PrintedBookCard({ visible, onClick }) {
  return (
    <ExportOptionCard
      title="Printed Book"
      description="Beautiful hardcover or paperback delivered to your door. The perfect gift."
      className="bg-gradient-to-br from-stone-800 to-stone-900 text-white hover:shadow-2xl relative overflow-hidden"
      iconWrapperClass="bg-white/10 group-hover:bg-white/20 transition"
      cornerLabel="Most Popular"
      icon={<PackageIcon />}
      priceOrStatus={<span className="font-semibold">From £29</span>}
      actionIcon={
        <ChevronRightIcon className="text-white/70 group-hover:translate-x-1 transition" />
      }
      visible={visible}
      delay="200ms"
      onClick={onClick}
    />
  )
}

function AudiobookCard({
  visible,
  audiobookStatus,
  generatingAudiobook,
  onGenerate,
  onSetupVoice
}) {
  return (
    <ExportOptionCard
      title="Audiobook (MP3)"
      badge="New"
      badgeClass="bg-purple-200 text-purple-800"
      description="Listen to your memoir narrated. Option to use your own AI-cloned voice."
      className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 hover:border-purple-300 hover:shadow-lg"
      iconWrapperClass="bg-gradient-to-br from-purple-500 to-indigo-500 shadow-md"
      icon={<SpeakerIcon />}
      priceOrStatus={
        audiobookStatus?.canGenerate ? (
          <span className="text-green-600 font-medium">Ready</span>
        ) : (
          <span className="font-semibold text-ink">£14.99</span>
        )
      }
      visible={visible}
      delay="250ms"
    >
      {audiobookStatus?.hasVoiceModel && (
        <div className="mt-3 mb-2 text-xs text-purple-600 flex items-center gap-1">
          <CheckCircleIcon />
          Your voice is set up
        </div>
      )}
      <AudiobookActions
        audiobookStatus={audiobookStatus}
        generatingAudiobook={generatingAudiobook}
        onGenerate={onGenerate}
        onSetupVoice={onSetupVoice}
      />
    </ExportOptionCard>
  )
}

function AudiobookActions({ audiobookStatus, generatingAudiobook, onGenerate, onSetupVoice }) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={e => {
          e.stopPropagation()
          onGenerate(false)
        }}
        disabled={generatingAudiobook}
        className="flex-1 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
      >
        {generatingAudiobook ? 'Creating...' : 'Generate'}
      </button>
      {audiobookStatus?.hasVoiceModel ? (
        <button
          onClick={e => {
            e.stopPropagation()
            onGenerate(true)
          }}
          disabled={generatingAudiobook}
          className="flex-1 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 disabled:opacity-50 transition"
        >
          My Voice
        </button>
      ) : (
        <button
          onClick={e => {
            e.stopPropagation()
            onSetupVoice()
          }}
          className="flex-1 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition"
        >
          Set Up Voice
        </button>
      )}
    </div>
  )
}

function ModalHeader({ onClose }) {
  return (
    <div className="relative bg-gradient-to-r from-stone-800 via-stone-900 to-stone-800 text-white p-8 rounded-t-3xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 text-white/60 hover:text-white hover:rotate-90 transition-all duration-300"
      >
        <CloseIcon />
      </button>
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-4 left-8 text-6xl font-serif">&ldquo;</div>
        <div className="absolute bottom-4 right-8 text-6xl font-serif rotate-180">&ldquo;</div>
      </div>
      <div className="text-center relative z-10">
        <p className="text-xl sm:text-2xl font-light italic leading-relaxed max-w-2xl mx-auto">
          The stories we leave behind become the bridges
          <br className="hidden sm:block" />
          <span className="text-amber-300">between generations.</span>
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="w-12 h-px bg-white/30" />
          <span className="text-xs uppercase tracking-[0.3em] text-white/50">
            Your Legacy Awaits
          </span>
          <div className="w-12 h-px bg-white/30" />
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ error, onDismiss }) {
  if (!error) return null
  return (
    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
      <span>{error}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="text-red-500 hover:text-red-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}

function ModalFooter({ storyCount }) {
  return (
    <div className="px-6 pb-6">
      <div className="text-center text-xs text-warmgray/60 border-t border-stone-200 pt-4">
        <p>All exports include your complete memoir with {storyCount} stories</p>
        <p className="mt-1">Secure payment via Stripe &bull; Instant delivery</p>
      </div>
    </div>
  )
}
