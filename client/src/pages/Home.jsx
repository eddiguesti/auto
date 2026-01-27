import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'

export default function Home() {
  const [progress, setProgress] = useState({})
  const [userName, setUserName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)

  useEffect(() => {
    fetchProgress()
    fetchUserName()
  }, [])

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/stories/progress')
      const data = await res.json()
      setProgress(data)
    } catch (err) {
      console.error('Error fetching progress:', err)
    }
  }

  const fetchUserName = async () => {
    try {
      const res = await fetch('/api/stories/settings')
      const data = await res.json()
      if (data.name) {
        setUserName(data.name)
      } else {
        setShowNameInput(true)
      }
    } catch (err) {
      setShowNameInput(true)
    }
  }

  const saveName = async () => {
    if (!userName.trim()) return
    try {
      await fetch('/api/stories/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName })
      })
      setShowNameInput(false)
    } catch (err) {
      console.error('Error saving name:', err)
    }
  }

  const getChapterProgress = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter || !progress[chapterId]) return 0
    const answered = progress[chapterId] || 0
    return Math.round((answered / chapter.questions.length) * 100)
  }

  const totalProgress = () => {
    const totalQuestions = chapters.reduce((sum, ch) => sum + ch.questions.length, 0)
    const totalAnswered = Object.values(progress).reduce((sum, count) => sum + count, 0)
    return Math.round((totalAnswered / totalQuestions) * 100)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
          Steven's Life
        </h1>
        {showNameInput ? (
          <div className="max-w-md mx-auto px-2">
            <p className="text-sepia mb-4">Let's start by getting your name</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="flex-1 px-4 py-3 rounded-lg border border-sepia/30 bg-white focus:outline-none focus:ring-2 focus:ring-sepia/50 text-base"
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
              />
              <button
                onClick={saveName}
                className="px-6 py-3 bg-sepia text-white rounded-lg hover:bg-sepia/80 transition font-medium"
              >
                Start
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xl text-sepia">
              {userName}'s Autobiography
            </p>
            <p className="text-sepia/70 mt-2">
              Answer questions, share memories, and let AI help you tell your story
            </p>
          </>
        )}
      </header>

      {!showNameInput && (
        <>
          {/* Overall Progress */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-ink font-medium">Your Progress</span>
              <span className="text-sepia font-bold">{totalProgress()}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                style={{ width: `${totalProgress()}%` }}
              />
            </div>
          </div>

          {/* Chapters Grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {chapters.map((chapter) => {
              const chapterProgress = getChapterProgress(chapter.id)
              return (
                <Link
                  key={chapter.id}
                  to={`/chapter/${chapter.id}`}
                  className={`bg-gradient-to-br ${chapter.color} rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition group active:scale-[0.98]`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-2xl sm:text-3xl mb-2 block">{chapter.icon}</span>
                      <h2 className="text-lg sm:text-xl font-bold text-ink group-hover:text-sepia transition">
                        {chapter.title}
                      </h2>
                      <p className="text-sepia/70 text-sm truncate">{chapter.subtitle}</p>
                      <p className="text-sepia/50 text-xs mt-2">
                        {chapter.questions.length} questions
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl sm:text-2xl font-bold text-ink">
                        {chapterProgress}%
                      </span>
                      <div className="w-12 sm:w-16 h-2 bg-white/50 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-sepia/70 transition-all"
                          style={{ width: `${chapterProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Export Button */}
          <div className="text-center px-2">
            <Link
              to="/export"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 sm:py-3 bg-ink text-white rounded-lg hover:bg-ink/80 transition active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Preview & Export Your Story
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
