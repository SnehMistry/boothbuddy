import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export function SignInScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed });
    setSending(false);
    if (error) {
      Alert.alert("Couldn't send code", error.message);
      return;
    }
    setStep('code');
  };

  const handleVerifyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: 'email',
    });
    setVerifying(false);
    if (error) {
      Alert.alert("Couldn't verify code", error.message);
      return;
    }
    // On success, useSession's onAuthStateChange listener picks up the new
    // session automatically — nothing else to do here.
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedText type="title" style={styles.title}>
          BoothBuddy
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {step === 'email'
            ? 'Enter your email — no password needed.'
            : `Enter the code we emailed to ${email.trim()}`}
        </ThemedText>

        {step === 'email' ? (
          <>
            <TextInput
              autoFocus
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            <Pressable
              onPress={handleSendCode}
              disabled={sending || !email.trim()}
              style={({ pressed }) => [
                styles.button,
                (sending || !email.trim()) && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                {sending ? 'Sending…' : 'Send Code'}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              autoFocus
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            <Pressable
              onPress={handleVerifyCode}
              disabled={verifying || !code.trim()}
              style={({ pressed }) => [
                styles.button,
                (verifying || !code.trim()) && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                {verifying ? 'Verifying…' : 'Verify Code'}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setStep('email')} style={styles.linkButton}>
              <ThemedText type="link" themeColor="textSecondary">
                Use a different email
              </ThemedText>
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  button: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    alignItems: 'center',
    padding: Spacing.three,
  },
});
