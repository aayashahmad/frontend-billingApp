import api from './api';

/**
 * Payment reminders.
 *
 * The overdue list is computed on the server, not here: the daily job that
 * sends the emails uses the same rules, and two answers to "who is overdue"
 * is how a shopkeeper stops trusting the screen.
 */

/** Everyone past their reminder thresholds, longest-overdue first. */
export const getDueCustomers = async ({ signal } = {}) => {
  const { data } = await api.get('/reminders/due', { signal });
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? null,
    outstanding: Number(row.outstanding ?? 0),
    daysOverdue: Number(row.days_overdue ?? 0),
    lastRemindedAt: row.last_reminded_at ?? null,
  }));
};

export const getReminderSettings = async ({ signal } = {}) => {
  const { data } = await api.get('/reminders/settings', { signal });
  return {
    enabled: Boolean(data?.reminders_enabled),
    minAmount: Number(data?.reminder_min_amount ?? 0),
    afterDays: Number(data?.reminder_after_days ?? 0),
    pushRegistered: Boolean(data?.push_registered),
  };
};

export const updateReminderSettings = async (values, { signal } = {}) => {
  const body = {};
  if (values.enabled !== undefined) body.reminders_enabled = values.enabled;
  if (values.minAmount !== undefined) {
    body.reminder_min_amount = Number(values.minAmount);
  }
  if (values.afterDays !== undefined) {
    body.reminder_after_days = Number(values.afterDays);
  }

  const { data } = await api.put('/reminders/settings', body, { signal });
  return {
    enabled: Boolean(data?.reminders_enabled),
    minAmount: Number(data?.reminder_min_amount ?? 0),
    afterDays: Number(data?.reminder_after_days ?? 0),
    pushRegistered: Boolean(data?.push_registered),
  };
};

/**
 * Per-customer overrides.
 *
 * Only the fields passed are sent. An absent field means "leave it alone",
 * which is not the same as null — null clears an override so the customer
 * falls back to the shop's setting, and collapsing the two would silently
 * reset thresholds the owner had set by hand.
 */
export const updateCustomerReminder = async (
  customerId,
  values,
  { signal } = {},
) => {
  const body = {};
  if ('email' in values) body.email = values.email?.trim().toLowerCase() || null;
  if ('enabled' in values) body.reminder_enabled = values.enabled;
  if ('minAmount' in values) {
    body.reminder_min_amount =
      values.minAmount === null ? null : Number(values.minAmount);
  }
  if ('afterDays' in values) {
    body.reminder_after_days =
      values.afterDays === null ? null : Number(values.afterDays);
  }

  const { data } = await api.put(`/reminders/customers/${customerId}`, body, {
    signal,
  });
  return data;
};

/** Where this shop wants its daily summary delivered. */
export const registerPushToken = async (token, { signal } = {}) => {
  const { data } = await api.put('/reminders/push-token', { token }, { signal });
  return Boolean(data?.registered);
};
