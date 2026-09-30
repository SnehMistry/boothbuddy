import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';

import { ChangePasswordModal } from '@/components/change-password-modal';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { confirmAction } from '@/lib/confirm';
import { formatHumanDate } from '@/lib/dates';
import { getEvents } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import type { BoothEvent } from '@/lib/types';

const NARROW_BREAKPOINT = 768;
const COLLAPSE_STORAGE_KEY = 'boothbuddy.sidebarCollapsed';

function readStoredCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// The persistent left nav for the web dashboard (see _layout.web.tsx) —
// mobile has no equivalent, it uses full-screen push navigation instead
// (see PROMPT.md's original "Mobile: capture-focused... Web: review-
// focused dashboard" split). Above the 768px breakpoint it's an inline,
// collapsible rail; below it, it becomes an off-canvas drawer opened by a
// hamburger button, so it never eats into the content column on a phone-
// width browser window.
export function WebSidebar() {
  const theme = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_BREAKPOINT;
  const [events, setEvents] = useState<BoothEvent[]>([]);
  const [changingPassword, setChangingPassword] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed());
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes — adjusted during render
  // (comparing against the last-seen pathname) rather than in an effect, so
  // this doesn't trigger a cascading render.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
  }

  // Refetch on every navigation rather than once on mount: this component
  // never unmounts (it's outside the Slot), so it has no other signal that
  // an event was just created or renamed elsewhere in the app.
  useEffect(() => {
    getEvents().then(setEvents);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // best-effort — a private window or blocked storage just won't remember it
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    const confirmed = await confirmAction('Sign out?');
    if (confirmed) supabase.auth.signOut();
  };

  const showLabels = !collapsed || isNarrow;

  const content = (
    <View
      style={[
        styles.sidebar,
        { backgroundColor: theme.surface, borderRightColor: theme.border },
        !isNarrow && (collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded),
        isNarrow && styles.sidebarDrawer,
      ]}>
      <Pressable onPress={() => router.push('/')} style={styles.brandRow}>
        <View style={[styles.logo, { backgroundColor: theme.accent }]}>
          <Ionicons name="id-card" size={16} color="#FFFFFF" />
        </View>
        {showLabels && <ThemedText type="heading">BoothBuddy</ThemedText>}
      </Pressable>

      <Pressable
        onPress={() => router.push('/new-event')}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.newEventButton,
          { backgroundColor: theme.accent },
          hovered && !pressed && styles.hoveredSolid,
          pressed && styles.pressed,
        ]}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
        {showLabels && (
          <ThemedText type="bodyBold" style={styles.newEventButtonText}>
            New Event
          </ThemedText>
        )}
      </Pressable>

      {showLabels && (
        <ThemedText type="label" themeColor="textMuted" style={styles.sectionLabel}>
          Events
        </ThemedText>
      )}
      <ScrollView style={styles.eventList}>
        {events.length === 0 ? (
          showLabels && (
            <ThemedText type="body" themeColor="textMuted" style={styles.emptyText}>
              No events yet.
            </ThemedText>
          )
        ) : (
          events.map((event) => {
            const active = pathname.startsWith(`/event/${event.id}`);
            return (
              <Pressable
                key={event.id}
                onPress={() => router.push(`/event/${event.id}`)}
                style={({ hovered }: { hovered?: boolean }) => [
                  styles.eventRow,
                  active
                    ? { backgroundColor: theme.accentMuted }
                    : hovered && { backgroundColor: theme.surfaceMuted },
                ]}>
                {showLabels ? (
                  <>
                    <ThemedText type="body" themeColor={active ? 'accent' : 'text'} numberOfLines={1}>
                      {event.name}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      {formatHumanDate(event.date)}
                    </ThemedText>
                  </>
                ) : (
                  <View style={[styles.eventDot, { backgroundColor: active ? theme.accent : theme.border }]} />
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Pressable
          onPress={() => router.push('/settings')}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.footerRow,
            pathname === '/settings'
              ? { backgroundColor: theme.accentMuted }
              : hovered && { backgroundColor: theme.surfaceMuted },
          ]}>
          <Ionicons name="person-circle-outline" size={15} color={theme.textMuted} />
          {showLabels && (
            <ThemedText type="body" themeColor="textMuted">
              Profile & settings
            </ThemedText>
          )}
        </Pressable>
        <Pressable
          onPress={() => setChangingPassword(true)}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.footerRow,
            hovered && { backgroundColor: theme.surfaceMuted },
          ]}>
          <Ionicons name="key-outline" size={15} color={theme.textMuted} />
          {showLabels && (
            <ThemedText type="body" themeColor="textMuted">
              Change password
            </ThemedText>
          )}
        </Pressable>
        <Pressable
          onPress={handleSignOut}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.footerRow,
            hovered && { backgroundColor: theme.surfaceMuted },
          ]}>
          <Ionicons name="log-out-outline" size={15} color={theme.textMuted} />
          {showLabels && (
            <ThemedText type="body" themeColor="textMuted">
              Sign out
            </ThemedText>
          )}
        </Pressable>
        {!isNarrow && (
          <Pressable
            onPress={toggleCollapsed}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.footerRow,
              hovered && { backgroundColor: theme.surfaceMuted },
            ]}>
            <Ionicons name={collapsed ? 'chevron-forward-outline' : 'chevron-back-outline'} size={15} color={theme.textMuted} />
            {showLabels && (
              <ThemedText type="body" themeColor="textMuted">
                Collapse
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>

      <ChangePasswordModal visible={changingPassword} onClose={() => setChangingPassword(false)} />
    </View>
  );

  if (!isNarrow) return content;

  return (
    <>
      {!drawerOpen && (
        <Pressable
          onPress={() => setDrawerOpen(true)}
          style={[styles.hamburger, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="menu" size={20} color={theme.text} />
        </Pressable>
      )}
      {drawerOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setDrawerOpen(false)} />
          {content}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: '100%',
    borderRightWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sidebarExpanded: {
    width: 260,
  },
  sidebarCollapsed: {
    width: 72,
    alignItems: 'center',
  },
  sidebarDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 20,
  },
  hamburger: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 12, 18, 0.4)',
    zIndex: 10,
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
    paddingHorizontal: Spacing.two,
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
    alignSelf: 'stretch',
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
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  hoveredSolid: {
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.85,
  },
  footer: {
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.one,
    alignSelf: 'stretch',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: 2,
    borderRadius: Radius.small,
  },
});
