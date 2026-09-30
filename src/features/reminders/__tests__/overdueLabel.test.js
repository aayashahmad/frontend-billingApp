import { overdueLabel } from '../overdue';

describe('overdueLabel', () => {
  it('never says "1 days" or "1 months"', () => {
    expect(overdueLabel(1)).toBe('1 day overdue');
    expect(overdueLabel(365)).toBe('1 year overdue');
  });

  it('keeps days exact where the exact number still matters', () => {
    expect(overdueLabel(7)).toBe('7 days overdue');
    expect(overdueLabel(42)).toBe('42 days overdue');
    expect(overdueLabel(59)).toBe('59 days overdue');
  });

  it('rounds to months once the exact day stops meaning anything', () => {
    expect(overdueLabel(60)).toBe('2 months overdue');
    expect(overdueLabel(200)).toBe('6 months overdue');
  });

  it('rounds to years past a year', () => {
    expect(overdueLabel(400)).toBe('1 year overdue');
    expect(overdueLabel(800)).toBe('2 years overdue');
  });

  it('handles a debt that turned overdue today', () => {
    expect(overdueLabel(0)).toBe('0 days overdue');
  });
});
