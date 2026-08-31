import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../../components/Card';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';

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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // The app runs edge-to-edge on Android, so `adjustResize` no longer
      // shrinks the window and the default (undefined) behaviour left the
      // password and button sitting under the keyboard. `padding` works on
      // both platforms.
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + SPACING.xl,
            paddingBottom: insets.bottom + SPACING.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  // `justifyContent: 'center'` is deliberately absent: once the keyboard
  // shrinks the viewport the content is taller than the container, and a
  // centred content container overflows equally top and bottom — leaving the
  // top unreachable however far you scroll. `marginTop: auto` on the first
  // child centres it only while it actually fits.
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
