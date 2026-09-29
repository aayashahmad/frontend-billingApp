import { Platform } from 'react-native';

import { buildBalanceMessage, buildSmsLink, toInternational } from '../messaging';

const REAL_OS = Platform.OS;
afterEach(() => {
  Platform.OS = REAL_OS;
});

describe('buildSmsLink', () => {
  // The separator before the body differs by platform, and the wrong one is
  // dropped silently — the message app opens with an empty body and no error.
  // Both are pinned here because neither can be checked by looking at it.
  it.each([
    ['ios', 'sms:9876543210&body=Hello'],
    ['android', 'sms:9876543210?body=Hello'],
  ])('pre-fills the body on %s', (os, expected) => {
    Platform.OS = os;
    expect(buildSmsLink('9876543210', 'Hello')).toBe(expected);
  });

  it('strips formatting from the number', () => {
    expect(buildSmsLink('+91 98765 43210')).toBe('sms:919876543210');
  });

  it('refuses a number too short to be real', () => {
    expect(buildSmsLink('12345')).toBeNull();
    expect(buildSmsLink('')).toBeNull();
    expect(buildSmsLink(null)).toBeNull();
  });

  it('escapes a body that would otherwise break the URL', () => {
    const link = buildSmsLink('9876543210', 'Due: ₹1,200 & rising');
    expect(link).not.toContain(' ');
    expect(decodeURIComponent(link.split('body=')[1])).toBe(
      'Due: ₹1,200 & rising',
    );
  });
});

describe('toInternational', () => {
  it('assumes India for a bare 10-digit number', () => {
    expect(toInternational('9876543210')).toBe('919876543210');
  });

  it('leaves an already-international number alone', () => {
    expect(toInternational('919876543210')).toBe('919876543210');
  });
});

describe('buildBalanceMessage', () => {
  const shopName = 'Sharma Stores';

  it('asks for money only when money is owed', () => {
    const message = buildBalanceMessage({
      customer: { name: 'Ramesh', total_unpaid: 1200, advance_balance: 0 },
      shopName,
    });
    expect(message).toContain('Ramesh');
    expect(message).toContain('Sharma Stores');
    expect(message).toContain('outstanding balance');
    expect(message).toContain('1,200');
  });

  it('never demands payment from somebody holding credit', () => {
    const message = buildBalanceMessage({
      customer: { name: 'Sita', total_unpaid: 0, advance_balance: 500 },
      shopName,
    });
    expect(message).toContain('advance balance');
    expect(message).toContain('500');
    expect(message).not.toMatch(/outstanding|due|owe/i);
  });

  it('thanks a settled customer rather than saying nothing', () => {
    const message = buildBalanceMessage({
      customer: { name: 'Anil', total_unpaid: 0, advance_balance: 0 },
      shopName,
    });
    expect(message).toContain('fully settled');
    expect(message).not.toMatch(/outstanding|advance/i);
  });

  it('stays sendable when the customer has no name', () => {
    const message = buildBalanceMessage({
      customer: { total_unpaid: 100 },
      shopName,
    });
    expect(message).toContain('Customer');
    expect(message).not.toContain('undefined');
  });
});
