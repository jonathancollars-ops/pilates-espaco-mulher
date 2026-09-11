/**
 * Pilates Espaço Mulher — Safe Haptic Feedback Engine
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Bulletproof wrapper around expo-haptics with native Taptic Engine
 * triggers and graceful Web vibration fallback.
 */

import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

export type NotificationType = 'success' | 'warning' | 'error';
export type ImpactStyle = 'light' | 'medium' | 'heavy';

/**
 * Triggers web browser vibration fallback if available
 */
function triggerWebVibration(pattern: number | number[]): void {
  try {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      'navigator' in window &&
      typeof window.navigator.vibrate === 'function'
    ) {
      window.navigator.vibrate(pattern);
    }
  } catch {
    // Gracefully ignore web vibration failure
  }
}

/**
 * Standard Selection Feedback
 * Triggered on tab switches, segmented control changes, picker steps
 */
export async function selectionAsync(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      triggerWebVibration(10);
      return;
    }
    await ExpoHaptics.selectionAsync();
  } catch {
    // Fallback silently if device lacks hardware or in test runner
  }
}

/**
 * Notification Feedback (Success, Warning, Error)
 * Triggered on clinical saves, sync completions, validations, warnings
 */
export async function notificationAsync(type: NotificationType): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      switch (type) {
        case 'success':
          triggerWebVibration([20, 40, 20]);
          break;
        case 'warning':
          triggerWebVibration([40, 60, 40]);
          break;
        case 'error':
          triggerWebVibration([50, 50, 50, 50, 100]);
          break;
      }
      return;
    }

    let feedbackType = ExpoHaptics.NotificationFeedbackType.Success;
    if (type === 'warning') feedbackType = ExpoHaptics.NotificationFeedbackType.Warning;
    if (type === 'error') feedbackType = ExpoHaptics.NotificationFeedbackType.Error;

    await ExpoHaptics.notificationAsync(feedbackType);
  } catch {
    // Fallback silently
  }
}

/**
 * Impact Feedback (Light, Medium, Heavy)
 * Triggered on button presses, cards, deletions, physical actions
 */
export async function impactAsync(style: ImpactStyle = 'medium'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      switch (style) {
        case 'light':
          triggerWebVibration(15);
          break;
        case 'medium':
          triggerWebVibration(30);
          break;
        case 'heavy':
          triggerWebVibration(50);
          break;
      }
      return;
    }

    let feedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Medium;
    if (style === 'light') feedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Light;
    if (style === 'heavy') feedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Heavy;

    await ExpoHaptics.impactAsync(feedbackStyle);
  } catch {
    // Fallback silently
  }
}

/**
 * Unified Haptics Controller Object with semantic shortcuts
 */
export const Haptics = {
  // Standard async methods
  selectionAsync,
  notificationAsync,
  impactAsync,

  // Semantic convenience helpers
  selection: selectionAsync,
  success: () => notificationAsync('success'),
  warning: () => notificationAsync('warning'),
  error: () => notificationAsync('error'),
  impactLight: () => impactAsync('light'),
  impactMedium: () => impactAsync('medium'),
  impactHeavy: () => impactAsync('heavy'),
};

export default Haptics;
