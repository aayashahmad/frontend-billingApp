import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { COLORS, FONT_SIZES } from '../constants/theme';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import NewBillScreen from '../screens/NewBillScreen';
import SearchScreen from '../screens/SearchScreen';

const Tab = createBottomTabNavigator();
const NewBillStack = createNativeStackNavigator();
const CustomersStack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '700' },
};

const NewBillNavigator = () => (
  <NewBillStack.Navigator screenOptions={stackScreenOptions}>
    <NewBillStack.Screen
      name="NewBill"
      component={NewBillScreen}
      options={{ title: 'New Bill' }}
    />
    <NewBillStack.Screen
      name="CustomerDetail"
      component={CustomerDetailScreen}
      options={{ title: 'Customer' }}
    />
  </NewBillStack.Navigator>
);

const CustomersNavigator = () => (
  <CustomersStack.Navigator screenOptions={stackScreenOptions}>
    <CustomersStack.Screen
      name="SearchCustomers"
      component={SearchScreen}
      options={{ title: 'Customers' }}
    />
    <CustomersStack.Screen
      name="CustomerDetail"
      component={CustomerDetailScreen}
      options={{ title: 'Customer' }}
    />
  </CustomersStack.Navigator>
);

const tabIcon = (glyph) =>
  function TabIcon({ color }) {
    return <Text style={[styles.tabIcon, { color }]}>{glyph}</Text>;
  };

const AppNavigator = () => (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: { backgroundColor: COLORS.card },
      }}
    >
      <Tab.Screen
        name="NewBillTab"
        component={NewBillNavigator}
        options={{ title: 'New Bill', tabBarIcon: tabIcon('🧾') }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersNavigator}
        options={{ title: 'Customers', tabBarIcon: tabIcon('🔍') }}
      />
    </Tab.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  tabIcon: { fontSize: FONT_SIZES.lg },
});

export default AppNavigator;
