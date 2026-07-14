import { IconX } from '@tabler/icons-react'
import BookOrderWizard from './BookOrderWizard'
import ExportOptionCard from './export/ExportOptionCard'
import VoiceSetupModal from './export/VoiceSetupModal'
import { useExportModal } from '../hooks/useExportModal'
import { Modal, Button } from './ui'
import {
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
    <>
      <Modal
        onClose={modal.handleClose}
        eyebrow="Your Legacy Awaits"
        title="Export Your Memoir"
        size="xl"
        className="lg:max-w-4xl"
      >
        <p className="font-serif italic text-sepia-600 mb-6">
          The stories we leave behind become the bridges between generations.
        </p>

        <ErrorBanner error={modal.error} onDismiss={() => modal.setError(null)} />

        <div className="grid sm:grid-cols-2 gap-4">
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
      </Modal>

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
    </>
  )
}

function StyleCard({ visible, exportStatus, onClick }) {
  return (
    <ExportOptionCard
      title="Style Your Memoir"
      badge="AI"
      description="Transform your writing in the style of Hemingway, Jane Austen, Maya Angelou & more"
      iconWrapperClass="bg-sepia-100 text-sepia-600"
      icon={<StyleIcon />}
      priceOrStatus={
        exportStatus?.canExport ? (
          <span className="text-sm font-medium text-success-strong">Included</span>
        ) : (
          <span className="font-semibold text-ink">£4.99</span>
        )
      }
      actionIcon={<ChevronRightIcon className="text-sepia-400" />}
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
      iconWrapperClass="bg-sepia-100 text-sepia-600"
      icon={<BookIcon />}
      priceOrStatus={
        exportStatus?.canExport ? (
          <span className="text-sm font-medium text-success-strong">
            {downloading ? 'Downloading...' : 'Download Now'}
          </span>
        ) : (
          <span className="font-semibold text-ink">£7.99</span>
        )
      }
      actionIcon={<DownloadIcon className="text-sepia-400" />}
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
      className="!bg-bronze-50 !border-bronze-200 hover:!border-bronze-300"
      iconWrapperClass="bg-bronze-100 text-bronze-700"
      cornerLabel="Most Popular"
      icon={<PackageIcon />}
      priceOrStatus={<span className="font-semibold text-ink">From £29</span>}
      actionIcon={<ChevronRightIcon className="text-bronze-500" />}
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
      description="Listen to your memoir narrated. Option to use your own AI-cloned voice."
      iconWrapperClass="bg-sepia-100 text-sepia-600"
      icon={<SpeakerIcon />}
      priceOrStatus={
        audiobookStatus?.canGenerate ? (
          <span className="text-sm font-medium text-success-strong">Ready</span>
        ) : (
          <span className="font-semibold text-ink">£14.99</span>
        )
      }
      visible={visible}
      delay="250ms"
    >
      {audiobookStatus?.hasVoiceModel && (
        <div className="mt-3 mb-1 text-sm text-success-strong flex items-center gap-1.5">
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
      <Button
        variant="secondary"
        size="sm"
        className="flex-1"
        disabled={generatingAudiobook}
        onClick={e => {
          e.stopPropagation()
          onGenerate(false)
        }}
      >
        {generatingAudiobook ? 'Creating...' : 'Generate'}
      </Button>
      {audiobookStatus?.hasVoiceModel ? (
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={generatingAudiobook}
          onClick={e => {
            e.stopPropagation()
            onGenerate(true)
          }}
        >
          My Voice
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={e => {
            e.stopPropagation()
            onSetupVoice()
          }}
        >
          Set Up Voice
        </Button>
      )}
    </div>
  )
}

function ErrorBanner({ error, onDismiss }) {
  if (!error) return null
  return (
    <div className="mb-4 p-4 bg-error-soft text-error-strong rounded-xl text-sm flex justify-between items-center gap-3">
      <span>{error}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 p-1 rounded-full text-error hover:text-error-strong hover:bg-error-soft transition-colors"
      >
        <IconX size={20} stroke={1.75} />
      </button>
    </div>
  )
}

function ModalFooter({ storyCount }) {
  return (
    <div className="text-center text-xs text-sepia-500 border-t border-sepia-100 mt-6 pt-4">
      <p>All exports include your complete memoir with {storyCount} stories</p>
      <p className="mt-1">Secure payment via Stripe &bull; Instant delivery</p>
    </div>
  )
}
