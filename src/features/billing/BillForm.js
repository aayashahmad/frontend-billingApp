import { Formik } from 'formik';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import CustomerSummaryCard from '../../components/CustomerSummaryCard';
import ImagePickerField from '../../components/ImagePickerField';
import Input from '../../components/Input';
import {
  PAYMENT_REFERENCE_LABELS,
  PAYMENT_TYPES,
  PHONE_MAX_LENGTH,
} from '../../constants/paymentTypes';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useCustomerLookup } from '../../hooks/useCustomerLookup';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  calculateBillTotal,
  calculateUnbalance,
  hasPaymentReference,
  usesEnteredAmount,
} from '../../utils/billing';
import { formatCurrency } from '../../utils/money';
import {
  INITIAL_BILL_VALUES,
  billValidationSchema,
} from './billValidationSchema';
import PaymentTypeToggle from './PaymentTypeToggle';

const PHONE_LOOKUP_DEBOUNCE_MS = 400;

const BillFormFields = ({
  values,
  errors,
  touched,
  handleBlur,
  setFieldValue,
  setFieldTouched,
  handleSubmit,
  submitting,
  submitError,
  onClearSubmitError,
}) => {
  const { customer, isNewCustomer, loading: lookingUp, error: lookupError, lookup, reset: resetLookup } =
    useCustomerLookup();

  const debouncedPhone = useDebouncedValue(values.phone, PHONE_LOOKUP_DEBOUNCE_MS);

  // A rejected submit leaves its message on screen. Clear it the moment the
  // user edits anything, otherwise "Cheque number is required" keeps showing
  // while they are typing the cheque number that fixes it.
  useEffect(() => {
    if (submitError) onClearSubmitError?.();
    // Intentionally keyed on `values` alone: this should fire on edits, not
    // when the error itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  // Once the user edits the name themselves, a later auto-fill must not
  // overwrite it — until they switch to a different phone number.
  const nameEditedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const found = await lookup(debouncedPhone);
      if (!active || !found) return;
      if (!nameEditedRef.current) setFieldValue('customerName', found.name);
    };

    run();
    return () => {
      active = false;
    };
  }, [debouncedPhone, lookup, setFieldValue]);

  // Cash and cheque both take an entered amount; online and cheque both
  // take a reference number plus an image.
  const entersAmount = usesEnteredAmount(values.paymentType);
  const needsReference = hasPaymentReference(values.paymentType);
  const referenceLabels = PAYMENT_REFERENCE_LABELS[values.paymentType];

  const billTotal = useMemo(
    () => calculateBillTotal(values.qty, values.rate),
    [values.qty, values.rate],
  );

  const unbalance = useMemo(
    () => (entersAmount ? calculateUnbalance(billTotal, values.amountPaid) : 0),
    [entersAmount, billTotal, values.amountPaid],
  );

  const handlePhoneChange = useCallback(
    (text) => {
      const digitsOnly = text.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH);
      // A new phone means a different customer — allow auto-fill again.
      nameEditedRef.current = false;
      setFieldValue('phone', digitsOnly);
      if (digitsOnly.length === 0) resetLookup();
    },
    [resetLookup, setFieldValue],
  );

  const handleNameChange = useCallback(
    (text) => {
      nameEditedRef.current = true;
      setFieldValue('customerName', text);
    },
    [setFieldValue],
  );

  const handlePaymentTypeChange = useCallback(
    (nextType) => {
      setFieldValue('paymentType', nextType);
      // Clear the fields belonging to the other branch so a switch never
      // submits stale values from the previous payment type.
      if (!hasPaymentReference(nextType)) {
        setFieldValue('transactionNumber', '');
        setFieldValue('transactionScreenshot', null);
      }
      if (!usesEnteredAmount(nextType)) {
        setFieldValue('amountPaid', '');
      }
    },
    [setFieldValue],
  );

  const handleScreenshotChange = useCallback(
    (asset) => {
      setFieldValue('transactionScreenshot', asset);
      setFieldTouched('transactionScreenshot', true, false);
    },
    [setFieldTouched, setFieldValue],
  );

  const fieldError = useCallback(
    (name) => (touched[name] && errors[name] ? errors[name] : undefined),
    [errors, touched],
  );

  return (
    <View>
      <Input
        label="Customer phone number"
        placeholder="Enter phone number"
        value={values.phone}
        onChangeText={handlePhoneChange}
        onBlur={handleBlur('phone')}
        keyboardType="number-pad"
        maxLength={PHONE_MAX_LENGTH}
        loading={lookingUp}
        error={fieldError('phone')}
        hint={
          isNewCustomer
            ? 'New customer — enter their name below.'
            : 'Existing customers are filled in automatically.'
        }
        editable={!submitting}
      />

      {!!lookupError && <Text style={styles.lookupError}>{lookupError}</Text>}

      {!!customer && (
        <CustomerSummaryCard
          customer={customer}
          caption="Existing customer"
          style={styles.summary}
        />
      )}

      <Input
        label="Customer name"
        placeholder="Enter customer name"
        value={values.customerName}
        onChangeText={handleNameChange}
        onBlur={handleBlur('customerName')}
        autoCapitalize="words"
        error={fieldError('customerName')}
        containerStyle={styles.spacedTop}
        editable={!submitting}
      />

      <Input
        label="Item name"
        placeholder="What was sold?"
        value={values.itemName}
        onChangeText={(text) => setFieldValue('itemName', text)}
        onBlur={handleBlur('itemName')}
        error={fieldError('itemName')}
        editable={!submitting}
      />

      <View style={styles.row}>
        <Input
          label="Quantity"
          placeholder="0"
          value={String(values.qty)}
          onChangeText={(text) => setFieldValue('qty', text.replace(/[^\d]/g, ''))}
          onBlur={handleBlur('qty')}
          keyboardType="number-pad"
          error={fieldError('qty')}
          containerStyle={styles.rowItem}
          editable={!submitting}
        />
        <View style={styles.rowGap} />
        <Input
          label="Rate per unit"
          placeholder="0.00"
          value={String(values.rate)}
          onChangeText={(text) =>
            setFieldValue('rate', text.replace(/[^\d.]/g, ''))
          }
          onBlur={handleBlur('rate')}
          keyboardType="decimal-pad"
          error={fieldError('rate')}
          containerStyle={styles.rowItem}
          editable={!submitting}
        />
      </View>

      <Card style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Bill total</Text>
          <Text style={styles.totalValue}>{formatCurrency(billTotal)}</Text>
        </View>
        {entersAmount && (
          <View style={[styles.totalRow, styles.totalRowSpaced]}>
            <Text style={styles.totalLabel}>Balance due</Text>
            <Text
              style={[
                styles.totalValue,
                unbalance > 0 ? styles.due : styles.settled,
              ]}
            >
              {formatCurrency(unbalance)}
            </Text>
          </View>
        )}
      </Card>

      <PaymentTypeToggle
        label="Payment type"
        value={values.paymentType}
        onChange={handlePaymentTypeChange}
        disabled={submitting}
      />

      {entersAmount && (
        <Input
          label="Amount paid"
          placeholder="0.00"
          value={String(values.amountPaid)}
          onChangeText={(text) =>
            setFieldValue('amountPaid', text.replace(/[^\d.]/g, ''))
          }
          onBlur={handleBlur('amountPaid')}
          keyboardType="decimal-pad"
          error={fieldError('amountPaid')}
          hint="Balance due is calculated automatically from the bill total."
          editable={!submitting}
        />
      )}

      {needsReference && (
        <>
          <Input
            label={referenceLabels.number}
            placeholder={referenceLabels.numberPlaceholder}
            value={values.transactionNumber}
            onChangeText={(text) => setFieldValue('transactionNumber', text)}
            onBlur={handleBlur('transactionNumber')}
            autoCapitalize="characters"
            error={fieldError('transactionNumber')}
            editable={!submitting}
          />
          <ImagePickerField
            label={referenceLabels.image}
            emptyText={referenceLabels.imageEmpty}
            value={values.transactionScreenshot}
            onChange={handleScreenshotChange}
            error={fieldError('transactionScreenshot')}
            disabled={submitting}
          />
        </>
      )}

      {!!submitError && <Text style={styles.submitError}>{submitError}</Text>}

      <Button
        title="Create bill"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submitButton}
        testID="submit-bill"
      />
    </View>
  );
};

const BillForm = ({ onSubmitBill, submitting, submitError, onClearSubmitError }) => {
  const handleFormikSubmit = useCallback(
    async (values, helpers) => {
      const result = await onSubmitBill(values);
      if (result) helpers.resetForm({ values: INITIAL_BILL_VALUES });
    },
    [onSubmitBill],
  );

  return (
    <Formik
      initialValues={INITIAL_BILL_VALUES}
      validationSchema={billValidationSchema}
      onSubmit={handleFormikSubmit}
      validateOnBlur
      validateOnChange={false}
    >
      {(formik) => (
        <BillFormFields
          {...formik}
          submitting={submitting}
          submitError={submitError}
          onClearSubmitError={onClearSubmitError}
        />
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  spacedTop: { marginTop: SPACING.md },
  summary: { marginBottom: SPACING.sm },
  lookupError: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
  },
  row: { flexDirection: 'row' },
  rowItem: { flex: 1 },
  rowGap: { width: SPACING.md },
  totalCard: { marginBottom: SPACING.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRowSpaced: { marginTop: SPACING.sm },
  totalLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  totalValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  due: { color: COLORS.danger },
  settled: { color: COLORS.success },
  submitError: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  submitButton: { marginTop: SPACING.sm, marginBottom: SPACING.xl },
});

export default BillForm;
