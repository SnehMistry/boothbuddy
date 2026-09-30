import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useTheme } from '@/hooks/use-theme';

export type MoreMenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

const MENU_WIDTH = 200;

// A "⋯" button that opens a small dropdown of secondary actions — where
// destructive actions (Delete event / Delete contact) live, instead of a big
// red button or a toolbar link that's always one mis-tap away. Built on
// Modal (not a platform-native action sheet) so it looks and behaves the
// same on iOS, Android, and web; the dropdown is positioned under the
// button by measuring it on open.
export function MoreMenu({
  items,
  accessibilityLabel = 'More actions',
}: {
  items: MoreMenuItem[];
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

  const close = useCallback(() => setAnchor(null), []);
  useEscapeKey(close, anchor !== null);

  const open = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height + 4, right: Math.max(Spacing.two, windowWidth - (x + width)) });
    });
  };

  return (
    <>
      <Pressable
        ref={anchorRef}
        onPress={open}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.trigger,
          (hovered || anchor) && { backgroundColor: theme.surfaceMuted },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
      </Pressable>

      <Modal
        visible={anchor !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close menu" />
        {anchor && (
          <View
            style={[
              styles.menu,
              { top: anchor.top, right: anchor.right, backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                onPress={() => {
                  close();
                  item.onPress();
                }}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.item,
                  (hovered || pressed) && { backgroundColor: theme.surfaceMuted },
                ]}>
                <Ionicons name={item.icon} size={17} color={item.destructive ? theme.danger : theme.text} />
                <ThemedText type="body" themeColor={item.destructive ? 'dangerStrong' : 'text'}>
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
  },
});
