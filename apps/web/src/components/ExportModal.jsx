import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import BookOrderWizard from './BookOrderWizard'

export default function ExportModal({ onClose, userName }) {
  const { authFetch } = useAuth()
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [exportStatus, setExportStatus] = useState(null)
  const [audiobookStatus, setAudiobookStatus] = useState(null)
  const [styleStatus, setStyleStatus] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [generatingAudiobook, setGeneratingAudiobook] = useState(false)
  const [showBookOrder, setShowBookOrder] = useState(false)
  const [showVoiceSetup, setShowVoiceSetup] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceConsent, setVoiceConsent] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [error, setError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Trigger entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  useEffect(() => {
    fetchAllStatus()
  }, [])

  // Handle close with exit animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => onClose(), 300)
  }

  const fetchAllStatus = async () => {
    try {
      const [exportRes, audiobookRes, styleRes] = await Promise.all([
        authFetch('/api/export/status'),
        authFetch('/api/audiobook/status'),
        authFetch('/api/style/preferences')
      ])

      if (exportRes.ok) setExportStatus(await exportRes.json())
      if (audiobookRes.ok) setAudiobookStatus(await audiobookRes.json())
      if (styleRes.ok) setStyleStatus(await styleRes.json())
    } catch (err) {
      console.error('Status fetch error:', err)
    }
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setRecordedAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }, 30000)
    } catch (err) {
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const uploadVoiceSample = async () => {
    if (!recordedAudio || !voiceConsent) return

    setUploadingVoice(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(recordedAudio)
      reader.onloadend = async () => {
        const res = await authFetch('/api/audiobook/voice-sample', {
          method: 'POST',
          body: JSON.stringify({
            audioData: reader.result,
            consentGiven: voiceConsent
          })
        })
        if (!res.ok) throw new Error('Upload failed')
        await fetchAllStatus()
        setShowVoiceSetup(false)
        setRecordedAudio(null)
      }
    } catch (err) {
      setError('Failed to upload voice sample.')
    } finally {
      setUploadingVoice(false)
    }
  }

  const handleDownloadEpub = async () => {
    if (!exportStatus?.canExport) {
      handlePayment('export_ebook')
      return
    }

    setDownloading(true)
    try {
      const res = await authFetch('/api/export/epub')
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${userName}_Life_Story.epub`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      setError('Failed to download eBook.')
    } finally {
      setDownloading(false)
    }
  }

  const handleGenerateAudiobook = async (useOwnVoice = false) => {
    if (!audiobookStatus?.canGenerate) {
      handlePayment('export_audiobook')
      return
    }

    setGeneratingAudiobook(true)
    try {
      const res = await authFetch('/api/audiobook/generate', {
        method: 'POST',
        body: JSON.stringify({ useOwnVoice })
      })
      if (!res.ok) throw new Error('Generation failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${userName}_Life_Story_Audiobook.mp3`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      setError('Failed to generate audiobook.')
    } finally {
      setGeneratingAudiobook(false)
    }
  }

  const handleStyleMemoir = () => {
    // Style is included with any export purchase
    if (exportStatus?.canExport) {
      onClose()
      navigate('/preview-style')
    } else {
      handlePayment('export_style')
    }
  }

  const handlePayment = async (productId) => {
    try {
      const res = await authFetch('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/home?success=true`,
          cancelUrl: `${window.location.origin}/home?cancelled=true`
        })
      })
      if (!res.ok) throw new Error('Payment setup failed')
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError('Failed to start payment.')
    }
  }

  if (showBookOrder) {
    return (
      <BookOrderWizard
        userName={userName}
        pageCount={50}
        onClose={() => setShowBookOrder(false)}
      />
    )
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 ease-out ${
      isVisible && !isClosing ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
    }`}>
      <div className={`bg-gradient-to-b from-stone-50 to-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-300 ease-out ${
        isVisible && !isClosing
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-8 scale-95'
      }`}>
        {/* Header with Quote */}
        <div className="relative bg-gradient-to-r from-stone-800 via-stone-900 to-stone-800 text-white p-8 rounded-t-3xl overflow-hidden">
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white hover:rotate-90 transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-4 left-8 text-6xl font-serif">"</div>
            <div className="absolute bottom-4 right-8 text-6xl font-serif rotate-180">"</div>
          </div>

          <div className="text-center relative z-10">
            <p className="text-xl sm:text-2xl font-light italic leading-relaxed max-w-2xl mx-auto">
              The stories we leave behind become the bridges
              <br className="hidden sm:block" />
              <span className="text-amber-300">between generations.</span>
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="w-12 h-px bg-white/30" />
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Your Legacy Awaits</span>
              <div className="w-12 h-px bg-white/30" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Export Options Grid */}
        <div className="p-6 grid sm:grid-cols-2 gap-4">

          {/* Style Your Memoir */}
          <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 group cursor-pointer transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
               style={{ transitionDelay: '100ms' }}
               onClick={handleStyleMemoir}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-ink">Style Your Memoir</h3>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">AI</span>
                </div>
                <p className="text-sm text-warmgray mb-3">
                  Transform your writing in the style of Hemingway, Jane Austen, Maya Angelou & more
                </p>
                <div className="flex items-center justify-between">
                  {exportStatus?.canExport ? (
                    <span className="text-green-600 font-medium">Included</span>
                  ) : (
                    <span className="font-semibold text-ink">£4.99</span>
                  )}
                  <svg className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* eBook Export */}
          <div className={`bg-white rounded-2xl p-5 border border-stone-200 hover:border-sepia/50 hover:shadow-lg transition-all duration-300 group cursor-pointer transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
               style={{ transitionDelay: '150ms' }}
               onClick={handleDownloadEpub}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-sepia/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-sepia/20 transition">
                <svg className="w-6 h-6 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-ink mb-1">eBook (EPUB)</h3>
                <p className="text-sm text-warmgray mb-3">
                  Download for Kindle, iPad, or any e-reader. Share digitally with family.
                </p>
                <div className="flex items-center justify-between">
                  {exportStatus?.canExport ? (
                    <span className="text-green-600 font-medium">{downloading ? 'Downloading...' : 'Download Now'}</span>
                  ) : (
                    <span className="font-semibold text-ink">£7.99</span>
                  )}
                  <svg className="w-5 h-5 text-sepia group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Printed Book */}
          <div className={`bg-gradient-to-br from-stone-800 to-stone-900 text-white rounded-2xl p-5 hover:shadow-2xl transition-all duration-300 group cursor-pointer relative overflow-hidden transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
               style={{ transitionDelay: '200ms' }}
               onClick={() => setShowBookOrder(true)}>
            <div className="absolute top-2 right-2">
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Most Popular</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Printed Book</h3>
                <p className="text-sm text-white/70 mb-3">
                  Beautiful hardcover or paperback delivered to your door. The perfect gift.
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">From £29</span>
                  <svg className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Audiobook */}
          <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
               style={{ transitionDelay: '250ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-ink">Audiobook (MP3)</h3>
                  <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">New</span>
                </div>
                <p className="text-sm text-warmgray mb-3">
                  Listen to your memoir narrated. Option to use your own AI-cloned voice.
                </p>

                {/* Voice model indicator */}
                {audiobookStatus?.hasVoiceModel && (
                  <div className="mb-2 text-xs text-purple-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Your voice is set up
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  {audiobookStatus?.canGenerate ? (
                    <span className="text-green-600 font-medium">Ready</span>
                  ) : (
                    <span className="font-semibold text-ink">£14.99</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleGenerateAudiobook(false); }}
                    disabled={generatingAudiobook}
                    className="flex-1 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    {generatingAudiobook ? 'Creating...' : 'Generate'}
                  </button>
                  {audiobookStatus?.hasVoiceModel ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleGenerateAudiobook(true); }}
                      disabled={generatingAudiobook}
                      className="flex-1 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 disabled:opacity-50 transition"
                    >
                      My Voice
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowVoiceSetup(true); }}
                      className="flex-1 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 transition"
                    >
                      Set Up Voice
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="text-center text-xs text-warmgray/60 border-t border-stone-200 pt-4">
            <p>All exports include your complete memoir with {exportStatus?.storyCount || 0} stories</p>
            <p className="mt-1">Secure payment via Stripe • Instant delivery</p>
          </div>
        </div>
      </div>

      {/* Voice Setup Modal */}
      {showVoiceSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-display text-xl text-ink">Set Up Your Voice</h3>
              <button onClick={() => { setShowVoiceSetup(false); setRecordedAudio(null); setVoiceConsent(false); }}
                      className="text-warmgray hover:text-ink">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-warmgray mb-4">
              Record a 15-30 second voice sample. Our AI will learn your voice and narrate your entire memoir.
            </p>

            <label className="flex items-start gap-3 mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <input type="checkbox" checked={voiceConsent} onChange={(e) => setVoiceConsent(e.target.checked)}
                     className="mt-1 w-4 h-4 text-sepia rounded" />
              <span className="text-sm text-amber-900">
                I consent to having my voice cloned using AI. I can delete my voice model at any time.
              </span>
            </label>

            <div className="text-center mb-6">
              {!recordedAudio ? (
                <button onClick={isRecording ? stopRecording : startRecording} disabled={!voiceConsent}
                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition ${
                          isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                            : voiceConsent ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'
                        }`}>
                  {isRecording ? (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">Recording complete</span>
                  </div>
                  <audio controls src={URL.createObjectURL(recordedAudio)} className="mx-auto" />
                  <button onClick={() => setRecordedAudio(null)} className="text-sm text-warmgray hover:text-ink underline">
                    Record again
                  </button>
                </div>
              )}
              <p className="text-xs text-warmgray mt-2">
                {isRecording ? 'Recording... (max 30 seconds)' : !recordedAudio ? 'Tap to start recording' : ''}
              </p>
            </div>

            {recordedAudio && (
              <button onClick={uploadVoiceSample} disabled={uploadingVoice || !voiceConsent}
                      className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium">
                {uploadingVoice ? 'Processing...' : 'Save My Voice'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
