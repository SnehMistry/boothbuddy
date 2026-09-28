import { useEffect } from 'react';
import { Platform } from 'react-native';

// Web-only "press Esc to close" for modals/forms — native has no equivalent
// key to bind to, and the OS back gesture/button already covers this there.
export function useEscapeKey(onEscape: () => void, active: boolean = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}
