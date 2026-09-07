import api from './api';

/** Letterhead printed on bills and PDFs, scoped to the signed-in owner. */
export const getBusinessProfile = async ({ signal } = {}) => {
  const { data } = await api.get('/business', { signal });
  return data;
};

/**
 * Replaces the whole letterhead. Every field is sent, so clearing one on the
 * form clears it on the server rather than leaving the old value behind.
 */
export const updateBusinessProfile = async (values, { signal } = {}) => {
  const { data } = await api.put(
    '/business',
    {
      business_name: values.businessName?.trim() || null,
      business_address: values.businessAddress?.trim() || null,
      business_email: values.businessEmail?.trim() || null,
      business_phone: values.businessPhone?.trim() || null,
      business_alt_phone: values.businessAltPhone?.trim() || null,
      registration_number: values.registrationNumber?.trim() || null,
      // Stored uppercase: both are official identifiers that are printed and
      // read back, and mixed case invites duplicates that look different.
      gstin: values.gstin?.trim().toUpperCase() || null,
      upi_id: values.upiId?.trim() || null,
      bank_account_name: values.bankAccountName?.trim() || null,
      bank_account_number: values.bankAccountNumber?.replace(/\s/g, '') || null,
      bank_ifsc: values.bankIfsc?.trim().toUpperCase() || null,
      whatsapp_number: values.whatsappNumber?.replace(/\D/g, '') || null,
      bill_footer_note: values.billFooterNote?.trim() || null,
    },
    { signal },
  );
  return data;
};

/** API snake_case -> form camelCase, with '' for absent values. */
export const toBusinessFormValues = (profile) => ({
  businessName: profile?.business_name ?? '',
  businessAddress: profile?.business_address ?? '',
  businessEmail: profile?.business_email ?? '',
  businessPhone: profile?.business_phone ?? '',
  businessAltPhone: profile?.business_alt_phone ?? '',
  registrationNumber: profile?.registration_number ?? '',
  gstin: profile?.gstin ?? '',
  upiId: profile?.upi_id ?? '',
  bankAccountName: profile?.bank_account_name ?? '',
  bankAccountNumber: profile?.bank_account_number ?? '',
  bankIfsc: profile?.bank_ifsc ?? '',
  whatsappNumber: profile?.whatsapp_number ?? '',
  billFooterNote: profile?.bill_footer_note ?? '',
});
