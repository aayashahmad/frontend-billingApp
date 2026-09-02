import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useProducts } from '../../hooks/useProducts';
import { lookupPublicProduct } from '../../services/productLookupService';
import { importProducts } from '../../services/productService';
import { parseProductCsv } from '../../utils/csv';
import { formatCurrency } from '../../utils/money';
import { File } from 'expo-file-system';

const SEARCH_DEBOUNCE_MS = 300;

const keyExtractor = (product) => String(product.id);

const blankDraft = { id: null, barcode: '', name: '', rate: '' };

/**
 * Add / edit sheet.
 *
 * The barcode is only editable while adding — a different barcode is a
 * different product, so an edit changes the name and price and nothing else.
 */
const ProductEditor = ({ draft, saving, error, onChange, onSave, onClose, rapid }) => {
  const [scanning, setScanning] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const isEditing = draft.id !== null;
  const canSave =
    draft.barcode.trim() && draft.name.trim() && Number(draft.rate) > 0;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        {/* Lifted by the keyboard's height — the sheet is bottom-anchored and
            edge-to-edge stops the window resizing under it. */}
        <View style={[styles.sheet, { marginBottom: keyboardHeight }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>
              {isEditing ? 'Edit product' : 'Add product'}
            </Text>
            {rapid && !isEditing && (
              <Text style={styles.sheetHint}>
                Saving reopens the scanner for the next item.
              </Text>
            )}

            <View style={styles.barcodeRow}>
              <Input
                label="Barcode"
                placeholder="Scan or type the code"
                value={draft.barcode}
                onChangeText={(text) => onChange('barcode', text)}
                keyboardType="number-pad"
                editable={!isEditing && !saving}
                hint={
                  isEditing
                    ? 'A barcode identifies the product and cannot be changed.'
                    : undefined
                }
                containerStyle={styles.barcodeInput}
              />
              {!isEditing && (
                <Pressable
                  onPress={() => setScanning(true)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Scan barcode"
                  style={({ pressed }) => [
                    styles.scanButton,
                    saving && styles.scanButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="barcode-outline" size={22} color={COLORS.white} />
                </Pressable>
              )}
            </View>

            <Input
              label="Product name"
              placeholder="e.g. Cement bag 50kg"
              value={draft.name}
              onChangeText={(text) => onChange('name', text)}
              autoCapitalize="words"
              editable={!saving}
            />

            <Input
              label="Rate per unit"
              placeholder="0.00"
              value={String(draft.rate)}
              onChangeText={(text) =>
                onChange('rate', text.replace(/[^\d.]/g, ''))
              }
              keyboardType="decimal-pad"
              editable={!saving}
            />

            {/* The screen-level error banner sits BEHIND this sheet, so a
                failed save looked like a button that did nothing. */}
            {!!error && <Text style={styles.sheetError}>{error}</Text>}

            <Button
              title={
                isEditing
                  ? 'Save changes'
                  : rapid
                    ? 'Save & scan next'
                    : 'Add product'
              }
              onPress={onSave}
              loading={saving}
              disabled={saving || !canSave}
              testID="save-product"
            />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={saving}
              style={styles.sheetCancel}
            />
          </ScrollView>

          <BarcodeScannerModal
            visible={scanning}
            onScanned={async (code) => {
              setScanning(false);
              onChange('barcode', code);

              // Save typing where the public database knows the name. It
              // has no price, and it never overwrites a name already typed.
              if (!draft.name.trim()) {
                const match = await lookupPublicProduct(code);
                if (match) onChange('name', match.name);
              }
            }}
            onClose={() => setScanning(false)}
          />
        </View>
      </View>
    </Modal>
  );
};

const ProductRow = ({ product, onEdit, onDelete }) => (
  <Card style={styles.row}>
    <View style={styles.rowText}>
      <Text style={styles.rowName} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.rowBarcode} numberOfLines={1}>
        {product.barcode}
      </Text>
    </View>

    <Text style={styles.rowRate}>{formatCurrency(product.rate)}</Text>

    <Pressable
      onPress={() => onEdit(product)}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${product.name}`}
      hitSlop={8}
      style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
    >
      <Ionicons name="create-outline" size={20} color={COLORS.primary} />
    </Pressable>

    <Pressable
      onPress={() => onDelete(product)}
      accessibilityRole="button"
      accessibilityLabel={`Delete ${product.name}`}
      hitSlop={8}
      style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
    >
      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
    </Pressable>
  </Card>
);

/**
 * The shop's barcode catalogue.
 *
 * Scanning on the bill form fills a line from here, and a barcode billed for
 * the first time is added here automatically — so this screen is mostly for
 * correcting a price or removing something no longer stocked.
 */
const ProductsScreen = () => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [draft, setDraft] = useState(null);
  // Stocking a grocery shop means entering hundreds of items. In rapid mode
  // saving one reopens the scanner straight away, so a shelf can be worked
  // through without returning to this list between each item.
  const [rapidScan, setRapidScan] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const {
    products,
    loading,
    refreshing,
    saving,
    error,
    refresh,
    create,
    edit,
    remove,
  } = useProducts(debouncedSearch);

  const handleChangeDraft = useCallback(
    (field, value) => setDraft((current) => ({ ...current, [field]: value })),
    [],
  );

  const handleSave = useCallback(async () => {
    const saved = draft.id
      ? await edit(draft.id, { name: draft.name, rate: Number(draft.rate) })
      : await create(draft);
    if (!saved) return;

    setDraft(null);
    // Straight back to the camera for the next item off the shelf.
    if (rapidScan && !draft.id) setScannerOpen(true);
  }, [create, draft, edit, rapidScan]);

  const handleCloseEditor = useCallback(() => {
    setDraft(null);
    setRapidScan(false);
  }, []);

  /**
   * Import a price list prepared on a computer.
   *
   * Parsing happens here rather than server-side so a bad line can be
   * reported against the row number the owner sees in their spreadsheet.
   */
  const handleImport = useCallback(async () => {
    try {
      const picked = await File.pickFileAsync({
        // Some file managers report CSV as plain text, and a few report
        // nothing at all — accepting all three avoids a picker that shows
        // the file greyed out.
        mimeTypes: ['text/csv', 'text/comma-separated-values', 'text/plain'],
      });
      if (picked.canceled || !picked.result) return;

      setImporting(true);
      const { rows, errors } = parseProductCsv(await picked.result.text());

      if (rows.length === 0) {
        Alert.alert(
          'Nothing to import',
          errors[0] ||
            'Expected three columns: barcode, name, rate — one product per line.',
        );
        return;
      }

      const summary = await importProducts(rows);
      await refresh();

      const parts = [
        `${summary.created} added`,
        `${summary.updated} updated`,
      ];
      const skipped = errors.length + (summary.errors?.length ?? 0);
      if (skipped > 0) parts.push(`${skipped} skipped`);

      Alert.alert(
        'Import finished',
        `${parts.join(', ')}.` +
          (errors.length
            ? `\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n…and ${errors.length - 5} more.` : ''}`
            : ''),
      );
    } catch (err) {
      Alert.alert('Import failed', err?.message || 'Please try again.');
    } finally {
      setImporting(false);
    }
  }, [refresh]);

  const handleStartRapidScan = useCallback(() => {
    setRapidScan(true);
    setScannerOpen(true);
  }, []);

  /** A scan in rapid mode opens the editor already filled in as far as it can be. */
  const handleRapidScanned = useCallback(async (code) => {
    setScannerOpen(false);
    setDraft({ ...blankDraft, barcode: code });

    // The public database may know the name; it never knows your price.
    const match = await lookupPublicProduct(code);
    if (match) {
      setDraft((current) =>
        current && current.barcode === code && !current.name.trim()
          ? { ...current, name: match.name }
          : current,
      );
    }
  }, []);

  const handleDelete = useCallback(
    (product) => {
      Alert.alert(
        'Remove product?',
        `"${product.name}" will no longer fill in when its barcode is scanned. Bills already written keep their item and price.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => remove(product.id),
          },
        ],
      );
    },
    [remove],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <ProductRow product={item} onEdit={setDraft} onDelete={handleDelete} />
    ),
    [handleDelete],
  );

  if (loading && products.length === 0 && !error) {
    return <StateView variant="loading" style={styles.fill} />;
  }

  return (
    <View style={styles.fill}>
      <View style={styles.searchBar}>
        <Input
          placeholder="Search by name or barcode"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.searchInput}
        />

        <Pressable
          onPress={handleImport}
          disabled={importing}
          accessibilityRole="button"
          accessibilityLabel="Import a price list"
          style={({ pressed }) => [
            styles.importRow,
            importing && styles.importRowBusy,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="document-attach-outline"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.importText}>
            {importing ? 'Importing…' : 'Import price list (CSV)'}
          </Text>
        </Pressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={products}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + SPACING.xl * 2 },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <StateView
            title={search ? 'No matching products' : 'No products yet'}
            message={
              search
                ? 'Try a different name or barcode.'
                : 'Scan items in one pass, or import a CSV of barcode, name, rate. After that, scanning an item on a bill fills its name and price automatically.'
            }
            style={styles.emptyState}
          />
        }
      />

      <View style={[styles.fabRow, { bottom: insets.bottom + SPACING.lg }]}>
        <Pressable
          onPress={handleStartRapidScan}
          accessibilityRole="button"
          accessibilityLabel="Scan items to add"
          style={({ pressed }) => [
            styles.fab,
            styles.fabScan,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="barcode-outline" size={22} color={COLORS.white} />
          <Text style={styles.fabText}>Scan items</Text>
        </Pressable>

        <Pressable
          onPress={() => setDraft(blankDraft)}
          accessibilityRole="button"
          accessibilityLabel="Add product"
          style={({ pressed }) => [
            styles.fab,
            styles.fabAdd,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
          <Text style={[styles.fabText, styles.fabTextAdd]}>Add</Text>
        </Pressable>
      </View>

      <BarcodeScannerModal
        visible={scannerOpen}
        onScanned={handleRapidScanned}
        onClose={() => {
          setScannerOpen(false);
          setRapidScan(false);
        }}
      />

      {!!draft && (
        <ProductEditor
          error={error}
          draft={draft}
          saving={saving}
          onChange={handleChangeDraft}
          onSave={handleSave}
          onClose={handleCloseEditor}
          rapid={rapidScan}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.background },
  pressed: { opacity: 0.7 },
  searchBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
  },
  searchInput: { marginBottom: SPACING.sm },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
  },
  importRowBusy: { opacity: 0.6 },
  importText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
  sheetError: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },
  emptyState: { paddingVertical: SPACING.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  rowText: { flex: 1, paddingRight: SPACING.sm },
  rowName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.text },
  rowBarcode: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  rowRate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  rowAction: { paddingHorizontal: SPACING.xs },
  fabRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  // Scanning is the primary way to stock a grocery shop, so it leads.
  fabScan: { backgroundColor: COLORS.primary, marginRight: SPACING.sm },
  fabAdd: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingRight: SPACING.md,
  },
  fabText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
  fabTextAdd: { color: COLORS.primary },
  sheetHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.md,
    maxHeight: '90%',
  },
  sheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sheetCancel: { marginTop: SPACING.sm, marginBottom: SPACING.md },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  barcodeInput: { flex: 1 },
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
});

export default ProductsScreen;
