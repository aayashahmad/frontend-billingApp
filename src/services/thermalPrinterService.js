import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Bluetooth Classic transport for ESC/POS printers.
 *
 * The native module is required lazily so the rest of the app — and the test
 * suite — still runs where it is unavailable, such as Expo Go or a build made
 * before this feature was added. Every accessor degrades to "no Bluetooth"
 * rather than crashing a screen.
 */
let cached;
const bluetooth = () => {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line global-require
    cached = require('react-native-bluetooth-classic').default ?? null;
  } catch {
    cached = null;
  }
  return cached;
};

export const isBluetoothAvailable = () => bluetooth() !== null;

export class PrinterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrinterError';
  }
}

/**
 * Android 12 split the old blanket Bluetooth permission into scan/connect,
 * while older versions gate discovery behind location instead. Asking for the
 * wrong set silently returns no devices.
 */
export const requestBluetoothPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  const required =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const granted = await PermissionsAndroid.requestMultiple(required);
  return required.every(
    (permission) => granted[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
};

const requireModule = () => {
  const module = bluetooth();
  if (!module) {
    throw new PrinterError(
      'Bluetooth printing is not available in this build. Rebuild the app to enable it.',
    );
  }
  return module;
};

export const isBluetoothEnabled = async () => {
  try {
    return await requireModule().isBluetoothEnabled();
  } catch {
    return false;
  }
};

/** Asks Android to turn Bluetooth on; returns whether it ended up enabled. */
export const enableBluetooth = async () => {
  const module = requireModule();
  try {
    await module.requestBluetoothEnabled();
  } catch {
    // The user declined the system prompt.
  }
  return module.isBluetoothEnabled();
};

/**
 * Printers already paired in Android settings.
 *
 * Pairing is deliberately left to the system dialog — it handles the PIN,
 * and a printer paired once stays paired.
 */
export const listPairedPrinters = async () => {
  const devices = await requireModule().getBondedDevices();
  return (devices ?? []).map((device) => ({
    address: device.address,
    name: device.name || device.address,
  }));
};

/** Devices in range that have not been paired yet. */
export const discoverPrinters = async () => {
  const devices = await requireModule().startDiscovery();
  return (devices ?? []).map((device) => ({
    address: device.address,
    name: device.name || device.address,
  }));
};

export const cancelDiscovery = async () => {
  try {
    await requireModule().cancelDiscovery();
  } catch {
    // Nothing was running.
  }
};

/**
 * Sends the encoded receipt to one printer.
 *
 * Connects, writes and disconnects each time rather than holding the socket
 * open: a thermal printer is shared with whatever else the shop uses, and a
 * held connection blocks it. The disconnect runs even when the write throws,
 * so a failed print never leaves the printer unusable.
 */
export const printBytes = async (address, base64Payload) => {
  const module = requireModule();

  let connected = false;
  try {
    connected = await module.connectToDevice(address, {
      // A printer is a serial port profile device; the delimiter-based
      // read modes do not apply and would stall the write.
      CONNECTOR_TYPE: 'rfcomm',
    });

    if (!connected) {
      throw new PrinterError(
        'Could not connect. Check the printer is on, in range and paired.',
      );
    }

    await module.writeToDevice(address, base64Payload, 'base64');
  } catch (error) {
    if (error instanceof PrinterError) throw error;
    throw new PrinterError(
      error?.message || 'Printing failed. Check the printer and try again.',
    );
  } finally {
    if (connected) {
      try {
        await module.disconnectFromDevice(address);
      } catch {
        // Already dropped by the printer.
      }
    }
  }
};
