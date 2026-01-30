import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { chapters } from '../data/chapters'
import BookOrderWizard from '../components/BookOrderWizard'
import { useAuth } from '../context/AuthContext'
import { IconSparkles } from '@tabler/icons-react'

export default function Export() {
  const { user, authFetch } = useAuth()
  const [searchParams] = useSearchParams()
  const [stories, setStories] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBookOrder, setShowBookOrder] = useState(false)
  const [pageCount, setPageCount] = useState(50)
  const [exportStatus, setExportStatus] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(searchParams.get('success') === 'true')

  // Audiobook state
  const [audiobookStatus, setAudiobookStatus] = useState(null)
  const [showVoiceSetup, setShowVoiceSetup] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceConsent, setVoiceConsent] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [generatingAudiobook, setGeneratingAudiobook] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    fetchAllStories()
    fetchExportStatus()
    fetchAudiobookStatus()
  }, [])

  useEffect(() => {
    // Refresh export status after successful payment
    if (paymentSuccess) {
      fetchExportStatus()
    }
  }, [paymentSuccess])

  const fetchAllStories = async () => {
    try {
      setError(null)
      const storiesRes = await authFetch('/api/stories/all')
      if (!storiesRes.ok) {
        throw new Error('Failed to load stories')
      }
      const storiesData = await storiesRes.json()

      // Organize by chapter and question
      const organized = {}
      storiesData.forEach(story => {
        if (!organized[story.chapter_id]) {
          organized[story.chapter_id] = {}
        }
        organized[story.chapter_id][story.question_id] = story
      })
      setStories(organized)
    } catch (err) {
      console.error('Error fetching stories:', err)
      setError('Unable to load your stories. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const fetchExportStatus = async () => {
    try {
      const res = await authFetch('/api/export/status')
      if (res.ok) {
        const data = await res.json()
        setExportStatus(data)
      }
    } catch (err) {
      console.error('Error fetching export status:', err)
    }
  }

  const fetchAudiobookStatus = async () => {
    try {
      const res = await authFetch('/api/audiobook/status')
      if (res.ok) {
        const data = await res.json()
        setAudiobookStatus(data)
      }
    } catch (err) {
      console.error('Error fetching audiobook status:', err)
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

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }, 30000)
    } catch (err) {
      console.error('Microphone access error:', err)
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
      // Convert blob to base64
      const reader = new FileReader()
      reader.readAsDataURL(recordedAudio)
      reader.onloadend = async () => {
        const base64Audio = reader.result

        const res = await authFetch('/api/audiobook/voice-sample', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            consentGiven: voiceConsent
          })
        })

        if (!res.ok) throw new Error('Upload failed')

        await fetchAudiobookStatus()
        setShowVoiceSetup(false)
        setRecordedAudio(null)
      }
    } catch (err) {
      console.error('Voice upload error:', err)
      setError('Failed to upload voice sample. Please try again.')
    } finally {
      setUploadingVoice(false)
    }
  }

  const deleteVoiceModel = async () => {
    try {
      const res = await authFetch('/api/audiobook/voice-sample', { method: 'DELETE' })
      if (res.ok) {
        await fetchAudiobookStatus()
      }
    } catch (err) {
      console.error('Delete voice error:', err)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useOwnVoice })
      })

      if (!res.ok) throw new Error('Generation failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${user?.name || 'My'}_Life_Story_Audiobook.mp3`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error('Audiobook generation error:', err)
      setError('Failed to generate audiobook. Please try again.')
    } finally {
      setGeneratingAudiobook(false)
    }
  }

  const handleDownloadEpub = async () => {
    if (!exportStatus?.canExport) {
      // Redirect to payment
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
      a.download = `${user?.name || 'My'}_Life_Story.epub`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download eBook. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handlePayment = async (productId) => {
    try {
      const res = await authFetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/export?success=true`,
          cancelUrl: `${window.location.origin}/export?cancelled=true`
        })
      })

      if (!res.ok) throw new Error('Payment setup failed')

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error('Payment error:', err)
      setError('Failed to start payment. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-sepia">Loading your story...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center">
          {error}
        </div>
        <div className="text-center mt-4">
          <Link to="/" className="text-sepia hover:text-ink underline">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const hasContent = Object.keys(stories).length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      {/* Success Message */}
      {paymentSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 print:hidden">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-green-900">Payment successful!</p>
            <p className="text-sm text-green-700">You can now download your eBook anytime.</p>
          </div>
          <button
            onClick={() => setPaymentSuccess(false)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Early Adopter Badge */}
      {exportStatus?.isEarlyAdopter && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 print:hidden">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-amber-900">Early Adopter Bonus!</p>
            <p className="text-sm text-amber-700">You're one of our first 100 users - enjoy free eBook exports forever!</p>
          </div>
        </div>
      )}

      {/* Header - hidden in print */}
      <header className="mb-8 print:hidden">
        <Link to="/home" className="text-sepia hover:text-ink transition inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Chapters
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-ink">Preview Your Story</h1>
            <p className="text-sepia">Review and print your autobiography</p>
          </div>
          {hasContent && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadEpub}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 disabled:opacity-50 transition tap-bounce"
              >
                {downloading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {exportStatus?.canExport ? 'Download eBook' : 'Download eBook (£7.99)'}
              </button>
              <button
                onClick={() => setShowBookOrder(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white rounded-lg hover:bg-ink/80 transition tap-bounce"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Order Printed Book
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Style Your Memoir Banner */}
      {hasContent && (
        <div className="mb-8 print:hidden">
          <Link
            to="/preview-style"
            className="block bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 hover:border-amber-300 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <IconSparkles size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl text-ink mb-1 group-hover:text-amber-700 transition">
                  Style Your Memoir
                </h3>
                <p className="text-sm text-warmgray">
                  Transform your writing style - choose from Hemingway, Jane Austen, Maya Angelou & more
                </p>
              </div>
              <div className="hidden sm:block text-amber-600 group-hover:translate-x-1 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Export Options Cards */}
      {hasContent && (
        <div className="grid md:grid-cols-3 gap-6 mb-12 print:hidden">
          {/* eBook Card */}
          <div className="bg-white rounded-2xl p-6 border border-sepia/10 shadow-sm">
            <div className="w-12 h-12 bg-sepia/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-ink mb-2">eBook (EPUB)</h3>
            <p className="text-sm text-warmgray mb-4">
              Download as an eBook for Kindle, iPad, or any e-reader. Perfect for sharing digitally.
            </p>
            <div className="flex items-baseline gap-2 mb-4">
              {exportStatus?.canExport ? (
                <span className="text-2xl font-medium text-green-600">Free</span>
              ) : (
                <>
                  <span className="text-2xl font-medium text-ink">£7.99</span>
                  <span className="text-sm text-warmgray">one-time</span>
                </>
              )}
            </div>
            <button
              onClick={handleDownloadEpub}
              disabled={downloading}
              className="w-full py-3 bg-sepia text-white rounded-lg hover:bg-sepia/90 disabled:opacity-50 transition font-medium"
            >
              {downloading ? 'Downloading...' : exportStatus?.canExport ? 'Download Now' : 'Buy & Download'}
            </button>
          </div>

          {/* Printed Book Card */}
          <div className="bg-white rounded-2xl p-6 border-2 border-sepia shadow-md relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sepia text-white text-xs px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="w-12 h-12 bg-sepia/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-ink mb-2">Printed Book</h3>
            <p className="text-sm text-warmgray mb-4">
              A beautiful hardcover or paperback book delivered to your door. The perfect gift.
            </p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-medium text-ink">£99</span>
              <span className="text-sm text-warmgray">includes shipping</span>
            </div>
            <button
              onClick={() => setShowBookOrder(true)}
              className="w-full py-3 bg-ink text-white rounded-lg hover:bg-ink/90 transition font-medium"
            >
              Order Your Book
            </button>
          </div>

          {/* Audiobook Card */}
          <div className="bg-white rounded-2xl p-6 border border-sepia/10 shadow-sm relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
              New
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-ink mb-2">Audiobook (MP3)</h3>
            <p className="text-sm text-warmgray mb-4">
              Listen to your memoir narrated aloud. Option to use your own voice with AI cloning.
            </p>
            <div className="flex items-baseline gap-2 mb-4">
              {audiobookStatus?.canGenerate ? (
                <span className="text-2xl font-medium text-green-600">Free</span>
              ) : (
                <>
                  <span className="text-2xl font-medium text-ink">£14.99</span>
                  <span className="text-sm text-warmgray">one-time</span>
                </>
              )}
            </div>

            {/* Voice status indicator */}
            {audiobookStatus?.hasVoiceModel && (
              <div className="mb-3 p-2 bg-purple-50 rounded-lg flex items-center justify-between">
                <span className="text-xs text-purple-700">Your voice is set up</span>
                <button
                  onClick={deleteVoiceModel}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => handleGenerateAudiobook(false)}
                disabled={generatingAudiobook}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium"
              >
                {generatingAudiobook ? 'Generating...' : audiobookStatus?.canGenerate ? 'Generate Audiobook' : 'Buy & Generate'}
              </button>

              {audiobookStatus?.hasVoiceModel ? (
                <button
                  onClick={() => handleGenerateAudiobook(true)}
                  disabled={generatingAudiobook}
                  className="w-full py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 transition text-sm"
                >
                  Use My Voice
                </button>
              ) : (
                <button
                  onClick={() => setShowVoiceSetup(true)}
                  className="w-full py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition text-sm"
                >
                  Set Up My Voice
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Voice Setup Modal */}
      {showVoiceSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-display text-xl text-ink">Set Up Your Voice</h3>
              <button
                onClick={() => {
                  setShowVoiceSetup(false)
                  setRecordedAudio(null)
                  setVoiceConsent(false)
                }}
                className="text-warmgray hover:text-ink"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-warmgray mb-4">
              Record a 15-30 second voice sample. Read naturally - perhaps a paragraph from your story.
              Our AI will learn your voice and narrate your entire memoir in your own voice.
            </p>

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                checked={voiceConsent}
                onChange={(e) => setVoiceConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-sepia rounded"
              />
              <span className="text-sm text-amber-900">
                I consent to having my voice cloned using AI technology. I understand my voice data
                will be processed by Fish.audio and stored securely. I can delete my voice model at any time.
              </span>
            </label>

            {/* Recording UI */}
            <div className="text-center mb-6">
              {!recordedAudio ? (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!voiceConsent}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : voiceConsent
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
                  <audio
                    controls
                    src={URL.createObjectURL(recordedAudio)}
                    className="mx-auto"
                  />
                  <button
                    onClick={() => setRecordedAudio(null)}
                    className="text-sm text-warmgray hover:text-ink underline"
                  >
                    Record again
                  </button>
                </div>
              )}

              <p className="text-xs text-warmgray mt-2">
                {isRecording ? 'Recording... (max 30 seconds)' : !recordedAudio ? 'Tap to start recording' : ''}
              </p>
            </div>

            {/* Upload button */}
            {recordedAudio && (
              <button
                onClick={uploadVoiceSample}
                disabled={uploadingVoice || !voiceConsent}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium"
              >
                {uploadingVoice ? 'Processing...' : 'Save My Voice'}
              </button>
            )}
          </div>
        </div>
      )}

      {!hasContent ? (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-sepia text-lg mb-4">No stories written yet</p>
          <Link to="/home" className="text-ink underline">
            Start writing your story
          </Link>
        </div>
      ) : (
        /* Book Summary - No content preview to protect from screenshots */
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-sepia/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-3xl font-display text-ink mb-2">{user?.name || 'My'}'s Life Story</h2>
            <p className="text-sepia mb-8">Your memoir is ready to export</p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-3xl font-display text-ink">
                  {Object.keys(stories).length}
                </p>
                <p className="text-sm text-warmgray">Chapters</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display text-ink">
                  {Object.values(stories).reduce((acc, chapter) =>
                    acc + Object.values(chapter).filter(s => s.answer?.trim()).length, 0
                  )}
                </p>
                <p className="text-sm text-warmgray">Stories</p>
              </div>
            </div>

            {/* Chapter list - just titles, no content */}
            <div className="max-w-md mx-auto text-left">
              <p className="text-sm text-warmgray mb-3 font-medium">Chapters included:</p>
              <ul className="space-y-2">
                {chapters.map(chapter => {
                  const chapterStories = stories[chapter.id]
                  const storyCount = chapterStories
                    ? Object.values(chapterStories).filter(s => s.answer?.trim()).length
                    : 0
                  if (storyCount === 0) return null
                  return (
                    <li key={chapter.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{chapter.title}</span>
                      <span className="text-warmgray">{storyCount} {storyCount === 1 ? 'story' : 'stories'}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <p className="text-xs text-warmgray/60 mt-8">
              Your full story content is securely stored and will be included in your export.
            </p>
          </div>
        </div>
      )}

      {/* Book Order Modal */}
      {showBookOrder && (
        <BookOrderWizard
          userName={user?.name || 'My'}
          pageCount={pageCount}
          onClose={() => setShowBookOrder(false)}
        />
      )}
    </div>
  )
}
