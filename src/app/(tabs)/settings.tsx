import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChangePasswordModal } from '@/components/change-password-modal';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { useThemePreference, type ThemePreference } from '@/lib/theme-preference';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={danger ? theme.danger : theme.text} />
      <ThemedText type="body" themeColor={danger ? 'dangerStrong' : 'text'} style={styles.rowLabel}>
        {label}
      </ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSignOut = async () => {
    const confirmed = await confirmAction('Sign out?');
    if (confirmed) supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="label" themeColor="textMuted" style={styles.sectionLabel}>
          Appearance
        </ThemedText>
        <View style={styles.segmented}>
          {THEME_OPTIONS.map((option) => {
            const selected = preference === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPreference(option.value)}
                style={[
                  styles.segment,
                  {
                    backgroundColor: selected ? theme.accentMuted : theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <Ionicons name={option.icon} size={16} color={selected ? theme.accent : theme.textMuted} />
                <ThemedText type="label" themeColor={selected ? 'accentStrong' : 'textMuted'}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText type="label" themeColor="textMuted" style={styles.sectionLabel}>
          Account
        </ThemedText>
        <SettingsRow icon="key-outline" label="Change password" onPress={() => setChangingPassword(true)} />
        <SettingsRow icon="log-out-outline" label="Sign out" onPress={handleSignOut} danger />
      </ScrollView>

      <ChangePasswordModal visible={changingPassword} onClose={() => setChangingPassword(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sectionLabel: {
    marginTop: Spacing.four,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  rowLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
