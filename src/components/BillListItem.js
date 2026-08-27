import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PAYMENT_TYPE_LABELS } from '../constants/paymentTypes';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import { isOnlinePayment, summariseBill } from '../utils/billing';
import { formatDateTime } from '../utils/date';
import { formatCurrency } from '../utils/money';
import Card from './Card';

const BillListItem = ({ bill, onViewTransaction }) => {
  const { billTotal, amountPaid, unbalance } = useMemo(
    () => summariseBill(bill),
    [bill],
  );

  const isOnline = isOnlinePayment(bill.payment_type);
  const canViewTransaction = isOnline && Boolean(bill.transaction_screenshot_url);

  const handlePress = useCallback(() => {
    if (canViewTransaction) onViewTransaction?.(bill);
  }, [bill, canViewTransaction, onViewTransaction]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!canViewTransaction}
      accessibilityRole={canViewTransaction ? 'button' : undefined}
      style={({ pressed }) => [pressed && canViewTransaction && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.itemName} numberOfLines={2}>
              {bill.item_name}
            </Text>
            <Text style={styles.meta}>
              Qty {bill.qty} · {formatDateTime(bill.created_at)}
            </Text>
          </View>
          <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeCash]}>
            <Text style={[styles.badgeText, isOnline ? styles.badgeTextOnline : styles.badgeTextCash]}>
              {PAYMENT_TYPE_LABELS[bill.payment_type] ?? bill.payment_type}
            </Text>
          </View>
        </View>

        <View style={styles.amountsRow}>
          <View style={styles.amountCell}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>{formatCurrency(billTotal)}</Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={styles.amountValue}>{formatCurrency(amountPaid)}</Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.amountLabel}>Balance</Text>
            <Text
              style={[
                styles.amountValue,
                unbalance > 0 ? styles.due : styles.settled,
              ]}
            >
              {formatCurrency(unbalance)}
            </Text>
          </View>
        </View>

        {isOnline && (
          <View style={styles.transactionRow}>
            <Text style={styles.transactionNumber} numberOfLines={1}>
              Ref: {bill.transaction_number || '—'}
            </Text>
            {canViewTransaction && (
              <Text style={styles.viewLink}>View screenshot</Text>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.sm },
  pressed: { opacity: 0.75 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, paddingRight: SPACING.sm },
  itemName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  meta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  badgeCash: { backgroundColor: COLORS.successLight },
  badgeOnline: { backgroundColor: COLORS.primaryLight },
  badgeText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  badgeTextCash: { color: COLORS.success },
  badgeTextOnline: { color: COLORS.primaryDark },
  amountsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  amountCell: { flex: 1 },
  amountLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  amountValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  due: { color: COLORS.danger },
  settled: { color: COLORS.success },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  transactionNumber: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  viewLink: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default React.memo(BillListItem);
