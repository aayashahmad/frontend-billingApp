import {
  formatCompactCurrency, formatCurrency, roundMoney, toNumber } from '../money';

describe('toNumber', () => {
  it('coerces strings and rejects junk', () => {
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber(' 7 ')).toBe(7);
    expect(toNumber('')).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber('abc')).toBe(0);
  });
});

describe('roundMoney', () => {
  it('rounds float artefacts down at small magnitudes', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('rounds half-paisa up at every magnitude', () => {
    // 4.005 * 100 is 400.4999… in floating point; the EPSILON trick this
    // replaced rounded it DOWN to 4.00.
    expect(roundMoney(4.005)).toBe(4.01);
    expect(roundMoney(1234.565)).toBe(1234.57);
    expect(roundMoney(99999.995)).toBe(100000);
  });

  it('leaves exact values alone', () => {
    expect(roundMoney(835)).toBe(835);
    expect(roundMoney(335.0)).toBe(335);
  });
});

describe('formatCurrency', () => {
  it('formats with the rupee symbol and two decimals', () => {
    expect(formatCurrency(835)).toBe('₹835.00');
    expect(formatCurrency('99.5')).toBe('₹99.50');
  });

  it('groups Indian style for large amounts', () => {
    expect(formatCurrency(1234567)).toBe('₹12,34,567.00');
  });
});

describe('formatCompactCurrency', () => {
  it('uses Indian scale words a shop owner reads at a glance', () => {
    expect(formatCompactCurrency(850)).toBe('₹850');
    expect(formatCompactCurrency(6600)).toBe('₹6.6K');
    expect(formatCompactCurrency(120000)).toBe('₹1.2L');
    expect(formatCompactCurrency(25000000)).toBe('₹2.5Cr');
  });

  it('drops a decimal that says nothing', () => {
    expect(formatCompactCurrency(2000)).toBe('₹2K');
    expect(formatCompactCurrency(200000)).toBe('₹2L');
  });

  it('handles zero and negatives', () => {
    expect(formatCompactCurrency(0)).toBe('₹0');
    expect(formatCompactCurrency(-1500)).toBe('-₹1.5K');
  });
});
