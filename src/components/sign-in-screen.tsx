import { useState } from 'react';
import {
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

const MIN_PASSWORD_LENGTH = 8;

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists — try signing in instead.';
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (lower.includes('unable to validate email address') || lower.includes('invalid email')) {
    return "That doesn't look like a valid email address.";
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts — please wait a bit and try again.';
  }
  return message;
}

export function SignInScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = () => {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    if (mode === 'sign-up' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: authError } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        : await supabase.auth.signUp({ email: trimmedEmail, password });

    setSubmitting(false);
    if (authError) {
      setError(friendlyAuthError(authError.message));
      return;
    }
    // On success, useSession's onAuthStateChange listener picks up the new
    // session automatically — nothing else to do here.
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedText type="title" style={styles.title}>
          BoothBuddy
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {mode === 'sign-in' ? 'Sign in to your account' : 'Create an account'}
        </ThemedText>

        <TextInput
          autoFocus
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        <TextInput
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          placeholder={
            mode === 'sign-up' ? `Password (min ${MIN_PASSWORD_LENGTH} characters)` : 'Password'
          }
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        {error && (
          <ThemedText type="small" style={styles.errorText}>
            {error}
          </ThemedText>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            {submitting
              ? mode === 'sign-in'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'sign-in'
                ? 'Sign In'
                : 'Create Account'}
          </ThemedText>
        </Pressable>

        <Pressable onPress={switchMode} style={styles.linkButton}>
          <ThemedText type="link" themeColor="textSecondary">
            {mode === 'sign-in'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </ThemedText>
        </Pressable>
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
  errorText: {
    color: '#e0483e',
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
