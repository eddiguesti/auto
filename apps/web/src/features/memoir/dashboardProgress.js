/** Bound server counts to the chapter catalogue so stale or unknown keys cannot inflate progress. */
export function getDashboardProgress(chapters, progress = {}) {
  const chapterProgress = chapters.map(chapter => {
    const value = Number(progress[chapter.id])
    const answered = Number.isFinite(value)
      ? Math.min(chapter.questions.length, Math.max(0, Math.floor(value)))
      : 0
    return { ...chapter, answered, complete: answered === chapter.questions.length }
  })
  const totalQuestions = chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0)
  const totalAnswered = chapterProgress.reduce((sum, chapter) => sum + chapter.answered, 0)
  return {
    chapterProgress,
    totalQuestions,
    totalAnswered,
    totalProgress: totalQuestions ? Math.round((totalAnswered / totalQuestions) * 100) : 0,
    completedChapters: chapterProgress.filter(chapter => chapter.complete).length,
    nextChapter: chapterProgress.find(chapter => !chapter.complete) || null
  }
}
