import { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from './Button';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

/**
 * Symbologies worth scanning on retail stock. Listing them explicitly keeps
 * the scanner off QR codes and the like, which are not product barcodes and
 * would otherwise fill the item field with a URL.
 */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'];

/**
 * Camera sheet that reads a product barcode and hands back its digits.
 *
 * There is no product catalogue, so the code itself is what gets returned —
 * the caller writes it into the item name and the user fills in the rest.
 */
const BarcodeScannerModal = ({ visible, onScanned, onClose }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  // The camera fires repeatedly while a barcode stays in frame; without this
  // the field would be written dozens of times and the sheet would try to
  // close on every one.
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible) handledRef.current = false;
  }, [visible]);

  const handleScan = useCallback(
    ({ data }) => {
      if (handledRef.current || !data) return;
      handledRef.current = true;
      onScanned?.(String(data).trim());
    },
    [onScanned],
  );

  const granted = permission?.granted;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        {granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={handleScan}
          />
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionBody}>
              {permission && !permission.canAskAgain
                ? 'Enable the camera for Billing in your device settings to scan barcodes.'
                : 'Billing uses the camera only to read the barcode on an item.'}
            </Text>
            {permission?.canAskAgain !== false && (
              <Button
                title="Allow camera"
                onPress={requestPermission}
                style={styles.permissionButton}
              />
            )}
          </View>
        )}

        {granted && (
          <>
            <View style={styles.reticle} pointerEvents="none" />
            <Text style={[styles.hint, { top: insets.top + SPACING.xl }]}>
              Point the camera at the item's barcode
            </Text>
          </>
        )}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          style={({ pressed }) => [
            styles.close,
            // The translucent-white pill belongs on the dark camera feed; on
            // the light permission screen it made "Cancel" nearly invisible.
            !granted && styles.closeOnLight,
            { bottom: insets.bottom + SPACING.lg },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.closeText, !granted && styles.closeTextOnLight]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  reticle: {
    position: 'absolute',
    top: '32%',
    left: '10%',
    right: '10%',
    height: '22%',
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: RADIUS.md,
    opacity: 0.85,
  },
  hint: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    textAlign: 'center',
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  permission: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  permissionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  permissionButton: { marginTop: SPACING.lg },
  pressed: { opacity: 0.75 },
  close: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeOnLight: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  closeTextOnLight: { color: COLORS.primary },
});

export default BarcodeScannerModal;
