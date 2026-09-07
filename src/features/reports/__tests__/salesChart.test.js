import { niceAxisMax } from '../SalesChart';

describe('niceAxisMax', () => {
  it('snaps to a number a person would put on an axis', () => {
    // A raw peak of 6,600 would give ticks of 1,650 — correct and unreadable.
    expect(niceAxisMax(6600)).toBe(10000);
    expect(niceAxisMax(850)).toBe(1000);
    expect(niceAxisMax(1800)).toBe(2000);
    expect(niceAxisMax(2200)).toBe(2500);
    expect(niceAxisMax(4800)).toBe(5000);
  });

  it('never rounds below the peak, or a bar would overflow the plot', () => {
    [1, 99, 101, 999, 12345, 987654].forEach((peak) => {
      expect(niceAxisMax(peak)).toBeGreaterThanOrEqual(peak);
    });
  });

  it('returns zero for an empty chart rather than dividing by it', () => {
    expect(niceAxisMax(0)).toBe(0);
    expect(niceAxisMax(-5)).toBe(0);
    expect(niceAxisMax(NaN)).toBe(0);
  });
});
