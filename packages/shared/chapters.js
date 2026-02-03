/**
 * Shared chapter definitions used across server routes.
 * The client has a more detailed version with questions - this is
 * the minimal version needed for server-side operations like
 * export and audiobook generation.
 */

export const chapters = [
  { id: 'earliest-memories', title: 'Earliest Memories', subtitle: 'Ages 0-5' },
  { id: 'childhood', title: 'Childhood', subtitle: 'Ages 6-12' },
  { id: 'school-days', title: 'School Days', subtitle: 'Education Years' },
  { id: 'teenage-years', title: 'Teenage Years', subtitle: 'Coming of Age' },
  { id: 'key-people', title: 'Key People', subtitle: 'Those Who Shaped You' },
  { id: 'young-adulthood', title: 'Young Adulthood', subtitle: 'Starting Out' },
  { id: 'family-career', title: 'Family & Career', subtitle: 'Building a Life' },
  { id: 'world-around-you', title: 'The World Around You', subtitle: 'History & Culture' },
  { id: 'passions-beliefs', title: 'Passions & Beliefs', subtitle: 'What Matters to You' },
  { id: 'wisdom-reflections', title: 'Wisdom & Reflections', subtitle: 'Looking Back' }
]

export default chapters
