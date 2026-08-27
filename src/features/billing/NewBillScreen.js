import { useCallback, useState } from 'react';
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
import { formatCurrency } from '../../utils/money';
import DocumentActions from '../printing/DocumentActions';
import { buildBillReceiptHtml } from '../printing/documentTemplates';
import BillForm from './BillForm';

const NewBillScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { submitBill, submitting, error, clearError } = useCreateBill();
  const { profile: owner, profileLoaded } = useProfile();
  const receiptDocs = useDocumentActions();
  const [lastCreated, setLastCreated] = useState(null);

  const handleSubmitBill = useCallback(
    async (values) => {
      clearError();
      const result = await submitBill(values);
      if (result) setLastCreated(result);
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + SPACING.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {!!lastCreated && (
          <Card style={styles.receipt}>
            <Text style={styles.receiptTitle}>Bill created</Text>
            <Text style={styles.receiptLine}>
              {lastCreated.bill.item_name} × {lastCreated.bill.qty} —{' '}
              {formatCurrency(lastCreated.bill.bill_total)}
            </Text>
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
  receiptDocs: { marginTop: SPACING.md },
  receiptActions: { flexDirection: 'row', marginTop: SPACING.sm },
  receiptAction: { flex: 1 },
  receiptGap: { width: SPACING.sm },
});

export default NewBillScreen;
