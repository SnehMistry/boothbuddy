import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Button } from '@/components/button';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { createContact, processContact } from '@/lib/storage';
import type { ContactPhoto, PhotoLabel } from '@/lib/types';

export default function NewContactScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [photos, setPhotos] = useState<ContactPhoto[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const canSave = name.trim().length > 0 && !saving;

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera access needed', 'Enable camera access to scan a QR code.');
        return;
      }
    }
    setScannerOpen(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    setCompanyUrl(result.data);
    setScannerOpen(false);
  };

  const handleAddPhoto = (photo: ContactPhoto) => setPhotos((prev) => [...prev, photo]);
  const handleRemovePhoto = (photo: ContactPhoto) =>
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  const handleLabelChange = (photoId: string, label: PhotoLabel | undefined) =>
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, label } : p)));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Photos are already uploaded to Supabase Storage as they were
      // captured, so this is just writing the contact record itself.
      const contact = await createContact({
        eventId,
        name: name.trim(),
        photos,
        companyUrl: companyUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      // Deliberately not awaited: AI processing can take a while (several
      // Gemini calls with retry-with-backoff on the free tier), and
      // blocking Save on it would defeat the "capture in ~60 seconds" goal.
      // It keeps running after we navigate away; the contact card shows
      // whatever ai_status it lands on next time it's opened.
      processContact(contact.id).catch(() => {});
      haptics.success();
      router.replace(`/event/${eventId}`);
    } catch {
      Alert.alert(
        "Couldn't save contact",
        'Something went wrong saving this contact. Your photos are safe — please try Save again.',
      );
      setSaving(false);
    }
  };

  if (scannerOpen) {
    return (
      <View style={styles.flex}>
        <CameraView
          style={styles.flex}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <SafeAreaView style={styles.cameraControls}>
          <Pressable
            onPress={() => setScannerOpen(false)}
            style={({ pressed }) => [styles.cameraCancel, pressed && styles.pressed]}>
            <ThemedText style={styles.cameraCancelText}>Cancel</ThemedText>
          </Pressable>
          <ThemedText style={styles.cameraCancelText}>Point at a QR code</ThemedText>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="label" themeColor="textMuted">
          Notes
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" style={styles.hint}>
          e.g. sarah, recruiter, google cloud team, internship apps open oct 15, likes hiking, said
          email her resume. Use your keyboard&apos;s dictation mic to speak instead of type.
        </ThemedText>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Type or dictate notes about this person or conversation…"
          placeholderTextColor={theme.textMuted}
          multiline
          style={[
            styles.notesInput,
            { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        />

        <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
          Photos — business card, badge, booth, brochure
        </ThemedText>
        <PhotoPicker
          photos={photos}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
          onLabelChange={handleLabelChange}
        />

        <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
          Company URL — scan their QR code or type it
        </ThemedText>
        <Pressable
          onPress={openScanner}
          style={({ pressed }) => [
            styles.scanButton,
            { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="qr-code-outline" size={18} color={theme.text} />
          <ThemedText type="bodyBold">Scan QR Code</ThemedText>
        </Pressable>
        <TextInput
          value={companyUrl}
          onChangeText={setCompanyUrl}
          placeholder="https://company.com"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
        />

        <ThemedText type="label" themeColor="textMuted" style={styles.sectionSpacing}>
          Name
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Their name"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
        />

        <Button
          label={saving ? 'Saving…' : 'Save Contact'}
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
          icon="checkmark"
          style={styles.saveButton}
        />
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
  sectionSpacing: {
    marginTop: Spacing.four,
  },
  hint: {
    marginTop: -Spacing.one,
  },
  notesInput: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  input: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  saveButton: {
    marginTop: Spacing.five,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  cameraCancel: {
    padding: Spacing.two,
  },
  cameraCancelText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
