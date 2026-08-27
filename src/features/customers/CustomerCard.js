import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { formatCurrency, toNumber } from '../../utils/money';

const CustomerCard = ({ customer, onPress }) => {
  const handlePress = useCallback(() => onPress?.(customer), [customer, onPress]);
  const unpaid = toNumber(customer.total_unpaid);

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
          <Text style={[styles.unpaid, unpaid > 0 ? styles.due : styles.settled]}>
            {unpaid > 0 ? `Due ${formatCurrency(unpaid)}` : 'Settled'}
          </Text>
        </View>
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
});

export default React.memo(CustomerCard);
