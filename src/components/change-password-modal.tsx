import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 8;

// A small modal for supabase.auth.updateUser({ password }) — shared between
// the mobile events list and the web sidebar, so "change your password"
// exists somewhere on both platforms instead of only being possible via
// Supabase's own dashboard.
export function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    Alert.alert('Password updated');
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="heading">Change password</ThemedText>

          <ThemedText type="label" themeColor="textMuted" style={styles.fieldSpacing}>
            New password
          </ThemedText>
          <TextInput
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            textContentType="newPassword"
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          />

          <ThemedText type="label" themeColor="textMuted" style={styles.fieldSpacing}>
            Confirm new password
          </ThemedText>
          <TextInput
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError(null);
            }}
            placeholder="Retype password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            textContentType="newPassword"
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          />

          {!!error && (
            <ThemedText type="body" themeColor="danger" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <View style={styles.actions}>
            <Pressable onPress={handleClose} style={styles.cancelButton}>
              <ThemedText type="link" themeColor="textMuted">
                Cancel
              </ThemedText>
            </Pressable>
            <Button
              label={submitting ? 'Updating…' : 'Update password'}
              onPress={handleSubmit}
              loading={submitting}
              disabled={!password || !confirmPassword}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
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
  error: {
    marginTop: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
  cancelButton: {
    padding: Spacing.two,
  },
});
