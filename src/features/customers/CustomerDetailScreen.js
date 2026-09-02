import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BillDetailModal from '../../components/BillDetailModal';
import BillListItem from '../../components/BillListItem';
import Card from '../../components/Card';
import CustomerSummaryCard from '../../components/CustomerSummaryCard';
import StateView from '../../components/StateView';
import { PAYMENT_TYPE_LABELS } from '../../constants/paymentTypes';
import TransactionImageModal from '../../components/TransactionImageModal';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useCustomerDetail } from '../../hooks/useCustomerDetail';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { useProfile } from '../../store/ProfileContext';
import {
  aggregateBillTotals,
  outstandingAfterPayments,
} from '../../utils/billing';
import { formatDateTime } from '../../utils/date';
import { formatCurrency } from '../../utils/money';
import DocumentActions from '../printing/DocumentActions';
import RecordPaymentModal from './RecordPaymentModal';
import {
  buildBillReceiptHtml,
  buildCustomerStatementHtml,
} from '../printing/documentTemplates';
import { buildBillReceipt } from '../printing/thermalReceipt';

const keyExtractor = (bill) => String(bill.id);

const CustomerDetailScreen = ({ route, navigation }) => {
  const { customerId, customerName } = route.params;
  const { customer, loading, refreshing, error, refresh } =
    useCustomerDetail(customerId);
  const { profile: owner, profileLoaded } = useProfile();
  // Two separate selections: opening the payment image from inside the detail
  // sheet must not close the sheet underneath it.
  const [payingCustomer, setPayingCustomer] = useState(null);
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
  const payments = useMemo(() => customer?.payments ?? [], [customer]);

  // Totals are derived from the bills themselves so the header can never
  // disagree with the list it sits above.
  const { totalAmount, totalUnpaid } = useMemo(
    () => aggregateBillTotals(bills),
    [bills],
  );

  // Payments settle dues without touching any bill, so the figure derived
  // from the bills alone would keep showing money already handed over.
  const outstanding = useMemo(
    () => outstandingAfterPayments(totalUnpaid, payments),
    [payments, totalUnpaid],
  );

  const handleOpenBill = useCallback((bill) => setDetailBill(bill), []);

  const handleRecorded = useCallback(() => {
    setPayingCustomer(null);
    // The balance moved server-side, so re-read rather than patch locally.
    refresh();
  }, [refresh]);
  const handleCloseBill = useCallback(() => setDetailBill(null), []);
  const handleViewTransaction = useCallback((bill) => setSelectedBill(bill), []);
  const handleCloseTransaction = useCallback(() => setSelectedBill(null), []);

  const buildStatementHtml = useCallback(
    () =>
      buildCustomerStatementHtml({
        customer,
        bills,
        payments,
        owner,
        issuedAt: formatDateTime(new Date().toISOString()),
      }),
    [bills, customer, owner, payments],
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
            buildReceipt={(paperWidth) =>
              buildBillReceipt({ bill: item, customer, owner, paperWidth })
            }
            printToThermal={billDocs.printToThermal}
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
          totalUnpaid={outstanding}
        />

        {payments.length > 0 && (
          <Card style={styles.paymentsCard}>
            <Text style={styles.paymentsTitle}>
              Payments received ({payments.length})
            </Text>
            {payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentText}>
                  <Text style={styles.paymentMethod}>
                    {PAYMENT_TYPE_LABELS[payment.payment_type] ??
                      payment.payment_type}
                    {payment.transaction_number
                      ? ` · ${payment.transaction_number}`
                      : ''}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {formatDateTime(payment.created_at)}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
            ))}
          </Card>
        )}
        {outstanding > 0 && (
          <Pressable
            onPress={() => setPayingCustomer(customer)}
            accessibilityRole="button"
            accessibilityLabel={`Take payment from ${customer.name}`}
            style={({ pressed }) => [styles.payButton, pressed && styles.pressed]}
          >
            <Ionicons name="cash-outline" size={18} color={COLORS.white} />
            <Text style={styles.payText}>
              Take payment · {formatCurrency(outstanding)} due
            </Text>
          </Pressable>
        )}

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
    outstanding,
    payments,
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

      <RecordPaymentModal
        customer={payingCustomer}
        onClose={() => setPayingCustomer(null)}
        onRecorded={handleRecorded}
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
  paymentsCard: { marginTop: SPACING.md },
  paymentsTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  paymentText: { flex: 1, paddingRight: SPACING.sm },
  paymentMethod: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.success,
  },
  pressed: { opacity: 0.75 },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.success,
  },
  payText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
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
