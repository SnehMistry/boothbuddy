import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';

import { ChangePasswordModal } from '@/components/change-password-modal';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { confirmAction } from '@/lib/confirm';
import { getEvents } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import type { BoothEvent } from '@/lib/types';

// The persistent left nav for the web dashboard (see _layout.web.tsx) —
// mobile has no equivalent, it uses full-screen push navigation instead
// (see PROMPT.md's original "Mobile: capture-focused... Web: review-
// focused dashboard" split).
export function WebSidebar() {
  const theme = useTheme();
  const pathname = usePathname();
  const [events, setEvents] = useState<BoothEvent[]>([]);
  const [changingPassword, setChangingPassword] = useState(false);

  // Refetch on every navigation rather than once on mount: this component
  // never unmounts (it's outside the Slot), so it has no other signal that
  // an event was just created or renamed elsewhere in the app.
  useEffect(() => {
    getEvents().then(setEvents);
  }, [pathname]);

  const handleSignOut = async () => {
    const confirmed = await confirmAction('Sign out?');
    if (confirmed) supabase.auth.signOut();
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
      <Pressable onPress={() => router.push('/')} style={styles.brandRow}>
        <View style={[styles.logo, { backgroundColor: theme.accent }]}>
          <Ionicons name="id-card" size={16} color="#FFFFFF" />
        </View>
        <ThemedText type="heading">BoothBuddy</ThemedText>
      </Pressable>

      <Pressable
        onPress={() => router.push('/new-event')}
        style={({ pressed }) => [
          styles.newEventButton,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
        <ThemedText type="bodyBold" style={styles.newEventButtonText}>
          New Event
        </ThemedText>
      </Pressable>

      <ThemedText type="label" themeColor="textMuted" style={styles.sectionLabel}>
        Events
      </ThemedText>
      <ScrollView style={styles.eventList}>
        {events.length === 0 ? (
          <ThemedText type="body" themeColor="textMuted" style={styles.emptyText}>
            No events yet.
          </ThemedText>
        ) : (
          events.map((event) => {
            const active = pathname.startsWith(`/event/${event.id}`);
            return (
              <Pressable
                key={event.id}
                onPress={() => router.push(`/event/${event.id}`)}
                style={[styles.eventRow, active && { backgroundColor: theme.accentMuted }]}>
                <ThemedText type="body" themeColor={active ? 'accent' : 'text'} numberOfLines={1}>
                  {event.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {event.date}
                </ThemedText>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Pressable onPress={() => setChangingPassword(true)} style={styles.footerRow}>
          <Ionicons name="key-outline" size={15} color={theme.textMuted} />
          <ThemedText type="body" themeColor="textMuted">
            Change password
          </ThemedText>
        </Pressable>
        <Pressable onPress={handleSignOut} style={styles.footerRow}>
          <Ionicons name="log-out-outline" size={15} color={theme.textMuted} />
          <ThemedText type="body" themeColor="textMuted">
            Sign out
          </ThemedText>
        </Pressable>
      </View>

      <ChangePasswordModal visible={changingPassword} onClose={() => setChangingPassword(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
  },
  newEventButtonText: {
    color: '#ffffff',
  },
  sectionLabel: {
    marginTop: Spacing.two,
  },
  eventList: {
    flex: 1,
  },
  emptyText: {
    paddingVertical: Spacing.two,
  },
  eventRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
    gap: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  footer: {
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.one,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
