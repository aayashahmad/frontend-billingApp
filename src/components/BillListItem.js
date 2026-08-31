import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  PAYMENT_REFERENCE_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPES,
} from '../constants/paymentTypes';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import { billItems, hasPaymentReference, summariseBill } from '../utils/billing';
import { formatDateTime } from '../utils/date';
import { formatCurrency } from '../utils/money';
import Card from './Card';

const BillListItem = ({ bill, onPress, onViewTransaction, actions }) => {
  const { billTotal, amountPaid, unbalance } = useMemo(
    () => summariseBill(bill),
    [bill],
  );

  // A bill can carry several lines. Name the first and count the rest rather
  // than growing the card — the full list is on the receipt.
  const items = useMemo(() => billItems(bill), [bill]);
  const extraItems = items.length - 1;
  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [items],
  );

  const hasReference = hasPaymentReference(bill.payment_type);
  const referenceLabels = PAYMENT_REFERENCE_LABELS[bill.payment_type];
  const canViewTransaction =
    hasReference && Boolean(bill.transaction_screenshot_url);

  // The row opens the bill's details. The reference link is a shortcut
  // straight to the payment image, so it stops the press from doing both.
  const handlePress = useCallback(() => onPress?.(bill), [bill, onPress]);

  const handleViewTransaction = useCallback(() => {
    if (canViewTransaction) onViewTransaction?.(bill);
  }, [bill, canViewTransaction, onViewTransaction]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Bill ${bill.id} details` : undefined}
      style={({ pressed }) => [pressed && !!onPress && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.itemName} numberOfLines={2}>
              {items[0]?.item_name ?? bill.item_name}
              {extraItems > 0 ? ` +${extraItems} more` : ''}
            </Text>
            <Text style={styles.meta}>
              Qty {totalQty} · {formatDateTime(bill.created_at)}
            </Text>
          </View>
          <View style={[styles.badge, hasReference ? styles.badgeOnline : styles.badgeCash]}>
            <Text style={[styles.badgeText, hasReference ? styles.badgeTextOnline : styles.badgeTextCash]}>
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

        {hasReference && (
          <View style={styles.transactionRow}>
            <Text style={styles.transactionNumber} numberOfLines={1}>
              {referenceLabels?.numberShort ?? 'Ref'}:{' '}
              {bill.transaction_number || '—'}
            </Text>
            {canViewTransaction && (
              <Text
                onPress={handleViewTransaction}
                suppressHighlighting
                accessibilityRole="button"
                style={styles.viewLink}
              >
                {bill.payment_type === PAYMENT_TYPES.CHEQUE
                  ? 'View cheque'
                  : 'View screenshot'}
              </Text>
            )}
          </View>
        )}

        {!!actions && <View style={styles.actions}>{actions}</View>}
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.sm },
  actions: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
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
