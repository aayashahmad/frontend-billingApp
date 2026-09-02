import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PAYMENT_TYPE_OPTIONS } from '../../constants/paymentTypes';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';

const PaymentTypeToggle = ({ value, onChange, label, disabled }) => (
  <View style={styles.container}>
    {!!label && <Text style={styles.label}>{label}</Text>}

    <View style={styles.track} accessibilityRole="radiogroup">
      {PAYMENT_TYPE_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, selected, disabled: Boolean(disabled) }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  segmentSelected: { backgroundColor: COLORS.primary },
  segmentText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  segmentTextSelected: { color: COLORS.white },
});

export default React.memo(PaymentTypeToggle);
