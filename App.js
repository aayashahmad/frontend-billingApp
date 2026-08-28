import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
// Must be imported before any navigator that uses gestures (the drawer).
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnimatedSplash from './src/components/AnimatedSplash';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/store/AuthContext';
import { BillingProvider } from './src/store/BillingContext';
import { ProfileProvider } from './src/store/ProfileContext';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <BillingProvider>
              <StatusBar style="light" />
              {splashDone ? (
                <AppNavigator />
              ) : (
                <AnimatedSplash onFinish={() => setSplashDone(true)} />
              )}
            </BillingProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
