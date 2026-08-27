import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { buildUploadUrl } from '../constants/config';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

/** Full-screen viewer for an online bill's transaction screenshot. */
const TransactionImageModal = ({ bill, onClose }) => {
  const uri = buildUploadUrl(bill?.transaction_screenshot_url);

  return (
    <Modal
      visible={Boolean(bill)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <Text style={styles.reference} numberOfLines={1}>
            Ref: {bill?.transaction_number || '—'}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close screenshot"
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel="Transaction screenshot"
          />
        ) : (
          <Text style={styles.missing}>No screenshot available.</Text>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xl + SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    zIndex: 1,
  },
  reference: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    marginRight: SPACING.md,
  },
  closeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  image: { width: '100%', height: '75%' },
  missing: { color: COLORS.white, textAlign: 'center' },
});

export default React.memo(TransactionImageModal);
