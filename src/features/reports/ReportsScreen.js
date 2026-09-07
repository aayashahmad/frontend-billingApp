import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../../components/Card';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useSalesReport } from '../../hooks/useSalesReport';
import { useProfile } from '../../store/ProfileContext';
import { formatCurrency } from '../../utils/money';
import DocumentActions from '../printing/DocumentActions';
import { buildSalesReportHtml } from '../printing/documentTemplates';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { REPORT_PERIODS } from '../../services/reportService';
import SalesChart from './SalesChart';

/** One headline figure. */
const Figure = ({ label, value, tone }) => (
  <View style={styles.figure}>
    <Text style={styles.figureLabel}>{label}</Text>
    <Text style={[styles.figureValue, tone === 'due' && styles.figureDue]}>
      {value}
    </Text>
  </View>
);

/**
 * Sales over time.
 *
 * Reports sales rather than profit, and says so: profit needs a cost price,
 * and the catalogue only records what things sell for. Showing revenue under
 * a "profit" heading would put a wrong number in front of decisions.
 */
const ReportsScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile, profileLoaded } = useProfile();
  const [period, setPeriod] = useState('daily');
  const { report, loading, error, refresh } = useSalesReport(period);
  const docs = useDocumentActions();

  // Which column the detail card describes. Null follows the latest bucket,
  // so the card shows today until the owner taps a different bar.
  const [selectedIndex, setSelectedIndex] = useState(null);

  const buckets = report?.buckets ?? [];
  const activeIndex =
    selectedIndex === null || selectedIndex >= buckets.length
      ? buckets.length - 1
      : selectedIndex;
  const selected = buckets[activeIndex];
  const totals = report?.totals;

  const handlePeriod = useCallback((key) => {
    setPeriod(key);
    // The new period has different columns; pinning an old index would point
    // the detail card at an unrelated bucket.
    setSelectedIndex(null);
  }, []);

  const buildHtml = useCallback(
    () => buildSalesReportHtml({ report, owner: profile }),
    [report, profile],
  );

  const periodLabel = useMemo(
    () => REPORT_PERIODS.find((p) => p.key === period)?.label ?? '',
    [period],
  );

  if (loading && !report) return <StateView variant="loading" style={styles.fill} />;

  if (error && !report) {
    return (
      <StateView
        variant="error"
        title="Could not load your figures"
        message={error}
        onRetry={refresh}
        style={styles.fill}
      />
    );
  }

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + SPACING.xl },
      ]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={COLORS.primary} />
      }
    >
      <View style={styles.periods}>
        {REPORT_PERIODS.map((option) => {
          const active = option.key === period;
          return (
            <Pressable
              key={option.key}
              onPress={() => handlePeriod(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.period,
                active && styles.periodActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.periodText, active && styles.periodTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <Text style={styles.cardTitle}>{periodLabel} sales</Text>
        <View style={styles.figures}>
          <Figure label="Sold" value={formatCurrency(totals?.billed ?? 0)} />
          <Figure label="Collected" value={formatCurrency(totals?.collected ?? 0)} />
          <Figure
            label="On the book"
            value={formatCurrency(totals?.outstanding ?? 0)}
            tone="due"
          />
        </View>
        <Text style={styles.billCount}>
          {totals?.bills ?? 0} {totals?.bills === 1 ? 'bill' : 'bills'} in this period
        </Text>
        {/* Said plainly rather than dressed up: there is no cost price in the
            app, so this is turnover, not profit. */}
        <Text style={styles.caveat}>
          Sales, not profit — add cost prices to your products to see margin.
        </Text>
      </Card>

      <Card style={styles.chartCard}>
        <SalesChart
          buckets={buckets}
          selectedIndex={activeIndex}
          onSelect={setSelectedIndex}
        />
      </Card>

      {!!selected && (
        <>
          <Text style={styles.sectionTitle}>{selected.label}</Text>
          <Card>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bills</Text>
              <Text style={styles.detailValue}>{selected.bills}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sold</Text>
              <Text style={styles.detailValue}>{formatCurrency(selected.billed)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Collected</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(selected.collected)}
              </Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Went on the book</Text>
              <Text style={[styles.detailValue, styles.detailDue]}>
                {formatCurrency(selected.outstanding)}
              </Text>
            </View>
            <Text style={styles.detailHint}>
              {selected.bills > 0
                ? `Average bill ${formatCurrency(selected.billed / selected.bills)}.`
                : 'No bills in this one.'}
            </Text>
          </Card>
        </>
      )}

      <DocumentActions
        label={`sales-report-${period}`}
        buildHtml={buildHtml}
        print={docs.print}
        shareAsPdf={docs.shareAsPdf}
        busy={docs.busy}
        error={docs.error}
        disabled={!profileLoaded || !report}
        style={styles.actions}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  periods: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  period: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  periodActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textLight },
  periodTextActive: { color: COLORS.white },
  pressed: { opacity: 0.7 },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  figures: { flexDirection: 'row', justifyContent: 'space-between' },
  figure: { flex: 1 },
  figureLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
  figureValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  figureDue: { color: COLORS.danger },
  billCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  caveat: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  chartCard: { marginTop: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  detailValue: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text },
  detailDue: { color: COLORS.danger },
  detailHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  actions: { marginTop: SPACING.lg },
});

export default ReportsScreen;
