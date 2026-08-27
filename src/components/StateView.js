import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZES, SPACING } from '../constants/theme';
import Button from './Button';

/** Shared loading / error / empty presentation for every async screen. */
const StateView = ({
  variant = 'empty',
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  style,
}) => (
  <View style={[styles.container, style]}>
    {variant === 'loading' ? (
      <ActivityIndicator size="large" color={COLORS.primary} />
    ) : (
      <Text
        style={[styles.title, variant === 'error' && styles.errorTitle]}
        accessibilityRole="header"
      >
        {title}
      </Text>
    )}

    {!!message && <Text style={styles.message}>{message}</Text>}

    {variant === 'error' && !!onRetry && (
      <Button
        title={retryLabel}
        variant="secondary"
        onPress={onRetry}
        style={styles.retry}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  errorTitle: { color: COLORS.danger },
  message: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  retry: { marginTop: SPACING.lg, alignSelf: 'stretch' },
});

export default React.memo(StateView);
