/** Mobile view of the monorepo's canonical chapter definitions. */
import { chapters as sharedChapters } from '@easy-memoir/shared/chapters';

export interface Question {
  id: string;
  question: string;
  prompt: string;
  aiHint: string;
}

export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  optional?: boolean;
  questions: Question[];
}

export const chapters: Chapter[] = sharedChapters;

export function getChapterById(id: string): Chapter | undefined {
  return chapters.find(chapter => chapter.id === id);
}

export function getTotalQuestions(): number {
  return chapters.reduce((total, chapter) => total + chapter.questions.length, 0);
}
