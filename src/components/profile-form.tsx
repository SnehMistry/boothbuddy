import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { getProfile, saveProfile } from '@/lib/storage';
import { EMPTY_PROFILE, type Profile } from '@/lib/types';

const FIELDS: {
  key: keyof Omit<Profile, 'updatedAt'>;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  { key: 'school', label: 'School', placeholder: 'e.g. State University' },
  { key: 'major', label: 'Major', placeholder: 'e.g. Computer Science' },
  { key: 'yearInSchool', label: 'Year', placeholder: 'e.g. 3rd year (junior)' },
  { key: 'graduation', label: 'Graduation date', placeholder: 'e.g. December 2027' },
  {
    key: 'workAuthorization',
    label: 'Work authorization',
    placeholder: 'e.g. US citizen, or F-1 student (needs CPT for internships, OPT for full-time)',
    multiline: true,
  },
  {
    key: 'interests',
    label: 'Interests & skills',
    placeholder: 'e.g. backend, ML, React Native, Python, hiking',
    multiline: true,
  },
];

// "My profile" — who the user is, read by every Gemini prompt server-side
// (both Edge Functions load it themselves via RLS, so nothing here has to
// be passed along with each AI request). One explicit Save rather than
// save-on-blur: a half-typed work-authorization note shouldn't be sent to
// the AI mid-edit.
export function ProfileForm() {
  const theme = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((found) => {
        setProfile(found ?? EMPTY_PROFILE);
        setSaved(found ?? EMPTY_PROFILE);
      })
      .catch(() => {
        setProfile(EMPTY_PROFILE);
        setSaved(EMPTY_PROFILE);
      });
  }, []);

  if (!profile) {
    return (
      <ThemedText type="body" themeColor="textMuted">
        Loading profile…
      </ThemedText>
    );
  }

  const dirty = FIELDS.some(({ key }) => profile[key] !== saved?.[key]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveProfile(profile);
      setProfile(updated);
      setSaved(updated);
      haptics.success();
    } catch (error) {
      Alert.alert(
        "Couldn't save profile",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="caption" themeColor="textMuted">
        Used by every AI feature — research, job suggestions, and follow-up drafts. After editing, open a
        contact and tap &ldquo;Refresh with my profile&rdquo; to update it.
      </ThemedText>
      {FIELDS.map(({ key, label, placeholder, multiline }) => (
        <View key={key} style={styles.field}>
          <ThemedText type="label" themeColor="textMuted">
            {label}
          </ThemedText>
          <TextInput
            value={profile[key]}
            onChangeText={(text) => setProfile((prev) => (prev ? { ...prev, [key]: text } : prev))}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            multiline={multiline}
            style={[
              styles.input,
              multiline && styles.multiline,
              { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          />
        </View>
      ))}
      <Button
        label={saving ? 'Saving…' : dirty ? 'Save profile' : 'Saved'}
        icon={dirty ? 'save-outline' : 'checkmark'}
        onPress={handleSave}
        loading={saving}
        disabled={!dirty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.half,
  },
  input: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
