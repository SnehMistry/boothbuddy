import { Linking, Platform } from 'react-native';

// On web this opens in a new tab so the current page (dashboard, contact
// detail) stays put behind it; on native there's no tab concept, so it's
// just the normal external-link handoff. Shared by ExternalLinkRow and
// FollowupCard rather than duplicated.
export function openExternalLink(url: string) {
  if (Platform.OS === 'web') {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) Linking.openURL(url); // popup blocked — fall back to same-tab nav
    return;
  }
  Linking.openURL(url);
}
