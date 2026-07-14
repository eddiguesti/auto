export interface Question {
  id: string
  question: string
  prompt: string
  aiHint: string
}

export interface Chapter {
  id: string
  title: string
  subtitle: string
  icon: string
  color: string
  optional?: boolean
  questions: Question[]
}

export const chapters: Chapter[]
export function getChapterById(id: string): Chapter | undefined
export function getTotalQuestions(): number
