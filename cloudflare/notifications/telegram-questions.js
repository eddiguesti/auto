import { chapters } from '../../apps/web/src/data/chapters.js'
const ordered = [
  ...chapters.filter(chapter => chapter.id === 'earliest-memories'),
  ...chapters.filter(chapter => chapter.id !== 'earliest-memories')
]
export const telegramQuestions = ordered.flatMap(chapter =>
  chapter.questions.map(question => ({
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    questionId: question.id,
    text: question.question,
    hint: question.prompt || ''
  }))
)
export const telegramQuestionMap = new Map(
  telegramQuestions.map(question => [`${question.chapterId}:${question.questionId}`, question])
)
