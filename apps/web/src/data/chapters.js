export const chapters = [
  {
    id: 'earliest-memories',
    title: 'Earliest Memories',
    subtitle: 'Ages 0-5',
    icon: 'I',
    color: 'from-amber-50 to-amber-100',
    questions: [
      // Warmup - easy facts first
      {
        id: 'birth-details',
        question: "Where were you born?",
        prompt: "The hospital, city, or country. Do you know the time of day or any stories about the day you arrived?",
        aiHint: "Start simple: get the place and date. Then ask if they know any stories their parents told about that day."
      },
      {
        id: 'first-memory',
        question: "What's your very first memory?",
        prompt: "Don't worry if it's fuzzy - describe what you see, hear, or feel. Even fragments are precious.",
        aiHint: "Follow-up sequence: 1) Where were you? 2) What did you see/hear? 3) Who was there? 4) How did you feel?"
      },
      {
        id: 'childhood-home',
        question: "What did your childhood home look like?",
        prompt: "Walk me through the front door. What would I see, smell, hear?",
        aiHint: "Start with layout/rooms, then ask about specific sensory details: What did it smell like? What sounds do you remember? Which room was your favourite?"
      },
      {
        id: 'childhood-bedroom',
        question: "What was your bedroom like as a small child?",
        prompt: "The bed, the walls, the window view. What did you see when you woke up?",
        aiHint: "Ask about: wallpaper/posters, what they could see from the window, any night-time fears or comforts"
      },
      {
        id: 'important-people',
        question: "Who were the important people around you?",
        prompt: "Describe one person who made you feel safe and loved.",
        aiHint: "Get specifics: What did they look like? What did they smell like? What did their voice sound like? A specific moment with them."
      },
      {
        id: 'early-smells-sounds',
        question: "What smells or sounds take you back to early childhood?",
        prompt: "Think about cooking, music, voices, the outdoors, a particular room...",
        aiHint: "This is a sensory trigger question - dig into each sense they mention. What memory does that smell bring back? Who does that sound remind you of?"
      },
      {
        id: 'early-favorite-toy',
        question: "Did you have a favourite toy or comfort object?",
        prompt: "What was it? Where did it come from? What happened to it?",
        aiHint: "Ask about the emotional attachment: Did it have a name? Where did you take it? Do you still have it or know what happened to it?"
      },
      {
        id: 'early-food',
        question: "What foods do you remember from early childhood?",
        prompt: "Special treats, everyday meals, things you loved or hated.",
        aiHint: "Connect food to people and moments: Who made it? When did you have it? Can you still taste it in your memory?"
      }
    ]
  },
  {
    id: 'childhood',
    title: 'Childhood',
    subtitle: 'Ages 6-12',
    icon: 'II',
    color: 'from-stone-50 to-stone-100',
    questions: [
      // Warmup
      {
        id: 'childhood-home-address',
        question: "Where did you live during these years?",
        prompt: "The address, the neighbourhood, the type of home. Did you move at all?",
        aiHint: "Simple facts first, then: What was the neighbourhood like? Who were the neighbours? What was outside your door?"
      },
      {
        id: 'childhood-games',
        question: "What games did you play?",
        prompt: "Who did you play with? Were you outside or inside? What made it fun?",
        aiHint: "Ask for ONE specific game in detail: How did you play? Any made-up rules? Best memory of playing it?"
      },
      {
        id: 'summer-holidays',
        question: "Describe a typical summer day during the holidays.",
        prompt: "From when you woke up to when you went to bed - what filled your days?",
        aiHint: "Walk through the day: What time did you wake up? What did you eat? Where did you go? When did you come home? What was the best part?"
      },
      {
        id: 'childhood-adventure',
        question: "Tell me about an adventure you had as a child.",
        prompt: "Exploring somewhere, building something, discovering something new.",
        aiHint: "Get the story: Where did you go? Who was with you? What happened? Were you scared or excited? Did anyone find out?"
      },
      {
        id: 'mischief',
        question: "What got you into trouble?",
        prompt: "Tell me about a time you were mischievous. Did you get caught?",
        aiHint: "Get the full story: What did you do? Why? Who caught you? What was the punishment? Looking back, was it worth it?"
      },
      {
        id: 'fears-excitements',
        question: "What scared you as a child? What excited you?",
        prompt: "Think about both the dark corners and the bright moments.",
        aiHint: "Explore one fear deeply: Where did it come from? Did you ever overcome it? Then do the same for an excitement."
      },
      {
        id: 'best-friend',
        question: "Who was your best friend?",
        prompt: "What adventures did you have together? Are you still in touch?",
        aiHint: "Get specifics: What was their name? Where did you meet? What did you do together? A specific memory with them?"
      },
      {
        id: 'family-traditions',
        question: "What family traditions do you remember?",
        prompt: "Holidays, Sunday dinners, birthday rituals - what made your family unique?",
        aiHint: "Pick one tradition and go deep: Who started it? What exactly happened? What did it feel like? Does anyone still do it?"
      },
      {
        id: 'childhood-christmas',
        question: "What were Christmases (or holidays) like?",
        prompt: "The decorations, the food, the presents, the people. Paint the picture.",
        aiHint: "Sensory details: What did the house look like? Smell like? What sounds? A specific gift you remember?"
      },
      {
        id: 'childhood-pet',
        question: "Did you have any pets growing up?",
        prompt: "What were they? What were their names? Any stories about them?",
        aiHint: "If yes, get the details: How did you get them? Personality? Favourite memory? What happened to them?"
      }
    ]
  },
  {
    id: 'school-days',
    title: 'School Days',
    subtitle: 'Education Years',
    icon: 'III',
    color: 'from-amber-50 to-stone-100',
    questions: [
      // Warmup
      {
        id: 'schools-attended',
        question: "What schools did you go to?",
        prompt: "Names, locations, how you got there each day.",
        aiHint: "Start with facts: Names, years, how did you get there? Then: What did the building look like? Any strong first impressions?"
      },
      {
        id: 'first-day-school',
        question: "What do you remember about your first day of school?",
        prompt: "Were you excited? Scared? Who took you? What happened?",
        aiHint: "Walk through the day: Who took you? What did you wear? What do you remember seeing? How did you feel by the end?"
      },
      {
        id: 'school-building',
        question: "Describe your school building.",
        prompt: "The classrooms, the playground, the smells, the sounds.",
        aiHint: "Sensory focus: What did the hallways smell like? What sounds do you remember? Favourite and least favourite places in the building?"
      },
      {
        id: 'favourite-teacher',
        question: "Who was your favourite teacher and why?",
        prompt: "What did they teach you - in class and about life?",
        aiHint: "Get specific: What did they look like? How did they speak? A specific moment when they made a difference? Did you ever thank them?"
      },
      {
        id: 'worst-teacher',
        question: "Was there a teacher you didn't get along with?",
        prompt: "What made it difficult? How did you cope?",
        aiHint: "No need to dwell, but: What happened? How did it affect you? Any lesson learned from the experience?"
      },
      {
        id: 'subjects',
        question: "What subjects did you love? What did you struggle with?",
        prompt: "What made certain subjects click or not click for you?",
        aiHint: "Pick one subject they loved: What specifically hooked you? A project or moment you remember? Did it shape your path?"
      },
      {
        id: 'school-friend',
        question: "Tell me about a school friend.",
        prompt: "What did you do together? Any memorable moments?",
        aiHint: "Get the name and story: How did you meet? What made them a good friend? Funniest or best memory together?"
      },
      {
        id: 'school-lunch',
        question: "What were school lunches like?",
        prompt: "Packed lunch or canteen? What did you eat? Who did you sit with?",
        aiHint: "Simple but evocative: What was in your lunchbox? Or what did the canteen serve? Where did you sit? What did you talk about?"
      },
      {
        id: 'future-dreams',
        question: "What did you want to be when you grew up?",
        prompt: "What sparked that dream? Did it change over time?",
        aiHint: "Explore the dream: Where did the idea come from? What did you imagine it would be like? How close did life come to that dream?"
      },
      {
        id: 'school-achievement',
        question: "What achievement or moment at school made you proud?",
        prompt: "Academic, sports, arts, or something else entirely?",
        aiHint: "Get the full story: What happened? How did you prepare? Who was there to see it? How did it feel in that moment?"
      }
    ]
  },
  {
    id: 'teenage-years',
    title: 'Teenage Years',
    subtitle: 'Coming of Age',
    icon: 'IV',
    color: 'from-stone-50 to-amber-50',
    questions: [
      // Warmup
      {
        id: 'teen-appearance',
        question: "What did you look like as a teenager?",
        prompt: "Your hair, your clothes, your style. How did you want to be seen?",
        aiHint: "Fun warmup: Describe a photo from that time. What were you wearing? What was your hair like? What did you think looked cool?"
      },
      {
        id: 'teen-music-culture',
        question: "What music did you listen to? What was cool?",
        prompt: "Describe the culture, fashion, and trends of your teenage years.",
        aiHint: "Get specific: Name bands, songs that mattered. Where did you listen to music? Did you have posters on your wall? Go to concerts?"
      },
      {
        id: 'teen-bedroom',
        question: "What was your teenage bedroom like?",
        prompt: "The posters, the mess, the privacy. Your personal space.",
        aiHint: "Walk through it: What was on the walls? Where did you keep your treasures? What did you do in there? Any secrets hidden?"
      },
      {
        id: 'first-romance',
        question: "Tell me about your first crush or first date.",
        prompt: "What were they like? What happened? How did you feel?",
        aiHint: "Get the story gently: Who were they? How did you meet? What happened? Even if it's embarrassing now, those feelings were real."
      },
      {
        id: 'teen-friendship',
        question: "Who were your closest friends as a teenager?",
        prompt: "What did you do together? What made those friendships special?",
        aiHint: "Focus on one friend: Name, how you met, what you did together, a specific memory. Are you still in touch?"
      },
      {
        id: 'parents-teen',
        question: "What were your parents like during this time?",
        prompt: "Were there conflicts? Understanding moments? How did the relationship change?",
        aiHint: "Balance is key: A moment of conflict AND a moment of connection. How do you understand their perspective now?"
      },
      {
        id: 'teen-ambition',
        question: "What was your biggest dream or ambition?",
        prompt: "What did you believe was possible? What were you striving for?",
        aiHint: "Explore the dream: Where did it come from? What did you do to pursue it? Did anyone support or discourage you?"
      },
      {
        id: 'defining-moment-teen',
        question: "Tell me about a moment that changed how you saw the world.",
        prompt: "Something that shifted your perspective, opened your eyes, or made you think differently.",
        aiHint: "This is deep - give them time. What happened? What did you believe before? What changed? How did it affect your choices?"
      },
      {
        id: 'teen-rebellion',
        question: "Did you ever rebel? Push boundaries?",
        prompt: "What did you do? How did it turn out?",
        aiHint: "Get the story: What did you do? Why? Did you get caught? Looking back, what was that really about?"
      },
      {
        id: 'teen-job',
        question: "Did you have any jobs as a teenager?",
        prompt: "Saturday jobs, paper rounds, helping out. Your first taste of earning.",
        aiHint: "If yes: What was the job? How much did you earn? What did you spend it on? Any memorable moments or people?"
      },
      {
        id: 'leaving-school',
        question: "How did you feel when your school years ended?",
        prompt: "Relief? Sadness? Excitement? What came next?",
        aiHint: "The transition: Last day memories? What were you looking forward to? What were you leaving behind? Any regrets?"
      }
    ]
  },
  {
    id: 'key-people',
    title: 'Key People',
    subtitle: 'Those Who Shaped You',
    icon: 'V',
    color: 'from-amber-50 to-amber-100',
    questions: [
      {
        id: 'mother',
        question: "Tell me about your mother.",
        prompt: "What was she like? What did she look like? What do you remember most about her?",
        aiHint: "Build a full picture: Physical description, personality, her voice, her habits. Then: A specific memory that captures who she was. What did she teach you?"
      },
      {
        id: 'father',
        question: "Tell me about your father.",
        prompt: "What was he like? What did he do? What do you remember most about him?",
        aiHint: "Same approach: Physical description, personality, how he spoke. A specific memory. What did he teach you? How did you relate?"
      },
      {
        id: 'siblings',
        question: "Tell me about your brothers and sisters.",
        prompt: "Names, ages, what they were like. Your relationship with them.",
        aiHint: "Take each sibling in turn if multiple: Name, personality, a memory together. How has the relationship changed over time?"
      },
      {
        id: 'grandparents',
        question: "What do you remember about your grandparents?",
        prompt: "Did you know them? What were they like? Where did they live?",
        aiHint: "For each grandparent they knew: What did they look like? Their house? A specific memory? What stories did they tell?"
      },
      {
        id: 'extended-family',
        question: "Were there aunts, uncles, or cousins who were important to you?",
        prompt: "Family gatherings, special relationships, memorable characters.",
        aiHint: "Pick one or two and go deep: Who were they? What made them memorable? A specific story involving them?"
      },
      {
        id: 'mentor',
        question: "Was there someone outside your family who really influenced you?",
        prompt: "A teacher, neighbour, coach, boss, friend's parent - someone who made a difference.",
        aiHint: "Get the story: Who were they? How did you know them? What did they do that mattered? Did you ever tell them?"
      },
      {
        id: 'lost-loved-one',
        question: "Is there someone you've lost that you'd like to talk about?",
        prompt: "Someone who's no longer here but still matters deeply to you.",
        aiHint: "Handle with care. Let them share at their own pace. Ask: What would you want people to know about them? What do you miss most?"
      },
      {
        id: 'lifelong-friend',
        question: "Who has been your longest or closest friend?",
        prompt: "How did you meet? What keeps the friendship going?",
        aiHint: "The full arc: How you met, key moments in the friendship, what makes it work, a favourite memory together."
      }
    ]
  },
  {
    id: 'young-adulthood',
    title: 'Young Adulthood',
    subtitle: 'Starting Out',
    icon: 'VI',
    color: 'from-stone-50 to-stone-100',
    questions: [
      // Warmup
      {
        id: 'leaving-home',
        question: "When did you leave home? Where did you go?",
        prompt: "Moving out, going to university, starting work - that first step into independence.",
        aiHint: "The transition: How old were you? Where did you go? How did it feel? What did you take with you?"
      },
      {
        id: 'young-adult-living',
        question: "Where did you live during this time?",
        prompt: "Describe your first flat, house, or living situation. What was life like?",
        aiHint: "Paint the picture: What did the place look like? Who else was there? What was the neighbourhood like? Best and worst things about it?"
      },
      {
        id: 'first-job',
        question: "What was your first real job?",
        prompt: "How did you get it? What did you learn? What do you remember most?",
        aiHint: "Full story: How did you find it? First day nerves? The people? What skills did you learn? How much did you earn?"
      },
      {
        id: 'career-path',
        question: "How did your career unfold?",
        prompt: "The jobs, the changes, the decisions that shaped your working life.",
        aiHint: "Key turning points: Jobs you loved, jobs you hated, decisions that changed direction. What are you proudest of from your working years?"
      },
      {
        id: 'meeting-partner',
        question: "How did you meet your partner/spouse?",
        prompt: "Tell me the whole story - where, when, what you noticed about them.",
        aiHint: "The full romance: Where did you meet? First impression? First conversation? When did you know they were special? The proposal?"
      },
      {
        id: 'wedding-day',
        question: "Tell me about your wedding day.",
        prompt: "The venue, the dress/suit, the guests, the moments that stand out.",
        aiHint: "Walk through the day: Getting ready, the ceremony, the reception. What went wrong? What went perfectly? How did you feel?"
      },
      {
        id: 'first-home-together',
        question: "What was your first home together like?",
        prompt: "The place where you started building a life together.",
        aiHint: "Describe it: Size, location, what you loved and hated about it. How did you make it yours? Funny early-days stories?"
      },
      {
        id: 'life-decisions',
        question: "What decisions shaped your path?",
        prompt: "Think about crossroads moments - choices that sent you one direction instead of another.",
        aiHint: "Pick one decision and explore: What were the options? Why did you choose what you chose? How would life be different if you'd chosen differently?"
      },
      {
        id: 'young-adult-challenges',
        question: "What was the hardest thing about this period?",
        prompt: "What challenges did you face? How did you handle them?",
        aiHint: "One challenge in depth: What happened? How did you cope? Who helped? What did you learn about yourself?"
      },
      {
        id: 'young-adult-joy',
        question: "What brought you the most joy during these years?",
        prompt: "Friends, adventures, achievements - what lit you up?",
        aiHint: "Pick a specific joy and tell the story: What was it? Why did it matter so much? A peak moment of happiness?"
      }
    ]
  },
  {
    id: 'family-career',
    title: 'Family & Career',
    subtitle: 'Building a Life',
    icon: 'VII',
    color: 'from-amber-50 to-stone-50',
    questions: [
      {
        id: 'becoming-parent',
        question: "Tell me about becoming a parent.",
        prompt: "The moment you knew, the preparations, the day they arrived - how did it feel?",
        aiHint: "The full journey: Finding out, the pregnancy/wait, the birth day itself. That first moment holding them. How did life change?"
      },
      {
        id: 'naming-children',
        question: "How did you choose your children's names?",
        prompt: "The discussions, the meanings, the family names.",
        aiHint: "For each child: What names were considered? Why did you pick what you picked? Any regrets or alternatives?"
      },
      {
        id: 'children-as-babies',
        question: "What were your children like as babies?",
        prompt: "Their personalities from the start. The sleepless nights, the first laughs, the chaos.",
        aiHint: "Pick one child or moment: What were they like? A specific memory from those early days? What surprised you about parenthood?"
      },
      {
        id: 'parenting-moments',
        question: "What's a moment with your children that you'll never forget?",
        prompt: "Funny, touching, proud - a moment that defined being their parent.",
        aiHint: "Get the full story: What happened? How old were they? What did it teach you? Why does it stay with you?"
      },
      {
        id: 'family-home',
        question: "Describe the home where you raised your family.",
        prompt: "The house, the garden, the neighbourhood. Where the memories were made.",
        aiHint: "Walk through it: Favourite room? Where did family gather? The sounds of that house? Neighbours and neighbourhood?"
      },
      {
        id: 'family-traditions-created',
        question: "What traditions did you create for your family?",
        prompt: "Things that became 'your family things' - annual events, rituals, sayings.",
        aiHint: "Pick one tradition: How did it start? What exactly happens? What does it mean to you? Will it continue?"
      },
      {
        id: 'proudest-work',
        question: "What work are you most proud of?",
        prompt: "Projects, achievements, contributions - what matters most when you look back?",
        aiHint: "One achievement in depth: What was it? What did it take? Who helped? How did it feel when it succeeded?"
      },
      {
        id: 'career-lessons',
        question: "What did your career teach you about life?",
        prompt: "Beyond the job itself - what wisdom came from your working years?",
        aiHint: "Concrete lessons: A mistake that taught you something. A mentor who shaped you. A success that surprised you."
      },
      {
        id: 'challenges-overcome',
        question: "What challenges did you overcome during these years?",
        prompt: "Times when things were hard but you found a way through.",
        aiHint: "One challenge deeply: What happened? How bad did it get? What got you through? How are you different because of it?"
      },
      {
        id: 'family-holidays',
        question: "Tell me about family holidays.",
        prompt: "Where did you go? Disasters and triumphs. The car journeys, the memories.",
        aiHint: "Pick one memorable holiday: Where did you go? What happened? Funny disaster stories? A perfect moment?"
      }
    ]
  },
  {
    id: 'world-around-you',
    title: 'The World Around You',
    subtitle: 'History & Culture',
    icon: 'VIII',
    color: 'from-stone-50 to-amber-50',
    questions: [
      {
        id: 'world-events-childhood',
        question: "What big world events do you remember from childhood?",
        prompt: "News stories, historical moments, things adults talked about.",
        aiHint: "Pick one event: How did you hear about it? What did you understand at the time? How did adults react? How do you see it now?"
      },
      {
        id: 'technology-changes',
        question: "How has technology changed during your lifetime?",
        prompt: "From your first phone call to smartphones. What changes amazed you most?",
        aiHint: "Specific firsts: First TV, first computer, first mobile phone. What did you think? What do you miss about the old ways?"
      },
      {
        id: 'historical-moment',
        question: "Where were you when [a major historical event] happened?",
        prompt: "Moon landing, fall of Berlin Wall, 9/11 - moments that stopped the world.",
        aiHint: "Pick one they remember: Where were you? What were you doing? How did you hear? What did you feel? How did life change after?"
      },
      {
        id: 'social-changes',
        question: "What social changes have you witnessed?",
        prompt: "How people live, work, and treat each other - what's changed for better or worse?",
        aiHint: "Pick one change: What was it like before? When did you notice the change? What do you think about it? What would younger you think?"
      },
      {
        id: 'neighbourhood-changes',
        question: "How has your area changed over the years?",
        prompt: "The places, the people, the character of where you've lived.",
        aiHint: "Specific changes: Buildings that are gone, shops that closed, how people are different. What do you miss? What's better?"
      },
      {
        id: 'prices-then-now',
        question: "What do you remember about prices and money?",
        prompt: "What things cost, what you earned, how money felt different.",
        aiHint: "Specific examples: First wage? Cost of first house? A pint of milk? What could you buy as a child with pocket money?"
      },
      {
        id: 'music-across-life',
        question: "What music has been the soundtrack to your life?",
        prompt: "Songs that take you back, artists you loved, music that marked different eras.",
        aiHint: "Pick songs from different eras: What song is the 60s/70s/80s for you? Where does a certain song take you back to?"
      },
      {
        id: 'cultural-entertainment',
        question: "What entertainment do you remember from different eras?",
        prompt: "Films, TV shows, radio programmes - what did you watch and listen to?",
        aiHint: "Specific shows or films: What did you watch as a family? What was your guilty pleasure? Something you'd love people today to see?"
      }
    ]
  },
  {
    id: 'passions-beliefs',
    title: 'Passions & Beliefs',
    subtitle: 'What Matters to You',
    icon: 'IX',
    color: 'from-amber-50 to-amber-100',
    questions: [
      {
        id: 'hobbies',
        question: "What hobbies or interests have been important to you?",
        prompt: "Things you love to do, skills you've developed, passions you've pursued.",
        aiHint: "Pick one hobby deeply: How did you discover it? What do you love about it? A peak moment or achievement? Who shares it with you?"
      },
      {
        id: 'sports-teams',
        question: "Did you support a sports team or play any sports?",
        prompt: "The victories, defeats, match days, and memories.",
        aiHint: "If yes: Which team? How did you become a fan? Best match you saw? Any playing memories? What does it mean to you?"
      },
      {
        id: 'faith-spirituality',
        question: "What role has faith or spirituality played in your life?",
        prompt: "Religious beliefs, spiritual experiences, how your views have evolved.",
        aiHint: "Handle respectfully: How were you raised? Has it changed? What do you believe now? How has it helped you through difficult times?"
      },
      {
        id: 'values',
        question: "What values have guided your life?",
        prompt: "The principles you've tried to live by. Where did they come from?",
        aiHint: "Pick one or two values: What are they? Where did you learn them? A time when you had to stand by them? A time you fell short?"
      },
      {
        id: 'causes',
        question: "Have there been causes or issues you've cared deeply about?",
        prompt: "Things you've supported, fought for, or believed in strongly.",
        aiHint: "If yes: What cause? Why does it matter to you? What have you done about it? How have your views evolved?"
      },
      {
        id: 'travel',
        question: "What's the most memorable place you've ever visited?",
        prompt: "Holidays, adventures, places that changed you or took your breath away.",
        aiHint: "Pick one place: When did you go? What made it special? Sights, sounds, smells? Would you go back? What did you learn?"
      },
      {
        id: 'books-learning',
        question: "What books or ideas have influenced you?",
        prompt: "Things you've read, learned, or discovered that shaped how you think.",
        aiHint: "Pick one book or idea: What was it? When did you encounter it? How did it change you?"
      },
      {
        id: 'creative-pursuits',
        question: "Have you done anything creative in your life?",
        prompt: "Art, writing, music, crafts, building, making - things you've created.",
        aiHint: "If yes: What do you create? How did you start? What have you made that you're proud of? What does it give you?"
      }
    ]
  },
  {
    id: 'wisdom-reflections',
    title: 'Wisdom & Reflections',
    subtitle: 'Looking Back',
    icon: 'X',
    color: 'from-stone-50 to-stone-100',
    questions: [
      {
        id: 'wisdom-for-younger-self',
        question: "What do you know now that you wish you knew at 20?",
        prompt: "The lessons that took time to learn, the perspective that came with age.",
        aiHint: "Pick specific lessons: About work? Love? Money? Happiness? What would you tell your younger self?"
      },
      {
        id: 'proudest-moments',
        question: "What moments are you most proud of?",
        prompt: "Not just achievements - moments when you became who you wanted to be.",
        aiHint: "One or two moments: What happened? Why does it matter? What did it take? Why does it make you proud?"
      },
      {
        id: 'regrets',
        question: "Is there anything you wish you'd done differently?",
        prompt: "Paths not taken, words not said, choices you'd reconsider.",
        aiHint: "Handle gently: What is it? What stopped you at the time? How do you feel about it now? Any peace you've made with it?"
      },
      {
        id: 'marriage-lessons',
        question: "What have you learned about love and marriage?",
        prompt: "The secrets to making it work, the hard parts, the rewards.",
        aiHint: "Real wisdom: What makes a relationship last? What was hardest? What would you tell a young couple today?"
      },
      {
        id: 'parenting-lessons',
        question: "What have you learned about being a parent?",
        prompt: "What worked, what you'd do differently, what surprised you.",
        aiHint: "Honest reflection: What did you get right? What would you change? What do you hope you passed on?"
      },
      {
        id: 'message-to-grandchildren',
        question: "What would you tell your grandchildren about life?",
        prompt: "The essential truths you've discovered, the advice you'd want to pass on.",
        aiHint: "Their legacy: What matters most? What should they know about the world? About your family? About themselves?"
      },
      {
        id: 'how-remembered',
        question: "How do you want to be remembered?",
        prompt: "When people speak of you, what do you hope they say?",
        aiHint: "Deep question - give them time: What matters to you? How do you want to be described? What's your legacy?"
      },
      {
        id: 'unexpected-blessings',
        question: "What unexpected blessings has life brought you?",
        prompt: "Things you didn't plan for or expect that became treasures.",
        aiHint: "Specific surprises: What happened? Why was it unexpected? How did it change things? What does it mean to you now?"
      },
      {
        id: 'gratitude',
        question: "What are you most grateful for?",
        prompt: "People, experiences, moments - what fills you with gratitude?",
        aiHint: "Let them reflect: Who? What? If it's a person - what would you say to them? If it's something abstract - why does it matter?"
      },
      {
        id: 'final-words',
        question: "Is there anything else you want people to know?",
        prompt: "Anything we haven't covered. Anything left unsaid. Your final words for the book.",
        aiHint: "Open-ended finish: What matters that we haven't touched? Any last stories? Anything for specific people? This is their chance."
      }
    ]
  }
];
