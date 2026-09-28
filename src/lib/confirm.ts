import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert renders nothing for a multi-button alert
// (no window.confirm/window.alert call happens at all for the 2+ button
// case) — every "Delete this?"/"Sign out?" confirmation in the app was
// silently a no-op on web. This is the one shared way to ask "are you
// sure?" on both platforms: window.confirm on web, the real Alert.alert
// button flow on native.
export function confirmAction(
  title: string,
  message?: string,
  confirmLabel: string = 'Delete',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
