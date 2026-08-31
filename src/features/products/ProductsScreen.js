import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useProducts } from '../../hooks/useProducts';
import { formatCurrency } from '../../utils/money';

const SEARCH_DEBOUNCE_MS = 300;

const keyExtractor = (product) => String(product.id);

const blankDraft = { id: null, barcode: '', name: '', rate: '' };

/**
 * Add / edit sheet.
 *
 * The barcode is only editable while adding — a different barcode is a
 * different product, so an edit changes the name and price and nothing else.
 */
const ProductEditor = ({ draft, saving, onChange, onSave, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const isEditing = draft.id !== null;
  const canSave =
    draft.barcode.trim() && draft.name.trim() && Number(draft.rate) > 0;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>
              {isEditing ? 'Edit product' : 'Add product'}
            </Text>

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

            <Button
              title={isEditing ? 'Save changes' : 'Add product'}
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
            onScanned={(code) => {
              setScanning(false);
              onChange('barcode', code);
            }}
            onClose={() => setScanning(false)}
          />
        </View>
      </KeyboardAvoidingView>
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
    if (saved) setDraft(null);
  }, [create, draft, edit]);

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
                : 'Scan an item on a new bill and it is added here automatically, or add one now.'
            }
            style={styles.emptyState}
          />
        }
      />

      <Pressable
        onPress={() => setDraft(blankDraft)}
        accessibilityRole="button"
        accessibilityLabel="Add product"
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + SPACING.lg },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add" size={26} color={COLORS.white} />
        <Text style={styles.fabText}>Add product</Text>
      </Pressable>

      {!!draft && (
        <ProductEditor
          draft={draft}
          saving={saving}
          onChange={handleChangeDraft}
          onSave={handleSave}
          onClose={() => setDraft(null)}
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
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginLeft: SPACING.xs,
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
