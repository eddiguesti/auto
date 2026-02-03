// /life-story/client/src/components/PromptCompletionCelebration.jsx

import { useEffect, useState } from 'react';

export default function PromptCompletionCelebration({ data, onComplete }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Animate through stages
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1500),
      setTimeout(() => setStage(3), 2500),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const { streak, stats, newAchievements, celebration } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-parchment flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        {/* Main Celebration */}
        <div className={`transition-all duration-500 ${stage >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <span className="text-6xl block mb-4">✨</span>
          <h1 className="font-display text-3xl text-ink mb-2">
            Memory Preserved
          </h1>
          <p className="text-sepia">
            {celebration?.message || 'Forever captured in your story.'}
          </p>
        </div>

        {/* Streak Info */}
        {streak && (
          <div className={`mt-8 transition-all duration-500 delay-300 ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm">
              <span className="text-3xl">🔥</span>
              <div className="text-left">
                <p className="font-display text-xl text-ink">{streak.current} day streak</p>
                {streak.isNewRecord && (
                  <p className="text-xs text-amber-600 font-medium">New personal best!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className={`mt-6 transition-all duration-500 delay-500 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex justify-center gap-4 text-sm text-sepia">
              {stats.wordCount && <span>📝 {stats.wordCount} words</span>}
              {stats.timeToComplete && <span>⏱️ {Math.round(stats.timeToComplete / 60)} min</span>}
            </div>
          </div>
        )}

        {/* New Achievements */}
        {newAchievements && newAchievements.length > 0 && (
          <div className={`mt-8 transition-all duration-500 delay-700 ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-gradient-to-r from-amber-100 to-stone-100 rounded-xl p-4">
              <p className="text-sm font-medium text-ink mb-2">🎉 Achievement Unlocked!</p>
              {newAchievements.map((achievement, i) => (
                <div key={i} className="mt-2">
                  <p className="font-display text-lg text-ink">{achievement.achievement_name}</p>
                  <p className="text-sm text-sepia">{achievement.achievement_description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className={`mt-10 transition-all duration-500 delay-1000 ${stage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-sepia text-cream rounded-lg hover:bg-sepia/90 transition-colors shadow-md"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
