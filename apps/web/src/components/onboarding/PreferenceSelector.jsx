export default function PreferenceSelector({ onSelect }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-display text-ink mb-2">
        How would you like to tell your story?
      </h2>
      <p className="text-warmgray mb-8">
        Choose your preferred way to share your memories
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Voice Option */}
        <button
          onClick={() => onSelect('voice')}
          className="group relative p-6 bg-white rounded-xl border-2 border-sepia/20 hover:border-sepia transition-all hover:shadow-lg text-left"
        >
          {/* Recommended badge */}
          <div className="absolute -top-3 left-4 px-3 py-1 bg-sepia text-white text-xs rounded-full">
            Recommended
          </div>

          <div className="w-14 h-14 mb-4 rounded-full bg-sepia/10 flex items-center justify-center group-hover:bg-sepia/20 transition">
            <svg className="w-7 h-7 text-sepia" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>

          <h3 className="text-lg font-medium text-ink mb-1">Talk</h3>
          <p className="text-sm text-warmgray">
            Have a conversation with Lisa. Just speak naturally - like chatting with a friend.
          </p>
        </button>

        {/* Type Option */}
        <button
          onClick={() => onSelect('type')}
          className="group p-6 bg-white rounded-xl border-2 border-sepia/20 hover:border-sepia transition-all hover:shadow-lg text-left"
        >
          <div className="w-14 h-14 mb-4 rounded-full bg-sepia/10 flex items-center justify-center group-hover:bg-sepia/20 transition">
            <svg className="w-7 h-7 text-sepia" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h3 className="text-lg font-medium text-ink mb-1">Type</h3>
          <p className="text-sm text-warmgray">
            Write at your own pace. Perfect if you prefer to think before you answer.
          </p>
        </button>
      </div>

      <p className="text-xs text-warmgray/60">
        You can always switch between voice and text while writing your memoir
      </p>
    </div>
  )
}
