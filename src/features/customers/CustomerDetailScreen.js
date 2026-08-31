import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import BillDetailModal from '../../components/BillDetailModal';
import BillListItem from '../../components/BillListItem';
import CustomerSummaryCard from '../../components/CustomerSummaryCard';
import StateView from '../../components/StateView';
import TransactionImageModal from '../../components/TransactionImageModal';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useCustomerDetail } from '../../hooks/useCustomerDetail';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { useProfile } from '../../store/ProfileContext';
import { aggregateBillTotals } from '../../utils/billing';
import { formatDateTime } from '../../utils/date';
import DocumentActions from '../printing/DocumentActions';
import {
  buildBillReceiptHtml,
  buildCustomerStatementHtml,
} from '../printing/documentTemplates';

const keyExtractor = (bill) => String(bill.id);

const CustomerDetailScreen = ({ route, navigation }) => {
  const { customerId, customerName } = route.params;
  const { customer, loading, refreshing, error, refresh } =
    useCustomerDetail(customerId);
  const { profile: owner, profileLoaded } = useProfile();
  // Two separate selections: opening the payment image from inside the detail
  // sheet must not close the sheet underneath it.
  const [detailBill, setDetailBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);

  // Separate action states so a per-bill failure never reports itself under
  // the statement buttons, and vice versa.
  const statementDocs = useDocumentActions();
  const billDocs = useDocumentActions();

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

  const handleOpenBill = useCallback((bill) => setDetailBill(bill), []);
  const handleCloseBill = useCallback(() => setDetailBill(null), []);
  const handleViewTransaction = useCallback((bill) => setSelectedBill(bill), []);
  const handleCloseTransaction = useCallback(() => setSelectedBill(null), []);

  const buildStatementHtml = useCallback(
    () =>
      buildCustomerStatementHtml({
        customer,
        bills,
        owner,
        issuedAt: formatDateTime(new Date().toISOString()),
      }),
    [bills, customer, owner],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <BillListItem
        bill={item}
        onPress={handleOpenBill}
        onViewTransaction={handleViewTransaction}
        actions={
          <DocumentActions
            compact
            label={`bill-${item.id}-${customer?.name ?? ''}`}
            buildHtml={() =>
              buildBillReceiptHtml({ bill: item, customer, owner })
            }
            print={billDocs.print}
            shareAsPdf={billDocs.shareAsPdf}
            busy={billDocs.busy}
            disabled={!profileLoaded}
          />
        }
      />
    ),
    [
      billDocs.busy,
      billDocs.print,
      billDocs.shareAsPdf,
      customer,
      handleOpenBill,
      handleViewTransaction,
      owner,
      profileLoaded,
    ],
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
        <DocumentActions
          label={`statement-${customer.name}-${customer.phone}`}
          buildHtml={buildStatementHtml}
          print={statementDocs.print}
          shareAsPdf={statementDocs.shareAsPdf}
          busy={statementDocs.busy}
          error={statementDocs.error}
          disabled={!profileLoaded}
          style={styles.statementActions}
        />
        <Text style={styles.sectionTitle}>
          Bill history{bills.length ? ` (${bills.length})` : ''}
        </Text>
        {!!billDocs.error && (
          <Text style={styles.billError}>{billDocs.error}</Text>
        )}
      </View>
    );
  }, [
    billDocs.error,
    bills.length,
    buildStatementHtml,
    customer,
    statementDocs.busy,
    statementDocs.error,
    statementDocs.print,
    statementDocs.shareAsPdf,
    profileLoaded,
    totalAmount,
    totalUnpaid,
  ]);

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

      <BillDetailModal
        bill={detailBill}
        onClose={handleCloseBill}
        onViewTransaction={handleViewTransaction}
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
  statementActions: { marginTop: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  billError: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
  },
  emptyState: { paddingVertical: SPACING.xl },
});

export default CustomerDetailScreen;
