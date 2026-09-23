import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createEvent } from '@/lib/storage';

function todayAsDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewEventScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayAsDateString());
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const event = await createEvent({
      name: name.trim(),
      date: date.trim() || todayAsDateString(),
      location: location.trim() || undefined,
    });
    router.replace(`/event/${event.id}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="small" themeColor="textSecondary">
          Event name
        </ThemedText>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          placeholder="e.g. UCSD Career Fair"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Date
        </ThemedText>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Location (optional)
        </ThemedText>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. RIMAC Arena"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
            pressed && canSave && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.saveButtonText}>
            {saving ? 'Saving…' : 'Create Event'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  saveButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
