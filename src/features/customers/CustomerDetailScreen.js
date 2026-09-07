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
import CreditLimitCard from './CreditLimitCard';
import StateView from '../../components/StateView';
import { PAYMENT_TYPE_LABELS } from '../../constants/paymentTypes';
import TransactionImageModal from '../../components/TransactionImageModal';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useCustomerDetail } from '../../hooks/useCustomerDetail';
import { updateCreditLimit } from '../../services/customerService';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { useProfile } from '../../store/ProfileContext';
import {
  aggregateBillTotals,
  outstandingAfterPayments,
} from '../../utils/billing';
import { formatDateTime } from '../../utils/date';
import { formatCurrency, roundMoney, toNumber } from '../../utils/money';
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

  // Saving the limit is local to this screen: it changes shop policy, not
  // the ledger, so it does not belong in the detail hook's fetch cycle.
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitError, setLimitError] = useState(null);

  const handleSaveCreditLimit = useCallback(
    async (limit) => {
      setSavingLimit(true);
      setLimitError(null);
      try {
        await updateCreditLimit(customerId, limit);
        await refresh();
        return true;
      } catch (err) {
        setLimitError(err?.message || 'Could not save the limit.');
        return false;
      } finally {
        setSavingLimit(false);
      }
    },
    [customerId, refresh],
  );
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

  // The server's figure is the only correct one: an overpayment on a later
  // bill settles earlier dues without touching any bill row, so no sum over
  // the bills can reproduce it — deriving here once showed money as owed
  // that had already been handed over. The derived figure remains only as a
  // fallback for a server old enough to omit the field.
  const outstanding = useMemo(() => {
    if (customer?.total_unpaid !== null && customer?.total_unpaid !== undefined) {
      return Math.max(roundMoney(toNumber(customer.total_unpaid)), 0);
    }
    return outstandingAfterPayments(totalUnpaid, payments);
  }, [customer?.total_unpaid, payments, totalUnpaid]);

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
        outstanding,
        issuedAt: formatDateTime(new Date().toISOString()),
      }),
    [bills, customer, outstanding, owner, payments],
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
                  {/* Payments carry the same screenshot fields as bills, so
                      the bill viewer works on them unchanged. Until now the
                      image was collected and then never shown to anyone. */}
                  {!!payment.transaction_screenshot_url && (
                    <Pressable
                      onPress={() => handleViewTransaction(payment)}
                      accessibilityRole="button"
                      hitSlop={10}
                      style={({ pressed }) => [
                        styles.paymentProof,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.paymentProofText}>
                        {payment.payment_type === 'cheque'
                          ? 'View cheque'
                          : 'View screenshot'}
                      </Text>
                    </Pressable>
                  )}
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
        <CreditLimitCard
          customer={customer}
          saving={savingLimit}
          error={limitError}
          onSave={handleSaveCreditLimit}
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
    handleViewTransaction,
    savingLimit,
    limitError,
    handleSaveCreditLimit,
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
  paymentProof: { alignSelf: 'flex-start', paddingVertical: SPACING.xs },
  paymentProofText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
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
