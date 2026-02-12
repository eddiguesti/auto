/**
 * Shared chapter definitions used across server routes.
 * The client has a more detailed version with questions - this is
 * the minimal version needed for server-side operations like
 * export and audiobook generation.
 */

export const chapters = [
  { id: 'heritage-roots', title: 'Heritage & Roots', subtitle: 'Where Your Story Begins' },
  { id: 'earliest-memories', title: 'Earliest Memories', subtitle: 'Ages 0-5' },
  { id: 'childhood', title: 'Childhood', subtitle: 'Ages 6-12' },
  { id: 'school-days', title: 'School Days', subtitle: 'Education Years' },
  { id: 'teenage-years', title: 'Teenage Years', subtitle: 'Coming of Age' },
  { id: 'key-people', title: 'Key People', subtitle: 'Those Who Shaped You' },
  { id: 'young-adulthood', title: 'Young Adulthood', subtitle: 'Starting Out' },
  { id: 'love-relationships', title: 'Love & Relationships', subtitle: 'Matters of the Heart' },
  { id: 'family-career', title: 'Family & Career', subtitle: 'Building a Life' },
  { id: 'home-places', title: 'Home & Places', subtitle: 'Where Life Happened' },
  {
    id: 'traditions-celebrations',
    title: 'Traditions & Celebrations',
    subtitle: 'The Rituals That Bind Us'
  },
  { id: 'world-around-you', title: 'The World Around You', subtitle: 'History & Culture' },
  { id: 'travel-adventure', title: 'Travel & Adventure', subtitle: 'Exploring the World' },
  { id: 'passions-beliefs', title: 'Passions & Beliefs', subtitle: 'What Matters to You' },
  {
    id: 'challenges-resilience',
    title: 'Challenges & Resilience',
    subtitle: 'What Made You Stronger'
  },
  { id: 'later-life', title: 'Later Life', subtitle: 'The Golden Years' },
  { id: 'wisdom-reflections', title: 'Wisdom & Reflections', subtitle: 'Looking Back' },
  { id: 'letters-loved-ones', title: 'Letters to Loved Ones', subtitle: 'Words From the Heart' }
]

export default chapters
