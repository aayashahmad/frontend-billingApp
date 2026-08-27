import { PAYMENT_TYPES } from '../constants/paymentTypes';
import api from './api';

const inferFileName = (asset) => {
  if (asset?.fileName) return asset.fileName;
  const fromUri = asset?.uri?.split('/').pop();
  return fromUri || 'transaction.jpg';
};

const inferMimeType = (asset) => {
  if (asset?.mimeType) return asset.mimeType;
  const ext = inferFileName(asset).split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : 'image/jpeg';
};

/**
 * Build the multipart payload the API expects. React Native's FormData takes
 * a `{ uri, name, type }` object in place of a browser File.
 */
const buildBillFormData = ({
  phone,
  customerName,
  itemName,
  qty,
  rate,
  paymentType,
  amountPaid,
  transactionNumber,
  transactionScreenshot,
}) => {
  const formData = new FormData();
  formData.append('phone', String(phone).trim());
  formData.append('customer_name', String(customerName || '').trim());
  formData.append('item_name', String(itemName).trim());
  formData.append('qty', String(qty));
  formData.append('rate', String(rate));
  formData.append('payment_type', paymentType);

  if (paymentType === PAYMENT_TYPES.CASH) {
    formData.append('amount_paid', String(amountPaid ?? 0));
  }

  if (paymentType === PAYMENT_TYPES.ONLINE) {
    formData.append('transaction_number', String(transactionNumber).trim());
    formData.append('transaction_screenshot', {
      uri: transactionScreenshot.uri,
      name: inferFileName(transactionScreenshot),
      type: inferMimeType(transactionScreenshot),
    });
  }

  return formData;
};

/** Returns `{ bill, customer }` — the customer carries the updated totals. */
export const createBill = async (values, { signal } = {}) => {
  const { data } = await api.post('/bills', buildBillFormData(values), {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
  });
  return data;
};

export { buildBillFormData };
