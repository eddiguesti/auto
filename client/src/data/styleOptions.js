// Writing style options for memoir customization

export const styleOptions = {
  tones: [
    {
      id: 'formal',
      name: 'Formal',
      description: 'Polished and dignified prose',
      sample: 'My father dedicated thirty years of his life to the factory. Despite the weariness that accompanied him home each evening, he consistently made time for our afternoon games of catch in the backyard.',
      prompt: 'Use formal, dignified language with proper grammar and sophisticated vocabulary. Avoid contractions and casual expressions.'
    },
    {
      id: 'conversational',
      name: 'Conversational',
      description: 'Warm and approachable, like talking to a friend',
      sample: "Dad worked at the factory for thirty years, you know? He'd come home tired every single day, but somehow he always found the energy to throw the ball around with me in the backyard. That's just who he was.",
      prompt: 'Write as if speaking directly to a close friend. Use natural speech patterns, contractions, and occasional asides.'
    },
    {
      id: 'nostalgic',
      name: 'Nostalgic',
      description: 'Wistful and reflective, evoking the past',
      sample: 'Those were the days when my father would return from the factory, thirty years of his life given to those worn machines. I can still see him in the golden afternoon light, tired but smiling, reaching for the baseball as if nothing else in the world mattered.',
      prompt: 'Infuse the writing with warm remembrance and wistful reflection. Evoke sensory details that bring the past to life.'
    },
    {
      id: 'humorous',
      name: 'Humorous',
      description: 'Light-hearted and witty observations',
      sample: "My father spent thirty years at that factory—which, looking back, explains why he had the arm of a minor league pitcher. Every evening he'd drag himself through the door looking like he'd wrestled a conveyor belt, but five minutes later? There he was in the backyard, somehow convinced he could still throw a fastball.",
      prompt: 'Include light-hearted observations, gentle self-deprecation, and witty remarks while maintaining the emotional core of the story.'
    }
  ],

  narratives: [
    {
      id: 'first-person-reflective',
      name: 'First-Person Reflective',
      description: 'Personal memories told with mature perspective',
      sample: 'Looking back now, I understand what those evening games of catch really meant. My father gave the factory his days, but he gave me his evenings—tired as he was, that time was sacred.',
      prompt: 'Write in first person with reflective, mature insight. Balance memory with present-day understanding.'
    },
    {
      id: 'third-person',
      name: 'Third-Person Narrative',
      description: 'Your story told as a biographical account',
      sample: "The boy's father worked at the factory for thirty years. Each evening, despite his exhaustion, he would find his son waiting in the backyard with a baseball, and together they would play until the light faded.",
      prompt: 'Write in third person as if describing someone else\'s life story. Maintain emotional intimacy while using objective narrative distance.'
    },
    {
      id: 'present-tense',
      name: 'Present-Tense Vivid',
      description: 'Immersive storytelling that puts readers in the moment',
      sample: "My father pushes through the door, thirty years of factory work written in his shoulders. But then he sees me holding the baseball, and something shifts. He drops his lunchbox, and suddenly we're in the backyard, the ball arcing between us.",
      prompt: 'Write in present tense to create immediacy and immersion. Make readers feel they are experiencing the moment as it happens.'
    }
  ],

  authors: [
    {
      id: 'hemingway',
      name: 'Ernest Hemingway',
      description: 'Sparse, direct, powerful',
      sample: 'Dad worked the factory. Thirty years. He came home tired. But he threw the ball with me. Every day in the backyard. That was enough.',
      prompt: 'Write in the style of Ernest Hemingway: short, declarative sentences. Simple words. No unnecessary adjectives. Let the facts speak. The emotion lives in what is not said.',
      icon: 'book'
    },
    {
      id: 'austen',
      name: 'Jane Austen',
      description: 'Elegant, witty, observant',
      sample: 'It is a truth universally acknowledged that a father, though burdened by thirty years of factory employment, shall nevertheless find himself in possession of sufficient energy for an evening game of catch with his son. My father was such a man, and our backyard ritual became the foundation upon which my fondest memories rest.',
      prompt: 'Write in the style of Jane Austen: elegant sentence structure, gentle irony, keen social observation, and refined vocabulary. Balance wit with genuine sentiment.',
      icon: 'feather'
    },
    {
      id: 'angelou',
      name: 'Maya Angelou',
      description: 'Poetic, rhythmic, soulful',
      sample: 'Thirty years my father gave to that factory, surrendering his mornings to machines and his afternoons to necessity. Yet each evening, weary as the setting sun, he would find new life in our backyard ritual—the ball arcing between us like whispered promises, like love made visible.',
      prompt: 'Write in the style of Maya Angelou: poetic rhythm, rich imagery, spiritual depth. Use metaphor and repetition for emphasis. Let the prose sing with dignity and soul.',
      icon: 'sun'
    },
    {
      id: 'twain',
      name: 'Mark Twain',
      description: 'Folksy, humorous, distinctly American',
      sample: "Now, my father worked at that factory for thirty years, which is about twenty-nine years longer than any sensible man would tolerate. But every evening he'd come dragging home, looking like he'd been wrestling with the machinery itself, and somehow find the gumption to play catch with me. I reckon that's what fathers are made of.",
      prompt: 'Write in the style of Mark Twain: folksy American voice, dry humor, vernacular expressions, and sharp observations about human nature. Be warm but never sentimental.',
      icon: 'anchor'
    }
  ]
}

// Helper function to build the AI prompt based on selections
export function buildStylePrompt(tones = [], narrative = null, authorStyle = null) {
  const parts = []

  parts.push('Transform this autobiography passage while preserving ALL facts, names, dates, and specific details exactly as stated.')
  parts.push('')
  parts.push('STYLE REQUIREMENTS:')

  // Add tone instructions
  if (tones.length > 0) {
    const selectedTones = styleOptions.tones.filter(t => tones.includes(t.id))
    parts.push('')
    parts.push('TONES:')
    selectedTones.forEach(tone => {
      parts.push(`- ${tone.name}: ${tone.prompt}`)
    })
  }

  // Add narrative instruction
  if (narrative) {
    const selectedNarrative = styleOptions.narratives.find(n => n.id === narrative)
    if (selectedNarrative) {
      parts.push('')
      parts.push('NARRATIVE STYLE:')
      parts.push(`- ${selectedNarrative.name}: ${selectedNarrative.prompt}`)
    }
  }

  // Add author style instruction
  if (authorStyle) {
    const selectedAuthor = styleOptions.authors.find(a => a.id === authorStyle)
    if (selectedAuthor) {
      parts.push('')
      parts.push('AUTHOR INSPIRATION:')
      parts.push(`- ${selectedAuthor.name}: ${selectedAuthor.prompt}`)
    }
  }

  parts.push('')
  parts.push('CRITICAL RULES:')
  parts.push('- Preserve ALL facts, names, dates, and specific details exactly')
  parts.push('- Output should be roughly the same length as the input')
  parts.push('- Do not add fictional details or embellishments')
  parts.push('- Do not remove any factual information')
  parts.push('- Maintain the original meaning and emotional intent')
  parts.push('')
  parts.push('ORIGINAL TEXT:')

  return parts.join('\n')
}

export default styleOptions
