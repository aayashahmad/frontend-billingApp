import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { buildSmsLink } from '../../utils/messaging';
import { buildWhatsAppLink } from '../../utils/upi';

/**
 * Send a customer a message, by WhatsApp or SMS.
 *
 * Both open the messaging app with the text already written, for the
 * shopkeeper to read and send. Nothing goes out on its own — what to say to
 * the person standing in front of you is a judgement the shop has to make,
 * and automated messages are how a regular customer stops coming.
 *
 * Neither channel can carry a file: SMS is text only, and a wa.me link has
 * no attachment. The PDF goes through the share sheet instead, where
 * WhatsApp appears as one target among many.
 */
const ContactActions = ({ phone, message, title = 'Send a message', style }) => {
  const [error, setError] = useState(null);

  const open = useCallback(async (url, missing) => {
    setError(null);
    if (!url) {
      setError('This customer has no valid phone number saved.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        setError(missing);
        return;
      }
      await Linking.openURL(url);
    } catch {
      setError(missing);
    }
  }, []);

  const handleWhatsApp = useCallback(
    () =>
      open(
        buildWhatsAppLink(phone, message),
        'WhatsApp is not installed on this phone.',
      ),
    [message, open, phone],
  );

  const handleSms = useCallback(
    () => open(buildSmsLink(phone, message), 'No messaging app could be opened.'),
    [message, open, phone],
  );

  return (
    <View style={style}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.row}>
        <Button
          title="WhatsApp"
          icon="logo-whatsapp"
          variant="secondary"
          onPress={handleWhatsApp}
          style={styles.action}
        />
        <View style={styles.gap} />
        <Button
          title="SMS"
          icon="chatbubble-outline"
          variant="secondary"
          onPress={handleSms}
          style={styles.action}
        />
      </View>
      <Text style={styles.hint} numberOfLines={3}>
        {message}
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  row: { flexDirection: 'row' },
  action: { flex: 1 },
  gap: { width: SPACING.sm },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
});

export default ContactActions;
