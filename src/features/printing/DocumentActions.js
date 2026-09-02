import { StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';

/**
 * Print / Share-as-PDF pair.
 *
 * `buildHtml` is a thunk so the (potentially large) document is only rendered
 * when a button is actually pressed.
 */
const DocumentActions = ({
  buildHtml,
  label,
  print,
  shareAsPdf,
  // Optional: only bills can go to a receipt printer, not statements.
  buildReceipt,
  printToThermal,
  busy,
  error,
  compact = false,
  disabled = false,
  style,
}) => {
  // Blocked while the letterhead is still loading — printing early would
  // silently produce a document with no business details at the top.
  const blocked = Boolean(busy) || disabled;

  return (
    <View style={style}>
      {!!buildReceipt && !!printToThermal && (
        <Button
          title="Print receipt"
          icon="print-outline"
          onPress={() => printToThermal(buildReceipt)}
          loading={busy === 'thermal'}
          disabled={blocked}
          style={styles.thermal}
        />
      )}

      <View style={styles.row}>
        <Button
          title="Print"
          variant="secondary"
          onPress={() => print(buildHtml())}
          loading={busy === 'print'}
          disabled={blocked}
          style={[styles.action, compact && styles.compact]}
        />
        <View style={styles.gap} />
        <Button
          title="Save as PDF"
          variant="secondary"
          onPress={() => shareAsPdf(buildHtml(), label)}
          loading={busy === 'pdf'}
          disabled={blocked}
          style={[styles.action, compact && styles.compact]}
        />
      </View>
      {disabled && !busy && (
        <Text style={styles.hint}>Loading your bill details…</Text>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  thermal: { marginBottom: SPACING.sm },
  row: { flexDirection: 'row' },
  action: { flex: 1 },
  compact: { minHeight: 40 },
  gap: { width: SPACING.sm },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default DocumentActions;
