import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Throwing here would crash the whole app before React ever renders a
// single frame — exactly what happened when a standalone EAS build was
// missing these (Expo Go reads .env directly and never hit this; the
// cloud build has no local .env, and needed them set as EAS environment
// variables instead — see eas env:list). Recording the problem as data
// instead lets the root layout show an actual error screen.
export const supabaseConfigError =
  !supabaseUrl || !supabasePublishableKey
    ? 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill in your Supabase project values (or, for an EAS build, set them with `eas env:set`).'
    : null;

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.invalid',
  supabasePublishableKey ?? 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
