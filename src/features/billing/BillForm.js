import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BarcodeScannerModal from '../../components/BarcodeScannerModal';
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
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useCustomerLookup } from '../../hooks/useCustomerLookup';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { lookupPublicProduct } from '../../services/productLookupService';
import { getProductByBarcode, saveProduct } from '../../services/productService';
import {
  calculateBillTotal,
  calculateItemsTotal,
  calculateUnbalance,
  hasPaymentReference,
  usesEnteredAmount,
} from '../../utils/billing';
import { formatCurrency, toNumber } from '../../utils/money';
import {
  INITIAL_BILL_VALUES,
  billValidationSchema,
  createEmptyItem,
} from './billValidationSchema';
import PaymentTypeToggle from './PaymentTypeToggle';

const PHONE_LOOKUP_DEBOUNCE_MS = 400;

/**
 * One line of the bill.
 *
 * The scan button writes the raw barcode into the item name — there is no
 * product catalogue to resolve it against, so quantity and rate stay manual.
 */
const ItemRow = ({
  index,
  item,
  error,
  touched,
  canRemove,
  disabled,
  onChangeField,
  onScanResolved,
  onBlurField,
  onRemove,
}) => {
  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState(null);

  const lineTotal = calculateBillTotal(item.qty, item.rate);
  const fieldError = (name) =>
    touched?.[name] && error?.[name] ? error[name] : undefined;

  const handleScanned = async (code) => {
    setScanning(false);
    setLookup({ status: 'loading' });

    // Own catalogue first — it is the only source with this shop's prices.
    // Its failure is recorded rather than thrown, so a sleeping backend
    // still falls through to the public lookup below instead of ending the
    // scan with an error and no name.
    let product = null;
    let catalogueError = null;
    try {
      product = await getProductByBarcode(code);
    } catch (err) {
      catalogueError = err;
    }

    if (product) {
      onScanResolved(code, product);
      setLookup({ status: 'matched', code, name: product.name });
      return;
    }

    // Open Food Facts may still know the name. It carries no price, so the
    // rate stays for the owner to enter. Whatever they type is saved to the
    // catalogue after the bill, so the next scan fills itself in completely.
    const publicMatch = await lookupPublicProduct(code);

    onScanResolved(code, null, publicMatch?.name);

    if (publicMatch) {
      setLookup({
        status: 'suggested',
        code,
        name: publicMatch.name,
        source: publicMatch.attribution,
      });
    } else if (catalogueError) {
      setLookup({
        status: 'error',
        code,
        message: `Could not reach your products (${catalogueError.message}). Enter the name and rate by hand.`,
      });
    } else {
      setLookup({ status: 'new', code });
    }
  };

  const lookupHint = () => {
    if (!lookup) return null;
    if (lookup.status === 'loading') return 'Looking up barcode…';
    if (lookup.status === 'matched')
      return `${lookup.code} — matched "${lookup.name}" from your products.`;
    if (lookup.status === 'suggested')
      // No public database carries a shop's selling price, so the rate is
      // always the owner's to enter the first time.
      return `${lookup.code} — name from ${lookup.source}. Enter your rate; the next scan fills both.`;
    if (lookup.status === 'new')
      return `${lookup.code} — not in your products yet. Enter the name and rate; the next scan of this barcode fills both.`;
    return `${lookup.code} — ${lookup.message}`;
  };

  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemHeading}>Item {index + 1}</Text>
        {canRemove && (
          <Pressable
            onPress={onRemove}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Remove item ${index + 1}`}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="close-circle" size={22} color={COLORS.danger} />
          </Pressable>
        )}
      </View>

      <View style={styles.itemNameRow}>
        <Input
          label="Item name"
          placeholder="What was sold?"
          value={item.itemName}
          onChangeText={(text) => onChangeField('itemName', text)}
          onBlur={() => onBlurField('itemName')}
          error={fieldError('itemName')}
          hint={lookupHint()}
          containerStyle={styles.itemNameInput}
          editable={!disabled}
        />
        <Pressable
          onPress={() => setScanning(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Scan barcode for item ${index + 1}`}
          style={({ pressed }) => [
            styles.scanButton,
            disabled && styles.scanButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="barcode-outline" size={22} color={COLORS.white} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <Input
          label="Quantity"
          placeholder="0"
          value={String(item.qty)}
          onChangeText={(text) =>
            onChangeField('qty', text.replace(/[^\d]/g, ''))
          }
          onBlur={() => onBlurField('qty')}
          keyboardType="number-pad"
          error={fieldError('qty')}
          containerStyle={styles.rowItem}
          editable={!disabled}
        />
        <View style={styles.rowGap} />
        <Input
          label="Rate per unit"
          placeholder="0.00"
          value={String(item.rate)}
          onChangeText={(text) =>
            onChangeField('rate', text.replace(/[^\d.]/g, ''))
          }
          onBlur={() => onBlurField('rate')}
          keyboardType="decimal-pad"
          error={fieldError('rate')}
          containerStyle={styles.rowItem}
          editable={!disabled}
        />
      </View>

      <View style={styles.lineTotalRow}>
        <Text style={styles.lineTotalLabel}>Line total</Text>
        <Text style={styles.lineTotalValue}>{formatCurrency(lineTotal)}</Text>
      </View>

      <BarcodeScannerModal
        visible={scanning}
        onScanned={handleScanned}
        onClose={() => setScanning(false)}
      />
    </Card>
  );
};

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
      if (!active) return;

      // What this customer already owes raises the ceiling on what they may
      // hand over: settling old dues alongside a new purchase is one payment.
      setFieldValue('outstandingBalance', found ? found.total_unpaid : 0);

      if (!found) return;
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
    () => calculateItemsTotal(values.items),
    [values.items],
  );

  const unbalance = useMemo(
    () => (entersAmount ? calculateUnbalance(billTotal, values.amountPaid) : 0),
    [entersAmount, billTotal, values.amountPaid],
  );

  const outstanding = Math.max(toNumber(values.outstandingBalance), 0);

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

  const handleItemChange = useCallback(
    (index, name, value) => setFieldValue(`items[${index}].${name}`, value),
    [setFieldValue],
  );

  /**
   * Writes a scan onto the line in a single update.
   *
   * Field-by-field updates would each rebuild `values.items`, so the later
   * ones would overwrite the earlier from a stale array.
   */
  const handleScanResolved = useCallback(
    (index, barcode, product, suggestedName) =>
      setFieldValue(
        'items',
        values.items.map((line, position) =>
          position === index
            ? {
                ...line,
                barcode,
                isNewProduct: !product,
                // The catalogue wins; a public suggestion only fills a blank
                // field, so it can never overwrite what the owner typed.
                itemName:
                  product?.name ??
                  (line.itemName?.trim() ? line.itemName : suggestedName ?? line.itemName),
                // Price is always the shop's own — no public source has it.
                rate: product ? String(product.rate) : line.rate,
              }
            : line,
        ),
      ),
    [setFieldValue, values.items],
  );

  const handleItemBlur = useCallback(
    (index, name) => setFieldTouched(`items[${index}].${name}`, true),
    [setFieldTouched],
  );

  const handleAddItem = useCallback(
    () => setFieldValue('items', [...values.items, createEmptyItem()]),
    [setFieldValue, values.items],
  );

  const handleRemoveItem = useCallback(
    (index) =>
      setFieldValue(
        'items',
        values.items.filter((_, position) => position !== index),
      ),
    [setFieldValue, values.items],
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

      <Text style={styles.sectionTitle}>
        Items{values.items.length > 1 ? ` (${values.items.length})` : ''}
      </Text>

      {values.items.map((item, index) => (
        <ItemRow
          // Index as key: rows have no stable id, and removal rebuilds the
          // list from the surviving values either way.
          key={`item-${index}`}
          index={index}
          item={item}
          error={errors.items?.[index]}
          touched={touched.items?.[index]}
          canRemove={values.items.length > 1}
          disabled={submitting}
          onChangeField={(name, value) => handleItemChange(index, name, value)}
          onScanResolved={(barcode, product, suggestedName) =>
            handleScanResolved(index, barcode, product, suggestedName)
          }
          onBlurField={(name) => handleItemBlur(index, name)}
          onRemove={() => handleRemoveItem(index)}
        />
      ))}

      {typeof errors.items === 'string' && (
        <Text style={styles.lookupError}>{errors.items}</Text>
      )}

      <Pressable
        onPress={handleAddItem}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel="Add another item"
        style={({ pressed }) => [
          styles.addItem,
          submitting && styles.addItemDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
        <Text style={styles.addItemText}>Add item</Text>
      </Pressable>

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
          hint={
            outstanding > 0
              ? `${formatCurrency(outstanding)} already outstanding — a larger payment settles that too.`
              : 'Balance due is calculated automatically from the bill total.'
          }
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

/**
 * Adds newly scanned items to the catalogue so the next scan fills itself in.
 *
 * Runs only after the bill is recorded, and swallows its own failures: the
 * sale is already saved by this point, and losing a catalogue entry is not
 * worth reporting as a failed bill. Lines whose barcode the catalogue already
 * knew are left alone — prices are edited on the products screen, not as a
 * side effect of one sale.
 */
const rememberScannedProducts = async (items = []) => {
  const unknown = items.filter(
    (item) => item.barcode && item.isNewProduct && item.itemName?.trim(),
  );

  await Promise.all(
    unknown.map((item) =>
      saveProduct({
        barcode: item.barcode,
        name: item.itemName,
        rate: item.rate,
      }).catch(() => null),
    ),
  );
};

const BillForm = ({ onSubmitBill, submitting, submitError, onClearSubmitError }) => {
  const handleFormikSubmit = useCallback(
    async (values, helpers) => {
      const result = await onSubmitBill(values);
      if (!result) return;
      await rememberScannedProducts(values.items);
      helpers.resetForm({ values: INITIAL_BILL_VALUES });
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
  pressed: { opacity: 0.7 },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  itemCard: { marginBottom: SPACING.sm },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  itemHeading: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // The scan button sits beside the field, so the input's own bottom margin
  // would push it out of alignment — hence the explicit offset.
  itemNameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemNameInput: { flex: 1 },
  scanButton: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    marginTop: 22,
  },
  scanButtonDisabled: { backgroundColor: COLORS.textMuted },
  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  lineTotalLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  lineTotalValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  addItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
  },
  addItemDisabled: { opacity: 0.5 },
  addItemText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
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
