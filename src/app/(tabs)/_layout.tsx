import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { resyncReminders } from '@/lib/notifications';
import { getEventsWithStats, getUpcomingDeadlines } from '@/lib/storage';

// The phone's bottom tab bar — Events (the capture-focused home), Deadlines
// (a cross-event view of what's coming up), and Settings. Web has no
// equivalent; it uses the persistent sidebar instead (see _layout.web.tsx
// and this group's own _layout.web.tsx, which renders these same screens
// without tab chrome).
export default function TabsLayout() {
  const theme = useTheme();

  // Reminders are re-derived from scratch every time the tab bar mounts
  // (i.e. whenever the app is opened) rather than tracked incrementally —
  // there's no background sync on a $0, client-only project, so "resync on
  // open" is the honest ceiling for how fresh these can be.
  useEffect(() => {
    Promise.all([getEventsWithStats(), getUpcomingDeadlines()])
      .then(([events, deadlines]) => resyncReminders(events, deadlines))
      .catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Events',
          headerTitle: 'BoothBuddy',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deadlines"
        options={{
          title: 'Deadlines',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
