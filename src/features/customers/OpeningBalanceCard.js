import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { formatDateTime } from '../../utils/date';
import { formatCurrency } from '../../utils/money';

const DUE = 'due';
const ADVANCE = 'advance';

/**
 * What this customer already owed when the shop left its paper khata.
 *
 * Not a bill, and deliberately not entered as one: an opening balance is
 * not a sale, and recording it as one would inflate the shop's takings for
 * ever. It sits on the customer, shows on their statement as the balance
 * brought forward, and is invisible to every sales report.
 *
 * Which side it falls on is a choice, not an assumption. Plenty of migrated
 * customers had paid ahead, and starting them in debt because the form only
 * offered one direction is the kind of error a shop finds out about from
 * the customer.
 */
const OpeningBalanceCard = ({ customer, saving, error, onSave }) => {
  const stored = customer?.opening_balance;
  const hasStored = stored !== null && stored !== undefined && Number(stored) > 0;

  const [amount, setAmount] = useState(hasStored ? String(stored) : '');
  const [side, setSide] = useState(customer?.opening_balance_type || DUE);
  const [reference, setReference] = useState(
    customer?.opening_balance_ref || '',
  );
  const [touched, setTouched] = useState(false);

  // Re-sync on reload, unless the owner is mid-edit — losing a half-typed
  // figure to a background refresh would be maddening on migration day.
  useEffect(() => {
    if (touched) return;
    setAmount(hasStored ? String(stored) : '');
    setSide(customer?.opening_balance_type || DUE);
    setReference(customer?.opening_balance_ref || '');
  }, [
    customer?.opening_balance_ref,
    customer?.opening_balance_type,
    hasStored,
    stored,
    touched,
  ]);

  const parsed = Number(amount);
  const invalid = amount.trim() !== '' && (!Number.isFinite(parsed) || parsed < 0);
  const dirty =
    touched &&
    !invalid &&
    (String(stored ?? '') !== amount.trim() ||
      (customer?.opening_balance_type || DUE) !== side ||
      (customer?.opening_balance_ref || '') !== reference.trim());

  const handleSave = useCallback(() => {
    const value = amount.trim() === '' ? null : parsed;
    onSave?.({
      amount: value,
      balanceType: value === null ? null : side,
      // Dated now when the shop does not say otherwise. A carried-over debt
      // with no date is invisible to reminders, which would quietly exempt
      // the oldest debts in the book from ever being chased.
      asOf: value === null ? null : new Date().toISOString(),
      reference,
    });
    setTouched(false);
  }, [amount, onSave, parsed, reference, side]);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Opening balance</Text>
      <Text style={styles.hint}>
        What this customer already owed, or had paid ahead, in your old book.
        It shows on their statement and never counts as a sale.
      </Text>

      {hasStored && !touched && (
        <View style={styles.current}>
          <Text
            style={[
              styles.currentAmount,
              customer.opening_balance_type === ADVANCE
                ? styles.credit
                : styles.debt,
            ]}
          >
            {formatCurrency(stored)}{' '}
            {customer.opening_balance_type === ADVANCE
              ? 'paid ahead'
              : 'owed'}
          </Text>
          {!!customer.opening_balance_ref && (
            <Text style={styles.currentMeta}>
              {customer.opening_balance_ref}
            </Text>
          )}
          {!!customer.opening_balance_date && (
            <Text style={styles.currentMeta}>
              As of {formatDateTime(customer.opening_balance_date)}
            </Text>
          )}
        </View>
      )}

      <View style={styles.sides}>
        {[
          { key: DUE, label: 'They owed me' },
          { key: ADVANCE, label: 'They paid ahead' },
        ].map((option) => {
          const active = side === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                setTouched(true);
                setSide(option.key);
              }}
              disabled={saving}
              style={[styles.side, active && styles.sideActive]}
            >
              <Text style={[styles.sideText, active && styles.sideTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Amount"
        placeholder="0.00"
        value={amount}
        onChangeText={(text) => {
          setTouched(true);
          setAmount(text.replace(/[^\d.]/g, ''));
        }}
        keyboardType="decimal-pad"
        editable={!saving}
        error={invalid ? 'Enter a valid amount' : undefined}
        hint="Leave empty to remove the opening balance"
      />

      <Input
        label="Khata / page number"
        placeholder="Khata 3, page 47"
        value={reference}
        onChangeText={(text) => {
          setTouched(true);
          setReference(text);
        }}
        editable={!saving}
        maxLength={100}
        hint="Where it came from, for when the figure is questioned later"
      />

      {dirty && (
        <Button
          title="Save opening balance"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginTop: SPACING.md },
  title: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  current: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  currentAmount: { fontSize: FONT_SIZES.lg, fontWeight: '700' },
  debt: { color: COLORS.danger },
  credit: { color: COLORS.success },
  currentMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  sides: { flexDirection: 'row', marginBottom: SPACING.md },
  side: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  sideActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  sideText: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  sideTextActive: { color: COLORS.primary, fontWeight: '700' },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default OpeningBalanceCard;
