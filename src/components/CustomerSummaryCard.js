import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZES, SPACING } from '../constants/theme';
import { formatCurrency, toNumber } from '../utils/money';
import Card from './Card';

const CustomerSummaryCard = ({
  customer,
  totalAmount,
  totalUnpaid,
  caption,
  style,
}) => {
  // Explicit totals win when the caller derived them from the bill list;
  // otherwise fall back to the server-maintained running totals.
  const amount = toNumber(totalAmount ?? customer?.total_amount);
  const unpaid = toNumber(totalUnpaid ?? customer?.total_unpaid);
  // A customer never owes and holds credit at once, so one figure describes
  // the relationship — showing both would be two contradictory statements.
  const advance = toNumber(customer?.advance_balance);
  const isSettled = unpaid <= 0;

  return (
    <Card style={style}>
      <Text style={styles.name} numberOfLines={1}>
        {customer?.name || 'Unnamed customer'}
      </Text>
      <Text style={styles.phone}>{customer?.phone}</Text>
      {!!caption && <Text style={styles.caption}>{caption}</Text>}

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Total billed</Text>
          <Text style={styles.metricValue}>{formatCurrency(amount)}</Text>
        </View>
        <View style={[styles.metric, styles.metricRight]}>
          <Text style={styles.metricLabel}>
            {advance > 0 ? 'Advance held' : 'Unpaid balance'}
          </Text>
          <Text
            style={[
              styles.metricValue,
              advance > 0 || isSettled ? styles.settled : styles.due,
            ]}
          >
            {formatCurrency(advance > 0 ? advance : unpaid)}
          </Text>
        </View>
      </View>

      {advance > 0 ? (
        <Text style={styles.settledNote}>
          Paid ahead — applied to their next bill
        </Text>
      ) : (
        isSettled && <Text style={styles.settledNote}>All bills settled</Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  name: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text },
  phone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  caption: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  row: { flexDirection: 'row' },
  metric: { flex: 1 },
  metricRight: { alignItems: 'flex-end' },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  metricValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  due: { color: COLORS.danger },
  settled: { color: COLORS.success },
  settledNote: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
  },
});

export default React.memo(CustomerSummaryCard);
