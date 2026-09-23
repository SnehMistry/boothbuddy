import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extensionFromUri, uploadCapturedFile } from '@/lib/files';
import { createContact } from '@/lib/storage';
import type { ContactPhoto, PhotoLabel } from '@/lib/types';

export default function NewContactScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [photos, setPhotos] = useState<ContactPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  // Already a Supabase Storage path by the time it's set here — see
  // handleStopRecording. Never store the recorder's raw local uri.
  const [audioStoragePath, setAudioStoragePath] = useState<string | null>(null);
  const [savingAudio, setSavingAudio] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const canSave = name.trim().length > 0 && !saving;

  const handleStartRecording = async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert('Microphone access needed', 'Enable microphone access to record a voice memo.');
      return;
    }
    setAudioStoragePath(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const handleStopRecording = async () => {
    await recorder.stop();
    const tempUri = recorder.uri;
    if (!tempUri) return;

    // Upload right away — the recording's cache file can be cleared by the
    // OS within seconds, especially on Android.
    setSavingAudio(true);
    try {
      const path = await uploadCapturedFile('audio', tempUri, extensionFromUri(tempUri, 'm4a'));
      setAudioStoragePath(path);
    } catch {
      Alert.alert(
        "Couldn't save recording",
        'Something went wrong saving that voice memo. Please try recording it again.',
      );
    } finally {
      setSavingAudio(false);
    }
  };

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
      // Audio and photos are already uploaded to Supabase Storage as they
      // were captured, so this is just writing the contact record itself.
      await createContact({
        eventId,
        name: name.trim(),
        audioStoragePath: audioStoragePath ?? undefined,
        photos,
        companyUrl: companyUrl.trim() || undefined,
      });
      router.replace(`/event/${eventId}`);
    } catch {
      Alert.alert(
        "Couldn't save contact",
        'Something went wrong saving this contact. Your voice memo and photos are safe — please try Save again.',
      );
      setSaving(false);
    }
  };

  if (scannerOpen) {
    return (
      <ThemedView style={styles.flex}>
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
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="small" themeColor="textSecondary">
          Voice memo — ramble for ~60 seconds about the conversation
        </ThemedText>
        <Pressable
          onPress={recorderState.isRecording ? handleStopRecording : handleStartRecording}
          disabled={savingAudio}
          style={({ pressed }) => [
            styles.bigButton,
            recorderState.isRecording && styles.bigButtonRecording,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.bigButtonText}>
            {savingAudio
              ? 'Saving recording…'
              : recorderState.isRecording
                ? '⏹ Stop Recording'
                : '🎙️ Record Voice Memo'}
          </ThemedText>
        </Pressable>
        {audioStoragePath && !recorderState.isRecording && !savingAudio && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.confirmText}>
            ✓ Voice memo recorded
          </ThemedText>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
          Photos — business card, badge, booth, brochure
        </ThemedText>
        <PhotoPicker
          photos={photos}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
          onLabelChange={handleLabelChange}
        />

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
          Company URL — scan their QR code or type it
        </ThemedText>
        <Pressable
          onPress={openScanner}
          style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.bigButtonText}>
            Scan QR Code
          </ThemedText>
        </Pressable>
        <TextInput
          value={companyUrl}
          onChangeText={setCompanyUrl}
          placeholder="https://company.com"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
          Name
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Their name"
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
          <ThemedText type="smallBold" style={styles.bigButtonText}>
            {saving ? 'Saving…' : 'Save Contact'}
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
  sectionSpacing: {
    marginTop: Spacing.four,
  },
  bigButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  bigButtonRecording: {
    backgroundColor: '#e0483e',
  },
  bigButtonText: {
    color: '#ffffff',
    fontSize: 17,
  },
  confirmText: {
    marginTop: Spacing.one,
  },
  scanButton: {
    backgroundColor: '#60646c',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2f9e44',
    paddingVertical: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  saveButtonDisabled: {
    opacity: 0.5,
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
