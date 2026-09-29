import { Platform } from 'react-native';

import {
  buildBalanceMessage,
  buildBillMessage,
  buildSmsLink,
  toInternational,
} from '../messaging';

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


describe('buildBillMessage', () => {
  const shopName = 'QA Shop';
  const customer = { name: 'Sita Devi', total_unpaid: 0, advance_balance: 0 };

  const message = (bill, over = {}) =>
    buildBillMessage({ customer: { ...customer, ...over }, bill, shopName });

  it('never claims money was paid when credit settled the bill', () => {
    // The reported bug: a pay-later bill covered entirely by the customer's
    // own advance read "Paid in full" although nothing changed hands.
    const text = message(
      {
        bill_total: 100,
        amount_paid: 0,
        advance_applied: 100,
        unbalance: 0,
        advance_added: 0,
      },
      { advance_balance: 480 },
    );

    expect(text).not.toMatch(/paid in full/i);
    expect(text).toContain('Settled from your advance balance');
    expect(text).toContain('Advance remaining');
    expect(text).toContain('480');
  });

  it('says a pay-later bill went on the account', () => {
    const text = message(
      {
        bill_total: 250,
        amount_paid: 0,
        advance_applied: 0,
        unbalance: 250,
        advance_added: 0,
      },
      { total_unpaid: 250 },
    );
    expect(text).toContain('Added to your account');
    expect(text).toContain('250');
    expect(text).not.toMatch(/paid in full/i);
  });

  it('says paid in full only when money actually covered it', () => {
    const text = message({
      bill_total: 250,
      amount_paid: 250,
      advance_applied: 0,
      unbalance: 0,
      advance_added: 0,
    });
    expect(text).toContain('Paid in full');
  });

  it('names both parts when cash and credit share the bill', () => {
    const text = message(
      {
        bill_total: 1000,
        amount_paid: 700,
        advance_applied: 300,
        unbalance: 0,
        advance_added: 0,
      },
      { advance_balance: 0 },
    );
    expect(text).toContain('700');
    expect(text).toContain('300');
    expect(text).toContain('taken from your advance');
  });

  it('reports what is still due on a part-paid bill', () => {
    const text = message(
      {
        bill_total: 1000,
        amount_paid: 600,
        advance_applied: 0,
        unbalance: 400,
        advance_added: 0,
      },
      { total_unpaid: 400 },
    );
    expect(text).toContain('Part-paid');
    expect(text).toContain('400');
  });

  it('does not count an overpayment as money spent on this bill', () => {
    // 1300 handed over on a 1000 bill: 1000 settled it, 300 became credit.
    const text = message(
      {
        bill_total: 1000,
        amount_paid: 1300,
        advance_applied: 0,
        unbalance: 0,
        advance_added: 300,
      },
      { advance_balance: 300 },
    );
    expect(text).toContain('Paid in full');
    expect(text).toContain('Advance remaining');
    expect(text).toContain('300');
  });

  it('warns about earlier debt even when this bill is settled', () => {
    const text = message(
      {
        bill_total: 250,
        amount_paid: 250,
        advance_applied: 0,
        unbalance: 0,
        advance_added: 0,
      },
      { total_unpaid: 560 },
    );
    expect(text).toContain('Paid in full');
    expect(text).toContain('Total outstanding');
    expect(text).toContain('560');
  });

  it('stays clean when the account is square both ways', () => {
    const text = message({
      bill_total: 250,
      amount_paid: 250,
      advance_applied: 0,
      unbalance: 0,
      advance_added: 0,
    });
    expect(text).not.toMatch(/outstanding|advance remaining/i);
    expect(text).not.toContain('undefined');
  });
});
