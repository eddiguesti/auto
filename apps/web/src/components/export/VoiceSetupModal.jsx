import { IconMicrophone, IconPlayerStopFilled, IconCircleCheck } from '@tabler/icons-react'
import { Modal, Button } from '../ui'

/**
 * Modal for recording a voice sample for audiobook generation.
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

  const handleClose = () => {
    clearRecording()
    onConsentChange(false)
    onClose()
  }

  return (
    <Modal onClose={handleClose} title="Set Up Your Voice" size="md">
      <p className="text-sepia-600 mb-5">
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
        <Button size="xl" loading={uploading} disabled={uploading || !consent} onClick={onUpload}>
          {uploading ? 'Processing...' : 'Save My Voice'}
        </Button>
      )}
    </Modal>
  )
}

function ConsentCheckbox({ consent, onChange }) {
  return (
    <label className="flex items-start gap-3 mb-6 p-4 bg-sepia-50 border border-sepia-200/70 rounded-xl cursor-pointer">
      <input
        type="checkbox"
        checked={consent}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 accent-bronze-500 rounded"
      />
      <span className="text-sm text-sepia-700">
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
      <p className="text-sm text-sepia-500 mt-3">
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
    <Button
      variant={isRecording ? 'danger' : 'primary'}
      onClick={isRecording ? onStop : onStart}
      disabled={!consent}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      className={`!w-20 !h-20 !p-0 mx-auto ${isRecording ? 'animate-pulse' : ''}`}
      icon={
        isRecording ? <IconPlayerStopFilled size={28} /> : <IconMicrophone size={32} stroke={1.5} />
      }
    />
  )
}

function PlaybackSection({ audio, onClear }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-success-strong">
        <IconCircleCheck size={20} stroke={1.75} />
        <span className="text-sm font-medium">Recording complete</span>
      </div>
      <audio controls src={URL.createObjectURL(audio)} className="mx-auto" />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Record again
      </Button>
    </div>
  )
}
