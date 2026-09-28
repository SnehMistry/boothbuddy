import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useEscapeKey } from '@/hooks/use-escape-key';
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

  useEscapeKey(() => router.back());

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
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="label" themeColor="textMuted">
          Event name
        </ThemedText>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleSave}
          returnKeyType="done"
          placeholder="e.g. UCSD Career Fair"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
        />

        <ThemedText type="label" themeColor="textMuted" style={styles.fieldSpacing}>
          Date
        </ThemedText>
        <TextInput
          value={date}
          onChangeText={setDate}
          onSubmitEditing={handleSave}
          returnKeyType="done"
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
        />

        <ThemedText type="label" themeColor="textMuted" style={styles.fieldSpacing}>
          Location (optional)
        </ThemedText>
        <TextInput
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={handleSave}
          returnKeyType="done"
          placeholder="e.g. RIMAC Arena"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
        />

        <View style={styles.buttonRow}>
          <Button
            label={saving ? 'Saving…' : 'Create Event'}
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
            style={styles.saveButton}
          />
        </View>
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
  },
  fieldSpacing: {
    marginTop: Spacing.three,
  },
  input: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    marginTop: Spacing.one,
  },
  buttonRow: {
    marginTop: Spacing.five,
  },
  saveButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
});
