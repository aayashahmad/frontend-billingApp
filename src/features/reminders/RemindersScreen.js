import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useReminders } from '../../hooks/useReminders';
import { useProfile } from '../../store/ProfileContext';
import { formatCurrency } from '../../utils/money';
import ReminderRow from './ReminderRow';

const keyExtractor = (customer) => String(customer.id);

/**
 * Overdue customers, and the rules that decide who lands here.
 *
 * The settings sit above the list rather than behind a gear icon: the list
 * is only meaningful next to the thresholds that produced it, and an owner
 * looking at an empty list needs to see the floor is ₹5,000 rather than
 * wonder whether the screen is broken.
 */
const RemindersScreen = ({ navigation }) => {
  const {
    customers,
    settings,
    loading,
    refreshing,
    saving,
    error,
    refresh,
    saveSettings,
    dismiss,
  } = useReminders();
  const { profile } = useProfile();

  // Draft values, so a half-typed threshold never reaches the server.
  const [draftAmount, setDraftAmount] = useState(null);
  const [draftDays, setDraftDays] = useState(null);

  const shopName = profile?.business_name || profile?.username;

  const amountValue =
    draftAmount ?? (settings ? String(settings.minAmount) : '');
  const daysValue = draftDays ?? (settings ? String(settings.afterDays) : '');

  const dirty =
    settings !== null &&
    (Number(amountValue) !== settings.minAmount ||
      Number(daysValue) !== settings.afterDays);

  const handleToggle = useCallback(
    (enabled) => saveSettings({ enabled }),
    [saveSettings],
  );

  const handleSaveThresholds = useCallback(async () => {
    const saved = await saveSettings({
      minAmount: Number(amountValue) || 0,
      afterDays: Number(daysValue) || 0,
    });
    if (saved) {
      setDraftAmount(null);
      setDraftDays(null);
    }
  }, [amountValue, daysValue, saveSettings]);

  const handleOpen = useCallback(
    (customer) =>
      navigation.navigate('MyCustomersRoot', {
        screen: 'CustomerDetail',
        params: { customerId: customer.id, customerName: customer.name },
      }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <ReminderRow
        customer={item}
        shopName={shopName}
        onOpen={handleOpen}
        onChased={dismiss}
      />
    ),
    [dismiss, handleOpen, shopName],
  );

  const header = useMemo(
    () => (
      <Card style={styles.settings}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.settingsTitle}>Send reminders automatically</Text>
            <Text style={styles.settingsHint}>
              {settings?.enabled
                ? 'Customers with an email on file are emailed once a day. You get a notification listing everyone who needs chasing.'
                : 'Off — nothing is sent. This list still shows who is overdue.'}
            </Text>
          </View>
          <Switch
            value={Boolean(settings?.enabled)}
            onValueChange={handleToggle}
            disabled={saving || !settings}
            trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
            thumbColor={settings?.enabled ? COLORS.primary : undefined}
          />
        </View>

        {settings?.enabled && !settings?.pushRegistered && (
          <Text style={styles.warning}>
            Notifications are not set up on this phone yet, so the daily
            summary has nowhere to go. Emails still send.
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.settingsTitle}>Chase a customer when…</Text>
        <View style={styles.thresholds}>
          <Input
            label="They owe at least"
            value={amountValue}
            onChangeText={(text) => setDraftAmount(text.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            editable={!saving}
            containerStyle={styles.threshold}
          />
          <View style={styles.gap} />
          <Input
            label="For at least (days)"
            value={daysValue}
            onChangeText={(text) => setDraftDays(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            editable={!saving}
            containerStyle={styles.threshold}
          />
        </View>

        {dirty && (
          <Button
            title="Save thresholds"
            onPress={handleSaveThresholds}
            loading={saving}
            disabled={saving}
          />
        )}

        <Text style={styles.count}>
          {customers.length === 0
            ? 'Nobody is overdue.'
            : `${customers.length} ${
                customers.length === 1 ? 'customer needs' : 'customers need'
              } chasing · ${formatCurrency(
                customers.reduce((sum, row) => sum + row.outstanding, 0),
              )} outstanding`}
        </Text>
      </Card>
    ),
    [
      amountValue,
      customers,
      daysValue,
      dirty,
      handleSaveThresholds,
      handleToggle,
      saving,
      settings,
    ],
  );

  if (loading) return <StateView variant="loading" />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={customers}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        error ? (
          <StateView variant="error" title="Could not load" message={error} />
        ) : (
          <StateView
            title="Nobody is overdue"
            message="Customers appear here once they pass the thresholds above."
          />
        )
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  settings: { marginBottom: SPACING.md },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start' },
  switchText: { flex: 1, paddingRight: SPACING.md },
  settingsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingsHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  warning: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.accentDark,
    marginTop: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  thresholds: { flexDirection: 'row', marginTop: SPACING.sm },
  threshold: { flex: 1, marginBottom: SPACING.sm },
  gap: { width: SPACING.sm },
  count: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
});

export default RemindersScreen;
