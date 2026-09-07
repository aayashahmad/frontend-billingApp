import api from './api';

/** The periods the reports screen offers, in the order it shows them. */
export const REPORT_PERIODS = Object.freeze([
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
]);

/**
 * Sales, collections and dues bucketed over a period.
 *
 * The device's own UTC offset is sent so buckets follow the shop's clock: a
 * sale rung up at 1am would otherwise land in the previous UTC day and move
 * takings into yesterday's total.
 */
export const getSalesSummary = async (period, { signal } = {}) => {
  const { data } = await api.get('/reports/summary', {
    params: {
      period,
      // getTimezoneOffset is minutes *behind* UTC, so it is negated.
      tz_offset: -new Date().getTimezoneOffset(),
    },
    signal,
  });
  return data;
};
