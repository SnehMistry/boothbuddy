import * as Haptics from 'expo-haptics';

// Haptics are a nice-to-have layer of "press feedback" on top of the visual
// state — never something a device without a vibration motor (or a flaky
// web Vibration API) should be able to turn into a crash.
function safe(fn: () => Promise<void>) {
  fn().catch(() => {});
}

export const haptics = {
  selection: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
