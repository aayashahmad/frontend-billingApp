import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

const VARIANT_STYLES = {
  primary: { container: 'primaryContainer', label: 'lightLabel' },
  secondary: { container: 'secondaryContainer', label: 'darkLabel' },
  danger: { container: 'dangerContainer', label: 'lightLabel' },
};

const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  testID,
}) => {
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variantStyle.container],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' ? COLORS.primary : COLORS.white}
            style={styles.spinner}
          />
        )}
        <Text style={[styles.label, styles[variantStyle.label]]}>{title}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  spinner: { marginRight: SPACING.sm },
  primaryContainer: { backgroundColor: COLORS.primary },
  secondaryContainer: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dangerContainer: { backgroundColor: COLORS.danger },
  pressed: { opacity: 0.8 },
  disabled: { backgroundColor: COLORS.disabled, borderColor: COLORS.disabled },
  label: { fontSize: FONT_SIZES.md, fontWeight: '600' },
  lightLabel: { color: COLORS.white },
  darkLabel: { color: COLORS.primary },
});

export default React.memo(Button);
