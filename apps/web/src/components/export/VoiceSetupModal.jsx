import { useRef } from 'react'
import { CloseIcon } from './ExportIcons'
import { useFocusTrap } from '../../hooks/useFocusTrap'

/**
 * Modal overlay for recording a voice sample for audiobook generation.
 */
export default function VoiceSetupModal({
  voice,
  consent,
  onConsentChange,
  onUpload,
  uploading,
  onClose
}) {
  const { startRecording, stopRecording, isRecording, recordedAudio, clearRecording } = voice
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)

  const handleClose = () => {
    clearRecording()
    onConsentChange(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Set Up Your Voice"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
      >
        <Header onClose={handleClose} />

        <p className="text-sm text-warmgray mb-4">
          Record a 15-30 second voice sample. Our AI will learn your voice and narrate your entire
          memoir.
        </p>

        <ConsentCheckbox consent={consent} onChange={onConsentChange} />
        <Recorder
          isRecording={isRecording}
          recordedAudio={recordedAudio}
          consent={consent}
          onStart={startRecording}
          onStop={stopRecording}
          onClear={clearRecording}
        />

        {recordedAudio && (
          <button
            onClick={onUpload}
            disabled={uploading || !consent}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium"
          >
            {uploading ? 'Processing...' : 'Save My Voice'}
          </button>
        )}
      </div>
    </div>
  )
}

function Header({ onClose }) {
  return (
    <div className="flex justify-between items-start mb-4">
      <h3 className="font-display text-xl text-ink">Set Up Your Voice</h3>
      <button onClick={onClose} aria-label="Close" className="text-warmgray hover:text-ink">
        <CloseIcon />
      </button>
    </div>
  )
}

function ConsentCheckbox({ consent, onChange }) {
  return (
    <label className="flex items-start gap-3 mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <input
        type="checkbox"
        checked={consent}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 text-sepia rounded"
      />
      <span className="text-sm text-amber-900">
        I consent to having my voice cloned using AI. I can delete my voice model at any time.
      </span>
    </label>
  )
}

function Recorder({ isRecording, recordedAudio, consent, onStart, onStop, onClear }) {
  return (
    <div className="text-center mb-6">
      {!recordedAudio ? (
        <RecordButton
          isRecording={isRecording}
          consent={consent}
          onStart={onStart}
          onStop={onStop}
        />
      ) : (
        <PlaybackSection audio={recordedAudio} onClear={onClear} />
      )}
      <p className="text-xs text-warmgray mt-2">
        {isRecording
          ? 'Recording... (max 30 seconds)'
          : !recordedAudio
            ? 'Tap to start recording'
            : ''}
      </p>
    </div>
  )
}

function RecordButton({ isRecording, consent, onStart, onStop }) {
  return (
    <button
      onClick={isRecording ? onStop : onStart}
      disabled={!consent}
      className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 animate-pulse'
          : consent
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'bg-gray-300 cursor-not-allowed'
      }`}
    >
      {isRecording ? (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  )
}

function PlaybackSection({ audio, onClear }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-green-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium">Recording complete</span>
      </div>
      <audio controls src={URL.createObjectURL(audio)} className="mx-auto" />
      <button onClick={onClear} className="text-sm text-warmgray hover:text-ink underline">
        Record again
      </button>
    </div>
  )
}
