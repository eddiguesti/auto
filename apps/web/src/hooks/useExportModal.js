import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExport } from './useExport'

const VISIBILITY = { hidden: 'hidden', visible: 'visible', closing: 'closing' }

export { VISIBILITY }

/**
 * Manages all ExportModal state and side-effects.
 * Delegates core export operations to useExport.
 */
export function useExportModal({ onClose, userName }) {
  const navigate = useNavigate()
  const mountedRef = useRef(true)

  const [visibility, setVisibility] = useState(VISIBILITY.hidden)
  const [showBookOrder, setShowBookOrder] = useState(false)
  const [showVoiceSetup, setShowVoiceSetup] = useState(false)

  const exportCore = useExport({ userName, successPath: '/home' })

  useEffect(() => {
    mountedRef.current = true
    const rafId = requestAnimationFrame(() => setVisibility(VISIBILITY.visible))
    return () => {
      mountedRef.current = false
      cancelAnimationFrame(rafId)
    }
  }, [])

  const handleClose = useCallback(() => {
    setVisibility(VISIBILITY.closing)
    setTimeout(() => onClose(), 300)
  }, [onClose])

  const handleStyleMemoir = useCallback(() => {
    if (exportCore.exportStatus?.canExport) {
      onClose()
      navigate('/preview-style')
    } else {
      exportCore.handlePayment('export_style')
    }
  }, [exportCore.exportStatus, exportCore.handlePayment, onClose, navigate])

  const uploadVoiceSample = useCallback(async () => {
    const ok = await exportCore.uploadVoiceSample()
    if (ok) setShowVoiceSetup(false)
  }, [exportCore.uploadVoiceSample])

  return {
    shown: visibility === VISIBILITY.visible,
    exportStatus: exportCore.exportStatus,
    audiobookStatus: exportCore.audiobookStatus,
    downloading: exportCore.downloading,
    generatingAudiobook: exportCore.generatingAudiobook,
    showBookOrder,
    setShowBookOrder,
    showVoiceSetup,
    setShowVoiceSetup,
    voiceConsent: exportCore.voiceConsent,
    setVoiceConsent: exportCore.setVoiceConsent,
    uploadingVoice: exportCore.uploadingVoice,
    error: exportCore.error,
    setError: exportCore.setError,
    voice: exportCore.voice,
    handleClose,
    handleStyleMemoir,
    handleDownloadEpub: exportCore.handleDownloadEpub,
    handleGenerateAudiobook: exportCore.handleGenerateAudiobook,
    uploadVoiceSample
  }
}
