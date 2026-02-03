/**
 * Haptic Feedback System
 * Provides tactile feedback for a premium app feel
 *
 * Inspired by: iOS system haptics, Duolingo, Stripe
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Light tap - for subtle selections, toggles
 */
export const lightTap = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Medium tap - for button presses, confirmations
 */
export const mediumTap = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Heavy tap - for significant actions, completing tasks
 */
export const heavyTap = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/**
 * Success - for completed actions, achievements
 */
export const success = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Warning - for attention-grabbing moments
 */
export const warning = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/**
 * Error - for failed actions, mistakes
 */
export const error = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Selection changed - for picker/slider changes
 */
export const selection = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
};

/**
 * Celebration pattern - for achievements, milestones
 */
export const celebrate = async () => {
  if (Platform.OS === 'web') return;

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise(resolve => setTimeout(resolve, 100));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await new Promise(resolve => setTimeout(resolve, 100));
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Recording start - distinct pattern for voice recording
 */
export const recordingStart = async () => {
  if (Platform.OS === 'web') return;

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await new Promise(resolve => setTimeout(resolve, 50));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Recording stop - completion pattern
 */
export const recordingStop = async () => {
  if (Platform.OS === 'web') return;

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Streak increment - exciting pattern
 */
export const streakUp = async () => {
  if (Platform.OS === 'web') return;

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await new Promise(resolve => setTimeout(resolve, 80));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await new Promise(resolve => setTimeout(resolve, 80));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Level up - powerful celebration
 */
export const levelUp = async () => {
  if (Platform.OS === 'web') return;

  for (let i = 0; i < 3; i++) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// Export as namespace for cleaner imports
const haptics = {
  lightTap,
  mediumTap,
  heavyTap,
  success,
  warning,
  error,
  selection,
  celebrate,
  recordingStart,
  recordingStop,
  streakUp,
  levelUp,
};

export default haptics;
