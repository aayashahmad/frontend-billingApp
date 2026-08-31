import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from './Card';
import {
  PAYMENT_REFERENCE_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPES,
} from '../constants/paymentTypes';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import {
  billItems,
  calculateBillTotal,
  hasPaymentReference,
  summariseBill,
} from '../utils/billing';
import { formatDateTime } from '../utils/date';
import { formatCurrency } from '../utils/money';

const Row = ({ label, value, valueStyle }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
  </View>
);

/**
 * Everything recorded on one bill.
 *
 * The list row can only show the first item and a count, so a multi-item bill
 * is unreadable without this — it is where the individual lines, their rates
 * and the payment reference actually live.
 */
const BillDetailModal = ({ bill, onClose, onViewTransaction }) => {
  const insets = useSafeAreaInsets();

  const { billTotal, amountPaid, unbalance } = useMemo(
    () => (bill ? summariseBill(bill) : { billTotal: 0, amountPaid: 0, unbalance: 0 }),
    [bill],
  );

  const items = useMemo(() => (bill ? billItems(bill) : []), [bill]);

  if (!bill) return null;

  const hasReference = hasPaymentReference(bill.payment_type);
  const referenceLabels = PAYMENT_REFERENCE_LABELS[bill.payment_type];
  const canViewTransaction =
    hasReference && Boolean(bill.transaction_screenshot_url);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.md }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Bill #{bill.id}</Text>
              <Text style={styles.subtitle}>
                {formatDateTime(bill.created_at)}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close bill details"
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.sectionTitle}>
              Items ({items.length})
            </Text>

            <Card style={styles.itemsCard}>
              {/* Column headings so quantity and rate are each named, rather
                  than run together as "10 × ₹400". */}
              <View style={styles.itemHeadRow}>
                <Text style={[styles.itemHead, styles.colName]}>Item</Text>
                <Text style={[styles.itemHead, styles.colQty]}>Qty</Text>
                <Text style={[styles.itemHead, styles.colRate]}>Price</Text>
                <Text style={[styles.itemHead, styles.colAmount]}>Amount</Text>
              </View>

              {items.map((item, index) => (
                <View
                  key={item.id ?? `${bill.id}-${index}`}
                  style={styles.itemRow}
                >
                  <Text style={[styles.itemName, styles.colName]}>
                    {item.item_name}
                  </Text>
                  <Text style={[styles.itemCell, styles.colQty]}>
                    {item.qty}
                  </Text>
                  <Text style={[styles.itemCell, styles.colRate]}>
                    {formatCurrency(item.rate)}
                  </Text>
                  <Text style={[styles.itemAmount, styles.colAmount]}>
                    {formatCurrency(
                      item.line_total ?? calculateBillTotal(item.qty, item.rate),
                    )}
                  </Text>
                </View>
              ))}
            </Card>

            <Text style={styles.sectionTitle}>Payment</Text>

            <Card>
              <Row
                label="Method"
                value={
                  PAYMENT_TYPE_LABELS[bill.payment_type] ?? bill.payment_type
                }
              />
              {hasReference && (
                <Row
                  label={referenceLabels?.numberShort ?? 'Reference'}
                  value={bill.transaction_number || '—'}
                />
              )}
              <Row label="Bill total" value={formatCurrency(billTotal)} />
              <Row label="Amount paid" value={formatCurrency(amountPaid)} />
              <View style={styles.grandRow}>
                <Text style={styles.grandLabel}>Balance due</Text>
                <Text
                  style={[
                    styles.grandValue,
                    unbalance > 0 ? styles.due : styles.settled,
                  ]}
                >
                  {formatCurrency(unbalance)}
                </Text>
              </View>
            </Card>

            {canViewTransaction && (
              <Pressable
                onPress={() => onViewTransaction?.(bill)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.viewProof,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.viewProofText}>
                  {bill.payment_type === PAYMENT_TYPES.CHEQUE
                    ? 'View cheque'
                    : 'View screenshot'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerText: { flex: 1 },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  close: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  body: { paddingBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  itemsCard: { paddingVertical: SPACING.sm },
  itemHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  itemHead: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  // Numeric columns are right-aligned and fixed-width so the decimal points
  // line up down the list.
  colName: { flex: 1, paddingRight: SPACING.sm },
  colQty: { width: 40, textAlign: 'right' },
  colRate: { width: 78, textAlign: 'right' },
  colAmount: { width: 86, textAlign: 'right' },
  itemName: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text },
  itemCell: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  itemAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  detailLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  grandLabel: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  grandValue: { fontSize: FONT_SIZES.lg, fontWeight: '700' },
  due: { color: COLORS.danger },
  settled: { color: COLORS.success },
  viewProof: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  viewProofText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});

export default React.memo(BillDetailModal);
