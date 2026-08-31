import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildUploadUrl } from '../constants/config';
import { getAuthHeaders } from '../services/api';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

const IDLE = { status: 'idle', uri: null, error: null };

/**
 * Reads the screenshot into a data URI.
 *
 * The endpoint is behind an ownership check, so the request needs the bearer
 * token. Handing `headers` to <Image> does not reliably reach the native
 * image loader, which left the viewer showing an empty frame — fetching the
 * bytes ourselves and rendering them inline is what actually works.
 */
const useAuthenticatedImage = (bill) => {
  const [state, setState] = useState(IDLE);
  const path = bill?.transaction_screenshot_url;
  const billId = bill?.id;

  useEffect(() => {
    const remoteUri = buildUploadUrl(path);
    if (!remoteUri) {
      setState(IDLE);
      return undefined;
    }

    let active = true;
    setState({ status: 'loading', uri: null, error: null });

    (async () => {
      try {
        const response = await fetch(remoteUri, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'This screenshot is no longer available.'
              : `Could not load the image (${response.status}).`,
          );
        }

        const blob = await response.blob();
        const dataUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Could not read the image.'));
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        if (active) setState({ status: 'ready', uri: dataUri, error: null });
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            uri: null,
            error: error?.message || 'Could not load the image.',
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [billId, path]);

  return state;
};

/** Full-screen viewer for an online bill's transaction screenshot. */
const TransactionImageModal = ({ bill, onClose }) => {
  const insets = useSafeAreaInsets();
  const { status, uri, error } = useAuthenticatedImage(bill);

  return (
    <Modal
      visible={Boolean(bill)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
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

        {status === 'loading' && (
          <ActivityIndicator size="large" color={COLORS.white} />
        )}

        {status === 'ready' && !!uri && (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel="Transaction screenshot"
          />
        )}

        {status === 'error' && <Text style={styles.missing}>{error}</Text>}

        {status === 'idle' && (
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
  missing: {
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});

export default React.memo(TransactionImageModal);
