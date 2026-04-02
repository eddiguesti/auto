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
        validate: v => {
          if (!/[a-z]/.test(v)) return 'must contain a lowercase letter'
          if (!/[A-Z]/.test(v)) return 'must contain an uppercase letter'
          if (!/[0-9]/.test(v)) return 'must contain a number'
          return true
        }
      },
      name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      birthYear: { type: 'integer', min: 1900, max: new Date().getFullYear() },
      // Bot protection fields
      _hp: { type: 'string', maxLength: 500 }, // honeypot - should be empty
      _ts: { type: 'integer' } // form load timestamp
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
      transcripts: { type: 'array', required: true, maxLength: 200 }
    }
  },

  saveContextForm: {
    body: {
      name: { type: 'string', maxLength: 100 },
      birthPlace: { type: 'string', maxLength: 100 },
      birthCountry: { type: 'string', maxLength: 100 },
      birthYear: { type: 'integer', min: 1900, max: new Date().getFullYear() },
      additionalContext: { type: 'string', maxLength: 5000 }
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
      preferences: { type: 'string', maxLength: 2000 },
      preferredPromptTime: {
        type: 'string',
        pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        patternMessage: 'must be in HH:MM format'
      },
      timezone: { type: 'string', maxLength: 100 }
    }
  }
}

// ============ Style Schemas ============

export const styleSchemas = {
  savePreferences: {
    body: {
      tones: { type: 'array', maxLength: 10 },
      narrative: { type: 'string', maxLength: 200 },
      authorStyle: { type: 'string', maxLength: 200 }
    }
  },

  preview: {
    body: {
      storyId: { type: 'integer', required: true, min: 1 },
      tones: { type: 'array', maxLength: 10 },
      narrative: { type: 'string', maxLength: 200 },
      authorStyle: { type: 'string', maxLength: 200 }
    }
  },

  applyAll: {
    body: {
      tones: { type: 'array', maxLength: 10 },
      narrative: { type: 'string', maxLength: 200 },
      authorStyle: { type: 'string', maxLength: 200 }
    }
  },

  revert: {
    body: {
      story_id: { type: 'integer', min: 1 }
    }
  }
}

// ============ Covers Schemas ============

export const coverSchemas = {
  save: {
    body: {
      templateId: { type: 'string', maxLength: 50 },
      title: { type: 'string', maxLength: 200 },
      author: { type: 'string', maxLength: 200 },
      spineText: { type: 'string', maxLength: 200 },
      colorScheme: { type: 'string', maxLength: 2000 },
      customSettings: { type: 'string', maxLength: 5000 }
    }
  }
}

// ============ Memos Schemas ============

export const memoSchemas = {
  create: {
    body: {
      title: { type: 'string', maxLength: 500 },
      audio_url: { type: 'url', required: true, protocols: ['https'] },
      transcript: { type: 'string', maxLength: 100000 },
      duration: { type: 'number', min: 0, max: 36000 }
    }
  },

  update: {
    body: {
      title: { type: 'string', maxLength: 500 }
    }
  }
}

// ============ Refund Schemas ============

export const refundSchemas = {
  request: {
    body: {
      paymentId: { type: 'integer', min: 1 },
      reason: { type: 'string', maxLength: 2000 },
      type: {
        type: 'string',
        required: true,
        enum: ['guarantee', 'cooling_off', 'faulty', 'other']
      }
    }
  }
}

// ============ Chapter Review Schemas ============

export const chapterReviewSchemas = {
  getOrRewrite: {
    params: {
      chapterId: { type: 'slug', required: true, maxLength: 50 }
    }
  },

  clioEdit: {
    params: {
      chapterId: { type: 'slug', required: true, maxLength: 50 }
    },
    body: {
      instruction: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
      currentText: { type: 'string', required: true, minLength: 1, maxLength: 15000 },
      clioHistory: { type: 'array', maxLength: 100 }
    }
  },

  save: {
    params: {
      chapterId: { type: 'slug', required: true, maxLength: 50 }
    },
    body: {
      polishedText: { type: 'string', required: true, minLength: 1, maxLength: 100000 }
    }
  }
}

// ============ Free Story Schemas ============

export const freeStorySchemas = {
  list: {
    query: {
      limit: { type: 'integer', min: 1, max: 100, default: 50 },
      offset: { type: 'integer', min: 0, default: 0 }
    }
  },

  byId: {
    params: {
      id: { type: 'integer', required: true, min: 1 }
    }
  },

  create: {
    body: {
      content: { type: 'string', required: true, minLength: 1, maxLength: 100000 },
      title: { type: 'string', maxLength: 200 }
    }
  },

  update: {
    params: {
      id: { type: 'integer', required: true, min: 1 }
    },
    body: {
      content: { type: 'string', minLength: 1, maxLength: 100000 },
      title: { type: 'string', maxLength: 200 }
    }
  }
}

// ============ Admin Schemas ============

export const adminSchemas = {
  listUsers: {
    query: {
      page: { type: 'integer', min: 1, default: 1 },
      limit: { type: 'integer', min: 1, max: 100, default: 20 },
      q: { type: 'string', maxLength: 200 }
    }
  },

  userById: {
    params: {
      id: { type: 'integer', required: true, min: 1 }
    }
  },

  grantPremium: {
    params: {
      id: { type: 'integer', required: true, min: 1 }
    },
    body: {
      months: { type: 'integer', required: true, min: 1, max: 120 }
    }
  },

  listPayments: {
    query: {
      page: { type: 'integer', min: 1, default: 1 },
      limit: { type: 'integer', min: 1, max: 100, default: 20 }
    }
  },

  processRefund: {
    params: {
      paymentId: { type: 'integer', required: true, min: 1 }
    }
  }
}

// ============ Circle Prompt Schemas ============

export const circlePromptSchemas = {
  send: {
    body: {
      forUserId: { type: 'integer', required: true, min: 1 },
      promptText: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
      promptNote: { type: 'string', maxLength: 500 }
    }
  },

  answer: {
    params: {
      promptId: { type: 'integer', required: true, min: 1 }
    },
    body: {
      answer: { type: 'string', required: true, minLength: 1, maxLength: 100000 }
    }
  },

  encourage: {
    body: {
      forUserId: { type: 'integer', required: true, min: 1 },
      type: { type: 'string', enum: ['heart', 'star', 'clap', 'fire'], default: 'heart' },
      message: { type: 'string', maxLength: 500 },
      relatedStoryId: { type: 'integer', min: 1 }
    }
  }
}

// ============ Telegram Schemas ============

export const telegramSchemas = {
  verifyLink: {
    body: {
      code: { type: 'string', required: true, minLength: 1, maxLength: 20 }
    }
  }
}

// ============ User Schemas ============

export const userSchemas = {
  phoneSettings: {
    body: {
      phoneNumber: {
        type: 'string',
        maxLength: 16,
        pattern: /^\+[1-9]\d{6,14}$/,
        patternMessage: 'must be in E.164 format (e.g. +447700900000)'
      },
      phoneCallConsent: { type: 'boolean' },
      contactPreference: { type: 'string', enum: ['email', 'phone', 'both'] }
    }
  }
}

// ============ Audiobook Schemas ============

export const audiobookUploadSchemas = {
  voiceSample: {
    body: {
      audioData: { type: 'string', required: true, maxLength: 70000000 },
      consentGiven: { type: 'boolean', required: true }
    }
  }
}
