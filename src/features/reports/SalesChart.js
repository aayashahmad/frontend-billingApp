import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { formatCompactCurrency, formatCurrency } from '../../utils/money';

const PLOT_HEIGHT = 170;
const BAR_WIDTH = 26;
const COLUMN_WIDTH = 44;
const AXIS_WIDTH = 46;
const TICK_COUNT = 4;

/**
 * Rounds an axis maximum up to something a person would choose.
 *
 * A raw peak of 6,600 gives ticks of 1,650 / 3,300 / 4,950 — arithmetically
 * fine and unreadable. Snapping to 1/2/2.5/5 x a power of ten produces the
 * round numbers a printed chart would use.
 */
export const niceAxisMax = (peak) => {
  if (!Number.isFinite(peak) || peak <= 0) return 0;

  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const normalised = peak / magnitude;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => normalised <= candidate) ?? 10;
  return step * magnitude;
};

/**
 * Sales per bucket.
 *
 * Drawn with plain views rather than a charting library: a bar chart is
 * rectangles whose heights are a ratio, and the alternative is a native
 * dependency to carry through every Expo upgrade for the sake of drawing
 * boxes.
 *
 * Each column splits into what was collected and what went on the book, so a
 * tall mostly-red bar reads as "sold plenty, took little" without reading a
 * single number.
 */
const SalesChart = ({ buckets = [], selectedIndex, onSelect }) => {
  const scrollRef = useRef(null);

  // Jump to the newest data once the bars have a width. Doing this in the ref
  // callback ran before layout, so the chart opened on the oldest columns —
  // usually empty, which made a working chart look blank.
  const handleContentSize = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  const axisMax = useMemo(
    () => niceAxisMax(Math.max(...buckets.map((b) => Number(b.billed) || 0), 0)),
    [buckets],
  );

  const ticks = useMemo(() => {
    if (axisMax <= 0) return [];
    return Array.from({ length: TICK_COUNT + 1 }, (_, index) => {
      const value = (axisMax / TICK_COUNT) * index;
      return { value, offset: (value / axisMax) * PLOT_HEIGHT };
    });
  }, [axisMax]);

  if (!buckets.length) return null;

  return (
    <View>
      <View style={styles.chartRow}>
        {/* Fixed axis: it must not scroll away with the bars, or the numbers
            stop describing what is on screen. */}
        <View style={styles.axis}>
          {ticks
            .slice()
            .reverse()
            .map((tick) => (
              <Text key={tick.value} style={styles.axisLabel} numberOfLines={1}>
                {formatCompactCurrency(tick.value)}
              </Text>
            ))}
        </View>

        <View style={styles.plot}>
          {/* Gridlines sit behind the bars and span the visible plot, so they
              stay put while the bars scroll under them. */}
          <View style={styles.gridlines} pointerEvents="none">
            {ticks.map((tick) => (
              <View
                key={tick.value}
                style={[
                  styles.gridline,
                  { bottom: tick.offset },
                  tick.value === 0 && styles.baseline,
                ]}
              />
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            ref={scrollRef}
            onContentSizeChange={handleContentSize}
          >
            {buckets.map((bucket, index) => {
              const billed = Number(bucket.billed) || 0;
              const collected = Math.min(Number(bucket.collected) || 0, billed);
              const due = Math.max(billed - collected, 0);

              const total =
                axisMax > 0
                  ? Math.max((billed / axisMax) * PLOT_HEIGHT, billed > 0 ? 4 : 0)
                  : 0;
              const dueHeight = billed > 0 ? (due / billed) * total : 0;
              const collectedHeight = total - dueHeight;
              const active = index === selectedIndex;

              return (
                <Pressable
                  key={`${bucket.label}-${index}`}
                  onPress={() => onSelect?.(index)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${bucket.label}: ${formatCurrency(billed)} sold, ${bucket.bills} bills`}
                  style={styles.column}
                >
                  <View style={styles.barArea}>
                    {/* A faint track marks every column, so a day with no
                        sales still reads as a day rather than a gap. */}
                    <View style={[styles.track, active && styles.trackActive]} />

                    {billed > 0 && (
                      <View style={[styles.bar, { height: total }]}>
                        {due > 0 && (
                          <View style={[styles.dueSegment, { height: dueHeight }]} />
                        )}
                        <View
                          style={[
                            styles.collectedSegment,
                            { height: collectedHeight },
                          ]}
                        />
                      </View>
                    )}
                  </View>

                  <Text
                    style={[styles.label, active && styles.labelActive]}
                    numberOfLines={1}
                  >
                    {bucket.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Collected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.legendText}>On the book</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartRow: { flexDirection: 'row' },
  axis: {
    width: AXIS_WIDTH,
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
    // Pulls each label up so it straddles its gridline rather than sitting
    // below it.
    marginBottom: 22,
  },
  axisLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'right',
    paddingRight: SPACING.xs,
    // Half the line height, so the text centres on the line it describes.
    marginBottom: -6,
    marginTop: -6,
  },
  plot: { flex: 1 },
  gridlines: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    height: PLOT_HEIGHT,
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  baseline: { backgroundColor: COLORS.textLight, height: 1 },
  scroll: { paddingRight: SPACING.sm },
  column: { width: COLUMN_WIDTH, alignItems: 'center' },
  barArea: {
    height: PLOT_HEIGHT,
    width: BAR_WIDTH,
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  trackActive: { backgroundColor: COLORS.primaryDark },
  bar: {
    width: BAR_WIDTH,
    // Rounded at the top only: a pill-shaped bar detaches from its baseline.
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  dueSegment: { width: '100%', backgroundColor: COLORS.danger },
  collectedSegment: { width: '100%', backgroundColor: COLORS.primary },
  label: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    width: COLUMN_WIDTH,
    textAlign: 'center',
  },
  labelActive: { color: COLORS.primaryDark, fontWeight: '700' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
  },
  swatch: { width: 10, height: 10, borderRadius: 2, marginRight: 6 },
  legendText: { fontSize: FONT_SIZES.xs, color: COLORS.textLight },
});

export default React.memo(SalesChart);
