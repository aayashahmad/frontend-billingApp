import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'billing.auth.token';
const USERNAME_KEY = 'billing.auth.username';

/**
 * SecureStore is unavailable on web and can throw on a locked keychain —
 * every accessor degrades to "no stored session" rather than crashing the
 * app on launch.
 */
const safeGet = async (key) => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

const safeSet = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // A session that cannot be persisted still works for this app run.
  }
};

const safeDelete = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Nothing to clean up.
  }
};

export const loadSession = async () => {
  const [token, username] = await Promise.all([
    safeGet(TOKEN_KEY),
    safeGet(USERNAME_KEY),
  ]);
  return token ? { token, username } : null;
};

export const saveSession = async ({ token, username }) => {
  await Promise.all([
    safeSet(TOKEN_KEY, token),
    safeSet(USERNAME_KEY, username ?? ''),
  ]);
};

export const clearSession = async () => {
  await Promise.all([safeDelete(TOKEN_KEY), safeDelete(USERNAME_KEY)]);
};
