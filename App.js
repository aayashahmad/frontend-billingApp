import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { BillingProvider } from './src/store/BillingContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <BillingProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </BillingProvider>
    </SafeAreaProvider>
  );
}
