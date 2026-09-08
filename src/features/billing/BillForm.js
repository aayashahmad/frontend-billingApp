import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import Button from '../../components/Button';
import Card from '../../components/Card';
import CustomerSummaryCard from '../../components/CustomerSummaryCard';
import CustomerSuggestions from './CustomerSuggestions';
import ImagePickerField from '../../components/ImagePickerField';
import Input from '../../components/Input';
import {
  PAYMENT_REFERENCE_LABELS,
  PAYMENT_TYPES,
  PHONE_MAX_LENGTH,
} from '../../constants/paymentTypes';
import { MIN_SEARCH_LENGTH } from '../../constants/config';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useCustomerLookup } from '../../hooks/useCustomerLookup';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { lookupPublicProduct } from '../../services/productLookupService';
import { getProductByBarcode, saveProduct } from '../../services/productService';
import {
  calculateBillTotal,
  calculateItemsTotal,
  calculateUnbalance,
  hasPaymentReference,
  settleWithAdvance,
  isCreditPayment,
  usesEnteredAmount,
} from '../../utils/billing';
import { formatCurrency, roundMoney, toNumber } from '../../utils/money';
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

/** Whether the form holds anything a shopkeeper would mind losing. */
const hasDraftContent = (values) =>
  Boolean(
    values.phone?.trim() ||
      values.customerName?.trim() ||
      values.amountPaid !== '' ||
      values.transactionNumber?.trim() ||
      values.transactionScreenshot ||
      values.items?.some(
        (line) =>
          line.itemName?.trim() || line.qty !== '' || line.rate !== '' || line.barcode,
      ),
  );

const BillFormFields = ({
  values,
  errors,
  touched,
  handleBlur,
  setFieldValue,
  setFieldTouched,
  handleSubmit,
  isSubmitting,
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
      setFieldValue('advanceBalance', found ? found.advance_balance ?? 0 : 0);

      if (!found) return;
      if (!nameEditedRef.current) setFieldValue('customerName', found.name);
    };

    run();
    return () => {
      active = false;
    };
  }, [debouncedPhone, lookup, setFieldValue]);

  // Android back at the root used to exit instantly, destroying a
  // half-filled bill without a word. Intercept it only while this screen is
  // focused AND the form holds something — an empty form keeps the stock
  // exit behavior. (With the keyboard open, Android consumes back to close
  // the keyboard before it ever reaches this handler.)
  const isFocused = useIsFocused();
  const hasDraft = hasDraftContent(values);
  useEffect(() => {
    if (!isFocused || !hasDraft) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Discard this bill?',
        'The customer and items you have entered will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ],
      );
      return true;
    });
    return () => subscription.remove();
  }, [isFocused, hasDraft]);

  // Cash and cheque both take an entered amount; online and cheque both
  // take a reference number plus an image.
  const entersAmount = usesEnteredAmount(values.paymentType);
  const needsReference = hasPaymentReference(values.paymentType);
  const referenceLabels = PAYMENT_REFERENCE_LABELS[values.paymentType];

  const billTotal = useMemo(
    () => calculateItemsTotal(values.items),
    [values.items],
  );

  /**
   * Credit this customer has already paid ahead, and how much of it this
   * bill will take. Mirrors the server: the advance settles the bill before
   * the customer is asked for anything.
   */
  const isCredit = isCreditPayment(values.paymentType);

  const { advanceApplied, balanceDue } = useMemo(
    () =>
      settleWithAdvance({
        billTotal,
        // Cash and cheque record a typed figure; an online transfer settles
        // in full; "pay later" receives nothing at all, so the bill lands on
        // the account minus whatever credit covers it.
        amountPaid: entersAmount ? values.amountPaid : isCredit ? 0 : billTotal,
        advanceBalance: customer?.advance_balance,
      }),
    [billTotal, entersAmount, isCredit, values.amountPaid, customer?.advance_balance],
  );

  // Counting the advance keeps "Balance due" equal to what the customer is
  // actually asked for; without it the figure overstates the debt by whatever
  // they already paid ahead.
  // An online transfer settles the bill by definition; everything else can
  // leave something owing — including "pay later", which is the whole point
  // of it and must not be hidden.
  const unbalance = entersAmount || isCredit ? balanceDue : 0;
  const advanceAvailable = Math.max(toNumber(customer?.advance_balance), 0);

  // Money handed over beyond this bill and every old due becomes credit. Shown
  // while typing so the shopkeeper sees where the extra is going before the
  // bill is written, not after.
  const excessToAdvance = useMemo(() => {
    if (!entersAmount) return 0;
    const surplus = roundMoney(
      toNumber(values.amountPaid) + advanceApplied - billTotal,
    );
    return Math.max(roundMoney(surplus - outstanding), 0);
  }, [entersAmount, values.amountPaid, advanceApplied, billTotal, outstanding]);

  const outstanding = Math.max(toNumber(values.outstandingBalance), 0);

  /**
   * Whether this bill would push the customer past the credit limit their
   * shop set for them.
   *
   * A warning, never a block: the owner at the counter knows things the app
   * does not, and refusing to record a sale that happened anyway would put
   * the ledger out of step with the shelf.
   */
  const creditWarning = useMemo(() => {
    const limit = customer?.credit_limit;
    if (limit === null || limit === undefined) return null;

    const afterThisBill = roundMoney(
      outstanding +
        Math.max(
          billTotal - toNumber(values.amountPaid) - advanceApplied,
          0,
        ),
    );
    if (afterThisBill <= toNumber(limit)) return null;

    return {
      limit: toNumber(limit),
      after: afterThisBill,
      over: roundMoney(afterThisBill - toNumber(limit)),
    };
  }, [customer, outstanding, billTotal, values.amountPaid, advanceApplied]);

  const handlePhoneChange = useCallback(
    (text) => {
      const digitsOnly = text.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH);
      // A new phone means a different customer — allow auto-fill again, and
      // drop the previous customer's dues from the payment ceiling until the
      // lookup for this number lands.
      nameEditedRef.current = false;
      setNameQuery('');
      setFieldValue('phone', digitsOnly);
      setFieldValue('outstandingBalance', 0);
      setFieldValue('advanceBalance', 0);
      if (digitsOnly.length === 0) resetLookup();
    },
    [resetLookup, setFieldValue],
  );

  // Typing a name searches the customer book. Kept separate from the field
  // value so that picking a customer (which fills the field) does not
  // immediately re-open the list with that customer's own name as the query.
  const [nameQuery, setNameQuery] = useState('');
  const {
    results: nameMatches,
    loading: searchingByName,
    error: nameSearchError,
  } = useCustomerSearch(nameQuery);

  const handleNameChange = useCallback(
    (text) => {
      nameEditedRef.current = true;
      setFieldValue('customerName', text);
      // Digits belong to the phone field's own exact lookup; searching on
      // them here would offer the same customer twice.
      setNameQuery(/[a-z]/i.test(text) ? text : '');
    },
    [setFieldValue],
  );

  /** Fills the whole customer block from a picked search result. */
  const handleSelectCustomer = useCallback(
    (picked) => {
      nameEditedRef.current = true;
      setNameQuery('');
      setFieldValue('customerName', picked.name);
      setFieldValue('phone', String(picked.phone ?? ''));
      // Their dues raise the ceiling on what may be paid against this bill,
      // exactly as the phone lookup does.
      setFieldValue('outstandingBalance', picked.total_unpaid ?? 0);
      setFieldValue('advanceBalance', picked.advance_balance ?? 0);
      Keyboard.dismiss();
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

  // The lookup can take many seconds (cold backend), and the form stays
  // editable meanwhile. Always read the line's CURRENT text through this ref
  // and write per path — rewriting the whole array from the snapshot captured
  // when the scan started silently reverted anything typed since.
  const itemsRef = useRef(values.items);
  itemsRef.current = values.items;

  const handleScanResolved = useCallback(
    (index, barcode, product, suggestedName) => {
      const line = itemsRef.current[index];
      if (!line) return;
      setFieldValue(`items[${index}].barcode`, barcode);
      setFieldValue(`items[${index}].isNewProduct`, !product);
      if (product?.name) {
        // The catalogue wins; it is the only source with this shop's prices.
        setFieldValue(`items[${index}].itemName`, product.name);
        setFieldValue(`items[${index}].rate`, String(product.rate));
      } else if (suggestedName && !line.itemName?.trim()) {
        // A public suggestion only fills a blank field, so it can never
        // overwrite what the owner typed.
        setFieldValue(`items[${index}].itemName`, suggestedName);
      }
    },
    [setFieldValue],
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

      {!!creditWarning && (
        <View style={styles.creditWarning}>
          <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
          <Text style={styles.creditWarningText}>
            This bill takes {customer?.name || 'this customer'} to{' '}
            {formatCurrency(creditWarning.after)} owed —{' '}
            {formatCurrency(creditWarning.over)} over their{' '}
            {formatCurrency(creditWarning.limit)} limit.
          </Text>
        </View>
      )}

      <Input
        label="Customer name"
        placeholder="Type a name to search, or enter a new one"
        value={values.customerName}
        onChangeText={handleNameChange}
        onBlur={handleBlur('customerName')}
        autoCapitalize="words"
        error={fieldError('customerName')}
        containerStyle={styles.spacedTop}
        editable={!submitting}
        hint={
          nameQuery.trim().length >= MIN_SEARCH_LENGTH
            ? undefined
            : 'Type at least 2 letters to search your customers.'
        }
      />

      {nameQuery.trim().length >= MIN_SEARCH_LENGTH && (
        <CustomerSuggestions
          results={nameMatches}
          loading={searchingByName}
          error={nameSearchError}
          query={nameQuery}
          onSelect={handleSelectCustomer}
        />
      )}

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
        {advanceAvailable > 0 && (
          <View style={[styles.totalRow, styles.totalRowSpaced]}>
            <Text style={styles.totalLabel}>Existing advance</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(advanceAvailable)}
            </Text>
          </View>
        )}
        {advanceApplied > 0 && (
          <View style={[styles.totalRow, styles.totalRowSpaced]}>
            <Text style={styles.totalLabel}>Advance applied</Text>
            <Text style={[styles.totalValue, styles.settled]}>
              −{formatCurrency(advanceApplied)}
            </Text>
          </View>
        )}
        {excessToAdvance > 0 && (
          <View style={[styles.totalRow, styles.totalRowSpaced]}>
            <Text style={styles.totalLabel}>Extra to advance</Text>
            <Text style={[styles.totalValue, styles.settled]}>
              {formatCurrency(excessToAdvance)}
            </Text>
          </View>
        )}
        {(entersAmount || isCredit) && (
          <View style={[styles.totalRow, styles.totalRowSpaced]}>
            <Text style={styles.totalLabel}>
              {isCredit ? 'Goes on account' : 'Balance due'}
            </Text>
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
        // isSubmitting covers the async-validation window before the parent's
        // `submitting` state has re-rendered — the gap a double-tap slips through.
        disabled={submitting || isSubmitting}
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
      // Reset first: while the catalogue saves ran (one POST per newly
      // scanned line), the form still held valid values behind a live
      // button — a second tap in that window recorded the sale twice.
      helpers.resetForm({ values: INITIAL_BILL_VALUES });
      rememberScannedProducts(values.items);
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
  creditWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  creditWarningText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    lineHeight: 19,
    marginLeft: SPACING.sm,
  },
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
