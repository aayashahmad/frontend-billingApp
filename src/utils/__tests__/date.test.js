import { ensureUtc, formatDateTime } from '../date';

describe('ensureUtc', () => {
  it('tags naive backend timestamps as UTC', () => {
    expect(ensureUtc('2026-09-02T14:42:40')).toBe('2026-09-02T14:42:40Z');
    expect(ensureUtc('2026-09-02T14:42')).toBe('2026-09-02T14:42Z');
    expect(ensureUtc('2026-09-02T14:42:40.123')).toBe('2026-09-02T14:42:40.123Z');
  });

  it('leaves offset-carrying strings and non-strings alone', () => {
    expect(ensureUtc('2026-09-02T14:42:40Z')).toBe('2026-09-02T14:42:40Z');
    expect(ensureUtc('2026-09-02T14:42:40+05:30')).toBe('2026-09-02T14:42:40+05:30');
    const date = new Date();
    expect(ensureUtc(date)).toBe(date);
  });
});

describe('formatDateTime', () => {
  it('renders a naive timestamp at the LOCAL wall-clock time', () => {
    // Whatever timezone the test runs in, the naive string must land on the
    // same instant as its explicit-UTC twin — before the fix it was read as
    // local time, showing bills 5h30 early in India.
    const fromNaive = formatDateTime('2026-09-02T14:42:40');
    const fromUtc = formatDateTime('2026-09-02T14:42:40Z');
    expect(fromNaive).toBe(fromUtc);
    expect(fromNaive).not.toBe('');
  });

  it('returns empty for blank and invalid input', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('not-a-date')).toBe('');
  });
});
