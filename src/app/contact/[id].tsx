import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getContact, updateContact } from '@/lib/storage';
import type { Contact } from '@/lib/types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [contact, setContact] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');

  useFocusEffect(
    useCallback(() => {
      getContact(id).then((found) => {
        if (!found) return;
        setContact(found);
        setName(found.name);
        setCompanyUrl(found.companyUrl ?? '');
      });
    }, [id]),
  );

  const player = useAudioPlayer(contact?.audioUri ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  // Save on blur rather than on every keystroke, so we're not writing to
  // storage on every character typed.
  const saveName = async () => {
    const trimmed = name.trim();
    if (!contact || trimmed === contact.name) return;
    const updated = await updateContact(contact.id, { name: trimmed });
    if (updated) setContact(updated);
  };

  const saveCompanyUrl = async () => {
    const trimmed = companyUrl.trim();
    if (!contact || trimmed === (contact.companyUrl ?? '')) return;
    const updated = await updateContact(contact.id, { companyUrl: trimmed || undefined });
    if (updated) setContact(updated);
  };

  if (!contact) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Captured {formatDateTime(contact.createdAt)}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
        Name
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        placeholder="Their name"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      {contact.photoUri && (
        <>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
            Photo
          </ThemedText>
          <Image source={{ uri: contact.photoUri }} style={styles.photo} />
        </>
      )}

      {contact.audioUri && (
        <>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
            Voice memo
          </ThemedText>
          <Pressable
            onPress={() => (playerStatus.playing ? player.pause() : player.play())}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.playButtonText}>
              {playerStatus.playing ? '⏸ Pause' : '▶ Play voice memo'}
            </ThemedText>
          </Pressable>
        </>
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
        Company URL
      </ThemedText>
      <TextInput
        value={companyUrl}
        onChangeText={setCompanyUrl}
        onBlur={saveCompanyUrl}
        placeholder="https://company.com"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="url"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      {contact.companyUrl && (
        <Pressable onPress={() => Linking.openURL(contact.companyUrl!)}>
          <ThemedText type="linkPrimary">Open {contact.companyUrl}</ThemedText>
        </Pressable>
      )}

      <ThemedView type="backgroundElement" style={styles.notice}>
        <ThemedText type="small" themeColor="textSecondary">
          AI-structured summary, topics, and follow-up drafts arrive in a later phase — for now
          this is the raw capture.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
  sectionSpacing: {
    marginTop: Spacing.four,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  playButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  notice: {
    marginTop: Spacing.six,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
