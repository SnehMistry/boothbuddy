import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
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
  const [showPassword, setShowPassword] = useState(false);
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.logo, { backgroundColor: theme.accent }]}>
            <Ionicons name="id-card" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="title" style={styles.title}>
            BoothBuddy
          </ThemedText>
          <ThemedText type="body" themeColor="textMuted" style={styles.tagline}>
            Remember everyone you meet.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText type="heading" style={styles.formTitle}>
              {mode === 'sign-in' ? 'Sign in' : 'Create your account'}
            </ThemedText>

            <ThemedText type="label" themeColor="textMuted">
              Email
            </ThemedText>
            <TextInput
              autoFocus
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              placeholder="you@example.com"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
            />

            <ThemedText type="label" themeColor="textMuted" style={styles.fieldSpacing}>
              Password
            </ThemedText>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                placeholder={
                  mode === 'sign-up' ? `Min ${MIN_PASSWORD_LENGTH} characters` : 'Password'
                }
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPassword}
                textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
                style={[
                  styles.input,
                  styles.passwordInput,
                  { color: theme.text, backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                ]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                style={styles.showPasswordButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textMuted}
                />
              </Pressable>
            </View>

            {!!error && (
              <ThemedText type="body" themeColor="danger" style={styles.errorText}>
                {error}
              </ThemedText>
            )}

            <Button
              label={
                submitting
                  ? mode === 'sign-in'
                    ? 'Signing in…'
                    : 'Creating account…'
                  : mode === 'sign-in'
                    ? 'Sign In'
                    : 'Create Account'
              }
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
              style={styles.submitButton}
            />
          </View>

          <Pressable onPress={switchMode} style={styles.linkButton}>
            <ThemedText type="link" themeColor="textMuted">
              {mode === 'sign-in'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </ThemedText>
          </Pressable>
        </ScrollView>
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
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
    gap: Spacing.one,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: Radius.large,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginBottom: Spacing.five,
  },
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  formTitle: {
    marginBottom: Spacing.two,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  showPasswordButton: {
    position: 'absolute',
    right: Spacing.three,
    top: Spacing.one + 14,
  },
  errorText: {
    marginTop: Spacing.two,
  },
  submitButton: {
    marginTop: Spacing.four,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  linkButton: {
    alignItems: 'center',
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
});
