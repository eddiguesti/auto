import { IconMicrophone, IconFileText } from '@tabler/icons-react'
import { Badge } from '../ui'

export default function PreferenceSelector({ onSelect }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-display text-ink mb-2">
        How would you like to tell your story?
      </h2>
      <p className="text-sepia-600 text-base mb-8">
        Choose your preferred way to share your memories
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Voice Option */}
        <button
          type="button"
          onClick={() => onSelect('voice')}
          className="group relative p-6 bg-surface rounded-2xl border border-sepia-200 hover:border-bronze-400 hover:ring-4 hover:ring-bronze-500/10 text-left transition-all duration-200 active:scale-[0.98]"
        >
          {/* Recommended badge */}
          <Badge variant="bronze" className="absolute -top-3 left-4">
            Recommended
          </Badge>

          <div className="w-11 h-11 mb-4 rounded-xl bg-bronze-100 text-bronze-700 flex items-center justify-center">
            <IconMicrophone size={24} stroke={1.5} />
          </div>

          <h3 className="text-lg font-medium text-ink mb-1">Talk</h3>
          <p className="text-sm text-sepia-600">
            Have a conversation with Clio. Just speak naturally - like chatting with a friend.
          </p>
        </button>

        {/* Type Option */}
        <button
          type="button"
          onClick={() => onSelect('type')}
          className="group p-6 bg-surface rounded-2xl border border-sepia-200 hover:border-bronze-400 hover:ring-4 hover:ring-bronze-500/10 text-left transition-all duration-200 active:scale-[0.98]"
        >
          <div className="w-11 h-11 mb-4 rounded-xl bg-sepia-100 text-sepia-600 flex items-center justify-center">
            <IconFileText size={24} stroke={1.5} />
          </div>

          <h3 className="text-lg font-medium text-ink mb-1">Type</h3>
          <p className="text-sm text-sepia-600">
            Write at your own pace. Perfect if you prefer to think before you answer.
          </p>
        </button>
      </div>

      <p className="text-sm text-sepia-500">
        You can always switch between voice and text while writing your memoir
      </p>
    </div>
  )
}
