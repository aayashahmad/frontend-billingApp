import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import BillListItem from '../../components/BillListItem';
import CustomerSummaryCard from '../../components/CustomerSummaryCard';
import StateView from '../../components/StateView';
import TransactionImageModal from '../../components/TransactionImageModal';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useCustomerDetail } from '../../hooks/useCustomerDetail';
import { aggregateBillTotals } from '../../utils/billing';

const keyExtractor = (bill) => String(bill.id);

const CustomerDetailScreen = ({ route, navigation }) => {
  const { customerId, customerName } = route.params;
  const { customer, loading, refreshing, error, refresh } =
    useCustomerDetail(customerId);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    const title = customer?.name || customerName;
    if (title) navigation.setOptions({ title });
  }, [customer?.name, customerName, navigation]);

  const bills = useMemo(() => customer?.bills ?? [], [customer]);

  // Totals are derived from the bills themselves so the header can never
  // disagree with the list it sits above.
  const { totalAmount, totalUnpaid } = useMemo(
    () => aggregateBillTotals(bills),
    [bills],
  );

  const handleViewTransaction = useCallback((bill) => setSelectedBill(bill), []);
  const handleCloseTransaction = useCallback(() => setSelectedBill(null), []);

  const renderItem = useCallback(
    ({ item }) => (
      <BillListItem bill={item} onViewTransaction={handleViewTransaction} />
    ),
    [handleViewTransaction],
  );

  const listHeader = useMemo(() => {
    if (!customer) return null;
    return (
      <View style={styles.header}>
        <CustomerSummaryCard
          customer={customer}
          totalAmount={totalAmount}
          totalUnpaid={totalUnpaid}
        />
        <Text style={styles.sectionTitle}>
          Bill history{bills.length ? ` (${bills.length})` : ''}
        </Text>
      </View>
    );
  }, [bills.length, customer, totalAmount, totalUnpaid]);

  if (loading && !customer) {
    return <StateView variant="loading" style={styles.fill} />;
  }

  if (error && !customer) {
    return (
      <StateView
        variant="error"
        title="Could not load customer"
        message={error}
        onRetry={refresh}
        style={styles.fill}
      />
    );
  }

  if (!customer) {
    return (
      <StateView
        title="Customer unavailable"
        message="This customer no longer exists."
        style={styles.fill}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <StateView
            title="No bills yet"
            message="Bills created for this customer will appear here."
            style={styles.emptyState}
          />
        }
      />

      <TransactionImageModal
        bill={selectedBill}
        onClose={handleCloseTransaction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  fill: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md },
  header: { marginBottom: SPACING.sm },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyState: { paddingVertical: SPACING.xl },
});

export default CustomerDetailScreen;
