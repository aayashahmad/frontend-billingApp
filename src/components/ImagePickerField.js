import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import Button from './Button';

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.7,
};

/**
 * Camera / gallery picker returning an ImagePickerAsset
 * (`{ uri, fileName, mimeType }`) to the parent form.
 */
const ImagePickerField = ({
  label,
  value,
  onChange,
  error,
  disabled,
  // Named per payment type — a cheque photo is not a "screenshot".
  emptyText = 'No image attached',
}) => {
  const [busy, setBusy] = useState(false);

  const runPicker = useCallback(
    async (launch, requestPermission, permissionMessage) => {
      setBusy(true);
      try {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission required', permissionMessage);
          return;
        }

        const result = await launch(PICKER_OPTIONS);
        // SDK 57: `canceled` is true and `assets` is null when dismissed.
        if (result.canceled || !result.assets?.length) return;

        onChange(result.assets[0]);
      } catch (pickerError) {
        Alert.alert(
          'Could not open picker',
          pickerError?.message || 'Please try again.',
        );
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const handleTakePhoto = useCallback(
    () =>
      runPicker(
        ImagePicker.launchCameraAsync,
        ImagePicker.requestCameraPermissionsAsync,
        'Camera access is needed to capture the transaction screenshot.',
      ),
    [runPicker],
  );

  const handlePickFromLibrary = useCallback(
    () =>
      runPicker(
        ImagePicker.launchImageLibraryAsync,
        ImagePicker.requestMediaLibraryPermissionsAsync,
        'Photo library access is needed to attach the transaction screenshot.',
      ),
    [runPicker],
  );

  const handleRemove = useCallback(() => onChange(null), [onChange]);

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {value?.uri ? (
        <View style={styles.previewWrapper}>
          <Image
            source={{ uri: value.uri }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel="Selected transaction screenshot"
          />
          <Pressable
            onPress={handleRemove}
            disabled={disabled}
            accessibilityRole="button"
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.placeholder, !!error && styles.placeholderError]}>
          <Text style={styles.placeholderText}>{emptyText}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title="Take photo"
          variant="secondary"
          onPress={handleTakePhoto}
          loading={busy}
          disabled={disabled}
          style={styles.action}
        />
        <View style={styles.actionGap} />
        <Button
          title="Choose from gallery"
          variant="secondary"
          onPress={handlePickFromLibrary}
          loading={busy}
          disabled={disabled}
          style={styles.action}
        />
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  previewWrapper: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  preview: { width: '100%', height: 200, backgroundColor: COLORS.background },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  removeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  placeholder: {
    height: 110,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderError: { borderColor: COLORS.danger },
  placeholderText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  actions: { flexDirection: 'row', marginTop: SPACING.sm },
  action: { flex: 1 },
  actionGap: { width: SPACING.sm },
  errorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
});

export default React.memo(ImagePickerField);
