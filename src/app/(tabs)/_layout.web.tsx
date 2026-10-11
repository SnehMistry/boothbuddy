import { Slot } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// Web has no bottom tab bar — the sidebar (WebSidebar, in the outer
// _layout.web.tsx) is the only nav chrome. This group exists purely so the
// native side can have a Tabs navigator; on web it's a transparent
// pass-through to whichever screen matched ("/", "/deadlines", "/settings").
//
// These screens have no header bar, so below the sidebar's 768px drawer
// breakpoint they reserve a strip at the top for the floating hamburger
// button instead of letting it sit on top of their first line.
export default function TabsWebLayout() {
  const theme = useTheme();
  const isNarrow = useWindowDimensions().width < 768;
  return (
    <View style={{ flex: 1, paddingTop: isNarrow ? 64 : 0, backgroundColor: theme.background }}>
      <Slot />
    </View>
  );
}
