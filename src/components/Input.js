import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

const Input = ({
  label,
  error,
  hint,
  loading = false,
  containerStyle,
  ...textInputProps
}) => {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          accessibilityLabel={label}
          {...textInputProps}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.spinner}
          />
        )}
      </View>

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        !!hint && <Text style={styles.hintText}>{hint}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  inputWrapperError: { borderColor: COLORS.danger },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  spinner: { marginLeft: SPACING.sm },
  errorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  hintText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
});

export default React.memo(Input);
