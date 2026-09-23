import { useRef, useState } from 'react';
import {
  Alert,
  Image,
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { savePersistentCopy } from '@/lib/files';
import { createContact } from '@/lib/storage';

function extensionFromUri(uri: string, fallback: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1] : fallback;
}

type OverlayMode = 'none' | 'photo' | 'scan';

export default function NewContactScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overlay, setOverlay] = useState<OverlayMode>('none');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const canSave = name.trim().length > 0 && !saving;

  const handleStartRecording = async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert('Microphone access needed', 'Enable microphone access to record a voice memo.');
      return;
    }
    setAudioUri(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const handleStopRecording = async () => {
    await recorder.stop();
    setAudioUri(recorder.uri ?? null);
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera access needed', 'Enable camera access to take a photo.');
        return;
      }
    }
    setOverlay('photo');
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera access needed', 'Enable camera access to scan a QR code.');
        return;
      }
    }
    setOverlay('scan');
  };

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo) setPhotoUri(photo.uri);
    setOverlay('none');
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    setCompanyUrl(result.data);
    setOverlay('none');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const savedAudioUri = audioUri
      ? await savePersistentCopy(audioUri, 'audio', extensionFromUri(audioUri, 'm4a'))
      : undefined;
    const savedPhotoUri = photoUri
      ? await savePersistentCopy(photoUri, 'photos', extensionFromUri(photoUri, 'jpg'))
      : undefined;

    await createContact({
      eventId,
      name: name.trim(),
      audioUri: savedAudioUri,
      photoUri: savedPhotoUri,
      companyUrl: companyUrl.trim() || undefined,
    });

    router.replace(`/event/${eventId}`);
  };

  if (overlay === 'photo' || overlay === 'scan') {
    return (
      <ThemedView style={styles.flex}>
        <CameraView
          ref={cameraRef}
          style={styles.flex}
          facing="back"
          barcodeScannerSettings={overlay === 'scan' ? { barcodeTypes: ['qr'] } : undefined}
          onBarcodeScanned={overlay === 'scan' ? handleBarcodeScanned : undefined}
        />
        <SafeAreaView style={styles.cameraControls}>
          <Pressable
            onPress={() => setOverlay('none')}
            style={({ pressed }) => [styles.cameraCancel, pressed && styles.pressed]}>
            <ThemedText style={styles.cameraCancelText}>Cancel</ThemedText>
          </Pressable>
          {overlay === 'photo' && (
            <Pressable
              onPress={takePicture}
              style={({ pressed }) => [styles.shutterButton, pressed && styles.pressed]}
            />
          )}
          {overlay === 'scan' && (
            <ThemedText style={styles.cameraCancelText}>Point at a QR code</ThemedText>
          )}
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
          style={({ pressed }) => [
            styles.bigButton,
            recorderState.isRecording && styles.bigButtonRecording,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.bigButtonText}>
            {recorderState.isRecording ? '⏹ Stop Recording' : '🎙️ Record Voice Memo'}
          </ThemedText>
        </Pressable>
        {audioUri && !recorderState.isRecording && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.confirmText}>
            ✓ Voice memo recorded
          </ThemedText>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacing}>
          Photo — business card, badge, or booth
        </ThemedText>
        {photoUri ? (
          <Pressable onPress={openCamera}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          </Pressable>
        ) : (
          <Pressable
            onPress={openCamera}
            style={({ pressed }) => [styles.bigButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.bigButtonText}>
              📷 Take Photo
            </ThemedText>
          </Pressable>
        )}

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
  photoPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
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
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#00000055',
  },
});
