import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import Input from '../../components/Input';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useMyCustomers } from '../../hooks/useMyCustomers';
import { useProfile } from '../../store/ProfileContext';
import { formatCurrency } from '../../utils/money';
import CustomerCard from './CustomerCard';
import RecordPaymentModal from './RecordPaymentModal';

const keyExtractor = (customer) => String(customer.id);

/** The signed-in owner's own customer book, filterable in memory. */
const MyCustomersScreen = ({ navigation }) => {
  const { customers, totals, loading, refreshing, error, refresh } =
    useMyCustomers();
  const { profile } = useProfile();
  const [filter, setFilter] = useState('');
  const [payingCustomer, setPayingCustomer] = useState(null);

  // Filtering locally — the whole book is already loaded, so a round trip
  // per keystroke would be slower and no more correct.
  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(needle) ||
        customer.phone?.includes(needle),
    );
  }, [customers, filter]);

  const handleSelectCustomer = useCallback(
    (customer) => {
      navigation.navigate('CustomerDetail', {
        customerId: customer.id,
        customerName: customer.name,
      });
    },
    [navigation],
  );

  const handlePay = useCallback((customer) => setPayingCustomer(customer), []);

  // The balance just changed, so the list has to come from the server again
  // rather than be patched in place.
  const handleRecorded = useCallback(() => {
    setPayingCustomer(null);
    refresh();
  }, [refresh]);

  const renderItem = useCallback(
    ({ item }) => (
      <CustomerCard
        customer={item}
        onPress={handleSelectCustomer}
        onPay={handlePay}
      />
    ),
    [handlePay, handleSelectCustomer],
  );

  const header = useMemo(
    () => (
      <View>
        <Card style={styles.summary}>
          <Text style={styles.summaryOwner} numberOfLines={1}>
            {profile?.username ? `${profile.username}'s customers` : 'My customers'}
          </Text>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{customers.length}</Text>
              <Text style={styles.metricLabel}>Customers</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {formatCurrency(totals.billed)}
              </Text>
              <Text style={styles.metricLabel}>Total billed</Text>
            </View>
            <View style={styles.metric}>
              <Text
                style={[
                  styles.metricValue,
                  totals.outstanding > 0 ? styles.due : styles.settled,
                ]}
              >
                {formatCurrency(totals.outstanding)}
              </Text>
              <Text style={styles.metricLabel}>
                Outstanding{totals.owing ? ` (${totals.owing})` : ''}
              </Text>
            </View>
          </View>
        </Card>

        {customers.length > 0 && (
          <Input
            placeholder="Filter by name or phone"
            value={filter}
            onChangeText={setFilter}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            containerStyle={styles.filter}
            accessibilityLabel="Filter customers"
          />
        )}
      </View>
    ),
    [customers.length, filter, profile?.username, totals],
  );

  if (loading && !customers.length) {
    return <StateView variant="loading" style={styles.fill} />;
  }

  if (error && !customers.length) {
    return (
      <StateView
        variant="error"
        title="Could not load your customers"
        message={error}
        onRetry={refresh}
        style={styles.fill}
      />
    );
  }

  const renderEmpty = () =>
    filter.trim() ? (
      <StateView
        title="No match"
        message={`No customer matches "${filter.trim()}".`}
      />
    ) : (
      <StateView
        title="No customers yet"
        message="Customers you bill will appear here. Create a bill to add your first one."
      />
    );

  return (
    <View style={styles.container}>
      {/* A failed refresh used to vanish silently once data was on screen,
          leaving stale balances that looked current. */}
      {!!error && customers.length > 0 && (
        <Text style={styles.refreshError}>
          Could not refresh — showing earlier data. Pull down to retry.
        </Text>
      )}
      <FlatList
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={COLORS.primary}
          />
        }
      />

      <RecordPaymentModal
        customer={payingCustomer}
        onClose={() => setPayingCustomer(null)}
        onRecorded={handleRecorded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  refreshError: {
    color: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  fill: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md },
  summary: { marginBottom: SPACING.md },
  summaryOwner: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  metrics: { flexDirection: 'row' },
  metric: { flex: 1 },
  metricValue: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  due: { color: COLORS.danger },
  settled: { color: COLORS.success },
  filter: { marginBottom: SPACING.sm },
});

export default MyCustomersScreen;
