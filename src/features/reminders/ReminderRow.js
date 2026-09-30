import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/money';
import { buildBalanceMessage, buildSmsLink } from '../../utils/messaging';
import { buildWhatsAppLink } from '../../utils/upi';
import { overdueLabel } from './overdue';

/**
 * One overdue customer, with the ways to chase them.
 *
 * The email tick is a statement of fact from the server, not a button: the
 * daily run already sent that one. WhatsApp and SMS are buttons because
 * neither can be sent without the shopkeeper pressing send.
 */
const ReminderRow = ({ customer, shopName, onOpen, onChased }) => {
  const [error, setError] = useState(null);

  const message = buildBalanceMessage({
    customer: {
      name: customer.name,
      total_unpaid: customer.outstanding,
      advance_balance: 0,
    },
    shopName,
  });

  const open = useCallback(
    async (url, missing) => {
      setError(null);
      if (!url) {
        setError('No valid phone number saved.');
        return;
      }
      try {
        if (!(await Linking.canOpenURL(url))) {
          setError(missing);
          return;
        }
        await Linking.openURL(url);
        onChased?.(customer.id);
      } catch {
        setError(missing);
      }
    },
    [customer.id, onChased],
  );

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => onOpen?.(customer)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${customer.name}`}
      >
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={styles.phone}>{customer.phone}</Text>
        </View>
        <View style={styles.amounts}>
          <Text style={styles.outstanding}>
            {formatCurrency(customer.outstanding)}
          </Text>
          <Text style={styles.overdue}>{overdueLabel(customer.daysOverdue)}</Text>
        </View>
      </Pressable>

      {customer.email ? (
        <Text style={styles.emailed}>
          ✓ Emailed automatically to {customer.email}
        </Text>
      ) : (
        <Text style={styles.noEmail}>
          No email on file — message them below, or add one on their page.
        </Text>
      )}

      <View style={styles.row}>
        <Button
          title="WhatsApp"
          icon="logo-whatsapp"
          variant="secondary"
          onPress={() =>
            open(
              buildWhatsAppLink(customer.phone, message),
              'WhatsApp is not installed on this phone.',
            )
          }
          style={styles.action}
        />
        <View style={styles.gap} />
        <Button
          title="SMS"
          icon="chatbubble-outline"
          variant="secondary"
          onPress={() =>
            open(
              buildSmsLink(customer.phone, message),
              'No messaging app could be opened.',
            )
          }
          style={styles.action}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  identity: { flex: 1, paddingRight: SPACING.sm },
  name: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  phone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  amounts: { alignItems: 'flex-end' },
  outstanding: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.danger,
  },
  overdue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentDark,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  emailed: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  noEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  row: { flexDirection: 'row' },
  action: { flex: 1 },
  gap: { width: SPACING.sm },
  pressed: { opacity: 0.6 },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default React.memo(ReminderRow);
