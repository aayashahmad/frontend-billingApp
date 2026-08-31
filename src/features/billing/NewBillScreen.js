import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Card from '../../components/Card';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useCreateBill } from '../../hooks/useCreateBill';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { useProfile } from '../../store/ProfileContext';
import { billItems, calculateBillTotal } from '../../utils/billing';
import { formatCurrency } from '../../utils/money';
import DocumentActions from '../printing/DocumentActions';
import { buildBillReceiptHtml } from '../printing/documentTemplates';
import BillForm from './BillForm';

const NewBillScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const { submitBill, submitting, error, clearError } = useCreateBill();
  const { profile: owner, profileLoaded } = useProfile();
  const receiptDocs = useDocumentActions();
  const [lastCreated, setLastCreated] = useState(null);

  const handleSubmitBill = useCallback(
    async (values) => {
      clearError();
      const result = await submitBill(values);
      if (result) {
        setLastCreated(result);
        // The receipt card renders above the (now reset) form, so bring it
        // into view instead of leaving the user at the bottom of the page.
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      return result;
    },
    [clearError, submitBill],
  );

  const handleViewCustomer = useCallback(() => {
    if (!lastCreated?.customer?.id) return;
    navigation.navigate('CustomerDetail', {
      customerId: lastCreated.customer.id,
      customerName: lastCreated.customer.name,
    });
  }, [lastCreated, navigation]);

  const handleDismissReceipt = useCallback(() => setLastCreated(null), []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Android runs edge-to-edge, so `adjustResize` no longer shrinks the
      // window — `padding` is what keeps fields clear of the keyboard.
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + SPACING.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!!lastCreated && (
          <Card style={styles.receipt}>
            <Text style={styles.receiptTitle}>Bill created</Text>

            {/* Every line, not just the flat first item — a multi-item bill
                was confirming itself as a one-item sale. */}
            {billItems(lastCreated.bill).map((item, index) => (
              <View
                key={item.id ?? `${lastCreated.bill.id}-${index}`}
                style={styles.receiptItem}
              >
                <Text style={styles.receiptItemName} numberOfLines={2}>
                  {item.item_name}
                </Text>
                <Text style={styles.receiptItemMeta}>
                  {item.qty} × {formatCurrency(item.rate)}
                </Text>
                <Text style={styles.receiptItemAmount}>
                  {formatCurrency(
                    item.line_total ?? calculateBillTotal(item.qty, item.rate),
                  )}
                </Text>
              </View>
            ))}

            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>Bill total</Text>
              <Text style={styles.receiptTotalValue}>
                {formatCurrency(lastCreated.bill.bill_total)}
              </Text>
            </View>

            <Text style={styles.receiptLine}>
              {lastCreated.customer.name} now owes{' '}
              {formatCurrency(lastCreated.customer.total_unpaid)} of{' '}
              {formatCurrency(lastCreated.customer.total_amount)} billed.
            </Text>
            <DocumentActions
              compact
              label={`bill-${lastCreated.bill.id}-${lastCreated.customer.name}`}
              buildHtml={() =>
                buildBillReceiptHtml({
                  bill: lastCreated.bill,
                  customer: lastCreated.customer,
                  owner,
                })
              }
              print={receiptDocs.print}
              shareAsPdf={receiptDocs.shareAsPdf}
              busy={receiptDocs.busy}
              error={receiptDocs.error}
              disabled={!profileLoaded}
              style={styles.receiptDocs}
            />

            <View style={styles.receiptActions}>
              <Button
                title="View customer"
                variant="secondary"
                onPress={handleViewCustomer}
                style={styles.receiptAction}
              />
              <View style={styles.receiptGap} />
              <Button
                title="Dismiss"
                variant="secondary"
                onPress={handleDismissReceipt}
                style={styles.receiptAction}
              />
            </View>
          </Card>
        )}

        <BillForm
          onSubmitBill={handleSubmitBill}
          submitting={submitting}
          submitError={error}
          onClearSubmitError={clearError}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  receipt: {
    marginBottom: SPACING.md,
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLight,
  },
  receiptTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  receiptLine: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: 2,
  },
  receiptItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.xs,
  },
  receiptItemName: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    paddingRight: SPACING.sm,
  },
  receiptItemMeta: {
    width: 110,
    textAlign: 'right',
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  receiptItemAmount: {
    width: 86,
    textAlign: 'right',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.success,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  receiptTotalLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  receiptTotalValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  receiptDocs: { marginTop: SPACING.md },
  receiptActions: { flexDirection: 'row', marginTop: SPACING.sm },
  receiptAction: { flex: 1 },
  receiptGap: { width: SPACING.sm },
});

export default NewBillScreen;
