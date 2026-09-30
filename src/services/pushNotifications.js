import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken } from './reminderService';

/**
 * The shop owner's own notifications — the daily "who needs chasing".
 *
 * Nothing here ever reaches a customer. It is the shop's own phone being
 * told what the server found overnight.
 *
 * Every function swallows its failures: a notification that could not be set
 * up must never stop the app loading. A shop with notifications denied still
 * gets the emails and the list; it just has to open the app to see them.
 */

/**
 * Notifications are a native module, so a JS bundle that expects them can
 * reach a build that does not have them — an over-the-air update, or a
 * developer on yesterday's APK. Every entry point here degrades to "no
 * push" rather than taking the whole app down at import time, because a
 * shopkeeper losing billing over an undelivered reminder is the worse
 * failure by a distance.
 */
const available = () => {
  try {
    return typeof Notifications?.getExpoPushTokenAsync === 'function';
  } catch {
    return false;
  }
};

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // No native module in this build. registerForPushNotifications() returns
  // null below, and nothing else in the app depends on this.
}

/**
 * Android needs a channel before anything can be delivered, and one created
 * after the first notification arrives is too late for that notification.
 */
const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Payment reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
};

/**
 * Asks for permission if it has not been decided, and tells the server where
 * to send this shop's summary.
 *
 * Returns the token, or null when notifications are unavailable — denied,
 * on a simulator, or on a build without a project id. Callers should treat
 * null as "no push", not as an error worth showing.
 */
export const registerForPushNotifications = async () => {
  if (!available()) return null;

  try {
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    // Only ask when the answer is not already known: re-asking after a
    // refusal does nothing on iOS and is nagging on Android.
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token) return null;

    await registerPushToken(token);
    return token;
  } catch {
    // A physical-device requirement, a missing project id, or no network.
    // None of them is worth interrupting the owner over.
    return null;
  }
};

/** Stops the daily summary reaching a phone somebody has signed out of. */
export const unregisterPushNotifications = async () => {
  try {
    await registerPushToken(null);
  } catch {
    // Signing out must succeed whether or not the server was reachable.
  }
};

/**
 * Runs `handler` when the owner taps a reminder notification, so the app can
 * open the list they were told about. Returns an unsubscribe function.
 */
export const onNotificationTapped = (handler) => {
  if (!available()) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response?.notification?.request?.content?.data;
      handler(data ?? {});
    },
  );
  return () => subscription.remove();
};
