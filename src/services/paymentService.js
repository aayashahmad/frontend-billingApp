import { hasPaymentReference } from '../utils/billing';
import api from './api';

const inferFileName = (asset) => {
  if (asset?.fileName) return asset.fileName;
  const fromUri = asset?.uri?.split('/').pop();
  return fromUri || 'payment.jpg';
};

const inferMimeType = (asset) => {
  if (asset?.mimeType) return asset.mimeType;
  const ext = inferFileName(asset).split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : 'image/jpeg';
};

/**
 * Multipart payload for a payment. Mirrors the bill request — React Native's
 * FormData takes a `{ uri, name, type }` object in place of a browser File.
 */
export const buildPaymentFormData = ({
  amount,
  paymentType,
  transactionNumber,
  transactionScreenshot,
  note,
}) => {
  const formData = new FormData();
  formData.append('amount', String(amount));
  formData.append('payment_type', paymentType);

  if (note) formData.append('note', String(note).trim());

  if (hasPaymentReference(paymentType)) {
    formData.append('transaction_number', String(transactionNumber ?? '').trim());

    if (transactionScreenshot?.uri) {
      formData.append('transaction_screenshot', {
        uri: transactionScreenshot.uri,
        name: inferFileName(transactionScreenshot),
        type: inferMimeType(transactionScreenshot),
      });
    }
  }

  return formData;
};

/** Records money received against a customer's outstanding balance. */
export const recordPayment = async (customerId, values, { signal } = {}) => {
  const { data } = await api.post(
    `/customers/${customerId}/payments`,
    buildPaymentFormData(values),
    { headers: { 'Content-Type': 'multipart/form-data' }, signal },
  );
  return data;
};
