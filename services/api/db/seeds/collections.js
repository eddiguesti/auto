// /life-story/server/db/seeds/collections.js

export const collectionsData = [
  {
    collection_key: 'family',
    collection_name: 'Family Portrait',
    collection_description: 'The people who shaped you',
    collection_icon: 'users',
    required_items: 5,
    reward_artwork_prompt: 'A warm, nostalgic family portrait in watercolor style, showing multiple generations gathered together, soft golden lighting, heirloom quality',
    display_order: 1
  },
  {
    collection_key: 'places',
    collection_name: 'Places of the Heart',
    collection_description: 'Where your memories live',
    collection_icon: 'home',
    required_items: 5,
    reward_artwork_prompt: 'A dreamy collage of meaningful places - childhood home, school, first apartment - rendered in soft impressionist style with warm nostalgia',
    display_order: 2
  },
  {
    collection_key: 'traditions',
    collection_name: 'Family Traditions',
    collection_description: 'The rituals that made you unique',
    collection_icon: 'gift',
    required_items: 5,
    reward_artwork_prompt: 'A cozy holiday scene capturing family traditions - decorations, special meals, gathered loved ones - in vintage illustration style',
    display_order: 3
  },
  {
    collection_key: 'firsts',
    collection_name: 'Book of Firsts',
    collection_description: 'First times that changed everything',
    collection_icon: 'star',
    required_items: 6,
    reward_artwork_prompt: 'A magical storybook page showing milestone moments - first steps, first day of school, first love - in whimsical illustrated style',
    display_order: 4
  },
  {
    collection_key: 'love',
    collection_name: 'Love Stories',
    collection_description: 'Romance and relationships',
    collection_icon: 'heart',
    required_items: 5,
    reward_artwork_prompt: 'A romantic scene capturing enduring love - dancing, holding hands through the years - in soft watercolor with rose gold tones',
    display_order: 5
  },
  {
    collection_key: 'adventures',
    collection_name: 'Adventures',
    collection_description: 'Journeys and discoveries',
    collection_icon: 'map',
    required_items: 5,
    reward_artwork_prompt: 'A vintage travel collage with maps, postcards, and scenic destinations, rendered in retro travel poster style',
    display_order: 6
  },
  {
    collection_key: 'work',
    collection_name: 'Working Life',
    collection_description: 'Career and accomplishments',
    collection_icon: 'briefcase',
    required_items: 5,
    reward_artwork_prompt: 'A dignified scene celebrating a life of work and achievement, vintage office and workplace elements, warm professional tones',
    display_order: 7
  },
  {
    collection_key: 'wisdom',
    collection_name: 'Wisdom Collection',
    collection_description: 'Lessons learned along the way',
    collection_icon: 'book-open',
    required_items: 5,
    reward_artwork_prompt: 'An elder sharing wisdom with younger generations, warm library setting with golden light, timeless and dignified',
    display_order: 8
  }
];

export const collectionItemsData = [
  // FAMILY COLLECTION
  { collection_key: 'family', item_key: 'mother', item_name: "Mother's Story", completion_type: 'question', completion_criteria: { chapter_id: 'key-people', question_id: 'mother' }, display_order: 1 },
  { collection_key: 'family', item_key: 'father', item_name: "Father's Story", completion_type: 'question', completion_criteria: { chapter_id: 'key-people', question_id: 'father' }, display_order: 2 },
  { collection_key: 'family', item_key: 'siblings', item_name: 'Brothers & Sisters', completion_type: 'question', completion_criteria: { chapter_id: 'key-people', question_id: 'siblings' }, display_order: 3 },
  { collection_key: 'family', item_key: 'grandparents', item_name: 'Grandparents', completion_type: 'question', completion_criteria: { chapter_id: 'key-people', question_id: 'grandparents' }, display_order: 4 },
  { collection_key: 'family', item_key: 'extended', item_name: 'Extended Family', completion_type: 'question', completion_criteria: { chapter_id: 'key-people', question_id: 'extended-family' }, display_order: 5 },

  // PLACES COLLECTION
  { collection_key: 'places', item_key: 'childhood_home', item_name: 'Childhood Home', completion_type: 'question', completion_criteria: { chapter_id: 'earliest-memories', question_id: 'childhood-home' }, display_order: 1 },
  { collection_key: 'places', item_key: 'childhood_bedroom', item_name: 'Childhood Bedroom', completion_type: 'question', completion_criteria: { chapter_id: 'earliest-memories', question_id: 'childhood-bedroom' }, display_order: 2 },
  { collection_key: 'places', item_key: 'school', item_name: 'School Building', completion_type: 'question', completion_criteria: { chapter_id: 'school-days', question_id: 'school-building' }, display_order: 3 },
  { collection_key: 'places', item_key: 'first_home', item_name: 'First Home Alone', completion_type: 'question', completion_criteria: { chapter_id: 'young-adulthood', question_id: 'young-adult-living' }, display_order: 4 },
  { collection_key: 'places', item_key: 'family_home', item_name: 'Family Home', completion_type: 'question', completion_criteria: { chapter_id: 'family-career', question_id: 'family-home' }, display_order: 5 },

  // TRADITIONS COLLECTION
  { collection_key: 'traditions', item_key: 'christmas', item_name: 'Holiday Memories', completion_type: 'question', completion_criteria: { chapter_id: 'childhood', question_id: 'childhood-christmas' }, display_order: 1 },
  { collection_key: 'traditions', item_key: 'family_traditions', item_name: 'Family Rituals', completion_type: 'question', completion_criteria: { chapter_id: 'childhood', question_id: 'family-traditions' }, display_order: 2 },
  { collection_key: 'traditions', item_key: 'sunday_dinners', item_name: 'Special Meals', completion_type: 'question', completion_criteria: { chapter_id: 'earliest-memories', question_id: 'early-food' }, display_order: 3 },
  { collection_key: 'traditions', item_key: 'created_traditions', item_name: 'Traditions You Created', completion_type: 'question', completion_criteria: { chapter_id: 'family-career', question_id: 'family-traditions-created' }, display_order: 4 },
  { collection_key: 'traditions', item_key: 'family_holidays', item_name: 'Family Holidays', completion_type: 'question', completion_criteria: { chapter_id: 'family-career', question_id: 'family-holidays' }, display_order: 5 },

  // FIRSTS COLLECTION
  { collection_key: 'firsts', item_key: 'first_memory', item_name: 'First Memory', completion_type: 'question', completion_criteria: { chapter_id: 'earliest-memories', question_id: 'first-memory' }, display_order: 1 },
  { collection_key: 'firsts', item_key: 'first_day_school', item_name: 'First Day of School', completion_type: 'question', completion_criteria: { chapter_id: 'school-days', question_id: 'first-day-school' }, display_order: 2 },
  { collection_key: 'firsts', item_key: 'first_romance', item_name: 'First Romance', completion_type: 'question', completion_criteria: { chapter_id: 'teenage-years', question_id: 'first-romance' }, display_order: 3 },
  { collection_key: 'firsts', item_key: 'first_job', item_name: 'First Real Job', completion_type: 'question', completion_criteria: { chapter_id: 'young-adulthood', question_id: 'first-job' }, display_order: 4 },
  { collection_key: 'firsts', item_key: 'first_home_together', item_name: 'First Home Together', completion_type: 'question', completion_criteria: { chapter_id: 'young-adulthood', question_id: 'first-home-together' }, display_order: 5 },
  { collection_key: 'firsts', item_key: 'becoming_parent', item_name: 'Becoming a Parent', completion_type: 'question', completion_criteria: { chapter_id: 'family-career', question_id: 'becoming-parent' }, display_order: 6 },

  // LOVE COLLECTION
  { collection_key: 'love', item_key: 'first_crush', item_name: 'First Crush', completion_type: 'question', completion_criteria: { chapter_id: 'teenage-years', question_id: 'first-romance' }, display_order: 1 },
  { collection_key: 'love', item_key: 'meeting_partner', item_name: 'Meeting Your Partner', completion_type: 'question', completion_criteria: { chapter_id: 'young-adulthood', question_id: 'meeting-partner' }, display_order: 2 },
  { collection_key: 'love', item_key: 'wedding_day', item_name: 'Wedding Day', completion_type: 'question', completion_criteria: { chapter_id: 'young-adulthood', question_id: 'wedding-day' }, display_order: 3 },
  { collection_key: 'love', item_key: 'marriage_lessons', item_name: 'Marriage Lessons', completion_type: 'question', completion_criteria: { chapter_id: 'wisdom-reflections', question_id: 'marriage-lessons' }, display_order: 4 },
  { collection_key: 'love', item_key: 'lifelong_friend', item_name: 'Lifelong Friend', completion_type: 'question', completion_criteria: { chapter_id: 'key-people', question_id: 'lifelong-friend' }, display_order: 5 },

  // ADVENTURES COLLECTION
  { collection_key: 'adventures', item_key: 'childhood_adventure', item_name: 'Childhood Adventure', completion_type: 'question', completion_criteria: { chapter_id: 'childhood', question_id: 'childhood-adventure' }, display_order: 1 },
  { collection_key: 'adventures', item_key: 'memorable_place', item_name: 'Memorable Place', completion_type: 'question', completion_criteria: { chapter_id: 'passions-beliefs', question_id: 'travel' }, display_order: 2 },
  { collection_key: 'adventures', item_key: 'mischief', item_name: 'Getting Into Mischief', completion_type: 'question', completion_criteria: { chapter_id: 'childhood', question_id: 'mischief' }, display_order: 3 },
  { collection_key: 'adventures', item_key: 'rebellion', item_name: 'Teenage Rebellion', completion_type: 'question', completion_criteria: { chapter_id: 'teenage-years', question_id: 'teen-rebellion' }, display_order: 4 },
  { collection_key: 'adventures', item_key: 'leaving_home', item_name: 'Leaving Home', completion_type: 'question', completion_criteria: { chapter_id: 'young-adulthood', question_id: 'leaving-home' }, display_order: 5 },

  // WORK COLLECTION
  { collection_key: 'work', item_key: 'teen_job', item_name: 'First Job', completion_type: 'question', completion_criteria: { chapter_id: 'teenage-years', question_id: 'teen-job' }, display_order: 1 },
  { collection_key: 'work', item_key: 'career_path', item_name: 'Career Path', completion_type: 'question', completion_criteria: { chapter_id: 'young-adulthood', question_id: 'career-path' }, display_order: 2 },
  { collection_key: 'work', item_key: 'proudest_work', item_name: 'Proudest Work', completion_type: 'question', completion_criteria: { chapter_id: 'family-career', question_id: 'proudest-work' }, display_order: 3 },
  { collection_key: 'work', item_key: 'career_lessons', item_name: 'Career Lessons', completion_type: 'question', completion_criteria: { chapter_id: 'family-career', question_id: 'career-lessons' }, display_order: 4 },
  { collection_key: 'work', item_key: 'future_dreams', item_name: 'Childhood Dreams', completion_type: 'question', completion_criteria: { chapter_id: 'school-days', question_id: 'future-dreams' }, display_order: 5 },

  // WISDOM COLLECTION
  { collection_key: 'wisdom', item_key: 'younger_self', item_name: 'Advice to Younger Self', completion_type: 'question', completion_criteria: { chapter_id: 'wisdom-reflections', question_id: 'wisdom-for-younger-self' }, display_order: 1 },
  { collection_key: 'wisdom', item_key: 'proudest_moments', item_name: 'Proudest Moments', completion_type: 'question', completion_criteria: { chapter_id: 'wisdom-reflections', question_id: 'proudest-moments' }, display_order: 2 },
  { collection_key: 'wisdom', item_key: 'values', item_name: 'Guiding Values', completion_type: 'question', completion_criteria: { chapter_id: 'passions-beliefs', question_id: 'values' }, display_order: 3 },
  { collection_key: 'wisdom', item_key: 'grandchildren', item_name: 'Message to Grandchildren', completion_type: 'question', completion_criteria: { chapter_id: 'wisdom-reflections', question_id: 'message-to-grandchildren' }, display_order: 4 },
  { collection_key: 'wisdom', item_key: 'gratitude', item_name: 'Gratitude', completion_type: 'question', completion_criteria: { chapter_id: 'wisdom-reflections', question_id: 'gratitude' }, display_order: 5 }
];

export async function seedCollections(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert collections
    for (const collection of collectionsData) {
      await client.query(`
        INSERT INTO collections (collection_key, collection_name, collection_description, collection_icon, required_items, reward_artwork_prompt, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (collection_key) DO UPDATE SET
          collection_name = EXCLUDED.collection_name,
          collection_description = EXCLUDED.collection_description,
          collection_icon = EXCLUDED.collection_icon,
          required_items = EXCLUDED.required_items,
          reward_artwork_prompt = EXCLUDED.reward_artwork_prompt,
          display_order = EXCLUDED.display_order
      `, [
        collection.collection_key,
        collection.collection_name,
        collection.collection_description,
        collection.collection_icon,
        collection.required_items,
        collection.reward_artwork_prompt,
        collection.display_order
      ]);
    }

    // Insert collection items
    for (const item of collectionItemsData) {
      const collectionResult = await client.query(
        'SELECT id FROM collections WHERE collection_key = $1',
        [item.collection_key]
      );

      if (collectionResult.rows.length > 0) {
        const collectionId = collectionResult.rows[0].id;
        await client.query(`
          INSERT INTO collection_items (collection_id, item_key, item_name, completion_type, completion_criteria, display_order)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (collection_id, item_key) DO UPDATE SET
            item_name = EXCLUDED.item_name,
            completion_type = EXCLUDED.completion_type,
            completion_criteria = EXCLUDED.completion_criteria,
            display_order = EXCLUDED.display_order
        `, [
          collectionId,
          item.item_key,
          item.item_name,
          item.completion_type,
          JSON.stringify(item.completion_criteria),
          item.display_order
        ]);
      }
    }

    await client.query('COMMIT');
    console.log('Collections seeded successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding collections:', err);
    throw err;
  } finally {
    client.release();
  }
}
