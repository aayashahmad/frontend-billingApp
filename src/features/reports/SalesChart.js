import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/money';

const CHART_HEIGHT = 168;
const BAR_WIDTH = 34;
const BAR_GAP = 10;

/**
 * Sales per bucket, drawn with plain views.
 *
 * No charting library and no SVG runtime: a bar chart is a set of rectangles
 * whose heights are a ratio, and the alternative would be a native dependency
 * that has to survive every future Expo upgrade for the sake of drawing
 * boxes. It also keeps the app installable on builds without extra modules.
 *
 * Each column is two stacked segments — what was collected, and what went on
 * the book — so a tall bar that is mostly red reads as "sold plenty, took
 * little" at a glance, which is the thing a shop owner actually wants to see.
 */
const SalesChart = ({ buckets = [], selectedIndex, onSelect }) => {
  const scrollRef = useRef(null);

  // Jump to the newest data once the bars have a width. Doing this in the ref
  // callback ran before layout, so the chart opened on the oldest columns —
  // which are usually empty, making a working chart look blank.
  const handleContentSize = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  const peak = useMemo(
    () => Math.max(...buckets.map((b) => Number(b.billed) || 0), 0),
    [buckets],
  );

  if (!buckets.length) return null;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        ref={scrollRef}
        // Newest data sits on the right, which is where the eye should land.
        onContentSizeChange={handleContentSize}
      >
        {buckets.map((bucket, index) => {
          const billed = Number(bucket.billed) || 0;
          const collected = Math.min(Number(bucket.collected) || 0, billed);
          const due = Math.max(billed - collected, 0);

          // A bucket with sales always gets a visible sliver, so an empty day
          // and a quiet day do not look identical.
          const totalHeight = peak > 0 ? Math.max((billed / peak) * CHART_HEIGHT, billed > 0 ? 3 : 0) : 0;
          const dueHeight = billed > 0 ? (due / billed) * totalHeight : 0;
          const collectedHeight = totalHeight - dueHeight;
          const active = index === selectedIndex;

          return (
            <Pressable
              key={`${bucket.label}-${index}`}
              onPress={() => onSelect?.(index)}
              accessibilityRole="button"
              accessibilityLabel={`${bucket.label}: ${formatCurrency(billed)} sold, ${bucket.bills} bills`}
              style={styles.column}
            >
              <View style={styles.barArea}>
                <View
                  style={[
                    styles.bar,
                    { height: totalHeight },
                    active && styles.barActive,
                  ]}
                >
                  {due > 0 && (
                    <View style={[styles.dueSegment, { height: dueHeight }]} />
                  )}
                  <View
                    style={[styles.collectedSegment, { height: collectedHeight }]}
                  />
                </View>
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
  scroll: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs },
  column: { width: BAR_WIDTH + BAR_GAP, alignItems: 'center' },
  barArea: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    marginBottom: SPACING.xs,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    justifyContent: 'flex-start',
  },
  barActive: {
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },
  dueSegment: { width: '100%', backgroundColor: COLORS.danger },
  collectedSegment: { width: '100%', backgroundColor: COLORS.primary },
  label: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    width: BAR_WIDTH + BAR_GAP - 2,
    textAlign: 'center',
  },
  labelActive: { color: COLORS.primaryDark, fontWeight: '700' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xs,
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
