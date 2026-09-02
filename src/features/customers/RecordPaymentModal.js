import { Formik } from 'formik';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Yup from 'yup';

import Button from '../../components/Button';
import Card from '../../components/Card';
import ImagePickerField from '../../components/ImagePickerField';
import Input from '../../components/Input';
import {
  PAYMENT_REFERENCE_LABELS,
  PAYMENT_TYPES,
} from '../../constants/paymentTypes';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useRecordPayment } from '../../hooks/useRecordPayment';
import { hasPaymentReference } from '../../utils/billing';
import { formatCurrency, roundMoney, toNumber } from '../../utils/money';
import PaymentTypeToggle from '../billing/PaymentTypeToggle';

/** Yup coerces '' to NaN for number fields; map it to undefined instead. */
const emptyStringToUndefined = (value, originalValue) =>
  typeof originalValue === 'string' && originalValue.trim() === ''
    ? undefined
    : value;

const buildSchema = (outstanding) =>
  Yup.object({
    amount: Yup.number()
      .transform(emptyStringToUndefined)
      .typeError('Amount must be a number')
      .required('Amount is required')
      .moreThan(0, 'Amount must be greater than 0')
      .max(
        outstanding,
        `Cannot pay more than the ${formatCurrency(outstanding)} outstanding`,
      ),

    paymentType: Yup.string()
      .required('Payment type is required')
      .oneOf(Object.values(PAYMENT_TYPES), 'Select a valid payment type'),

    transactionNumber: Yup.string().when('paymentType', {
      is: (paymentType) => hasPaymentReference(paymentType),
      then: (schema) =>
        schema.trim().when('paymentType', {
          is: PAYMENT_TYPES.CHEQUE,
          then: (inner) => inner.required('Cheque number is required'),
          otherwise: (inner) => inner.required('Transaction number is required'),
        }),
      otherwise: (schema) => schema.notRequired(),
    }),

    transactionScreenshot: Yup.mixed().when('paymentType', {
      is: (paymentType) => hasPaymentReference(paymentType),
      then: (schema) =>
        schema
          .required('Attach a photo of the payment')
          .test('is-image-asset', 'Attach a valid image', (value) =>
            Boolean(value?.uri),
          ),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

/**
 * Takes money against a customer's dues.
 *
 * No item fields: this settles what is already owed rather than recording a
 * sale, so it must not touch the customer's billed total.
 */
const RecordPaymentModal = ({ customer, onClose, onRecorded }) => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { submitPayment, submitting, error, clearError } = useRecordPayment();

  if (!customer) return null;

  const outstanding = roundMoney(Math.max(toNumber(customer.total_unpaid), 0));

  const handleSubmit = async (values) => {
    const payment = await submitPayment(customer, values);
    if (payment) onRecorded?.(payment, values);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* The sheet sits on the bottom edge, so an open keyboard would cover
            it outright. Lifting it by the keyboard's own height works under
            edge-to-edge, where the window never resizes. */}
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + SPACING.md,
              marginBottom: keyboardHeight,
            },
          ]}
        >
          <View style={styles.handle} />

          <Formik
            initialValues={{
              amount: '',
              paymentType: PAYMENT_TYPES.CASH,
              transactionNumber: '',
              transactionScreenshot: null,
            }}
            validationSchema={buildSchema(outstanding)}
            onSubmit={handleSubmit}
            validateOnChange={false}
          >
            {({
              values,
              errors,
              touched,
              handleBlur,
              setFieldValue,
              setFieldTouched,
              handleSubmit: submit,
            }) => {
              const fieldError = (name) =>
                touched[name] && errors[name] ? errors[name] : undefined;

              const needsReference = hasPaymentReference(values.paymentType);
              const referenceLabels = PAYMENT_REFERENCE_LABELS[values.paymentType];
              const remaining = roundMoney(
                Math.max(outstanding - toNumber(values.amount), 0),
              );

              const change = (name, value) => {
                if (error) clearError();
                setFieldValue(name, value);
              };

              return (
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.title}>Take payment</Text>

                  {/* Who is paying and how much they owe — the only customer
                      context this screen needs. */}
                  <Card style={styles.customerCard}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customer.name || 'Unnamed customer'}
                    </Text>
                    <Text style={styles.customerPhone}>{customer.phone}</Text>

                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>Outstanding</Text>
                      <Text style={styles.balanceValue}>
                        {formatCurrency(outstanding)}
                      </Text>
                    </View>
                  </Card>

                  <Input
                    label="Amount received"
                    placeholder="0.00"
                    value={String(values.amount)}
                    onChangeText={(text) =>
                      change('amount', text.replace(/[^\d.]/g, ''))
                    }
                    onBlur={handleBlur('amount')}
                    keyboardType="decimal-pad"
                    error={fieldError('amount')}
                    hint={`Leaves ${formatCurrency(remaining)} outstanding.`}
                    editable={!submitting}
                  />

                  <View style={styles.quickRow}>
                    <Button
                      title={`Pay all ${formatCurrency(outstanding)}`}
                      variant="secondary"
                      onPress={() => change('amount', String(outstanding))}
                      disabled={submitting}
                      style={styles.quickButton}
                    />
                  </View>

                  <PaymentTypeToggle
                    label="Payment method"
                    value={values.paymentType}
                    onChange={(nextType) => {
                      change('paymentType', nextType);
                      // Clear the other branch's fields so a switch never
                      // submits a stale reference or image.
                      if (!hasPaymentReference(nextType)) {
                        setFieldValue('transactionNumber', '');
                        setFieldValue('transactionScreenshot', null);
                      }
                    }}
                    disabled={submitting}
                  />

                  {needsReference && (
                    <>
                      <Input
                        label={referenceLabels.number}
                        placeholder={referenceLabels.numberPlaceholder}
                        value={values.transactionNumber}
                        onChangeText={(text) => change('transactionNumber', text)}
                        onBlur={handleBlur('transactionNumber')}
                        autoCapitalize="characters"
                        error={fieldError('transactionNumber')}
                        editable={!submitting}
                      />
                      <ImagePickerField
                        label={referenceLabels.image}
                        emptyText={referenceLabels.imageEmpty}
                        value={values.transactionScreenshot}
                        onChange={(asset) => {
                          change('transactionScreenshot', asset);
                          setFieldTouched('transactionScreenshot', true, false);
                        }}
                        error={fieldError('transactionScreenshot')}
                        disabled={submitting}
                      />
                    </>
                  )}

                  {!!error && <Text style={styles.error}>{error}</Text>}

                  <Button
                    title="Record payment"
                    onPress={submit}
                    loading={submitting}
                    disabled={submitting}
                    testID="record-payment"
                  />
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={onClose}
                    disabled={submitting}
                    style={styles.cancel}
                  />
                </ScrollView>
              );
            }}
          </Formik>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  customerCard: { marginBottom: SPACING.md },
  customerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  customerPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  balanceLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  balanceValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.danger,
  },
  quickRow: { marginBottom: SPACING.md },
  quickButton: {},
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  cancel: { marginTop: SPACING.sm, marginBottom: SPACING.md },
});

export default RecordPaymentModal;
