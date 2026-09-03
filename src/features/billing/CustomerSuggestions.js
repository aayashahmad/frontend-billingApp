import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/money';

/** Roughly four rows before it scrolls — enough to browse, short enough to
 *  leave the form behind it visible. */
const MAX_HEIGHT = 232;

/**
 * Existing customers matching what has been typed into the name field.
 *
 * Sits directly under the input as a picker: a shop owner knows the person's
 * name, not their phone number, and re-typing a number they half-remember was
 * the slowest part of writing a bill for a regular.
 */
const CustomerSuggestions = ({ results, loading, error, query, onSelect }) => {
  if (loading) {
    return (
      <View style={[styles.container, styles.statusRow]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.statusText}>Searching customers…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.statusRow]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!results.length) {
    return (
      <View style={[styles.container, styles.statusRow]}>
        <Text style={styles.statusText}>
          No customer matches “{query.trim()}” — carry on typing to add a new one.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ maxHeight: MAX_HEIGHT }}
        // The form is itself a ScrollView; without this the inner list
        // cannot be scrolled on Android at all.
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {results.map((customer, index) => {
          const unpaid = Number(customer.total_unpaid) || 0;
          return (
            <Pressable
              key={customer.id}
              onPress={() => onSelect(customer)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${customer.name}, ${customer.phone}`}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {customer.name}
                </Text>
                <Text style={styles.phone}>{customer.phone}</Text>
              </View>
              {/* Dues travel with the search result, so what the owner needs
                  to know before billing again is already on screen. */}
              <Text style={[styles.dues, unpaid > 0 && styles.duesOwing]}>
                {unpaid > 0 ? `${formatCurrency(unpaid)} due` : 'Settled'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  statusText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
    flexShrink: 1,
  },
  errorText: { color: COLORS.danger, fontSize: FONT_SIZES.sm, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowPressed: { backgroundColor: COLORS.primaryLight },
  rowText: { flex: 1, paddingRight: SPACING.sm },
  name: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  phone: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  dues: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.success },
  duesOwing: { color: COLORS.danger },
});

export default React.memo(CustomerSuggestions);
