import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useMyCustomers } from '../../hooks/useMyCustomers';
import { setOpeningBalances } from '../../services/customerService';
import { formatCurrency } from '../../utils/money';

const DUE = 'due';
const ADVANCE = 'advance';

const keyExtractor = (customer) => String(customer.id);

/**
 * Moving a whole paper khata across in one sitting.
 *
 * This screen exists because the per-customer card does not scale: a shop
 * with two hundred customers will not tap into two hundred pages, and the
 * ones that try give up halfway and stop using the app. So it is one flat
 * list the owner works down while reading their book, and one Save at the
 * end that either takes the lot or takes none of it.
 */
const OpeningBalancesScreen = () => {
  const { customers, loading, error, refresh } = useMyCustomers();
  const [drafts, setDrafts] = useState({});
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [filter, setFilter] = useState('');

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(needle) ||
        customer.phone?.includes(needle),
    );
  }, [customers, filter]);

  const setDraft = useCallback((id, patch) => {
    setSavedCount(0);
    setDrafts((current) => ({
      ...current,
      [id]: { side: DUE, amount: '', ...current[id], ...patch },
    }));
  }, []);

  const entries = useMemo(
    () =>
      Object.entries(drafts)
        .map(([id, draft]) => ({
          customerId: Number(id),
          amount: Number(draft.amount),
          balanceType: draft.side,
        }))
        .filter((entry) => Number.isFinite(entry.amount) && entry.amount > 0),
    [drafts],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const applied = await setOpeningBalances(
        entries.map((entry) => ({
          ...entry,
          // Dated now, because a carried-over debt with no date is invisible
          // to reminders — the oldest debts would be the only unchased ones.
          asOf: new Date().toISOString(),
          reference,
        })),
      );
      setSavedCount(applied);
      setDrafts({});
      await refresh();
    } catch (err) {
      setSaveError(err?.message || 'Could not save the opening balances.');
    } finally {
      setSaving(false);
    }
  }, [entries, reference, refresh]);

  const renderItem = useCallback(
    ({ item }) => {
      const draft = drafts[item.id] ?? { side: DUE, amount: '' };
      const existing = Number(item.opening_balance) || 0;

      return (
        <Card style={styles.row}>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {existing > 0 && (
              <Text style={styles.existing}>
                Already carried: {formatCurrency(existing)}{' '}
                {item.opening_balance_type === ADVANCE ? 'ahead' : 'owed'}
              </Text>
            )}
          </View>

          <View style={styles.entry}>
            <View style={styles.sides}>
              {[
                { key: DUE, label: 'Owed' },
                { key: ADVANCE, label: 'Ahead' },
              ].map((option) => {
                const active = draft.side === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setDraft(item.id, { side: option.key })}
                    disabled={saving}
                    style={[styles.side, active && styles.sideActive]}
                  >
                    <Text
                      style={[
                        styles.sideText,
                        active && styles.sideTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Input
              placeholder="0.00"
              value={draft.amount}
              onChangeText={(text) =>
                setDraft(item.id, { amount: text.replace(/[^\d.]/g, '') })
              }
              keyboardType="decimal-pad"
              editable={!saving}
              containerStyle={styles.amount}
            />
          </View>
        </Card>
      );
    },
    [drafts, saving, setDraft],
  );

  const header = useMemo(
    () => (
      <Card style={styles.intro}>
        <Text style={styles.introTitle}>Move your khata across</Text>
        <Text style={styles.introText}>
          Work down your book and type what each customer already owed, or had
          paid ahead. Nothing is saved until you press the button at the
          bottom, and none of it counts as a sale.
        </Text>
        <Input
          label="Book reference (optional)"
          placeholder="Khata 3"
          value={reference}
          onChangeText={setReference}
          editable={!saving}
          maxLength={100}
          hint="Recorded against every balance you enter here"
        />
        <Input
          placeholder="Filter by name or phone"
          value={filter}
          onChangeText={setFilter}
          editable={!saving}
          containerStyle={styles.filter}
        />
        {savedCount > 0 && (
          <Text style={styles.saved}>
            ✓ {savedCount} opening {savedCount === 1 ? 'balance' : 'balances'}{' '}
            saved.
          </Text>
        )}
      </Card>
    ),
    [filter, reference, saving, savedCount],
  );

  if (loading) return <StateView variant="loading" />;

  if (error) {
    return <StateView variant="error" title="Could not load" message={error} />;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <StateView
            title="No customers yet"
            message="Customers appear here once you have billed them."
          />
        }
      />

      {entries.length > 0 && (
        <View style={styles.footer}>
          {!!saveError && <Text style={styles.error}>{saveError}</Text>}
          <Button
            title={`Save ${entries.length} opening ${
              entries.length === 1 ? 'balance' : 'balances'
            }`}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  list: { flex: 1 },
  content: { padding: SPACING.md },
  intro: { marginBottom: SPACING.md },
  introTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  introText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  filter: { marginBottom: 0 },
  saved: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    marginTop: SPACING.sm,
    fontWeight: '600',
  },
  row: { marginBottom: SPACING.sm },
  identity: { marginBottom: SPACING.sm },
  name: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  phone: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  existing: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentDark,
    marginTop: SPACING.xs,
  },
  entry: { flexDirection: 'row', alignItems: 'flex-start' },
  sides: { flexDirection: 'row', marginRight: SPACING.sm },
  side: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginRight: SPACING.xs,
  },
  sideActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  sideText: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  sideTextActive: { color: COLORS.primary, fontWeight: '700' },
  amount: { flex: 1, marginBottom: 0 },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});

export default OpeningBalancesScreen;
