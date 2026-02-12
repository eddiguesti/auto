export const chapters = [
  {
    id: 'heritage-roots',
    title: 'Heritage & Roots',
    subtitle: 'Where Your Story Begins',
    icon: 'I',
    color: 'from-amber-50 to-amber-100',
    questions: [
      {
        id: 'family-origins',
        question: 'Where did your family come from?',
        prompt:
          'The countries, the towns, the journeys. How did your family end up where they did?',
        aiHint:
          'Start broad: Country and region, then narrow down. Did the family move? Immigrate? Were there stories about the old country?'
      },
      {
        id: 'family-surname',
        question: 'What do you know about your family name?',
        prompt: 'Its origins, its meaning, any stories attached to it.',
        aiHint:
          'Simple start: What nationality is the name? Any nicknames? Was the name ever changed? Any famous or infamous relatives who shared it?'
      },
      {
        id: 'parents-background',
        question: 'What was life like for your parents before you were born?',
        prompt: 'Their childhoods, how they met, what the world was like for them.',
        aiHint:
          'Get the story: Where did they grow up? What were their families like? How did they meet? What was happening in the world when they were young?'
      },
      {
        id: 'grandparents-stories',
        question: 'What stories were passed down about your grandparents?',
        prompt:
          'Tales told at the dinner table, legends of the family, things you were always told.',
        aiHint:
          'Family lore: What was repeated? Any favourite stories? Any characters or black sheep? Stories about hardship or triumph?'
      },
      {
        id: 'family-trade',
        question: 'What did your family do for a living through the generations?',
        prompt: 'Farmers, miners, shopkeepers, soldiers - what work ran through the family?',
        aiHint:
          'Trace the line: What did grandparents do? Parents? Was there an expectation you would follow? How did it shape the family identity?'
      },
      {
        id: 'family-values-heritage',
        question: 'What values or beliefs were passed down through your family?',
        prompt: 'The unspoken rules, the things that mattered, the way things were done.',
        aiHint:
          'Dig into the culture: Religion? Politics? Work ethic? Manners? What was expected? What was forbidden? Do you still carry those values?'
      },
      {
        id: 'family-heirlooms',
        question: 'Are there any family objects or heirlooms that tell a story?',
        prompt: 'Photos, jewellery, furniture, documents - things that connect you to the past.',
        aiHint:
          'Pick one object: What is it? Where did it come from? Whose was it? What story does it tell? Do you still have it?'
      },
      {
        id: 'world-before-you',
        question: 'What was the world like in the years before you were born?',
        prompt: 'The wars, the changes, the world your parents navigated before you arrived.',
        aiHint:
          'Set the scene: What was happening locally and globally? How did it affect your family? What echoes of that era did you grow up with?'
      }
    ]
  },
  {
    id: 'earliest-memories',
    title: 'Earliest Memories',
    subtitle: 'Ages 0-5',
    icon: 'II',
    color: 'from-amber-50 to-amber-100',
    questions: [
      // Warmup - easy facts first
      {
        id: 'birth-details',
        question: 'Where were you born?',
        prompt:
          'The hospital, city, or country. Do you know the time of day or any stories about the day you arrived?',
        aiHint:
          'Start simple: get the place and date. Then ask if they know any stories their parents told about that day.'
      },
      {
        id: 'first-memory',
        question: "What's your very first memory?",
        prompt:
          "Don't worry if it's fuzzy - describe what you see, hear, or feel. Even fragments are precious.",
        aiHint:
          'Follow-up sequence: 1) Where were you? 2) What did you see/hear? 3) Who was there? 4) How did you feel?'
      },
      {
        id: 'childhood-home',
        question: 'What did your childhood home look like?',
        prompt: 'Walk me through the front door. What would I see, smell, hear?',
        aiHint:
          'Start with layout/rooms, then ask about specific sensory details: What did it smell like? What sounds do you remember? Which room was your favourite?'
      },
      {
        id: 'childhood-bedroom',
        question: 'What was your bedroom like as a small child?',
        prompt: 'The bed, the walls, the window view. What did you see when you woke up?',
        aiHint:
          'Ask about: wallpaper/posters, what they could see from the window, any night-time fears or comforts'
      },
      {
        id: 'important-people',
        question: 'Who were the important people around you?',
        prompt: 'Describe one person who made you feel safe and loved.',
        aiHint:
          'Get specifics: What did they look like? What did they smell like? What did their voice sound like? A specific moment with them.'
      },
      {
        id: 'early-smells-sounds',
        question: 'What smells or sounds take you back to early childhood?',
        prompt: 'Think about cooking, music, voices, the outdoors, a particular room...',
        aiHint:
          'This is a sensory trigger question - dig into each sense they mention. What memory does that smell bring back? Who does that sound remind you of?'
      },
      {
        id: 'early-favorite-toy',
        question: 'Did you have a favourite toy or comfort object?',
        prompt: 'What was it? Where did it come from? What happened to it?',
        aiHint:
          'Ask about the emotional attachment: Did it have a name? Where did you take it? Do you still have it or know what happened to it?'
      },
      {
        id: 'early-food',
        question: 'What foods do you remember from early childhood?',
        prompt: 'Special treats, everyday meals, things you loved or hated.',
        aiHint:
          'Connect food to people and moments: Who made it? When did you have it? Can you still taste it in your memory?'
      }
    ]
  },
  {
    id: 'childhood',
    title: 'Childhood',
    subtitle: 'Ages 6-12',
    icon: 'III',
    color: 'from-stone-50 to-stone-100',
    questions: [
      // Warmup
      {
        id: 'childhood-home-address',
        question: 'Where did you live during these years?',
        prompt: 'The address, the neighbourhood, the type of home. Did you move at all?',
        aiHint:
          'Simple facts first, then: What was the neighbourhood like? Who were the neighbours? What was outside your door?'
      },
      {
        id: 'childhood-games',
        question: 'What games did you play?',
        prompt: 'Who did you play with? Were you outside or inside? What made it fun?',
        aiHint:
          'Ask for ONE specific game in detail: How did you play? Any made-up rules? Best memory of playing it?'
      },
      {
        id: 'summer-holidays',
        question: 'Describe a typical summer day during the holidays.',
        prompt: 'From when you woke up to when you went to bed - what filled your days?',
        aiHint:
          'Walk through the day: What time did you wake up? What did you eat? Where did you go? When did you come home? What was the best part?'
      },
      {
        id: 'childhood-adventure',
        question: 'Tell me about an adventure you had as a child.',
        prompt: 'Exploring somewhere, building something, discovering something new.',
        aiHint:
          'Get the story: Where did you go? Who was with you? What happened? Were you scared or excited? Did anyone find out?'
      },
      {
        id: 'mischief',
        question: 'What got you into trouble?',
        prompt: 'Tell me about a time you were mischievous. Did you get caught?',
        aiHint:
          'Get the full story: What did you do? Why? Who caught you? What was the punishment? Looking back, was it worth it?'
      },
      {
        id: 'fears-excitements',
        question: 'What scared you as a child? What excited you?',
        prompt: 'Think about both the dark corners and the bright moments.',
        aiHint:
          'Explore one fear deeply: Where did it come from? Did you ever overcome it? Then do the same for an excitement.'
      },
      {
        id: 'best-friend',
        question: 'Who was your best friend?',
        prompt: 'What adventures did you have together? Are you still in touch?',
        aiHint:
          'Get specifics: What was their name? Where did you meet? What did you do together? A specific memory with them?'
      },
      {
        id: 'family-traditions',
        question: 'What family traditions do you remember?',
        prompt: 'Holidays, Sunday dinners, birthday rituals - what made your family unique?',
        aiHint:
          'Pick one tradition and go deep: Who started it? What exactly happened? What did it feel like? Does anyone still do it?'
      },
      {
        id: 'childhood-christmas',
        question: 'What were Christmases (or holidays) like?',
        prompt: 'The decorations, the food, the presents, the people. Paint the picture.',
        aiHint:
          'Sensory details: What did the house look like? Smell like? What sounds? A specific gift you remember?'
      },
      {
        id: 'childhood-pet',
        question: 'Did you have any pets growing up?',
        prompt: 'What were they? What were their names? Any stories about them?',
        aiHint:
          'If yes, get the details: How did you get them? Personality? Favourite memory? What happened to them?'
      }
    ]
  },
  {
    id: 'school-days',
    title: 'School Days',
    subtitle: 'Education Years',
    icon: 'IV',
    color: 'from-amber-50 to-stone-100',
    questions: [
      // Warmup
      {
        id: 'schools-attended',
        question: 'What schools did you go to?',
        prompt: 'Names, locations, how you got there each day.',
        aiHint:
          'Start with facts: Names, years, how did you get there? Then: What did the building look like? Any strong first impressions?'
      },
      {
        id: 'first-day-school',
        question: 'What do you remember about your first day of school?',
        prompt: 'Were you excited? Scared? Who took you? What happened?',
        aiHint:
          'Walk through the day: Who took you? What did you wear? What do you remember seeing? How did you feel by the end?'
      },
      {
        id: 'school-building',
        question: 'Describe your school building.',
        prompt: 'The classrooms, the playground, the smells, the sounds.',
        aiHint:
          'Sensory focus: What did the hallways smell like? What sounds do you remember? Favourite and least favourite places in the building?'
      },
      {
        id: 'favourite-teacher',
        question: 'Who was your favourite teacher and why?',
        prompt: 'What did they teach you - in class and about life?',
        aiHint:
          'Get specific: What did they look like? How did they speak? A specific moment when they made a difference? Did you ever thank them?'
      },
      {
        id: 'worst-teacher',
        question: "Was there a teacher you didn't get along with?",
        prompt: 'What made it difficult? How did you cope?',
        aiHint:
          'No need to dwell, but: What happened? How did it affect you? Any lesson learned from the experience?'
      },
      {
        id: 'subjects',
        question: 'What subjects did you love? What did you struggle with?',
        prompt: 'What made certain subjects click or not click for you?',
        aiHint:
          'Pick one subject they loved: What specifically hooked you? A project or moment you remember? Did it shape your path?'
      },
      {
        id: 'school-friend',
        question: 'Tell me about a school friend.',
        prompt: 'What did you do together? Any memorable moments?',
        aiHint:
          'Get the name and story: How did you meet? What made them a good friend? Funniest or best memory together?'
      },
      {
        id: 'school-lunch',
        question: 'What were school lunches like?',
        prompt: 'Packed lunch or canteen? What did you eat? Who did you sit with?',
        aiHint:
          'Simple but evocative: What was in your lunchbox? Or what did the canteen serve? Where did you sit? What did you talk about?'
      },
      {
        id: 'future-dreams',
        question: 'What did you want to be when you grew up?',
        prompt: 'What sparked that dream? Did it change over time?',
        aiHint:
          'Explore the dream: Where did the idea come from? What did you imagine it would be like? How close did life come to that dream?'
      },
      {
        id: 'school-achievement',
        question: 'What achievement or moment at school made you proud?',
        prompt: 'Academic, sports, arts, or something else entirely?',
        aiHint:
          'Get the full story: What happened? How did you prepare? Who was there to see it? How did it feel in that moment?'
      }
    ]
  },
  {
    id: 'teenage-years',
    title: 'Teenage Years',
    subtitle: 'Coming of Age',
    icon: 'V',
    color: 'from-stone-50 to-amber-50',
    questions: [
      // Warmup
      {
        id: 'teen-appearance',
        question: 'What did you look like as a teenager?',
        prompt: 'Your hair, your clothes, your style. How did you want to be seen?',
        aiHint:
          'Fun warmup: Describe a photo from that time. What were you wearing? What was your hair like? What did you think looked cool?'
      },
      {
        id: 'teen-music-culture',
        question: 'What music did you listen to? What was cool?',
        prompt: 'Describe the culture, fashion, and trends of your teenage years.',
        aiHint:
          'Get specific: Name bands, songs that mattered. Where did you listen to music? Did you have posters on your wall? Go to concerts?'
      },
      {
        id: 'teen-bedroom',
        question: 'What was your teenage bedroom like?',
        prompt: 'The posters, the mess, the privacy. Your personal space.',
        aiHint:
          'Walk through it: What was on the walls? Where did you keep your treasures? What did you do in there? Any secrets hidden?'
      },
      {
        id: 'first-romance',
        question: 'Tell me about your first crush or first date.',
        prompt: 'What were they like? What happened? How did you feel?',
        aiHint:
          "Get the story gently: Who were they? How did you meet? What happened? Even if it's embarrassing now, those feelings were real."
      },
      {
        id: 'teen-friendship',
        question: 'Who were your closest friends as a teenager?',
        prompt: 'What did you do together? What made those friendships special?',
        aiHint:
          'Focus on one friend: Name, how you met, what you did together, a specific memory. Are you still in touch?'
      },
      {
        id: 'parents-teen',
        question: 'What were your parents like during this time?',
        prompt: 'Were there conflicts? Understanding moments? How did the relationship change?',
        aiHint:
          'Balance is key: A moment of conflict AND a moment of connection. How do you understand their perspective now?'
      },
      {
        id: 'teen-ambition',
        question: 'What was your biggest dream or ambition?',
        prompt: 'What did you believe was possible? What were you striving for?',
        aiHint:
          'Explore the dream: Where did it come from? What did you do to pursue it? Did anyone support or discourage you?'
      },
      {
        id: 'defining-moment-teen',
        question: 'Tell me about a moment that changed how you saw the world.',
        prompt:
          'Something that shifted your perspective, opened your eyes, or made you think differently.',
        aiHint:
          'This is deep - give them time. What happened? What did you believe before? What changed? How did it affect your choices?'
      },
      {
        id: 'teen-rebellion',
        question: 'Did you ever rebel? Push boundaries?',
        prompt: 'What did you do? How did it turn out?',
        aiHint:
          'Get the story: What did you do? Why? Did you get caught? Looking back, what was that really about?'
      },
      {
        id: 'teen-job',
        question: 'Did you have any jobs as a teenager?',
        prompt: 'Saturday jobs, paper rounds, helping out. Your first taste of earning.',
        aiHint:
          'If yes: What was the job? How much did you earn? What did you spend it on? Any memorable moments or people?'
      },
      {
        id: 'leaving-school',
        question: 'How did you feel when your school years ended?',
        prompt: 'Relief? Sadness? Excitement? What came next?',
        aiHint:
          'The transition: Last day memories? What were you looking forward to? What were you leaving behind? Any regrets?'
      }
    ]
  },
  {
    id: 'key-people',
    title: 'Key People',
    subtitle: 'Those Who Shaped You',
    icon: 'VI',
    color: 'from-amber-50 to-amber-100',
    questions: [
      {
        id: 'mother',
        question: 'Tell me about your mother.',
        prompt: 'What was she like? What did she look like? What do you remember most about her?',
        aiHint:
          'Build a full picture: Physical description, personality, her voice, her habits. Then: A specific memory that captures who she was. What did she teach you?'
      },
      {
        id: 'father',
        question: 'Tell me about your father.',
        prompt: 'What was he like? What did he do? What do you remember most about him?',
        aiHint:
          'Same approach: Physical description, personality, how he spoke. A specific memory. What did he teach you? How did you relate?'
      },
      {
        id: 'siblings',
        question: 'Tell me about your brothers and sisters.',
        prompt: 'Names, ages, what they were like. Your relationship with them.',
        aiHint:
          'Take each sibling in turn if multiple: Name, personality, a memory together. How has the relationship changed over time?'
      },
      {
        id: 'grandparents',
        question: 'What do you remember about your grandparents?',
        prompt: 'Did you know them? What were they like? Where did they live?',
        aiHint:
          'For each grandparent they knew: What did they look like? Their house? A specific memory? What stories did they tell?'
      },
      {
        id: 'extended-family',
        question: 'Were there aunts, uncles, or cousins who were important to you?',
        prompt: 'Family gatherings, special relationships, memorable characters.',
        aiHint:
          'Pick one or two and go deep: Who were they? What made them memorable? A specific story involving them?'
      },
      {
        id: 'mentor',
        question: 'Was there someone outside your family who really influenced you?',
        prompt:
          "A teacher, neighbour, coach, boss, friend's parent - someone who made a difference.",
        aiHint:
          'Get the story: Who were they? How did you know them? What did they do that mattered? Did you ever tell them?'
      },
      {
        id: 'lost-loved-one',
        question: "Is there someone you've lost that you'd like to talk about?",
        prompt: "Someone who's no longer here but still matters deeply to you.",
        aiHint:
          'Handle with care. Let them share at their own pace. Ask: What would you want people to know about them? What do you miss most?'
      },
      {
        id: 'lifelong-friend',
        question: 'Who has been your longest or closest friend?',
        prompt: 'How did you meet? What keeps the friendship going?',
        aiHint:
          'The full arc: How you met, key moments in the friendship, what makes it work, a favourite memory together.'
      }
    ]
  },
  {
    id: 'young-adulthood',
    title: 'Young Adulthood',
    subtitle: 'Starting Out',
    icon: 'VII',
    color: 'from-stone-50 to-stone-100',
    questions: [
      // Warmup
      {
        id: 'leaving-home',
        question: 'When did you leave home? Where did you go?',
        prompt:
          'Moving out, going to university, starting work - that first step into independence.',
        aiHint:
          'The transition: How old were you? Where did you go? How did it feel? What did you take with you?'
      },
      {
        id: 'young-adult-living',
        question: 'Where did you live during this time?',
        prompt: 'Describe your first flat, house, or living situation. What was life like?',
        aiHint:
          'Paint the picture: What did the place look like? Who else was there? What was the neighbourhood like? Best and worst things about it?'
      },
      {
        id: 'first-job',
        question: 'What was your first real job?',
        prompt: 'How did you get it? What did you learn? What do you remember most?',
        aiHint:
          'Full story: How did you find it? First day nerves? The people? What skills did you learn? How much did you earn?'
      },
      {
        id: 'career-path',
        question: 'How did your career unfold?',
        prompt: 'The jobs, the changes, the decisions that shaped your working life.',
        aiHint:
          'Key turning points: Jobs you loved, jobs you hated, decisions that changed direction. What are you proudest of from your working years?'
      },
      {
        id: 'independence',
        question: 'What was it like being independent for the first time?',
        prompt:
          'Cooking, paying bills, making your own decisions. The freedom and the responsibility.',
        aiHint:
          'Specific moments: First time you had to fend for yourself? Disasters in the kitchen? Managing money? What surprised you about adult life?'
      },
      {
        id: 'social-life',
        question: 'What was your social life like in your twenties?',
        prompt: 'The friends, the nights out, the adventures. How did you spend your free time?',
        aiHint:
          'Paint the picture: Where did you go? Who were you with? Best night out? A friendship from this era that stands out?'
      },
      {
        id: 'life-decisions',
        question: 'What decisions shaped your path?',
        prompt:
          'Think about crossroads moments - choices that sent you one direction instead of another.',
        aiHint:
          "Pick one decision and explore: What were the options? Why did you choose what you chose? How would life be different if you'd chosen differently?"
      },
      {
        id: 'young-adult-challenges',
        question: 'What was the hardest thing about this period?',
        prompt: 'What challenges did you face? How did you handle them?',
        aiHint:
          'One challenge in depth: What happened? How did you cope? Who helped? What did you learn about yourself?'
      },
      {
        id: 'young-adult-joy',
        question: 'What brought you the most joy during these years?',
        prompt: 'Friends, adventures, achievements - what lit you up?',
        aiHint:
          'Pick a specific joy and tell the story: What was it? Why did it matter so much? A peak moment of happiness?'
      }
    ]
  },
  {
    id: 'love-relationships',
    title: 'Love & Relationships',
    subtitle: 'Matters of the Heart',
    icon: 'VIII',
    color: 'from-stone-50 to-amber-50',
    questions: [
      {
        id: 'first-love',
        question: 'Tell me about your first love.',
        prompt: 'The butterflies, the excitement, the heartbreak. What do you remember?',
        aiHint:
          'Get the full story: Who were they? How did you meet? What made them special? What happened? How did it shape your view of love?'
      },
      {
        id: 'meeting-partner',
        question: 'How did you meet the love of your life?',
        prompt: 'The place, the moment, the first impression. Tell me everything.',
        aiHint:
          'Walk through it: Where were you? What did you notice first? What was your first conversation? When did you know this was different?'
      },
      {
        id: 'courtship',
        question: 'What was your courtship like?',
        prompt: 'The dates, the letters, the phone calls. How did you win each other over?',
        aiHint:
          "Romantic details: First date? How did you communicate? What did you do together? Any funny or awkward moments? When did you say 'I love you'?"
      },
      {
        id: 'proposal-story',
        question: 'Tell me about the proposal.',
        prompt: 'Who asked? Where? How did it happen? What was the reaction?',
        aiHint:
          'The full story: Was it planned or spontaneous? Where were you? What was said? How did you feel? Who did you tell first?'
      },
      {
        id: 'wedding-day',
        question: 'Describe your wedding day.',
        prompt: 'The venue, the outfit, the guests, the moments that stand out.',
        aiHint:
          'Walk through the day: Getting ready, the ceremony, the reception. What went wrong? What went perfectly? How did you feel?'
      },
      {
        id: 'early-marriage',
        question: 'What were the early days of marriage like?',
        prompt: 'The adjustments, the surprises, learning to live together.',
        aiHint:
          'Honest reflection: What surprised you? What was harder than expected? What was wonderful? Funny stories from early married life?'
      },
      {
        id: 'relationship-strengths',
        question: 'What has held your relationship together?',
        prompt: 'The shared values, the compromises, the things that kept you strong.',
        aiHint:
          "Real wisdom: What do you agree on? How do you handle disagreements? What's the secret? A moment that tested you but made you stronger?"
      },
      {
        id: 'love-lessons',
        question: 'What has love taught you about yourself?',
        prompt: 'How has being loved - and loving someone - changed who you are?',
        aiHint:
          'Deep reflection: What did you learn about patience, forgiveness, compromise? How are you different because of this relationship?'
      }
    ]
  },
  {
    id: 'family-career',
    title: 'Family & Career',
    subtitle: 'Building a Life',
    icon: 'IX',
    color: 'from-amber-50 to-stone-50',
    questions: [
      {
        id: 'becoming-parent',
        question: 'Tell me about becoming a parent.',
        prompt: 'The moment you knew, the preparations, the day they arrived - how did it feel?',
        aiHint:
          'The full journey: Finding out, the pregnancy/wait, the birth day itself. That first moment holding them. How did life change?'
      },
      {
        id: 'naming-children',
        question: "How did you choose your children's names?",
        prompt: 'The discussions, the meanings, the family names.',
        aiHint:
          'For each child: What names were considered? Why did you pick what you picked? Any regrets or alternatives?'
      },
      {
        id: 'children-as-babies',
        question: 'What were your children like as babies?',
        prompt:
          'Their personalities from the start. The sleepless nights, the first laughs, the chaos.',
        aiHint:
          'Pick one child or moment: What were they like? A specific memory from those early days? What surprised you about parenthood?'
      },
      {
        id: 'parenting-moments',
        question: "What's a moment with your children that you'll never forget?",
        prompt: 'Funny, touching, proud - a moment that defined being their parent.',
        aiHint:
          'Get the full story: What happened? How old were they? What did it teach you? Why does it stay with you?'
      },
      {
        id: 'family-home',
        question: 'Describe the home where you raised your family.',
        prompt: 'The house, the garden, the neighbourhood. Where the memories were made.',
        aiHint:
          'Walk through it: Favourite room? Where did family gather? The sounds of that house? Neighbours and neighbourhood?'
      },
      {
        id: 'family-traditions-created',
        question: 'What traditions did you create for your family?',
        prompt: "Things that became 'your family things' - annual events, rituals, sayings.",
        aiHint:
          'Pick one tradition: How did it start? What exactly happens? What does it mean to you? Will it continue?'
      },
      {
        id: 'proudest-work',
        question: 'What work are you most proud of?',
        prompt: 'Projects, achievements, contributions - what matters most when you look back?',
        aiHint:
          'One achievement in depth: What was it? What did it take? Who helped? How did it feel when it succeeded?'
      },
      {
        id: 'career-lessons',
        question: 'What did your career teach you about life?',
        prompt: 'Beyond the job itself - what wisdom came from your working years?',
        aiHint:
          'Concrete lessons: A mistake that taught you something. A mentor who shaped you. A success that surprised you.'
      },
      {
        id: 'challenges-overcome',
        question: 'What challenges did you overcome during these years?',
        prompt: 'Times when things were hard but you found a way through.',
        aiHint:
          'One challenge deeply: What happened? How bad did it get? What got you through? How are you different because of it?'
      },
      {
        id: 'family-holidays',
        question: 'Tell me about family holidays.',
        prompt: 'Where did you go? Disasters and triumphs. The car journeys, the memories.',
        aiHint:
          'Pick one memorable holiday: Where did you go? What happened? Funny disaster stories? A perfect moment?'
      }
    ]
  },
  {
    id: 'home-places',
    title: 'Home & Places',
    subtitle: 'Where Life Happened',
    icon: 'X',
    color: 'from-stone-50 to-stone-100',
    questions: [
      {
        id: 'first-home-own',
        question: 'Tell me about the first home you called your own.',
        prompt: 'Buying or renting, the excitement, the reality. What was it like?',
        aiHint:
          'The full story: How did you find it? What did it cost? First night there? What did you love and hate about it?'
      },
      {
        id: 'homes-through-life',
        question: 'How many homes have you lived in?',
        prompt: 'Walk me through the houses and flats that have been yours over the years.',
        aiHint:
          'Each home briefly: Where was it? Why did you move there? What do you remember most? Which was your favourite?'
      },
      {
        id: 'favourite-room',
        question: 'What room in any home has meant the most to you?',
        prompt: 'A kitchen where everyone gathered, a garden shed of peace, a bedroom with a view.',
        aiHint:
          'Sensory details: What did it look like? What happened there? Why was it special? Can you still picture it?'
      },
      {
        id: 'neighbourhood-memories',
        question: 'Tell me about a neighbourhood you loved.',
        prompt: 'The shops, the people, the walks, the feeling of belonging.',
        aiHint:
          'Paint the picture: Who were the characters? What was the corner shop like? Where did you walk? What sounds and smells?'
      },
      {
        id: 'garden-outdoors',
        question: 'Have you had a garden or outdoor space that mattered to you?',
        prompt:
          'Growing things, sitting outside, children playing - the life that happened outdoors.',
        aiHint:
          'If yes: What did you grow? Where did you sit? What happened out there? How did it change with the seasons?'
      },
      {
        id: 'moving-day',
        question: 'Tell me about a memorable moving day.',
        prompt:
          'The chaos, the emotions, the excitement or sadness of leaving one place for another.',
        aiHint:
          'Get the story: Where were you going? What did you feel leaving? Any disasters? What was it like arriving?'
      },
      {
        id: 'places-that-shaped-you',
        question: 'What places outside the home have shaped your life?',
        prompt: 'A church, a pub, a park bench, a workplace, a hospital - places with meaning.',
        aiHint:
          'Pick one place: What is it? What happened there? Why does it matter? Would you go back?'
      },
      {
        id: 'sense-of-home',
        question: 'What makes somewhere feel like home to you?',
        prompt: 'Is it the people, the objects, the sounds, the smells? What creates that feeling?',
        aiHint:
          'Reflective: What do you need around you to feel at home? Has that changed over time? Where do you feel most at home right now?'
      }
    ]
  },
  {
    id: 'traditions-celebrations',
    title: 'Traditions & Celebrations',
    subtitle: 'The Rituals That Bind Us',
    icon: 'XI',
    color: 'from-amber-50 to-stone-100',
    questions: [
      {
        id: 'christmas-memories',
        question: 'What has Christmas meant to you through the years?',
        prompt: 'From childhood magic to creating your own traditions. How has it changed?',
        aiHint:
          'Through the ages: Christmas as a child vs as a parent vs now. What stayed the same? What changed? Best Christmas ever?'
      },
      {
        id: 'birthday-traditions',
        question: 'How were birthdays celebrated in your family?',
        prompt: 'Cakes, parties, special treats. What made birthdays special?',
        aiHint:
          "Specific memories: A birthday that stands out? The cake? The presents? Who was there? How did you celebrate your children's birthdays?"
      },
      {
        id: 'sunday-rituals',
        question: 'What were Sundays like in your family?',
        prompt: 'Church, roast dinners, walks, visiting relatives - the rhythm of a Sunday.',
        aiHint:
          'Walk through the day: Morning routine? Church? The meal? Afternoon activities? How have Sundays changed over your lifetime?'
      },
      {
        id: 'wedding-funerals',
        question: 'Tell me about a wedding or funeral that stays with you.',
        prompt: 'The joy, the grief, the family gathered together. A day you remember clearly.',
        aiHint:
          'Pick one event: Whose was it? What happened? What do you remember most? How did it affect you?'
      },
      {
        id: 'seasonal-traditions',
        question: 'Were there seasonal traditions you looked forward to?',
        prompt: 'Bonfire Night, Easter, harvest time, summer fairs - the markers of the year.',
        aiHint:
          'Pick one: What was the tradition? Who was involved? What did you do? Do you still keep it up?'
      },
      {
        id: 'family-recipes',
        question: 'Are there family recipes that have been passed down?',
        prompt: 'The dishes that taste like home. Who made them? Do you still make them?',
        aiHint:
          'Pick one dish: What is it? Who made it best? Can you describe the taste and smell? Have you taught anyone to make it?'
      },
      {
        id: 'family-sayings',
        question: 'Were there sayings or phrases your family always used?',
        prompt: 'The words that were uniquely yours - funny, wise, or just familiar.',
        aiHint:
          'Get specific: What was the saying? Who said it? When? Does anyone still say it? What did it really mean?'
      },
      {
        id: 'new-traditions',
        question: 'What traditions have you started that you hope will continue?',
        prompt: 'Things you created for your family that became part of who you are.',
        aiHint:
          'Pick one: How did it start? What exactly happens? What does it mean to you? Do your children or grandchildren keep it going?'
      }
    ]
  },
  {
    id: 'world-around-you',
    title: 'The World Around You',
    subtitle: 'History & Culture',
    icon: 'XII',
    color: 'from-stone-50 to-amber-50',
    questions: [
      {
        id: 'world-events-childhood',
        question: 'What big world events do you remember from childhood?',
        prompt: 'News stories, historical moments, things adults talked about.',
        aiHint:
          'Pick one event: How did you hear about it? What did you understand at the time? How did adults react? How do you see it now?'
      },
      {
        id: 'technology-changes',
        question: 'How has technology changed during your lifetime?',
        prompt: 'From your first phone call to smartphones. What changes amazed you most?',
        aiHint:
          'Specific firsts: First TV, first computer, first mobile phone. What did you think? What do you miss about the old ways?'
      },
      {
        id: 'historical-moment',
        question: 'Where were you when [a major historical event] happened?',
        prompt: 'Moon landing, fall of Berlin Wall, 9/11 - moments that stopped the world.',
        aiHint:
          'Pick one they remember: Where were you? What were you doing? How did you hear? What did you feel? How did life change after?'
      },
      {
        id: 'social-changes',
        question: 'What social changes have you witnessed?',
        prompt: "How people live, work, and treat each other - what's changed for better or worse?",
        aiHint:
          'Pick one change: What was it like before? When did you notice the change? What do you think about it? What would younger you think?'
      },
      {
        id: 'neighbourhood-changes',
        question: 'How has your area changed over the years?',
        prompt: "The places, the people, the character of where you've lived.",
        aiHint:
          "Specific changes: Buildings that are gone, shops that closed, how people are different. What do you miss? What's better?"
      },
      {
        id: 'prices-then-now',
        question: 'What do you remember about prices and money?',
        prompt: 'What things cost, what you earned, how money felt different.',
        aiHint:
          'Specific examples: First wage? Cost of first house? A pint of milk? What could you buy as a child with pocket money?'
      },
      {
        id: 'music-across-life',
        question: 'What music has been the soundtrack to your life?',
        prompt: 'Songs that take you back, artists you loved, music that marked different eras.',
        aiHint:
          'Pick songs from different eras: What song is the 60s/70s/80s for you? Where does a certain song take you back to?'
      },
      {
        id: 'cultural-entertainment',
        question: 'What entertainment do you remember from different eras?',
        prompt: 'Films, TV shows, radio programmes - what did you watch and listen to?',
        aiHint:
          "Specific shows or films: What did you watch as a family? What was your guilty pleasure? Something you'd love people today to see?"
      }
    ]
  },
  {
    id: 'travel-adventure',
    title: 'Travel & Adventure',
    subtitle: 'Exploring the World',
    icon: 'XIII',
    color: 'from-amber-50 to-amber-100',
    questions: [
      {
        id: 'first-holiday',
        question: 'What was your first holiday away from home?',
        prompt: 'Where did you go? How did you get there? What do you remember?',
        aiHint:
          'Full story: How old were you? Who took you? The journey, the arrival, the excitement. What stands out most?'
      },
      {
        id: 'favourite-destination',
        question: 'What is the most beautiful place you have ever been?',
        prompt: 'A place that took your breath away. Describe what you saw.',
        aiHint:
          'Sensory details: What did you see? The colours, the light, the sounds. Why did it affect you so deeply? Would you go back?'
      },
      {
        id: 'family-holidays-travel',
        question: 'Tell me about holidays with your family.',
        prompt: 'The car journeys, the excitement, the disasters. Where did you go?',
        aiHint:
          'Pick one holiday: Where did you go? How did you get there? What went wrong? What went right? A moment you all still talk about?'
      },
      {
        id: 'adventure-story',
        question: 'Have you ever had a real adventure?',
        prompt: 'Something unexpected, thrilling, or completely out of your comfort zone.',
        aiHint:
          'Get the full story: What happened? Were you scared? Who was with you? How did it change you?'
      },
      {
        id: 'people-met-travelling',
        question: 'Did you ever meet someone memorable while travelling?',
        prompt: 'A stranger who became a friend, a character you never forgot.',
        aiHint:
          'The encounter: Where were you? Who were they? What happened? Did you stay in touch?'
      },
      {
        id: 'dream-destination',
        question: 'Is there somewhere you always wanted to visit but never did?',
        prompt: 'The place on your list, the trip you never took.',
        aiHint:
          'Why that place? What drew you to it? What stopped you going? Do you still think about it?'
      },
      {
        id: 'travel-disasters',
        question: 'Tell me about a holiday that went wrong.',
        prompt:
          'The funny disasters, the lost luggage, the wrong turns that became the best stories.',
        aiHint:
          'Get the story with humour: What happened? How bad was it at the time? How funny is it now? What did you learn?'
      },
      {
        id: 'travel-lessons',
        question: 'What has travelling taught you about life?',
        prompt: 'How seeing different places and people has changed the way you think.',
        aiHint:
          'Reflective: What surprised you about other cultures? What did you learn about yourself? How did travel broaden your view?'
      }
    ]
  },
  {
    id: 'passions-beliefs',
    title: 'Passions & Beliefs',
    subtitle: 'What Matters to You',
    icon: 'XIV',
    color: 'from-amber-50 to-amber-100',
    questions: [
      {
        id: 'hobbies',
        question: 'What hobbies or interests have been important to you?',
        prompt: "Things you love to do, skills you've developed, passions you've pursued.",
        aiHint:
          'Pick one hobby deeply: How did you discover it? What do you love about it? A peak moment or achievement? Who shares it with you?'
      },
      {
        id: 'sports-teams',
        question: 'Did you support a sports team or play any sports?',
        prompt: 'The victories, defeats, match days, and memories.',
        aiHint:
          'If yes: Which team? How did you become a fan? Best match you saw? Any playing memories? What does it mean to you?'
      },
      {
        id: 'faith-spirituality',
        question: 'What role has faith or spirituality played in your life?',
        prompt: 'Religious beliefs, spiritual experiences, how your views have evolved.',
        aiHint:
          'Handle respectfully: How were you raised? Has it changed? What do you believe now? How has it helped you through difficult times?'
      },
      {
        id: 'values',
        question: 'What values have guided your life?',
        prompt: "The principles you've tried to live by. Where did they come from?",
        aiHint:
          'Pick one or two values: What are they? Where did you learn them? A time when you had to stand by them? A time you fell short?'
      },
      {
        id: 'causes',
        question: "Have there been causes or issues you've cared deeply about?",
        prompt: "Things you've supported, fought for, or believed in strongly.",
        aiHint:
          'If yes: What cause? Why does it matter to you? What have you done about it? How have your views evolved?'
      },
      {
        id: 'travel',
        question: "What's the most memorable place you've ever visited?",
        prompt: 'Holidays, adventures, places that changed you or took your breath away.',
        aiHint:
          'Pick one place: When did you go? What made it special? Sights, sounds, smells? Would you go back? What did you learn?'
      },
      {
        id: 'books-learning',
        question: 'What books or ideas have influenced you?',
        prompt: "Things you've read, learned, or discovered that shaped how you think.",
        aiHint:
          'Pick one book or idea: What was it? When did you encounter it? How did it change you?'
      },
      {
        id: 'creative-pursuits',
        question: 'Have you done anything creative in your life?',
        prompt: "Art, writing, music, crafts, building, making - things you've created.",
        aiHint:
          "If yes: What do you create? How did you start? What have you made that you're proud of? What does it give you?"
      }
    ]
  },
  {
    id: 'challenges-resilience',
    title: 'Challenges & Resilience',
    subtitle: 'What Made You Stronger',
    icon: 'XV',
    color: 'from-stone-50 to-amber-50',
    questions: [
      {
        id: 'biggest-challenge',
        question: 'What has been the biggest challenge of your life?',
        prompt: 'The thing that tested you most. How did you face it?',
        aiHint:
          'Let them choose: What was it? How did it begin? What was the worst moment? How did you get through it? What did it teach you?'
      },
      {
        id: 'health-challenges',
        question: 'Have you faced any serious health challenges?',
        prompt: 'Illness, injury, or health scares that changed your perspective.',
        aiHint:
          'Handle sensitively: What happened? How did you find out? Who supported you? How did it change the way you live?'
      },
      {
        id: 'financial-hardship',
        question: 'Were there times when money was very tight?',
        prompt: 'Making ends meet, going without, finding ways to manage.',
        aiHint:
          'Real stories: What was the situation? What did you go without? How did you cope? Any resourcefulness or creativity?'
      },
      {
        id: 'loss-grief',
        question: 'How have you dealt with loss and grief?',
        prompt: 'Losing people you loved, learning to carry on, finding a way through.',
        aiHint:
          'With great care: Who did you lose? How did it affect you? What helped? How do you carry their memory?'
      },
      {
        id: 'failure-setback',
        question: 'Tell me about a time things went badly wrong.',
        prompt: 'A failure, a mistake, a setback that knocked you sideways.',
        aiHint:
          'The full arc: What happened? How did you feel? What did you do? How did you recover? What did you learn?'
      },
      {
        id: 'resilience-source',
        question: 'Where do you find your strength in difficult times?',
        prompt: 'Faith, family, stubbornness, humour - what keeps you going?',
        aiHint:
          "Personal and honest: What do you draw on? Has it always been the same? A specific moment when you found inner strength you didn't know you had?"
      },
      {
        id: 'helping-others',
        question: 'Have you ever helped someone through a difficult time?',
        prompt: 'Being there for someone who needed you. What did you do?',
        aiHint:
          'The story: Who was it? What happened? What did you do? How did it affect your relationship? What did it teach you?'
      },
      {
        id: 'silver-linings',
        question: 'Has anything good ever come from a difficult experience?',
        prompt:
          'Unexpected gifts from hard times - new perspectives, stronger relationships, personal growth.',
        aiHint:
          'Positive reflection: What was the difficulty? What good came from it? How long did it take to see the silver lining?'
      }
    ]
  },
  {
    id: 'later-life',
    title: 'Later Life',
    subtitle: 'The Golden Years',
    icon: 'XVI',
    color: 'from-amber-50 to-stone-100',
    questions: [
      {
        id: 'retirement',
        question: 'Tell me about retiring or slowing down.',
        prompt: 'When did it happen? How did it feel? What did you do with your new freedom?',
        aiHint:
          'The transition: When did you stop working? Was it your choice? What did you do on your first day? How did you fill your time?'
      },
      {
        id: 'grandchildren',
        question: 'Tell me about your grandchildren.',
        prompt: 'Their names, their personalities, what they mean to you.',
        aiHint:
          "Each grandchild: Name, personality, a special memory with them. What's different about being a grandparent vs a parent?"
      },
      {
        id: 'daily-life-now',
        question: 'What does a typical day look like for you now?',
        prompt: 'The rhythms, the routines, the small pleasures of your days.',
        aiHint:
          "Walk through the day: When do you wake? What do you enjoy? Who do you see? What's the best part of your day?"
      },
      {
        id: 'health-aging',
        question: 'How has getting older changed you?',
        prompt: "The body, the mind, the perspective. What's different now?",
        aiHint:
          "Honest but gentle: What do you notice? What frustrates you? What surprises you? What have you gained that youth didn't have?"
      },
      {
        id: 'losing-friends',
        question: 'Have you lost friends or loved ones along the way?',
        prompt: "The people who've gone but aren't forgotten. How do you carry them with you?",
        aiHint:
          'Handle with care: Who do you miss? How do you remember them? What would you say to them if you could?'
      },
      {
        id: 'new-discoveries',
        question: 'Have you discovered anything new in later life?',
        prompt: "New interests, new friendships, new perspectives you didn't expect.",
        aiHint:
          "Positive focus: What have you started recently? What surprised you? Is there something you wish you'd discovered sooner?"
      },
      {
        id: 'home-now',
        question: 'Tell me about where you live now.',
        prompt: 'Your home, your neighbourhood, what makes it yours.',
        aiHint:
          'Paint the picture: What does it look like? What do you see from your window? Favourite spot? What makes it home?'
      },
      {
        id: 'what-matters-now',
        question: 'What matters most to you at this stage of life?',
        prompt: 'The priorities, the people, the things you hold closest.',
        aiHint:
          'Reflective: Has what matters changed? What would you protect above all else? What brings you peace?'
      }
    ]
  },
  {
    id: 'wisdom-reflections',
    title: 'Wisdom & Reflections',
    subtitle: 'Looking Back',
    icon: 'XVII',
    color: 'from-stone-50 to-stone-100',
    questions: [
      {
        id: 'wisdom-for-younger-self',
        question: 'What do you know now that you wish you knew at 20?',
        prompt: 'The lessons that took time to learn, the perspective that came with age.',
        aiHint:
          'Pick specific lessons: About work? Love? Money? Happiness? What would you tell your younger self?'
      },
      {
        id: 'proudest-moments',
        question: 'What moments are you most proud of?',
        prompt: 'Not just achievements - moments when you became who you wanted to be.',
        aiHint:
          'One or two moments: What happened? Why does it matter? What did it take? Why does it make you proud?'
      },
      {
        id: 'regrets',
        question: "Is there anything you wish you'd done differently?",
        prompt: "Paths not taken, words not said, choices you'd reconsider.",
        aiHint:
          "Handle gently: What is it? What stopped you at the time? How do you feel about it now? Any peace you've made with it?"
      },
      {
        id: 'marriage-lessons',
        question: 'What have you learned about love and marriage?',
        prompt: 'The secrets to making it work, the hard parts, the rewards.',
        aiHint:
          'Real wisdom: What makes a relationship last? What was hardest? What would you tell a young couple today?'
      },
      {
        id: 'parenting-lessons',
        question: 'What have you learned about being a parent?',
        prompt: "What worked, what you'd do differently, what surprised you.",
        aiHint:
          'Honest reflection: What did you get right? What would you change? What do you hope you passed on?'
      },
      {
        id: 'message-to-grandchildren',
        question: 'What would you tell your grandchildren about life?',
        prompt: "The essential truths you've discovered, the advice you'd want to pass on.",
        aiHint:
          'Their legacy: What matters most? What should they know about the world? About your family? About themselves?'
      },
      {
        id: 'how-remembered',
        question: 'How do you want to be remembered?',
        prompt: 'When people speak of you, what do you hope they say?',
        aiHint:
          "Deep question - give them time: What matters to you? How do you want to be described? What's your legacy?"
      },
      {
        id: 'unexpected-blessings',
        question: 'What unexpected blessings has life brought you?',
        prompt: "Things you didn't plan for or expect that became treasures.",
        aiHint:
          'Specific surprises: What happened? Why was it unexpected? How did it change things? What does it mean to you now?'
      },
      {
        id: 'gratitude',
        question: 'What are you most grateful for?',
        prompt: 'People, experiences, moments - what fills you with gratitude?',
        aiHint:
          "Let them reflect: Who? What? If it's a person - what would you say to them? If it's something abstract - why does it matter?"
      },
      {
        id: 'final-words',
        question: 'Is there anything else you want people to know?',
        prompt: "Anything we haven't covered. Anything left unsaid. Your final words for the book.",
        aiHint:
          "Open-ended finish: What matters that we haven't touched? Any last stories? Anything for specific people? This is their chance."
      }
    ]
  },
  {
    id: 'letters-loved-ones',
    title: 'Letters to Loved Ones',
    subtitle: 'Words From the Heart',
    icon: 'XVIII',
    color: 'from-amber-50 to-amber-100',
    questions: [
      {
        id: 'letter-to-partner',
        question: 'What would you say to your partner if you could write them a letter?',
        prompt: 'The things that are hard to say out loud. The gratitude, the love, the memories.',
        aiHint:
          'Deeply personal: What do you want them to know? What are you grateful for? A memory that captures your love? Words you wish you said more often?'
      },
      {
        id: 'letter-to-children',
        question: 'What do you want your children to know?',
        prompt:
          'The things you hope they understand about you, about life, about how much they matter.',
        aiHint:
          'From the heart: What are you proud of in them? What do you hope for them? What do you want them to remember about you? Any apologies or explanations?'
      },
      {
        id: 'letter-to-grandchildren',
        question: 'What message would you leave for your grandchildren?',
        prompt:
          'Words they might read in years to come. What should they know about you and about life?',
        aiHint:
          'Legacy writing: What do you want them to know about your life? About the family? Advice for their future? What you hope for them?'
      },
      {
        id: 'letter-to-younger-self',
        question: 'What would you write to your younger self?',
        prompt: 'A letter across time. What would you tell the young you?',
        aiHint:
          'Honest and tender: What would you warn them about? What would you reassure them about? What would you tell them to enjoy more?'
      },
      {
        id: 'letter-to-lost',
        question: 'Is there someone no longer here that you would write to?',
        prompt: 'A parent, a friend, a sibling - someone you wish could read your words.',
        aiHint:
          'Handle with great care: Who is it? What would you say? What do you wish you had told them? What do you want them to know?'
      },
      {
        id: 'letter-to-friend',
        question: 'What would you say to your oldest or dearest friend?',
        prompt: 'The friendship that has meant the most. What do they need to hear?',
        aiHint:
          'Warm and personal: What has the friendship meant? A favourite memory together? What do you admire about them? What would you thank them for?'
      },
      {
        id: 'letter-to-future',
        question: 'What would you write to someone reading this book in 50 years?',
        prompt:
          'A message to a great-grandchild or a stranger. What should they know about your time?',
        aiHint:
          'Big picture: What was life like? What mattered? What do you hope the world looks like for them? What wisdom transcends the years?'
      },
      {
        id: 'final-letter',
        question: 'If this book is your legacy, what are your final words?',
        prompt: 'The last page of your story. What do you want it to say?',
        aiHint:
          'The closing: This is the end of the book. What matters most? What is the one thing you want everyone to take away? Give them space and time.'
      }
    ]
  },
  // ─── OPTIONAL BONUS CHAPTERS ───────────────────────────────────────
  // These chapters are optional - users can choose which ones to include.
  // They fill gaps identified in UK memoir market research and give
  // flexibility for unique life stories.
  {
    id: 'bonus-working-life',
    title: 'My Working Life',
    subtitle: 'The Jobs That Shaped Me',
    icon: 'XIX',
    color: 'from-stone-50 to-amber-50',
    optional: true,
    questions: [
      {
        id: 'first-proper-job',
        question: 'What was the first job you really cared about?',
        prompt:
          'Not just a Saturday job, but the first one that felt like it mattered. How did you get it?',
        aiHint:
          'Full story: How did you find it? What were you doing? First day nerves? What did it mean to you at the time?'
      },
      {
        id: 'typical-working-day',
        question: 'Describe a typical working day at the job you held longest.',
        prompt:
          'From the alarm clock to coming home. The commute, the routine, the people, the tea breaks.',
        aiHint:
          'Walk through the day: How did you get there? What did the workplace look like? Smell like? Who did you see first? What was the rhythm?'
      },
      {
        id: 'workplace-characters',
        question: 'Who were the characters you worked with?',
        prompt: 'The boss, the joker, the one who drove you mad, the one who became a friend.',
        aiHint:
          'Pick one or two people: What were they like? A specific story involving them? What made them memorable?'
      },
      {
        id: 'workplace-unforgettable',
        question: 'Was there a moment at work you will never forget?',
        prompt: 'Something dramatic, funny, proud, or terrible. The story you always tell.',
        aiHint:
          'Get the full story: What happened? Who was there? How did it unfold? How did it affect you?'
      },
      {
        id: 'industry-changes',
        question: 'How did your industry or trade change during your career?',
        prompt: 'New technology, new ways of working, things that disappeared. How did you adapt?',
        aiHint:
          'Specific changes: What was it like when you started vs when you finished? What surprised you? What do you miss about the old ways?'
      },
      {
        id: 'wages-money',
        question: 'What did you earn, and what did it mean to you?',
        prompt:
          'Your first wage packet, pay rises, what things cost. How did money shape your working life?',
        aiHint:
          'Specific numbers if they remember: First weekly wage? What could you buy with it? How did earnings change over the years?'
      },
      {
        id: 'work-life-balance',
        question: 'How did you balance work and family?',
        prompt: 'The juggling act, the sacrifices, the guilt, the pride. How did you manage?',
        aiHint:
          'Honest reflection: What did you miss? What did you prioritise? Any regrets? What would you do differently?'
      },
      {
        id: 'last-day-work',
        question: 'Tell me about leaving work for the last time.',
        prompt: 'Retirement, redundancy, or a change of path. What was that final day like?',
        aiHint:
          'The moment: How did it feel walking out? What did colleagues say or do? Were you ready? What did you do the next morning?'
      }
    ]
  },
  {
    id: 'bonus-food-table',
    title: 'Food & the Table',
    subtitle: 'What We Ate and Why It Mattered',
    icon: 'XX',
    color: 'from-amber-50 to-amber-100',
    optional: true,
    questions: [
      {
        id: 'meal-tastes-like-home',
        question: 'What is the meal that tastes like home?',
        prompt: 'The dish that takes you straight back. Who made it? Can you still taste it?',
        aiHint:
          'Sensory deep dive: What was it? The smell, the taste, the texture. Who was at the table? Where were you? Can you still make it?'
      },
      {
        id: 'mum-dad-cooking',
        question: 'What did your mother or father cook best?',
        prompt: 'Their signature dish, the Sunday roast, the thing they were famous for.',
        aiHint:
          'The full picture: What was the dish? How did they make it? Was there a secret ingredient? Did they teach you? Can you still smell it?'
      },
      {
        id: 'school-dinners',
        question: 'What were school dinners like?',
        prompt: 'The canteen, the dinner ladies, the puddings. Was it wonderful or terrible?',
        aiHint:
          'Specific memories: What was served? Favourite and worst meals? The dinner hall itself? Any rituals around lunch?'
      },
      {
        id: 'food-through-decades',
        question: 'How has the food you eat changed over your lifetime?',
        prompt:
          'From post-war simplicity to supermarkets, from meat and two veg to curry and pizza.',
        aiHint:
          'Journey through time: What did you eat as a child? When did new foods arrive? First curry? First takeaway? What changed the most?'
      },
      {
        id: 'best-meal-ever',
        question: 'What is the best meal you have ever had?',
        prompt: 'The food, the place, the company, the occasion. Why was it perfect?',
        aiHint:
          'Every detail: Where were you? Who were you with? What did you eat? What made it special? Could it ever be repeated?'
      },
      {
        id: 'kitchen-disasters',
        question: 'Tell me about a kitchen disaster or a memorable meal gone wrong.',
        prompt: 'The burnt turkey, the collapsed cake, the meal that became a family legend.',
        aiHint:
          'Get the funny story: What happened? Who was there? How bad was it? How does the family remember it now?'
      },
      {
        id: 'family-recipe',
        question: 'Is there a recipe you want to pass down?',
        prompt:
          'A dish that should never be lost. The ingredients, the method, and the story behind it.',
        aiHint:
          'Get the recipe AND the story: Where did it come from? Who taught you? What occasions was it made for? Who should carry it on?'
      },
      {
        id: 'food-and-gathering',
        question: 'What role has food played in bringing people together in your life?',
        prompt:
          'Sunday roasts, Christmas dinners, tea and biscuits with a neighbour. Food as connection.',
        aiHint:
          'Reflective: Pick a gathering centred around food. Who was there? What was served? What did it mean? How has that tradition carried on?'
      }
    ]
  },
  {
    id: 'bonus-service-duty',
    title: 'Service & Duty',
    subtitle: 'Answering the Call',
    icon: 'XXI',
    color: 'from-stone-50 to-stone-100',
    optional: true,
    questions: [
      {
        id: 'called-to-serve',
        question:
          'Were you ever called to serve - in the military, emergency services, or another duty?',
        prompt:
          'National Service, the armed forces, the fire brigade, nursing, policing - or any form of service to others.',
        aiHint:
          'Set the scene: What was the service? When? How did you come to it? Was it a choice or an obligation? How did you feel?'
      },
      {
        id: 'basic-training',
        question: 'What was your training or early days like?',
        prompt:
          'Basic training, first shifts, learning the ropes. The shock, the discipline, the camaraderie.',
        aiHint:
          'First experiences: Where were you sent? What was the hardest part? What surprised you? Who helped you through it?'
      },
      {
        id: 'people-served-with',
        question: 'Tell me about the people you served with.',
        prompt: 'The friends, the leaders, the characters. People you would trust with your life.',
        aiHint:
          'Pick one or two people: What were they like? Where were they from? A specific story together? Are you still in touch?'
      },
      {
        id: 'moment-of-courage',
        question: 'Was there a moment of danger, fear, or courage?',
        prompt: 'A moment when things got real. What happened? How did you respond?',
        aiHint:
          'Handle sensitively: What was the situation? What did you feel? What did you do? How did it change you? Only share what you are comfortable with.'
      },
      {
        id: 'service-changed-you',
        question: 'How did service change you as a person?',
        prompt: 'The discipline, the perspective, the maturity. What did you learn about yourself?',
        aiHint:
          'Deep reflection: Who were you before? Who were you after? What skills or values did you gain? How did it shape the rest of your life?'
      },
      {
        id: 'coming-home-service',
        question: 'What was it like coming home or returning to civilian life?',
        prompt: 'The adjustment, the relief, the strange feeling of normal life again.',
        aiHint:
          'The transition: What did you feel? Was it easy or hard? Did people understand? What did you miss? What were you glad to leave behind?'
      },
      {
        id: 'volunteer-service',
        question: 'Have you volunteered or served your community in other ways?',
        prompt:
          'Scouts, Guides, St John Ambulance, charity work, church, local committees - any service to others.',
        aiHint:
          'If yes: What did you do? Why did it matter to you? Who did you help? A specific memory? How long did you do it for?'
      },
      {
        id: 'service-legacy',
        question: 'What does service mean to you, looking back?',
        prompt:
          'Duty, honour, sacrifice, community - what words sum up what service has meant in your life?',
        aiHint:
          'Final reflection: Would you do it again? What would you tell a young person about service? What did it teach you about people?'
      }
    ]
  },
  {
    id: 'bonus-pets-companions',
    title: 'Pets & Companions',
    subtitle: 'The Animals Who Shared My Life',
    icon: 'XXII',
    color: 'from-amber-50 to-stone-50',
    optional: true,
    questions: [
      {
        id: 'first-pet',
        question: 'What was your first pet?',
        prompt: 'What was it? What was its name? How did it come into your life?',
        aiHint:
          'The full story: What animal? How old were you? Who chose it? First memory of it? What was it like?'
      },
      {
        id: 'pet-meant-most',
        question: 'Which pet has meant the most to you in your life?',
        prompt: 'The one you think of first. Tell me everything about them.',
        aiHint:
          'Build a full picture: Name, breed, personality. How did you get them? What made them special? Their habits, their character, their quirks.'
      },
      {
        id: 'funny-pet-story',
        question: 'Tell me a funny story about one of your animals.',
        prompt: 'The mischief, the chaos, the moments that made everyone laugh.',
        aiHint:
          'Get the full story with humour: What happened? Who was there? How did the animal react? Is it a story the family still tells?'
      },
      {
        id: 'pets-and-children',
        question: 'Did your children grow up with pets?',
        prompt: 'The relationship between your children and their animals. What did it teach them?',
        aiHint:
          'Specific memories: Which pets? How did the children interact with them? Any special bonds? What did animals teach your family?'
      },
      {
        id: 'losing-a-pet',
        question: 'How have you coped with losing a beloved animal?',
        prompt: 'The grief is real. Tell me about saying goodbye.',
        aiHint:
          'Handle with care: Which pet? What happened? How did it affect you? How do you remember them? It is okay to be emotional.'
      },
      {
        id: 'animals-and-comfort',
        question: 'Have animals ever been a source of comfort during difficult times?',
        prompt: 'A faithful dog during a lonely time, a cat who seemed to know when you were sad.',
        aiHint:
          'The bond: What was the situation? How did the animal help? What did they do? How did they make things better?'
      },
      {
        id: 'all-the-animals',
        question: 'Can you name all the pets you have had through your life?',
        prompt: 'A roll call of the animals who shared your home. Names, species, personalities.',
        aiHint:
          'Go through them all: Name each one, what they were, a one-line memory of each. Which was the most mischievous? The most loyal?'
      },
      {
        id: 'what-animals-taught',
        question: 'What have animals taught you about life?',
        prompt:
          'Loyalty, patience, unconditional love, living in the moment - what wisdom have they brought?',
        aiHint:
          'Reflective: What have you learned from animals? How have they made you a better person? What would life have been without them?'
      }
    ]
  },
  {
    id: 'bonus-extraordinary',
    title: 'An Extraordinary Experience',
    subtitle: 'The Story Only You Can Tell',
    icon: 'XXIII',
    color: 'from-stone-50 to-amber-100',
    optional: true,
    questions: [
      {
        id: 'story-waiting-to-tell',
        question: 'Is there a story you have been waiting to tell?',
        prompt:
          'Something that does not fit anywhere else. An experience, a moment, a chapter of your life that deserves its own space.',
        aiHint:
          'Completely open: Let them choose. Give them time and space. Follow wherever the story goes. This is their chapter.'
      },
      {
        id: 'most-unusual-experience',
        question: 'What is the most unusual or unexpected thing that has happened to you?',
        prompt:
          'The thing that surprises people when you tell them. The experience nobody would guess.',
        aiHint:
          'Get the full story: What happened? When? How did it come about? What was it like? How did it change you?'
      },
      {
        id: 'day-changed-everything',
        question: 'Tell me about a day that changed everything.',
        prompt: 'A single day that split your life into before and after. What happened?',
        aiHint:
          'Walk through the day: Where were you? What happened? How did you find out? What did you feel? What changed after that day?'
      },
      {
        id: 'brush-with-fame',
        question: 'Did you ever have a brush with fame or witness something historic?',
        prompt:
          'Meeting someone famous, being at a historic event, seeing something remarkable with your own eyes.',
        aiHint:
          'The details: Who or what? Where were you? What happened? Did anyone believe you? How does it feel looking back?'
      },
      {
        id: 'secret-talent',
        question: 'Is there a hidden talent or achievement most people do not know about?',
        prompt:
          'Something you did, made, won, or accomplished that never got the recognition it deserved.',
        aiHint:
          'Encourage them: What is it? How did you develop it? What happened? Why do so few people know?'
      },
      {
        id: 'against-all-odds',
        question: 'Tell me about a time you did something against all odds.',
        prompt:
          'Something you were told you could not do, or that seemed impossible, but you did it anyway.',
        aiHint:
          'The full arc: What was the challenge? Who doubted you? What did you do? How did it feel to prove them wrong?'
      },
      {
        id: 'life-chapter-title',
        question: 'If this experience were a chapter title, what would it be called?',
        prompt: 'Give your extraordinary story a name. What would the chapter heading say?',
        aiHint:
          'Creative and fun: Let them name it. Then ask why that title. What does it capture? This becomes part of their book.'
      },
      {
        id: 'anything-else-extraordinary',
        question: 'Is there anything else extraordinary you want to share?',
        prompt:
          'Another story, another moment, another experience that deserves a place in your book.',
        aiHint:
          'Final catch-all: This is their overflow. More stories, more detail, more of whatever makes their life unique.'
      }
    ]
  },
  {
    id: 'bonus-own-words',
    title: 'In My Own Words',
    subtitle: 'Your Chapter, Your Way',
    icon: 'XXIV',
    color: 'from-amber-50 to-stone-100',
    optional: true,
    questions: [
      {
        id: 'your-topic',
        question: 'What would you like this chapter to be about?',
        prompt:
          'This is your chapter. You choose the topic. It could be anything at all - something we have not covered, or something you want to explore more deeply.',
        aiHint:
          'Completely open: Let them define the topic. Ask what they want to talk about, then help them structure their thoughts around it.'
      },
      {
        id: 'why-this-matters',
        question: 'Why does this topic matter to you?',
        prompt: 'What draws you to this subject? Why is it important enough for its own chapter?',
        aiHint:
          'Understand the motivation: What is it about this topic that resonates? Is it unfinished business? A passion? A memory that deserves more space?'
      },
      {
        id: 'the-beginning',
        question: 'Where does this story begin?',
        prompt: 'Set the scene. When did this part of your life start? What was happening?',
        aiHint:
          'Anchor them in time and place: When? Where? Who was involved? What were the circumstances?'
      },
      {
        id: 'the-heart-of-it',
        question: 'What is at the heart of this story?',
        prompt: 'The central moment, the key experience, the thing that makes this worth telling.',
        aiHint:
          'Go deep: What is the most important part? What happened at the crucial moment? What did you feel? What did you learn?'
      },
      {
        id: 'the-people-involved',
        question: 'Who are the key people in this story?',
        prompt: 'The people who were there, who were affected, who mattered.',
        aiHint:
          'Build the cast: Who was involved? What were they like? What role did they play? How did they affect the outcome?'
      },
      {
        id: 'how-it-changed-you',
        question: 'How did this experience change you?',
        prompt: 'What did it teach you? How are you different because of it?',
        aiHint:
          'Reflective: Before and after. What did you learn? What would you do differently? How does it shape who you are today?'
      },
      {
        id: 'what-people-should-know',
        question: 'What do you want people to understand about this?',
        prompt: 'If someone reads this chapter in your book, what should they take away from it?',
        aiHint:
          'The message: What is the point of this story? What does it reveal about you? What truth does it contain?'
      },
      {
        id: 'anything-else-own-words',
        question: 'Is there anything else you want to add to this chapter?',
        prompt:
          'More detail, more stories, more reflections. This is your space - use it however you like.',
        aiHint:
          'Open finish: Let them add whatever they want. No restrictions. This is their voice, their story, their way.'
      }
    ]
  }
]
