import {
  DrawerToggleButton,
  createDrawerNavigator,
} from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import StateView from '../components/StateView';
import { COLORS, FONT_SIZES } from '../constants/theme';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import MyCustomersScreen from '../screens/MyCustomersScreen';
import NewBillScreen from '../screens/NewBillScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import SignupScreen from '../screens/SignupScreen';
import { useAuth } from '../store/AuthContext';
import { useProfile } from '../store/ProfileContext';
import DrawerContent from './DrawerContent';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const NewBillStack = createNativeStackNavigator();
const CustomersStack = createNativeStackNavigator();
const MyCustomersStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const BusinessStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '700' },
};

/**
 * Hamburger for a stack's root screen. The drawer's own header is disabled so
 * the stack header is the only one — this puts the toggle back on it.
 */
const drawerToggle = () => <DrawerToggleButton tintColor={COLORS.white} />;

const rootScreenOptions = (title) => ({
  title,
  headerLeft: drawerToggle,
});

const glyph = (character) =>
  function NavIcon({ color }) {
    return <Text style={[styles.icon, { color }]}>{character}</Text>;
  };

const NewBillNavigator = () => (
  <NewBillStack.Navigator screenOptions={stackScreenOptions}>
    <NewBillStack.Screen
      name="NewBill"
      component={NewBillScreen}
      options={rootScreenOptions('New Bill')}
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
      options={rootScreenOptions('Search')}
    />
    <CustomersStack.Screen
      name="CustomerDetail"
      component={CustomerDetailScreen}
      options={{ title: 'Customer' }}
    />
  </CustomersStack.Navigator>
);

const MyCustomersNavigator = () => (
  <MyCustomersStack.Navigator screenOptions={stackScreenOptions}>
    <MyCustomersStack.Screen
      name="MyCustomers"
      component={MyCustomersScreen}
      options={rootScreenOptions('My Customers')}
    />
    <MyCustomersStack.Screen
      name="CustomerDetail"
      component={CustomerDetailScreen}
      options={{ title: 'Customer' }}
    />
  </MyCustomersStack.Navigator>
);

const BusinessNavigator = () => (
  <BusinessStack.Navigator screenOptions={stackScreenOptions}>
    <BusinessStack.Screen
      name="BusinessProfile"
      component={BusinessProfileScreen}
      options={rootScreenOptions('Bill Details')}
    />
  </BusinessStack.Navigator>
);

const OnboardingBusinessScreen = () => <BusinessProfileScreen onboarding />;

/**
 * Shown instead of the app until a new owner saves their bill details.
 * No drawer and no back affordance — this is the only route available.
 */
const OnboardingNavigator = () => (
  <OnboardingStack.Navigator screenOptions={stackScreenOptions}>
    <OnboardingStack.Screen
      name="OnboardingBusiness"
      component={OnboardingBusinessScreen}
      options={{ title: 'Welcome' }}
    />
  </OnboardingStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={stackScreenOptions}>
    <ProfileStack.Screen
      name="ProfileDetails"
      component={ProfileScreen}
      options={rootScreenOptions('My Profile')}
    />
  </ProfileStack.Navigator>
);

const MainTabs = () => (
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
      options={{ title: 'New Bill', tabBarIcon: glyph('🧾') }}
    />
    <Tab.Screen
      name="CustomersTab"
      component={CustomersNavigator}
      options={{ title: 'Search', tabBarIcon: glyph('🔍') }}
    />
  </Tab.Navigator>
);

/**
 * The drawer wraps everything, so the hamburger is reachable from any root
 * screen. Its own header is off — each stack renders its own.
 */
const MainDrawer = () => (
  <Drawer.Navigator
    drawerContent={DrawerContent}
    screenOptions={{
      headerShown: false,
      drawerActiveTintColor: COLORS.primary,
      drawerInactiveTintColor: COLORS.textLight,
    }}
  >
    <Drawer.Screen
      name="Billing"
      component={MainTabs}
      options={{ title: 'Billing', drawerIcon: glyph('🧾') }}
    />
    <Drawer.Screen
      name="MyCustomersRoot"
      component={MyCustomersNavigator}
      options={{ title: 'My Customers', drawerIcon: glyph('👥') }}
    />
    <Drawer.Screen
      name="BusinessProfileRoot"
      component={BusinessNavigator}
      options={{ title: 'Bill Details', drawerIcon: glyph('🧑‍💼') }}
    />
    <Drawer.Screen
      name="Profile"
      component={ProfileNavigator}
      options={{ title: 'My Profile', drawerIcon: glyph('👤') }}
    />
  </Drawer.Navigator>
);

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

/** Picks the tree for the current session state. */
const RootRoute = () => {
  const { isAuthenticated, logout } = useAuth();
  const { profileLoaded, needsOnboarding, error, refresh } = useProfile();

  if (!isAuthenticated) return <AuthNavigator />;

  // The profile decides between onboarding and the app, so it has to load
  // before either can render. If it *fails*, offer a way out — otherwise an
  // unreachable server leaves the user stuck on a spinner forever.
  if (!profileLoaded) {
    if (error) {
      return (
        <View style={styles.splash}>
          <StateView
            variant="error"
            title="Cannot reach the server"
            message={`${error}\n\nCheck that the backend is running and that the app is pointed at the right address.`}
            onRetry={refresh}
          />
          <Button
            title="Sign out"
            variant="secondary"
            onPress={logout}
            style={styles.escape}
          />
        </View>
      );
    }
    return <StateView variant="loading" style={styles.splash} />;
  }

  return needsOnboarding ? <OnboardingNavigator /> : <MainDrawer />;
};

const AppNavigator = () => {
  const { restoring } = useAuth();

  // Hold on a splash until the keychain read settles, otherwise a returning
  // user sees the login screen flash before their session is restored.
  if (restoring) {
    return <StateView variant="loading" style={styles.splash} />;
  }

  return (
    <NavigationContainer>
      <RootRoute />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  icon: { fontSize: FONT_SIZES.lg },
  splash: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' },
  escape: { marginHorizontal: 24, marginBottom: 24 },
});

export default AppNavigator;
