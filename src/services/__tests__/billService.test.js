import { PAYMENT_TYPES } from '../../constants/paymentTypes';
import { buildBillFormData } from '../billService';

/**
 * These assert the *wire payload*, not the form state.
 *
 * Cheque support originally shipped broken because the form collected a
 * cheque number correctly while this builder — keyed on `=== ONLINE` — never
 * sent it. Backend tests with hand-built requests could not catch that.
 */
/**
 * Records appends verbatim.
 *
 * The real FormData under test is React Native's, which accepts a
 * `{ uri, name, type }` object for a file part. The jest environment's own
 * FormData would coerce that to a string, so it is replaced here to keep the
 * assertions about what the builder actually passes.
 */
class RecordingFormData {
  constructor() {
    this.entries = {};
  }

  append(key, value) {
    this.entries[key] = value;
  }
}

beforeEach(() => {
  global.FormData = RecordingFormData;
});

const fieldsOf = (formData) => formData.entries;

const base = {
  phone: '9876543210',
  customerName: 'Asha Traders',
  items: [{ itemName: 'Cement', qty: '2', rate: '500' }],
};

const asset = { uri: 'file://cheque.jpg', fileName: 'cheque.jpg' };

describe('buildBillFormData', () => {
  it('sends the entered amount for a cash bill and no reference fields', () => {
    const sent = fieldsOf(
      buildBillFormData({
        ...base,
        paymentType: PAYMENT_TYPES.CASH,
        amountPaid: '400',
      }),
    );
    expect(sent.payment_type).toBe('cash');
    expect(sent.amount_paid).toBe('400');
    expect(sent.transaction_number).toBeUndefined();
    expect(sent.transaction_screenshot).toBeUndefined();
  });

  it('sends the reference and image for an online bill, but no amount', () => {
    const sent = fieldsOf(
      buildBillFormData({
        ...base,
        paymentType: PAYMENT_TYPES.ONLINE,
        transactionNumber: 'UTR-9001',
        transactionScreenshot: asset,
      }),
    );
    expect(sent.transaction_number).toBe('UTR-9001');
    expect(sent.transaction_screenshot).toMatchObject({ uri: asset.uri });
    // Online settles in full, so the server derives the amount.
    expect(sent.amount_paid).toBeUndefined();
  });

  it('sends amount AND cheque number AND image for a cheque bill', () => {
    const sent = fieldsOf(
      buildBillFormData({
        ...base,
        paymentType: PAYMENT_TYPES.CHEQUE,
        amountPaid: '600',
        transactionNumber: 'CHQ-100234',
        transactionScreenshot: asset,
      }),
    );
    expect(sent.payment_type).toBe('cheque');
    expect(sent.amount_paid).toBe('600');
    expect(sent.transaction_number).toBe('CHQ-100234');
    expect(sent.transaction_screenshot).toMatchObject({ uri: asset.uri });
  });

  it('trims the cheque number', () => {
    const sent = fieldsOf(
      buildBillFormData({
        ...base,
        paymentType: PAYMENT_TYPES.CHEQUE,
        amountPaid: '600',
        transactionNumber: '  CHQ-7  ',
        transactionScreenshot: asset,
      }),
    );
    expect(sent.transaction_number).toBe('CHQ-7');
  });

  it('omits the image rather than throwing when none is attached', () => {
    const build = () =>
      buildBillFormData({
        ...base,
        paymentType: PAYMENT_TYPES.CHEQUE,
        amountPaid: '600',
        transactionNumber: 'CHQ-8',
        transactionScreenshot: null,
      });
    expect(build).not.toThrow();
    expect(fieldsOf(build()).transaction_screenshot).toBeUndefined();
  });

  it('always sends the shared fields', () => {
    const sent = fieldsOf(
      buildBillFormData({
        ...base,
        paymentType: PAYMENT_TYPES.CHEQUE,
        amountPaid: '600',
        transactionNumber: 'CHQ-9',
        transactionScreenshot: asset,
      }),
    );
    expect(sent.phone).toBe('9876543210');
    expect(sent.customer_name).toBe('Asha Traders');
    // The flat fields still carry the first line, so a server predating
    // multi-item bills gets a request it can still satisfy.
    expect(sent.item_name).toBe('Cement');
    expect(sent.qty).toBe('2');
    expect(sent.rate).toBe('500');
  });

  it('sends every line item as a JSON array', () => {
    const sent = fieldsOf(
      buildBillFormData({
        ...base,
        items: [
          { itemName: 'Cement', qty: '2', rate: '500' },
          { itemName: ' Steel rod ', qty: '4', rate: '125.5' },
        ],
        paymentType: PAYMENT_TYPES.CASH,
        amountPaid: '0',
      }),
    );

    expect(JSON.parse(sent.items)).toEqual([
      { item_name: 'Cement', qty: 2, rate: 500 },
      { item_name: 'Steel rod', qty: 4, rate: 125.5 },
    ]);
    // The flat mirror stays on the first line regardless of how many there are.
    expect(sent.item_name).toBe('Cement');
    expect(sent.qty).toBe('2');
  });
});
