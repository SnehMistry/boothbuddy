import { Slot } from 'expo-router';

// Web has no bottom tab bar — the sidebar (WebSidebar, in the outer
// _layout.web.tsx) is the only nav chrome. This group exists purely so the
// native side can have a Tabs navigator; on web it's a transparent
// pass-through to whichever screen matched ("/", "/deadlines", "/settings").
export default function TabsWebLayout() {
  return <Slot />;
}
