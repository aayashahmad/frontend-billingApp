import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../../components/Card';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

/** Shared chrome for the login and signup screens. */
const AuthScreenLayout = ({
  title,
  subtitle,
  children,
  footerPrompt,
  footerAction,
  onFooterPress,
}) => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  // Padding rather than KeyboardAvoidingView: the app runs edge-to-edge on
  // Android, so the window never resizes and that component computes a
  // zero inset — which is why the lower fields could not be scrolled to.
  const bottomPadding =
    keyboardHeight > 0
      ? keyboardHeight + SPACING.md
      : insets.bottom + SPACING.xl;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.xl, paddingBottom: bottomPadding },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // iOS can do this natively; harmless elsewhere.
      automaticallyAdjustKeyboardInsets={false}
    >
      {/* Auto margins centre the form only while it fits. `justifyContent:
          'center'` on the container would overflow it equally top and bottom
          once the keyboard shrinks the viewport, putting the top out of
          reach however far you scrolled. */}
      <View style={styles.centred}>
        <View style={styles.header}>
          <Text style={styles.brand}>Billing</Text>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <Card>{children}</Card>

        <View style={styles.footer}>
          <Text style={styles.footerPrompt}>{footerPrompt}</Text>
          <Pressable onPress={onFooterPress} accessibilityRole="button">
            <Text style={styles.footerAction}>{footerAction}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, flexGrow: 1 },
  centred: { marginTop: 'auto', marginBottom: 'auto', width: '100%' },
  header: { marginBottom: SPACING.lg, alignItems: 'center' },
  brand: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.text },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerPrompt: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  footerAction: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
});

export default AuthScreenLayout;
