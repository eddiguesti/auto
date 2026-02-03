// /life-story/server/db/seeds/achievements.js

export const achievementDefinitions = [
  // STREAK ACHIEVEMENTS
  { key: 'streak_3', type: 'streak', name: 'Getting Started', description: '3 days in a row', icon: 'flame', threshold: 3 },
  { key: 'streak_7', type: 'streak', name: 'One Week Wonder', description: '7 days in a row', icon: 'flame', threshold: 7 },
  { key: 'streak_14', type: 'streak', name: 'Fortnight of Memories', description: '14 days in a row', icon: 'flame', threshold: 14 },
  { key: 'streak_30', type: 'streak', name: 'Month of Memories', description: '30 days in a row', icon: 'flame', threshold: 30 },
  { key: 'streak_60', type: 'streak', name: 'Legacy Builder', description: '60 days in a row', icon: 'flame', threshold: 60 },
  { key: 'streak_100', type: 'streak', name: 'Century of Stories', description: '100 days in a row', icon: 'flame', threshold: 100 },
  { key: 'streak_365', type: 'streak', name: 'Year of Your Life', description: '365 days in a row', icon: 'flame', threshold: 365 },

  // MEMORY COUNT ACHIEVEMENTS
  { key: 'memories_1', type: 'milestone', name: 'First Memory', description: 'Your journey begins', icon: 'bookmark', threshold: 1 },
  { key: 'memories_10', type: 'milestone', name: 'Getting Warmed Up', description: '10 memories captured', icon: 'bookmark', threshold: 10 },
  { key: 'memories_25', type: 'milestone', name: 'Story Collector', description: '25 memories captured', icon: 'bookmark', threshold: 25 },
  { key: 'memories_50', type: 'milestone', name: 'Memory Keeper', description: '50 memories captured', icon: 'bookmark', threshold: 50 },
  { key: 'memories_75', type: 'milestone', name: 'Almost There', description: '75 memories captured', icon: 'bookmark', threshold: 75 },
  { key: 'memories_100', type: 'milestone', name: 'Century of Memories', description: '100 memories captured', icon: 'crown', threshold: 100 },

  // CHAPTER ACHIEVEMENTS
  { key: 'chapter_first', type: 'chapter', name: 'Chapter Complete', description: 'Finished your first chapter', icon: 'book', threshold: 1 },
  { key: 'chapter_half', type: 'chapter', name: 'Halfway There', description: 'Completed 5 chapters', icon: 'book', threshold: 5 },
  { key: 'chapter_all', type: 'chapter', name: 'The Whole Story', description: 'Completed all chapters', icon: 'book-open', threshold: 10 },

  // COLLECTION ACHIEVEMENTS
  { key: 'collection_first', type: 'collection', name: 'Collector', description: 'Completed your first collection', icon: 'layers', threshold: 1 },
  { key: 'collection_half', type: 'collection', name: 'Avid Collector', description: 'Completed 4 collections', icon: 'layers', threshold: 4 },
  { key: 'collection_all', type: 'collection', name: 'Master Collector', description: 'Completed all collections', icon: 'award', threshold: 8 },

  // SPECIAL ACHIEVEMENTS
  { key: 'voice_first', type: 'special', name: 'Finding Your Voice', description: 'Recorded your first voice memory', icon: 'mic' },
  { key: 'photo_first', type: 'special', name: 'Picture Perfect', description: 'Added your first photo', icon: 'image' },
  { key: 'family_joined', type: 'special', name: 'Family Affair', description: 'A family member joined your circle', icon: 'users' },
  { key: 'family_prompt', type: 'special', name: 'Family Connection', description: 'Answered a prompt from family', icon: 'message-circle' },
  { key: 'style_applied', type: 'special', name: 'Style Setter', description: 'Applied a writing style to your memoir', icon: 'edit-3' },
  { key: 'book_preview', type: 'special', name: 'Sneak Peek', description: 'Previewed your finished book', icon: 'eye' },
  { key: 'book_ordered', type: 'special', name: 'Published Author', description: 'Ordered your printed book', icon: 'package' },

  // PEOPLE ACHIEVEMENTS
  { key: 'people_5', type: 'people', name: 'Small Circle', description: 'Mentioned 5 people in your stories', icon: 'user', threshold: 5 },
  { key: 'people_15', type: 'people', name: 'Social Butterfly', description: 'Mentioned 15 people in your stories', icon: 'users', threshold: 15 },
  { key: 'people_30', type: 'people', name: 'Life Well Connected', description: 'Mentioned 30 people in your stories', icon: 'users', threshold: 30 },

  // PLACE ACHIEVEMENTS
  { key: 'places_5', type: 'places', name: 'Local Explorer', description: 'Described 5 different places', icon: 'map-pin', threshold: 5 },
  { key: 'places_15', type: 'places', name: 'World Traveler', description: 'Described 15 different places', icon: 'map', threshold: 15 },

  // TIME ACHIEVEMENTS
  { key: 'decades_3', type: 'time', name: 'Across the Decades', description: 'Shared memories from 3 different decades', icon: 'clock', threshold: 3 },
  { key: 'decades_5', type: 'time', name: 'Half Century of Memories', description: 'Shared memories from 5 different decades', icon: 'clock', threshold: 5 }
];

// Export for use in achievement checking logic
export function getAchievementDefinition(key) {
  return achievementDefinitions.find(a => a.key === key);
}

export function getAchievementsForType(type) {
  return achievementDefinitions.filter(a => a.type === type);
}
