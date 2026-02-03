/**
 * Request validation schemas for all API endpoints
 * Defines expected fields, types, and constraints
 */

// ============ Auth Schemas ============

export const authSchemas = {
  register: {
    body: {
      email: { type: 'email', required: true },
      password: {
        type: 'string',
        required: true,
        minLength: 8,
        maxLength: 128,
        validate: (v) => {
          if (!/[a-z]/.test(v)) return 'must contain a lowercase letter'
          if (!/[A-Z]/.test(v)) return 'must contain an uppercase letter'
          if (!/[0-9]/.test(v)) return 'must contain a number'
          return true
        }
      },
      name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      birthYear: { type: 'integer', min: 1900, max: new Date().getFullYear() }
    }
  },

  login: {
    body: {
      email: { type: 'email', required: true },
      password: { type: 'string', required: true, minLength: 1, maxLength: 128 }
    }
  },

  googleAuth: {
    body: {
      credential: { type: 'string', required: true, maxLength: 5000 }
    }
  },

  updateProfile: {
    body: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      birthYear: { type: 'integer', min: 1900, max: new Date().getFullYear() }
    }
  }
}

// ============ Stories Schemas ============

export const storySchemas = {
  saveStory: {
    body: {
      chapter_id: { type: 'slug', required: true, maxLength: 50 },
      question_id: { type: 'slug', required: true, maxLength: 50 },
      answer: { type: 'string', maxLength: 100000 },
      total_questions: { type: 'integer', min: 1, max: 50 }
    }
  },

  getChapter: {
    params: {
      chapterId: { type: 'slug', required: true, maxLength: 50 }
    }
  },

  saveSettings: {
    body: {
      name: { type: 'string', maxLength: 100 },
      birth_year: { type: 'integer', min: 1900, max: new Date().getFullYear() }
    }
  }
}

// ============ Photos Schemas ============

export const photoSchemas = {
  deletePhoto: {
    params: {
      id: { type: 'integer', required: true, min: 1 }
    }
  },

  getStoryPhotos: {
    params: {
      storyId: { type: 'integer', required: true, min: 1 }
    }
  },

  getPhotoFile: {
    params: {
      filename: {
        type: 'string',
        required: true,
        maxLength: 255,
        pattern: /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/,
        patternMessage: 'invalid filename format'
      }
    }
  }
}

// ============ AI Schemas ============

export const aiSchemas = {
  interview: {
    body: {
      chapter_id: { type: 'slug', required: true, maxLength: 50 },
      question_id: { type: 'slug', required: true, maxLength: 50 },
      messages: { type: 'array', required: true, maxLength: 100 },
      question_text: { type: 'string', maxLength: 1000 }
    }
  },

  writeStory: {
    body: {
      chapter_id: { type: 'slug', required: true, maxLength: 50 },
      question_id: { type: 'slug', required: true, maxLength: 50 },
      messages: { type: 'array', required: true, maxLength: 100 }
    }
  },

  chat: {
    body: {
      messages: { type: 'array', required: true, maxLength: 100 },
      context: { type: 'string', maxLength: 10000 }
    }
  },

  generateIllustration: {
    body: {
      story_content: { type: 'string', required: true, maxLength: 50000 },
      chapter_id: { type: 'slug', maxLength: 50 }
    }
  }
}

// ============ Game Schemas ============

export const gameSchemas = {
  completePrompt: {
    params: {
      promptId: { type: 'integer', required: true, min: 1 }
    },
    body: {
      answer: { type: 'string', required: true, minLength: 1, maxLength: 100000 },
      audioUrl: { type: 'url', protocols: ['https'] }
    }
  },

  skipPrompt: {
    params: {
      promptId: { type: 'integer', required: true, min: 1 }
    }
  },

  createCircle: {
    body: {
      circleName: { type: 'string', required: true, minLength: 1, maxLength: 100 }
    }
  },

  joinCircle: {
    params: {
      inviteCode: {
        type: 'string',
        required: true,
        maxLength: 20
      }
    },
    body: {
      displayName: { type: 'string', maxLength: 100 }
    }
  },

  promptHistory: {
    query: {
      limit: { type: 'integer', min: 1, max: 100, default: 50 }
    }
  },

  streakHistory: {
    query: {
      days: { type: 'integer', min: 1, max: 365, default: 30 }
    }
  }
}

// ============ Payments Schemas ============

export const paymentSchemas = {
  createCheckout: {
    body: {
      productId: { type: 'string', required: true, enum: ['export', 'audiobook', 'premium'] },
      successUrl: { type: 'url', required: true, protocols: ['https', 'http'] },
      cancelUrl: { type: 'url', required: true, protocols: ['https', 'http'] }
    }
  }
}

// ============ Onboarding Schemas ============

export const onboardingSchemas = {
  savePreference: {
    body: {
      preference_key: { type: 'string', required: true, maxLength: 50 },
      preference_value: { type: 'string', required: true, maxLength: 500 }
    }
  },

  saveContext: {
    body: {
      birth_place: { type: 'string', maxLength: 100 },
      birth_country: { type: 'string', maxLength: 100 },
      birth_year: { type: 'integer', min: 1900, max: new Date().getFullYear() },
      childhood_home: { type: 'string', maxLength: 200 },
      family_members: { type: 'string', maxLength: 1000 },
      key_events: { type: 'string', maxLength: 2000 }
    }
  },

  saveContextForm: {
    body: {
      birth_place: { type: 'string', maxLength: 100 },
      birth_country: { type: 'string', maxLength: 100 },
      birth_year: { type: 'integer', min: 1900, max: new Date().getFullYear() }
    }
  }
}

// ============ Export Schemas ============

export const exportSchemas = {
  // No body needed, uses authenticated user ID
}

// ============ Audiobook Schemas ============

export const audiobookSchemas = {
  downloadFile: {
    params: {
      filename: {
        type: 'string',
        required: true,
        maxLength: 255,
        pattern: /^[a-zA-Z0-9_-]+\.(mp3|m4a|wav)$/,
        patternMessage: 'invalid audio filename'
      }
    }
  }
}

// ============ Support Schemas ============

export const supportSchemas = {
  sendMessage: {
    body: {
      message: { type: 'string', required: true, minLength: 1, maxLength: 5000 },
      sessionId: { type: 'string', maxLength: 100 }
    }
  }
}

// ============ Notifications Schemas ============

export const notificationSchemas = {
  updatePreferences: {
    body: {
      email_enabled: { type: 'boolean' },
      push_enabled: { type: 'boolean' },
      reminder_time: {
        type: 'string',
        pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        patternMessage: 'must be in HH:MM format'
      },
      reminder_days: {
        type: 'array',
        itemType: 'integer',
        maxLength: 7
      }
    }
  }
}

// ============ Style Schemas ============

export const styleSchemas = {
  savePreferences: {
    body: {
      tone: { type: 'string', enum: ['formal', 'casual', 'storytelling', 'reflective'], maxLength: 50 },
      perspective: { type: 'string', enum: ['first', 'third'], maxLength: 20 },
      detail_level: { type: 'string', enum: ['brief', 'moderate', 'detailed'], maxLength: 20 }
    }
  },

  preview: {
    body: {
      story_id: { type: 'integer', required: true, min: 1 },
      style_options: { type: 'string', maxLength: 500 }
    }
  },

  revert: {
    body: {
      story_id: { type: 'integer', required: true, min: 1 }
    }
  }
}
