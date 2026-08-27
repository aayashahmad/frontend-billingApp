/* eslint-env jest */

// expo-image-picker touches native modules that do not exist under Jest.
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: true,
    assets: null,
  })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
}));

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://test.local:8000';
