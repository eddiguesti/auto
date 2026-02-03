// /life-story/server/db/seeds/prompts.js

export const promptLibrary = [
  // ============================================
  // QUICK MEMORIES - SENSORY (1-2 minutes)
  // ============================================
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What smell instantly takes you back to childhood?",
    prompt_hint: "Think about kitchens, gardens, seasons, or specific people.",
    linked_chapter_id: 'earliest-memories',
    linked_question_id: 'early-smells-sounds',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What song makes you think of being a teenager?",
    prompt_hint: "Close your eyes and you're back there. What's playing?",
    linked_chapter_id: 'teenage-years',
    linked_question_id: 'teen-music-culture',
    era_specific: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What taste reminds you of your grandmother?",
    prompt_hint: "A dish, a sweet, something from her kitchen.",
    linked_chapter_id: 'key-people',
    linked_question_id: 'grandparents',
    requires_person_mention: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What sound do you miss from your childhood home?",
    prompt_hint: "A clock, a voice, a creaky floorboard, birdsong...",
    linked_chapter_id: 'earliest-memories',
    linked_question_id: 'early-smells-sounds',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What texture reminds you of comfort?",
    prompt_hint: "A blanket, a hand, a favourite chair...",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What did your school smell like?",
    prompt_hint: "The corridors, the canteen, the gym, the library...",
    linked_chapter_id: 'school-days',
    linked_question_id: 'school-building',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What weather makes you feel most nostalgic?",
    prompt_hint: "Rain on windows, summer heat, crisp autumn mornings...",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What sound did your mother make when she was busy?",
    prompt_hint: "Humming, sighing, calling your name, pots clanging...",
    linked_chapter_id: 'key-people',
    linked_question_id: 'mother',
    requires_person_mention: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What did Saturday mornings sound like when you were young?",
    prompt_hint: "Radio, TV, siblings, parents, the neighbourhood...",
    linked_chapter_id: 'childhood',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'sensory',
    prompt_text: "What smell reminds you of your father?",
    prompt_hint: "Aftershave, tobacco, workshop, the car, his clothes...",
    linked_chapter_id: 'key-people',
    linked_question_id: 'father',
    requires_person_mention: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },

  // ============================================
  // QUICK MEMORIES - SIMPLE FACTS (1-2 minutes)
  // ============================================
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was the first album or record you ever bought?",
    prompt_hint: "Where did you buy it? Do you still have it?",
    linked_chapter_id: 'teenage-years',
    linked_question_id: 'teen-music-culture',
    era_specific: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was your favourite TV show as a child?",
    prompt_hint: "What time was it on? Who did you watch it with?",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'cultural-entertainment',
    era_specific: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was your first pet's name?",
    prompt_hint: "How did you choose the name? What happened to them?",
    linked_chapter_id: 'childhood',
    linked_question_id: 'childhood-pet',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was the first film you saw at the cinema?",
    prompt_hint: "Who took you? What do you remember about the experience?",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'cultural-entertainment',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was your childhood phone number?",
    prompt_hint: "You might still remember it! What was on the phone table?",
    linked_chapter_id: 'childhood',
    linked_question_id: 'childhood-home-address',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was your first car? (Or your family's car when you were young?)",
    prompt_hint: "The colour, the model, the sound of the engine...",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'technology-changes',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was your address as a child?",
    prompt_hint: "The street, the number, the postcode you had to memorise...",
    linked_chapter_id: 'childhood',
    linked_question_id: 'childhood-home-address',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was your favourite sweet or chocolate as a child?",
    prompt_hint: "From the corner shop, from grandparents, on special occasions...",
    linked_chapter_id: 'childhood',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What was your first job? How much did it pay?",
    prompt_hint: "Paper round, Saturday job, helping out somewhere...",
    linked_chapter_id: 'teenage-years',
    linked_question_id: 'teen-job',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'facts',
    prompt_text: "What did a pint of milk cost when you were young?",
    prompt_hint: "Or bread, or a bus fare, or pocket money amount...",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'prices-then-now',
    era_specific: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },

  // ============================================
  // QUICK MEMORIES - EITHER/OR (1-2 minutes)
  // ============================================
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "Beach holiday or countryside getaway? Why?",
    prompt_hint: "What memories do you have of each?",
    linked_chapter_id: 'passions-beliefs',
    linked_question_id: 'travel',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "Early bird or night owl? Has it always been that way?",
    prompt_hint: "Think about different stages of your life.",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "Tea or coffee? When did that preference start?",
    prompt_hint: "Is there a story behind it?",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "Dogs or cats? Is there a story there?",
    prompt_hint: "Think about pets you've had or wanted.",
    linked_chapter_id: 'childhood',
    linked_question_id: 'childhood-pet',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "City life or country life? What have you experienced of both?",
    prompt_hint: "Where have you lived? Where did you feel most at home?",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "Radio or television? What do you remember from each?",
    prompt_hint: "Different eras, different programmes, different habits.",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'cultural-entertainment',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "Mountains or sea? Which calls to you more?",
    prompt_hint: "Is there a holiday or trip that made you choose?",
    linked_chapter_id: 'passions-beliefs',
    linked_question_id: 'travel',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'either_or',
    prompt_text: "Handwritten letters or phone calls? How did you stay in touch?",
    prompt_hint: "Think about long-distance relationships before the internet.",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'technology-changes',
    estimated_minutes: 2,
    difficulty_level: 1
  },

  // ============================================
  // QUICK MEMORIES - FILL IN BLANK (1-2 minutes)
  // ============================================
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "The song that defined my teenage years was...",
    prompt_hint: "What memories does it bring back?",
    linked_chapter_id: 'teenage-years',
    linked_question_id: 'teen-music-culture',
    era_specific: true,
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "My favourite hiding spot as a child was...",
    prompt_hint: "In the house, in the garden, at a relative's place...",
    linked_chapter_id: 'childhood',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "The teacher I'll never forget is...",
    prompt_hint: "For good reasons or bad - what made them memorable?",
    linked_chapter_id: 'school-days',
    linked_question_id: 'favourite-teacher',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "The best meal I ever ate was...",
    prompt_hint: "Who made it? Where were you? What made it special?",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "The place I felt most at home was...",
    prompt_hint: "It might not be where you actually lived.",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "The person who made me laugh the most was...",
    prompt_hint: "What would they do or say?",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "My favourite thing about Sundays was...",
    prompt_hint: "As a child, as a young adult, now...",
    linked_chapter_id: 'childhood',
    linked_question_id: 'family-traditions',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "The best present I ever received was...",
    prompt_hint: "Who gave it to you? What made it special?",
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "When I was little, I was afraid of...",
    prompt_hint: "Did you overcome it? How?",
    linked_chapter_id: 'childhood',
    linked_question_id: 'fears-excitements',
    estimated_minutes: 2,
    difficulty_level: 1
  },
  {
    prompt_type: 'quick',
    prompt_category: 'fill_blank',
    prompt_text: "The words my parents said most often were...",
    prompt_hint: "Warnings, encouragements, catchphrases...",
    linked_chapter_id: 'key-people',
    estimated_minutes: 2,
    difficulty_level: 1
  },

  // ============================================
  // STORY MEMORIES - MICRO STORIES (5-10 minutes)
  // ============================================
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Tell me about a meal you'll never forget.",
    prompt_hint: "The setting, the food, the people, why it mattered.",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Describe a birthday that stands out in your memory.",
    prompt_hint: "It doesn't have to be a good memory - just a vivid one.",
    linked_chapter_id: 'childhood',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "What's the funniest thing that happened at school?",
    prompt_hint: "A prank, a mishap, something that still makes you smile.",
    linked_chapter_id: 'school-days',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Tell me about a time you got lost.",
    prompt_hint: "As a child, while travelling, in a new place...",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Describe a time you were really scared.",
    prompt_hint: "What happened? Who helped? How did it resolve?",
    linked_chapter_id: 'childhood',
    linked_question_id: 'fears-excitements',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "What's a small act of kindness you've never forgotten?",
    prompt_hint: "From a stranger, a friend, a family member...",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Tell me about a holiday that didn't go as planned.",
    prompt_hint: "Travel disasters often make the best stories.",
    linked_chapter_id: 'family-career',
    linked_question_id: 'family-holidays',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Describe a time you surprised yourself.",
    prompt_hint: "Did something you didn't think you could do.",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Tell me about a time you broke the rules.",
    prompt_hint: "At home, at school, at work... did you get caught?",
    linked_chapter_id: 'teenage-years',
    linked_question_id: 'teen-rebellion',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "What's a moment of pure luck you've experienced?",
    prompt_hint: "Right place, right time - how did it change things?",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Tell me about a time you had to be brave.",
    prompt_hint: "Standing up for someone, facing a fear, making a difficult choice.",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Describe your first day at a new job.",
    prompt_hint: "The nerves, the people, what you learned.",
    linked_chapter_id: 'young-adulthood',
    linked_question_id: 'first-job',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Tell me about a pet that was part of your family.",
    prompt_hint: "Their personality, their quirks, what they meant to you.",
    linked_chapter_id: 'childhood',
    linked_question_id: 'childhood-pet',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "What's a conversation that changed how you thought about something?",
    prompt_hint: "A piece of advice, an argument, a revelation.",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'micro_story',
    prompt_text: "Tell me about a time you made a new friend.",
    prompt_hint: "How did you meet? What brought you together?",
    linked_chapter_id: 'key-people',
    linked_question_id: 'lifelong-friend',
    estimated_minutes: 7,
    difficulty_level: 2
  },

  // ============================================
  // STORY MEMORIES - PEOPLE SNAPSHOTS (5-10 minutes)
  // ============================================
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "Describe your grandmother in three sentences.",
    prompt_hint: "Capture her essence - what made her her.",
    linked_chapter_id: 'key-people',
    linked_question_id: 'grandparents',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "What did your father's hands look like?",
    prompt_hint: "Working hands, gentle hands, what did they do?",
    linked_chapter_id: 'key-people',
    linked_question_id: 'father',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "What did your mother say most often?",
    prompt_hint: "Her catchphrases, her warnings, her expressions of love.",
    linked_chapter_id: 'key-people',
    linked_question_id: 'mother',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "Describe your best childhood friend.",
    prompt_hint: "What they looked like, how they acted, what you did together.",
    linked_chapter_id: 'childhood',
    linked_question_id: 'best-friend',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "What made your favourite teacher special?",
    prompt_hint: "How they taught, how they made you feel, what you learned.",
    linked_chapter_id: 'school-days',
    linked_question_id: 'favourite-teacher',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "Describe an eccentric relative.",
    prompt_hint: "Every family has one - what made them memorable?",
    linked_chapter_id: 'key-people',
    linked_question_id: 'extended-family',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "What was your grandfather's voice like?",
    prompt_hint: "Deep, gentle, gruff? What stories did he tell?",
    linked_chapter_id: 'key-people',
    linked_question_id: 'grandparents',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "Describe a neighbour from your childhood.",
    prompt_hint: "The one you remember most vividly - friendly or otherwise.",
    linked_chapter_id: 'childhood',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "Who was the funniest person in your family?",
    prompt_hint: "What made them funny? Tell me something they did.",
    linked_chapter_id: 'key-people',
    estimated_minutes: 5,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'people',
    prompt_text: "Describe your sibling in one memory.",
    prompt_hint: "A moment that captures who they are to you.",
    linked_chapter_id: 'key-people',
    linked_question_id: 'siblings',
    estimated_minutes: 5,
    difficulty_level: 2
  },

  // ============================================
  // STORY MEMORIES - PLACE MEMORIES (5-10 minutes)
  // ============================================
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "Walk me through your childhood kitchen.",
    prompt_hint: "The layout, the smells, who was usually there.",
    linked_chapter_id: 'earliest-memories',
    linked_question_id: 'childhood-home',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "Describe the view from your bedroom window as a child.",
    prompt_hint: "What did you see? How did it change with seasons?",
    linked_chapter_id: 'earliest-memories',
    linked_question_id: 'childhood-bedroom',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "What did your school playground look like?",
    prompt_hint: "The equipment, the corners, where different groups gathered.",
    linked_chapter_id: 'school-days',
    linked_question_id: 'school-building',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "Describe the street you grew up on.",
    prompt_hint: "The houses, the neighbours, the sounds, the feel of it.",
    linked_chapter_id: 'childhood',
    linked_question_id: 'childhood-home-address',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "What did your grandparents' house smell like?",
    prompt_hint: "And look like, and feel like when you visited.",
    linked_chapter_id: 'key-people',
    linked_question_id: 'grandparents',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "Describe your favourite room in your childhood home.",
    prompt_hint: "What was in it? What did you do there? How did it feel?",
    linked_chapter_id: 'earliest-memories',
    linked_question_id: 'childhood-home',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "What did your local high street or shops look like?",
    prompt_hint: "The butcher, the baker, the corner shop...",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'neighbourhood-changes',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "Describe a place you went on holiday as a child.",
    prompt_hint: "The journey there, arriving, what you did.",
    linked_chapter_id: 'childhood',
    linked_question_id: 'summer-holidays',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "What was your first flat or home away from family like?",
    prompt_hint: "The excitement, the freedom, the challenges.",
    linked_chapter_id: 'young-adulthood',
    linked_question_id: 'young-adult-living',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'places',
    prompt_text: "Describe the place where you felt most peaceful.",
    prompt_hint: "A garden, a room, a spot in nature, a chair by a window.",
    estimated_minutes: 7,
    difficulty_level: 2
  },

  // ============================================
  // STORY MEMORIES - MOMENT CAPTURES (5-10 minutes)
  // ============================================
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "Describe the moment you first held your child.",
    prompt_hint: "What did you feel? What did you notice? What did you think?",
    linked_chapter_id: 'family-career',
    linked_question_id: 'becoming-parent',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "Tell me about a perfect summer day from your memory.",
    prompt_hint: "Where were you? Who was there? What made it perfect?",
    linked_chapter_id: 'childhood',
    linked_question_id: 'summer-holidays',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "What's a moment of pure joy you remember?",
    prompt_hint: "When everything felt right with the world.",
    linked_chapter_id: 'young-adulthood',
    linked_question_id: 'young-adult-joy',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "Describe falling in love for the first time.",
    prompt_hint: "How it felt, what you noticed, what changed.",
    linked_chapter_id: 'teenage-years',
    linked_question_id: 'first-romance',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "What moment made you feel truly proud?",
    prompt_hint: "An achievement, a choice, standing up for something.",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'proudest-moments',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "Describe a moment when time seemed to stop.",
    prompt_hint: "Good or difficult - when the world held its breath.",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "Tell me about a moment you knew everything would be okay.",
    prompt_hint: "After worry, after difficulty - when relief came.",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "Describe your wedding day (or another important ceremony).",
    prompt_hint: "The nerves, the joy, the small details you remember.",
    linked_chapter_id: 'young-adulthood',
    linked_question_id: 'wedding-day',
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "What's a moment you wish you could go back to?",
    prompt_hint: "Not to change anything - just to experience again.",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'moments',
    prompt_text: "Describe a moment of unexpected beauty.",
    prompt_hint: "A sunset, a gesture, a piece of music, a place...",
    estimated_minutes: 7,
    difficulty_level: 2
  },

  // ============================================
  // DEEP REFLECTIONS - LIFE LESSONS (10-15 minutes)
  // Weekend prompts
  // ============================================
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What do you know now that you wish you knew at 25?",
    prompt_hint: "About work, love, money, happiness, what matters...",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'wisdom-for-younger-self',
    preferred_day_of_week: 0,
    min_streak_days: 7,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What's the best advice you ever received? Did you follow it?",
    prompt_hint: "Who gave it? When? What happened?",
    preferred_day_of_week: 6,
    min_streak_days: 7,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What mistake taught you the most?",
    prompt_hint: "Not the worst mistake - the most instructive one.",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'regrets',
    preferred_day_of_week: 0,
    min_streak_days: 14,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What would you tell your younger self about love?",
    prompt_hint: "The lessons that took years to learn.",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'marriage-lessons',
    preferred_day_of_week: 6,
    min_streak_days: 14,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What have you learned about happiness?",
    prompt_hint: "What brings it, what doesn't, how it's changed.",
    preferred_day_of_week: 0,
    min_streak_days: 7,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What did work teach you about life?",
    prompt_hint: "Beyond the job itself - the deeper lessons.",
    linked_chapter_id: 'family-career',
    linked_question_id: 'career-lessons',
    preferred_day_of_week: 6,
    min_streak_days: 7,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What's a belief you held strongly that changed over time?",
    prompt_hint: "About people, about the world, about yourself.",
    preferred_day_of_week: 0,
    min_streak_days: 14,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'lessons',
    prompt_text: "What do you wish more people understood?",
    prompt_hint: "A truth you've discovered that seems lost on others.",
    preferred_day_of_week: 6,
    min_streak_days: 14,
    estimated_minutes: 12,
    difficulty_level: 3
  },

  // ============================================
  // DEEP REFLECTIONS - RELATIONSHIPS (10-15 minutes)
  // ============================================
  {
    prompt_type: 'deep',
    prompt_category: 'relationships',
    prompt_text: "Who shaped who you became? How?",
    prompt_hint: "The people who influenced you most - for better or worse.",
    linked_chapter_id: 'key-people',
    linked_question_id: 'mentor',
    preferred_day_of_week: 0,
    min_streak_days: 7,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'relationships',
    prompt_text: "What did marriage teach you?",
    prompt_hint: "The surprises, the challenges, the unexpected joys.",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'marriage-lessons',
    preferred_day_of_week: 6,
    min_streak_days: 14,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'relationships',
    prompt_text: "How did becoming a parent change you?",
    prompt_hint: "The ways you grew, the things you learned about yourself.",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'parenting-lessons',
    preferred_day_of_week: 0,
    min_streak_days: 14,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'relationships',
    prompt_text: "Who do you wish you'd thanked?",
    prompt_hint: "Someone whose impact you didn't fully appreciate at the time.",
    preferred_day_of_week: 6,
    min_streak_days: 7,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'relationships',
    prompt_text: "What relationship surprised you most?",
    prompt_hint: "A friendship, a family bond, a love that evolved unexpectedly.",
    preferred_day_of_week: 0,
    min_streak_days: 7,
    estimated_minutes: 12,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'relationships',
    prompt_text: "What do you wish you'd said to someone who's gone?",
    prompt_hint: "The words left unspoken. You can say them now.",
    linked_chapter_id: 'key-people',
    linked_question_id: 'lost-loved-one',
    preferred_day_of_week: 6,
    min_streak_days: 21,
    estimated_minutes: 12,
    difficulty_level: 3
  },

  // ============================================
  // DEEP REFLECTIONS - LEGACY (10-15 minutes)
  // ============================================
  {
    prompt_type: 'deep',
    prompt_category: 'legacy',
    prompt_text: "What do you want your grandchildren to know?",
    prompt_hint: "About you, about life, about the family, about the world.",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'message-to-grandchildren',
    preferred_day_of_week: 0,
    min_streak_days: 21,
    estimated_minutes: 15,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'legacy',
    prompt_text: "How do you want to be remembered?",
    prompt_hint: "When people speak of you, what do you hope they say?",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'how-remembered',
    preferred_day_of_week: 6,
    min_streak_days: 21,
    estimated_minutes: 15,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'legacy',
    prompt_text: "What values did you try to pass on?",
    prompt_hint: "To your children, to others in your life.",
    linked_chapter_id: 'passions-beliefs',
    linked_question_id: 'values',
    preferred_day_of_week: 0,
    min_streak_days: 14,
    estimated_minutes: 15,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'legacy',
    prompt_text: "What traditions do you hope continue?",
    prompt_hint: "Family rituals, values, ways of being together.",
    linked_chapter_id: 'family-career',
    linked_question_id: 'family-traditions-created',
    preferred_day_of_week: 6,
    min_streak_days: 14,
    estimated_minutes: 15,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'legacy',
    prompt_text: "What's the most important thing you've learned about life?",
    prompt_hint: "If you could only pass on one piece of wisdom...",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'final-words',
    preferred_day_of_week: 0,
    min_streak_days: 30,
    estimated_minutes: 15,
    difficulty_level: 3
  },
  {
    prompt_type: 'deep',
    prompt_category: 'legacy',
    prompt_text: "What are you most grateful for?",
    prompt_hint: "The people, experiences, and blessings of your life.",
    linked_chapter_id: 'wisdom-reflections',
    linked_question_id: 'gratitude',
    preferred_day_of_week: 6,
    min_streak_days: 7,
    estimated_minutes: 15,
    difficulty_level: 3
  },

  // ============================================
  // ERA-SPECIFIC PROMPTS (Personalized by birth year)
  // ============================================
  {
    prompt_type: 'story',
    prompt_category: 'era',
    prompt_text: "What world event do you remember most vividly from your childhood?",
    prompt_hint: "Something on the news, something adults talked about.",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'world-events-childhood',
    era_specific: true,
    personalization_template: "You were a child in the {decade}s. What world event from that time do you remember most vividly?",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'era',
    prompt_text: "What was 'modern' when you were young that seems old-fashioned now?",
    prompt_hint: "Technology, fashion, ideas, ways of doing things.",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'technology-changes',
    era_specific: true,
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'story',
    prompt_category: 'era',
    prompt_text: "What was controversial or scandalous when you were a teenager?",
    prompt_hint: "Things that shocked people then that seem normal now.",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'social-changes',
    era_specific: true,
    personalization_template: "In the {decade}s when you were a teenager, what was considered controversial or scandalous?",
    estimated_minutes: 7,
    difficulty_level: 2
  },
  {
    prompt_type: 'quick',
    prompt_category: 'era',
    prompt_text: "What did teenagers wear when you were young?",
    prompt_hint: "The fashion, the hair, the things parents hated.",
    linked_chapter_id: 'teenage-years',
    linked_question_id: 'teen-appearance',
    era_specific: true,
    estimated_minutes: 3,
    difficulty_level: 1
  },
  {
    prompt_type: 'story',
    prompt_category: 'era',
    prompt_text: "Where were you when a major historical event happened?",
    prompt_hint: "Moon landing, Kennedy, Berlin Wall, 9/11 - what do you remember?",
    linked_chapter_id: 'world-around-you',
    linked_question_id: 'historical-moment',
    era_specific: true,
    estimated_minutes: 7,
    difficulty_level: 2
  }
];

// Function to seed prompts
export async function seedPrompts(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const prompt of promptLibrary) {
      await client.query(`
        INSERT INTO prompt_library (
          prompt_type, prompt_category, prompt_text, prompt_hint,
          linked_chapter_id, linked_question_id, era_specific,
          requires_person_mention, requires_place_mention, personalization_template,
          preferred_day_of_week, min_streak_days, difficulty_level, estimated_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT DO NOTHING
      `, [
        prompt.prompt_type,
        prompt.prompt_category,
        prompt.prompt_text,
        prompt.prompt_hint || null,
        prompt.linked_chapter_id || null,
        prompt.linked_question_id || null,
        prompt.era_specific || false,
        prompt.requires_person_mention || false,
        prompt.requires_place_mention || false,
        prompt.personalization_template || null,
        prompt.preferred_day_of_week,
        prompt.min_streak_days || 0,
        prompt.difficulty_level || 1,
        prompt.estimated_minutes || 5
      ]);
    }

    await client.query('COMMIT');
    console.log(`Prompts seeded: ${promptLibrary.length} prompts`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding prompts:', err);
    throw err;
  } finally {
    client.release();
  }
}
