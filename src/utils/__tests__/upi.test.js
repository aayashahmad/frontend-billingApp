import {
  buildUpiUri,
  buildWhatsAppLink,
  formatWhatsAppNumber,
  isValidGstin,
  isValidIfsc,
  isValidUpiId,
} from '../upi';

describe('buildUpiUri', () => {
  it('builds a link with the parameters NPCI requires', () => {
    const uri = buildUpiUri({
      upiId: 'shop@okaxis',
      payeeName: 'Ashu Store',
      amount: 835,
      note: 'Bill #12',
    });
    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=shop%40okaxis');
    expect(uri).toContain('pn=Ashu%20Store');
    // Only INR is accepted by the spec.
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('am=835.00');
    expect(uri).toContain('tn=Bill%20%2312');
  });

  it('always sends the amount with two decimals', () => {
    expect(buildUpiUri({ upiId: 'shop@ybl', payeeName: 'S', amount: 99.5 })).toContain(
      'am=99.50',
    );
    // A third decimal is a rounding artefact, not money anyone can pay.
    expect(buildUpiUri({ upiId: 'shop@ybl', payeeName: 'S', amount: 10.005 })).toContain(
      'am=10.01',
    );
  });

  it('omits the amount when there is nothing to collect', () => {
    const settled = buildUpiUri({ upiId: 'shop@ybl', payeeName: 'S', amount: 0 });
    expect(settled).not.toContain('am=');
    expect(buildUpiUri({ upiId: 'shop@ybl', payeeName: 'S' })).not.toContain('am=');
  });

  it('returns null without a usable payee address', () => {
    expect(buildUpiUri({ upiId: '', payeeName: 'S' })).toBeNull();
    expect(buildUpiUri({ upiId: 'not-a-vpa', payeeName: 'S' })).toBeNull();
  });

  it('escapes characters that would break the query string', () => {
    const uri = buildUpiUri({
      upiId: 'shop@ybl',
      payeeName: 'Ram & Sons',
      note: 'Bill #9 = paid?',
    });
    expect(uri).toContain('pn=Ram%20%26%20Sons');
    expect(uri).not.toMatch(/pn=Ram & Sons/);
  });
});

describe('identifier validation', () => {
  it('accepts real UPI handles and rejects malformed ones', () => {
    ['shop@okaxis', 'ashu.bhat@ybl', 'store-1@paytm'].forEach((id) =>
      expect(isValidUpiId(id)).toBe(true),
    );
    ['shop', 'shop@', '@okaxis', 'shop@123'].forEach((id) =>
      expect(isValidUpiId(id)).toBe(false),
    );
  });

  it('accepts a well-formed IFSC and rejects the rest', () => {
    expect(isValidIfsc('SBIN0125620')).toBe(true);
    expect(isValidIfsc('hdfc0001234')).toBe(true); // case-insensitive
    expect(isValidIfsc('SBIN1125620')).toBe(false); // 5th char must be 0
    expect(isValidIfsc('SBI0125620')).toBe(false); // too short
  });

  it('accepts a well-formed GSTIN', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
    expect(isValidGstin('27AAPFU0939F1AV')).toBe(false); // 14th char must be Z
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false); // too short
  });
});

describe('buildWhatsAppLink', () => {
  it('adds the country code to a bare Indian number', () => {
    expect(buildWhatsAppLink('9876543210')).toBe('https://wa.me/919876543210');
  });

  it('keeps a number that already carries its country code', () => {
    expect(buildWhatsAppLink('+91 98765 43210')).toBe('https://wa.me/919876543210');
  });

  it('attaches a prefilled message', () => {
    expect(buildWhatsAppLink('9876543210', 'Bill #4')).toBe(
      'https://wa.me/919876543210?text=Bill%20%234',
    );
  });

  it('returns null for something too short to dial', () => {
    expect(buildWhatsAppLink('12345')).toBeNull();
    expect(buildWhatsAppLink('')).toBeNull();
  });

  it('formats numbers for display', () => {
    expect(formatWhatsAppNumber('9876543210')).toBe('98765 43210');
    expect(formatWhatsAppNumber('919876543210')).toBe('+91 98765 43210');
  });
});

describe('note sanitising', () => {
  it('strips characters that would travel as multi-byte escapes', () => {
    const uri = buildUpiUri({
      upiId: 'shop@ybl',
      payeeName: 'Shop',
      note: 'Dues — Ravi ₹335',
    });
    // An em dash would arrive as %E2%80%94 and a rupee sign as %E2%82%B9.
    expect(uri).not.toContain('%E2%80%94');
    expect(uri).not.toContain('%E2%82%B9');
    expect(uri).toContain('tn=Dues%20Ravi%20335');
  });

  it('keeps ordinary punctuation that UPI apps accept', () => {
    const uri = buildUpiUri({ upiId: 'shop@ybl', payeeName: 'Shop', note: 'Bill #12' });
    expect(uri).toContain('tn=Bill%20%2312');
  });
});
