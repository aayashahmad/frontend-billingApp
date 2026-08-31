import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
// Must be imported before any navigator that uses gestures (the drawer).
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnimatedSplash from './src/components/AnimatedSplash';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { BillingProvider } from './src/store/BillingContext';
import { ProfileProvider } from './src/store/ProfileContext';

// Hold the native splash until React has painted its own, so the handover is
// one continuous dark screen instead of a flash of empty window between them.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unavailable — never a reason to fail startup.
});

/**
 * Decides when the app is ready to be shown.
 *
 * The splash stays up until its animation has finished *and* the stored
 * session has been read back. Releasing on the animation alone dropped the
 * user onto a bare spinner while the keychain read finished — a light screen
 * between two dark ones.
 */
const Shell = () => {
  const { restoring } = useAuth();
  const [animationDone, setAnimationDone] = useState(false);

  // Hand the native splash over to ours only once ours is on screen.
  const handleSplashLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!animationDone || restoring) {
    return (
      <AnimatedSplash
        onLayout={handleSplashLayout}
        onFinish={() => setAnimationDone(true)}
      />
    );
  }

  return <AppNavigator />;
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <BillingProvider>
              <StatusBar style="light" />
              <Shell />
            </BillingProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
});
