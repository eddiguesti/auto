import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Custom hook for voice recording via MediaRecorder API.
 *
 * @param {Object} options
 * @param {number} [options.maxDuration=30000] - Max recording duration in ms.
 * @param {Function} [options.onRecordingComplete] - Called with the audio Blob when recording finishes.
 * @returns {{ startRecording, stopRecording, isRecording, recordedAudio, clearRecording, error, clearError }}
 */
export function useVoiceRecording({ maxDuration = 30000, onRecordingComplete } = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const mountedRef = useRef(true)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Stop any active recording on unmount
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    let stream = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        stream.getTracks().forEach(track => track.stop())

        if (!mountedRef.current) return

        setRecordedAudio(audioBlob)
        onRecordingComplete?.(audioBlob)
      }

      recorder.start()
      setIsRecording(true)
      setError(null)

      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }, maxDuration)
    } catch (err) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (mountedRef.current) {
        setError('Could not access microphone. Please check permissions.')
      }
    }
  }, [maxDuration, onRecordingComplete, stopRecording])

  const clearRecording = useCallback(() => {
    setRecordedAudio(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordedAudio,
    clearRecording,
    error,
    clearError
  }
}
