import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/money';

/**
 * How much this customer may owe at once.
 *
 * Shops extend credit by reputation and the ceiling differs per person, so
 * this is set on the customer rather than as one shop-wide rule. Off means no
 * limit; on with 0 means cash only — a real setting, not the same thing.
 *
 * The limit only warns when a bill would cross it. It does not block the
 * sale: the owner standing at the counter knows things the app does not, and
 * refusing to record a sale that happened anyway would put the ledger out of
 * step with reality.
 */
const CreditLimitCard = ({ customer, saving, error, onSave }) => {
  const storedLimit = customer?.credit_limit;
  const hasStoredLimit = storedLimit !== null && storedLimit !== undefined;

  const [enabled, setEnabled] = useState(hasStoredLimit);
  const [amount, setAmount] = useState(
    hasStoredLimit ? String(storedLimit) : '',
  );
  const [touched, setTouched] = useState(false);

  // Re-sync when the customer reloads, unless the owner is mid-edit — losing
  // a half-typed limit to a background refresh would be maddening.
  useEffect(() => {
    if (touched) return;
    setEnabled(hasStoredLimit);
    setAmount(hasStoredLimit ? String(storedLimit) : '');
  }, [hasStoredLimit, storedLimit, touched]);

  const outstanding = Number(customer?.total_unpaid) || 0;
  const parsed = Number(amount);
  const amountInvalid = enabled && (!amount.trim() || !Number.isFinite(parsed) || parsed < 0);

  const handleToggle = useCallback((next) => {
    setTouched(true);
    setEnabled(next);
    if (!next) setAmount('');
  }, []);

  const handleSave = useCallback(async () => {
    if (amountInvalid) return;
    const saved = await onSave(enabled ? parsed : null);
    if (saved) setTouched(false);
  }, [amountInvalid, enabled, onSave, parsed]);

  const overBy = enabled && !amountInvalid ? outstanding - parsed : 0;

  return (
    <>
      <Text style={styles.sectionTitle}>Credit limit</Text>
      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Limit what this customer can owe</Text>
            <Text style={styles.rowHint}>
              {enabled
                ? 'A warning shows when a new bill would cross it.'
                : 'Off — this customer can carry any balance.'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={saving}
            trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
            thumbColor={enabled ? COLORS.primary : undefined}
            accessibilityLabel="Limit what this customer can owe"
          />
        </View>

        {enabled && (
          <>
            <Input
              label="Maximum outstanding"
              placeholder="e.g. 2000"
              value={amount}
              onChangeText={(text) => {
                setTouched(true);
                // Digits and a single decimal point — a limit is money.
                setAmount(text.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'));
              }}
              keyboardType="decimal-pad"
              editable={!saving}
              error={
                amountInvalid && touched ? 'Enter an amount of 0 or more' : undefined
              }
              hint={
                parsed === 0 && amount.trim()
                  ? 'Zero means cash only — no credit at all.'
                  : `Currently owes ${formatCurrency(outstanding)}.`
              }
              testID="credit-limit-amount"
            />

            {overBy > 0 && (
              <Text style={styles.warning}>
                Already over by {formatCurrency(overBy)}.
              </Text>
            )}
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button
          title="Save limit"
          onPress={handleSave}
          loading={saving}
          disabled={saving || amountInvalid}
          testID="save-credit-limit"
        />
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  rowText: { flex: 1, paddingRight: SPACING.md },
  rowLabel: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  rowHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
    lineHeight: 16,
  },
  warning: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});

export default CreditLimitCard;
