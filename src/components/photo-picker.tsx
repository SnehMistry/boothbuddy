import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ImageStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteStorageFile, extensionFromUri, getSignedUrl, uploadCapturedFile } from '@/lib/files';
import { PHOTO_LABELS, PHOTO_LABEL_TITLES, type ContactPhoto, type PhotoLabel } from '@/lib/types';

type PhotoPickerProps = {
  photos: ContactPhoto[];
  onAdd: (photo: ContactPhoto) => void;
  onRemove: (photo: ContactPhoto) => void;
  onLabelChange: (photoId: string, label: PhotoLabel | undefined) => void;
};

// Resolves a displayable uri for one photo: an instant local preview if this
// component uploaded it during its own lifetime, otherwise a signed URL
// fetched from Supabase Storage (the bucket is private, so there's no plain
// public URL to construct).
function PhotoImage({
  photo,
  localPreviewUri,
  style,
  resizeMode = 'cover',
}: {
  photo: ContactPhoto;
  localPreviewUri?: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (localPreviewUri) return;
    let cancelled = false;
    getSignedUrl('photos', photo.storagePath)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photo.storagePath, localPreviewUri]);

  const uri = localPreviewUri ?? signedUrl;
  if (!uri) return <ThemedView type="backgroundElement" style={style} />;
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}

export function PhotoPicker({ photos, onAdd, onRemove, onLabelChange }: PhotoPickerProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  const viewingPhoto = photos.find((p) => p.id === viewingPhotoId) ?? null;

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera access needed', 'Enable camera access to take a photo.');
        return;
      }
    }
    setCameraOpen(true);
  };

  const uploadAndAdd = async (localUri: string) => {
    const id = Crypto.randomUUID();
    try {
      const storagePath = await uploadCapturedFile('photos', localUri, extensionFromUri(localUri, 'jpg'));
      setLocalPreviews((prev) => ({ ...prev, [id]: localUri }));
      onAdd({ id, storagePath, createdAt: new Date().toISOString() });
      return true;
    } catch {
      return false;
    }
  };

  const pickFromLibrary = async () => {
    if (!libraryPermission?.granted) {
      const result = await requestLibraryPermission();
      if (!result.granted) {
        Alert.alert('Photo library access needed', 'Enable photo library access to add a photo.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;

    setUploading(true);
    // Each photo uploads independently: one bad file shouldn't stop the
    // rest of the batch from being added.
    let failures = 0;
    for (const asset of result.assets) {
      const ok = await uploadAndAdd(asset.uri);
      if (!ok) failures += 1;
    }
    setUploading(false);
    if (failures > 0) {
      Alert.alert(
        'Some photos failed to upload',
        `${failures} photo${failures === 1 ? '' : 's'} couldn't be uploaded. The rest were saved.`,
      );
    }
  };

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    setCameraOpen(false);
    if (!photo) return;

    setUploading(true);
    const ok = await uploadAndAdd(photo.uri);
    setUploading(false);
    if (!ok) {
      Alert.alert(
        "Couldn't upload photo",
        'Something went wrong saving that photo. Please try again.',
      );
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', undefined, [
      { text: 'Take Photo', onPress: openCamera },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removePhoto = (photo: ContactPhoto) => {
    // Best-effort: don't block removing a photo from the contact just
    // because deleting the underlying file failed.
    deleteStorageFile('photos', photo.storagePath).catch(() => {});
    setLocalPreviews((prev) => {
      const next = { ...prev };
      delete next[photo.id];
      return next;
    });
    onRemove(photo);
  };

  const confirmDelete = (photo: ContactPhoto) => {
    Alert.alert('Delete photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePhoto(photo) },
    ]);
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            onPress={() => setViewingPhotoId(photo.id)}
            onLongPress={() => confirmDelete(photo)}
            style={styles.thumbnailWrapper}>
            <PhotoImage
              photo={photo}
              localPreviewUri={localPreviews[photo.id]}
              style={styles.thumbnail}
            />
            <Pressable onPress={() => confirmDelete(photo)} hitSlop={8} style={styles.deleteBadge}>
              <ThemedText style={styles.deleteBadgeText}>×</ThemedText>
            </Pressable>
          </Pressable>
        ))}
        <Pressable
          onPress={handleAddPhoto}
          disabled={uploading}
          style={({ pressed }) => [styles.addTile, pressed && styles.pressed]}>
          <ThemedText type="title" style={styles.addTileText}>
            {uploading ? '…' : '+'}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <Modal visible={cameraOpen} animationType="slide" presentationStyle="fullScreen">
        <ThemedView style={styles.flex}>
          <CameraView ref={cameraRef} style={styles.flex} facing="back" />
          <SafeAreaView style={styles.cameraControls}>
            <Pressable onPress={() => setCameraOpen(false)} style={styles.cameraSideButton}>
              <ThemedText style={styles.overlayText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={takePicture}
              style={({ pressed }) => [styles.shutterButton, pressed && styles.pressed]}
            />
            <ThemedView style={styles.cameraSideButton} />
          </SafeAreaView>
        </ThemedView>
      </Modal>

      <Modal
        visible={viewingPhoto !== null}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewingPhotoId(null)}>
        {viewingPhoto && (
          <ThemedView style={styles.flex}>
            <PhotoImage
              photo={viewingPhoto}
              localPreviewUri={localPreviews[viewingPhoto.id]}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <SafeAreaView style={styles.viewerControls}>
              <ThemedView style={styles.labelRow}>
                {PHOTO_LABELS.map((label) => (
                  <Pressable
                    key={label}
                    onPress={() =>
                      onLabelChange(
                        viewingPhoto.id,
                        viewingPhoto.label === label ? undefined : label,
                      )
                    }
                    style={[
                      styles.labelChip,
                      viewingPhoto.label === label && styles.labelChipSelected,
                    ]}>
                    <ThemedText type="small" style={styles.overlayText}>
                      {PHOTO_LABEL_TITLES[label]}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
              <ThemedView style={styles.viewerButtonRow}>
                <Pressable
                  onPress={() => {
                    removePhoto(viewingPhoto);
                    setViewingPhotoId(null);
                  }}
                  style={styles.viewerButton}>
                  <ThemedText style={styles.overlayText}>Delete</ThemedText>
                </Pressable>
                <Pressable onPress={() => setViewingPhotoId(null)} style={styles.viewerButton}>
                  <ThemedText style={styles.overlayText}>Close</ThemedText>
                </Pressable>
              </ThemedView>
            </SafeAreaView>
          </ThemedView>
        )}
      </Modal>
    </>
  );
}

const THUMBNAIL_SIZE = 72;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000000',
  },
  row: {
    flexGrow: 0,
  },
  thumbnailWrapper: {
    marginRight: Spacing.two,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Spacing.two,
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00000099',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 16,
  },
  addTile: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: Spacing.two,
    borderWidth: 2,
    borderColor: '#60646c',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: {
    fontSize: 28,
    lineHeight: 32,
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
  cameraSideButton: {
    minWidth: 60,
    padding: Spacing.two,
  },
  overlayText: {
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
  fullImage: {
    flex: 1,
  },
  viewerControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#00000099',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'transparent',
  },
  labelChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#ffffff55',
  },
  labelChipSelected: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  viewerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
  },
  viewerButton: {
    padding: Spacing.two,
  },
});
