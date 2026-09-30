import { formatKhataRef, parseKhataRef } from '../khata';

describe('formatKhataRef', () => {
  it('reads the way a shopkeeper would say it', () => {
    expect(formatKhataRef({ khata: '3', page: '47' })).toBe('Khata 3, page 47');
  });

  it('copes with only one half being known', () => {
    expect(formatKhataRef({ khata: '3' })).toBe('Khata 3');
    expect(formatKhataRef({ page: '47' })).toBe('Page 47');
  });

  it('is empty when nothing was entered, rather than "Khata , page "', () => {
    expect(formatKhataRef({})).toBe('');
    expect(formatKhataRef()).toBe('');
    expect(formatKhataRef({ khata: '  ', page: '  ' })).toBe('');
  });
});

describe('parseKhataRef', () => {
  it('splits a reference back into its parts', () => {
    expect(parseKhataRef('Khata 3, page 47')).toEqual({
      khata: '3',
      page: '47',
    });
  });

  it('round-trips whatever it produced', () => {
    for (const parts of [
      { khata: '3', page: '47' },
      { khata: '3A', page: '' },
      { khata: '', page: '12' },
    ]) {
      const text = formatKhataRef(parts);
      expect(formatKhataRef(parseKhataRef(text))).toBe(text);
    }
  });

  it('keeps a hand-typed book name rather than losing it', () => {
    // A shop whose books are not numbered must not have its reference
    // silently dropped on the next edit.
    expect(parseKhataRef('Red ledger')).toEqual({
      khata: 'Red ledger',
      page: '',
    });
  });

  it('is case-insensitive, because nobody types consistently', () => {
    expect(parseKhataRef('khata 5, PAGE 9')).toEqual({ khata: '5', page: '9' });
  });

  it('handles an empty or missing reference', () => {
    expect(parseKhataRef('')).toEqual({ khata: '', page: '' });
    expect(parseKhataRef(null)).toEqual({ khata: '', page: '' });
    expect(parseKhataRef(undefined)).toEqual({ khata: '', page: '' });
  });
});
