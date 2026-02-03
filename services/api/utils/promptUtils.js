// /life-story/server/utils/promptUtils.js

/**
 * Get the decade string from a birth year
 * e.g., 1955 -> "1950s", 1962 -> "1960s"
 */
export function getDecadeFromYear(year) {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

/**
 * Get childhood decade (birth year + 5-12 years)
 */
export function getChildhoodDecade(birthYear) {
  return getDecadeFromYear(birthYear + 8);
}

/**
 * Get teenage decade (birth year + 13-19 years)
 */
export function getTeenageDecade(birthYear) {
  return getDecadeFromYear(birthYear + 16);
}

/**
 * Personalize a prompt template with user context
 */
export function personalizePrompt(prompt, userContext) {
  let text = prompt.prompt_text;
  const hint = prompt.prompt_hint;

  // Apply personalization template if exists
  if (prompt.personalization_template && userContext.birthYear) {
    text = prompt.personalization_template
      .replace('{decade}', getChildhoodDecade(userContext.birthYear))
      .replace('{teenage_decade}', getTeenageDecade(userContext.birthYear))
      .replace('{birth_year}', userContext.birthYear);
  }

  // Add context from memory graph
  if (prompt.requires_person_mention && userContext.recentPeople?.length > 0) {
    const person = userContext.recentPeople[0];
    text = `You mentioned ${person.name}. ${text}`;
  }

  if (prompt.requires_place_mention && userContext.recentPlaces?.length > 0) {
    const place = userContext.recentPlaces[0];
    text = `You described ${place.name}. ${text}`;
  }

  return {
    ...prompt,
    prompt_text: text,
    prompt_hint: hint,
    personalization_context: {
      birthYear: userContext.birthYear,
      decade: userContext.birthYear ? getChildhoodDecade(userContext.birthYear) : null,
      recentPeople: userContext.recentPeople?.map(p => p.name) || [],
      recentPlaces: userContext.recentPlaces?.map(p => p.name) || []
    }
  };
}

/**
 * Check if prompt is appropriate for user's streak level
 */
export function isPromptAppropriate(prompt, streakDays, dayOfWeek) {
  // Check minimum streak requirement
  if (prompt.min_streak_days && streakDays < prompt.min_streak_days) {
    return false;
  }

  // Check day of week preference (for deep prompts on weekends)
  if (prompt.preferred_day_of_week !== null && prompt.preferred_day_of_week !== undefined) {
    if (prompt.preferred_day_of_week !== dayOfWeek) {
      return false;
    }
  }

  return true;
}

/**
 * Select appropriate prompt type based on streak
 */
export function getPromptTypeForStreak(streakDays, dayOfWeek) {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // New users: quick prompts only
  if (streakDays < 7) {
    return 'quick';
  }

  // Building users: mix
  if (streakDays < 30) {
    if (isWeekend && streakDays >= 14) {
      return 'deep';
    }
    return Math.random() > 0.3 ? 'story' : 'quick';
  }

  // Established users: full variety
  if (isWeekend) {
    return 'deep';
  }
  return Math.random() > 0.4 ? 'story' : 'quick';
}
