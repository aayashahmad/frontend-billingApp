import { Ionicons } from '@expo/vector-icons';
import {
  DrawerToggleButton,
  createDrawerNavigator,
} from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import BrandedLoading from '../components/BrandedLoading';
import Button from '../components/Button';
import StateView from '../components/StateView';
import { COLORS, FONT_SIZES } from '../constants/theme';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import MyCustomersScreen from '../screens/MyCustomersScreen';
import NewBillScreen from '../screens/NewBillScreen';
import PrinterScreen from '../screens/PrinterScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import ProductsScreen from '../screens/ProductsScreen';
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
const PrinterStack = createNativeStackNavigator();
const ProductsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const BusinessStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const LegalStack = createNativeStackNavigator();

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

/**
 * Vector icons rather than emoji: emoji render in their own colours, ignore
 * the active/inactive tint, and vary by platform and OS version.
 */
const icon = (name) =>
  function NavIcon({ color, size = 22 }) {
    return <Ionicons name={name} size={size} color={color} />;
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

const ProductsNavigator = () => (
  <ProductsStack.Navigator screenOptions={stackScreenOptions}>
    <ProductsStack.Screen
      name="Products"
      component={ProductsScreen}
      options={rootScreenOptions('Products')}
    />
  </ProductsStack.Navigator>
);

const PrinterNavigator = () => (
  <PrinterStack.Navigator screenOptions={stackScreenOptions}>
    <PrinterStack.Screen
      name="Printer"
      component={PrinterScreen}
      options={rootScreenOptions('Printer')}
    />
  </PrinterStack.Navigator>
);

const LegalNavigator = () => (
  <LegalStack.Navigator screenOptions={stackScreenOptions}>
    <LegalStack.Screen
      name="PrivacyPolicy"
      component={PrivacyPolicyScreen}
      options={rootScreenOptions('Privacy Policy')}
    />
  </LegalStack.Navigator>
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

/**
 * Drawer destinations live in here too, as tabs without a button, so the tab
 * bar stays on screen wherever the user is — previously My Customers, Bill
 * Details, My Profile and Privacy Policy sat outside the tab navigator and
 * lost the bottom navigation entirely.
 */
const hiddenTab = { tabBarItemStyle: { display: 'none' }, tabBarButton: () => null };

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
      options={{ title: 'New Bill', tabBarIcon: icon('receipt-outline') }}
    />
    <Tab.Screen
      name="CustomersTab"
      component={CustomersNavigator}
      options={{ title: 'Search', tabBarIcon: icon('search-outline') }}
    />
    <Tab.Screen
      name="MyCustomersRoot"
      component={MyCustomersNavigator}
      options={{ title: 'My Customers', ...hiddenTab }}
    />
    <Tab.Screen
      name="BusinessProfileRoot"
      component={BusinessNavigator}
      options={{ title: 'Bill Details', ...hiddenTab }}
    />
    <Tab.Screen
      name="ProductsRoot"
      component={ProductsNavigator}
      options={{ title: 'Products', ...hiddenTab }}
    />
    <Tab.Screen
      name="PrinterRoot"
      component={PrinterNavigator}
      options={{ title: 'Printer', ...hiddenTab }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileNavigator}
      options={{ title: 'My Profile', ...hiddenTab }}
    />
    <Tab.Screen
      name="PrivacyPolicyRoot"
      component={LegalNavigator}
      options={{ title: 'Privacy Policy', ...hiddenTab }}
    />
  </Tab.Navigator>
);

/**
 * The drawer wraps the tab tree, so the hamburger is reachable from any root
 * screen. Its own header is off — each stack renders its own. Every
 * destination is a tab route now, so DrawerContent lists them explicitly
 * rather than through DrawerItemList.
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
    <Drawer.Screen name="Billing" component={MainTabs} />
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
    return <BrandedLoading message="Getting your shop ready…" />;
  }

  return needsOnboarding ? <OnboardingNavigator /> : <MainDrawer />;
};

const AppNavigator = () => {
  const { restoring } = useAuth();

  // Belt and braces: App.js already holds the splash until the keychain read
  // settles, so this only matters if that gate is ever bypassed.
  if (restoring) {
    return <BrandedLoading />;
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
