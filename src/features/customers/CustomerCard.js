import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { netBalance } from '../../utils/billing';
import { formatCurrency, toNumber } from '../../utils/money';

const CustomerCard = ({ customer, onPress, onPay }) => {
  const handlePress = useCallback(() => onPress?.(customer), [customer, onPress]);
  const handlePay = useCallback(() => onPay?.(customer), [customer, onPay]);
  const unpaid = toNumber(customer.total_unpaid);
  // One signed figure: negative is owed to the shop, positive is credit the
  // shop is holding. A customer is never both, so two numbers would only
  // make the reader compare them.
  const balance = netBalance(customer);
  // Nothing owed, nothing to collect — the button would only ever error.
  const canPay = Boolean(onPay) && unpaid > 0;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${customer.name}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name || 'Unnamed customer'}
          </Text>
          <Text style={styles.phone}>{customer.phone}</Text>
        </View>

        <View style={styles.amounts}>
          <Text style={styles.total}>
            {formatCurrency(customer.total_amount)}
          </Text>
          <Text style={[styles.unpaid, balance < 0 ? styles.due : styles.settled]}>
            {balance < 0
              ? `−${formatCurrency(Math.abs(balance))}`
              : balance > 0
                ? `+${formatCurrency(balance)} advance`
                : 'Settled'}
          </Text>
        </View>

        {canPay && (
          <Pressable
            onPress={handlePay}
            accessibilityRole="button"
            accessibilityLabel={`Take payment from ${customer.name}`}
            hitSlop={10}
            style={({ pressed }) => [styles.payButton, pressed && styles.pressed]}
          >
            <Ionicons name="cash-outline" size={16} color={COLORS.white} />
            <Text style={styles.payText}>Pay</Text>
          </Pressable>
        )}
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  identity: { flex: 1, paddingRight: SPACING.sm },
  name: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  phone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  amounts: { alignItems: 'flex-end' },
  total: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  unpaid: { fontSize: FONT_SIZES.xs, marginTop: 2, fontWeight: '600' },
  due: { color: COLORS.danger },
  settled: { color: COLORS.success },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.success,
  },
  payText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    marginLeft: 4,
  },
});

export default React.memo(CustomerCard);
