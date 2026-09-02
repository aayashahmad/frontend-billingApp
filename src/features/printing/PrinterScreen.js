import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Card from '../../components/Card';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import {
  clearPrinter,
  loadPrinter,
  savePrinter,
} from '../../services/printerSettings';
import {
  cancelDiscovery,
  discoverPrinters,
  enableBluetooth,
  isBluetoothAvailable,
  isBluetoothEnabled,
  listPairedPrinters,
  printBytes,
  requestBluetoothPermissions,
} from '../../services/thermalPrinterService';
import { useProfile } from '../../store/ProfileContext';
import { DEFAULT_PAPER_WIDTH, PAPER_WIDTHS } from './escpos';
import { buildTestReceipt } from './thermalReceipt';

const keyExtractor = (device) => device.address;

const PrinterRow = ({ device, selected, onSelect }) => (
  <Pressable
    onPress={() => onSelect(device)}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={({ pressed }) => [pressed && styles.pressed]}
  >
    <Card style={[styles.deviceCard, selected && styles.deviceCardSelected]}>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? COLORS.primary : COLORS.textMuted}
      />
      <View style={styles.deviceText}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={styles.deviceAddress}>{device.address}</Text>
      </View>
    </Card>
  </Pressable>
);

/**
 * Bluetooth thermal printer setup.
 *
 * Pairing itself is left to Android's own Bluetooth settings — it handles the
 * PIN prompt, and a printer paired once stays paired. This screen picks which
 * paired device to print to, sets the paper width and proves it works.
 */
const PrinterScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile: owner } = useProfile();

  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [paperWidth, setPaperWidth] = useState(DEFAULT_PAPER_WIDTH);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  const available = isBluetoothAvailable();

  const refreshDevices = useCallback(async () => {
    setError(null);
    try {
      if (!(await requestBluetoothPermissions())) {
        setError('Bluetooth permission was refused. Grant it to find printers.');
        return;
      }
      if (!(await isBluetoothEnabled()) && !(await enableBluetooth())) {
        setError('Bluetooth is off. Turn it on to find printers.');
        return;
      }
      setDevices(await listPairedPrinters());
    } catch (err) {
      setError(err?.message || 'Could not list Bluetooth devices.');
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const saved = await loadPrinter();
      if (!active) return;

      if (saved) {
        setSelected(saved);
        setPaperWidth(saved.paperWidth);
      }
      if (available) await refreshDevices();
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
      cancelDiscovery();
    };
  }, [available, refreshDevices]);

  /** Finds printers that have never been paired, in addition to bonded ones. */
  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const found = await discoverPrinters();
      // Merge rather than replace: a discovery pass does not re-report
      // devices already bonded, and losing them from the list looks broken.
      setDevices((current) => {
        const seen = new Set(current.map((device) => device.address));
        return [...current, ...found.filter((d) => !seen.has(d.address))];
      });
    } catch (err) {
      setError(err?.message || 'Scan failed.');
    } finally {
      setScanning(false);
    }
  }, []);

  const handleSelect = useCallback(
    async (device) => {
      const printer = { ...device, paperWidth };
      setSelected(printer);
      await savePrinter(printer);
    },
    [paperWidth],
  );

  const handleWidth = useCallback(
    async (width) => {
      setPaperWidth(width);
      if (selected) {
        const printer = { ...selected, paperWidth: width };
        setSelected(printer);
        await savePrinter(printer);
      }
    },
    [selected],
  );

  const handleTest = useCallback(async () => {
    if (!selected) return;
    setTesting(true);
    try {
      const receipt = buildTestReceipt({ owner, paperWidth });
      await printBytes(selected.address, receipt.toBase64());
      Alert.alert(
        'Test sent',
        'If the dashed line runs edge to edge, the paper width is right. If it wraps, choose the other width.',
      );
    } catch (err) {
      Alert.alert('Could not print', err?.message || 'Please try again.');
    } finally {
      setTesting(false);
    }
  }, [owner, paperWidth, selected]);

  const handleForget = useCallback(async () => {
    await clearPrinter();
    setSelected(null);
  }, []);

  if (!available) {
    return (
      <StateView
        variant="error"
        title="Bluetooth printing not in this build"
        message="Rebuild the app to enable Bluetooth printing. Print and Save as PDF keep working in the meantime."
        style={styles.fill}
      />
    );
  }

  if (loading) return <StateView variant="loading" style={styles.fill} />;

  return (
    <View style={styles.fill}>
      <FlatList
        data={devices}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + SPACING.xl },
        ]}
        renderItem={({ item }) => (
          <PrinterRow
            device={item}
            selected={selected?.address === item.address}
            onSelect={handleSelect}
          />
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.intro}>
              Pair your printer in Android Bluetooth settings first, then pick
              it here. Receipts print straight to it instead of opening the
              print dialog.
            </Text>

            <Text style={styles.sectionTitle}>Paper width</Text>
            <View style={styles.widthRow}>
              {Object.entries(PAPER_WIDTHS).map(([value, { label }]) => (
                <Pressable
                  key={value}
                  onPress={() => handleWidth(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: paperWidth === value }}
                  style={({ pressed }) => [
                    styles.widthOption,
                    paperWidth === value && styles.widthOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.widthText,
                      paperWidth === value && styles.widthTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.sectionTitle}>Printers</Text>
          </View>
        }
        ListEmptyComponent={
          <StateView
            title="No paired printers"
            message="Pair the printer in Android Bluetooth settings, then pull to refresh or scan."
            style={styles.empty}
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              title="Scan for printers"
              variant="secondary"
              icon="bluetooth-outline"
              onPress={handleScan}
              loading={scanning}
              disabled={scanning}
            />
            <Button
              title="Print test receipt"
              icon="print-outline"
              onPress={handleTest}
              loading={testing}
              disabled={!selected || testing}
              style={styles.footerAction}
            />
            {!!selected && (
              <Button
                title="Forget this printer"
                variant="secondary"
                onPress={handleForget}
                style={styles.footerAction}
              />
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.background },
  pressed: { opacity: 0.75 },
  list: { padding: SPACING.md },
  intro: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  widthRow: { flexDirection: 'row' },
  widthOption: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  widthOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  widthText: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, fontWeight: '600' },
  widthTextActive: { color: COLORS.primaryDark, fontWeight: '700' },
  deviceCard: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  deviceCardSelected: { borderColor: COLORS.primary },
  deviceText: { flex: 1, marginLeft: SPACING.sm },
  deviceName: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text },
  deviceAddress: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
  },
  empty: { paddingVertical: SPACING.lg },
  footer: { marginTop: SPACING.md },
  footerAction: { marginTop: SPACING.sm },
});

export default PrinterScreen;
