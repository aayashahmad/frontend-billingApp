
import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import { useAuth } from '../store/AuthContext';
import { useProfile } from '../store/ProfileContext';


/**
 * Drawer destinations, in order. Each one is a route on the tab navigator
 * nested under the drawer's single `Billing` screen — that nesting is what
 * keeps the bottom tab bar on screen everywhere.
 */
const DRAWER_ITEMS = [
  { route: 'NewBillTab', label: 'Billing', icon: 'receipt-outline' },
  { route: 'MyCustomersRoot', label: 'My Customers', icon: 'people-outline' },
  { route: 'ProductsRoot', label: 'Products', icon: 'pricetags-outline' },
  {
    route: 'BusinessProfileRoot',
    label: 'Bill Details',
    icon: 'document-text-outline',
  },
  { route: 'PrinterRoot', label: 'Printer', icon: 'print-outline' },
  { route: 'Profile', label: 'My Profile', icon: 'person-circle-outline' },
  {
    route: 'PrivacyPolicyRoot',
    label: 'Privacy Policy',
    icon: 'shield-checkmark-outline',
  },
];

/** Name of the tab route currently showing, for the active highlight. */
const activeTabRoute = (state) => {
  const nested = state?.routes?.[state.index]?.state;
  if (!nested?.routes?.length) return DRAWER_ITEMS[0].route;
  return nested.routes[nested.index ?? 0]?.name ?? DRAWER_ITEMS[0].route;
};

const initialsOf = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * One destination.
 *
 * The icon sits in its own tile rather than loose beside the label: it gives
 * the row a consistent left edge whatever the icon's width, and gives the
 * active state something to fill besides the text.
 */
const DrawerRow = ({ item, active, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    style={({ pressed }) => [
      styles.row,
      active && styles.rowActive,
      pressed && styles.pressed,
    ]}
  >
    <View style={[styles.rowIcon, active && styles.rowIconActive]}>
      <Ionicons
        name={item.icon}
        size={19}
        color={active ? COLORS.white : COLORS.textLight}
      />
    </View>
    <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
      {item.label}
    </Text>
    {active && (
      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
    )}
  </Pressable>
);

/** Drawer panel: signed-in owner's details above the navigation items. */
const DrawerContent = (props) => {
  const { profile } = useProfile();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const active = activeTabRoute(props.state);

  const go = (route) => {
    props.navigation.navigate('Billing', { screen: route });
    props.navigation.closeDrawer();
  };

  const shopName = profile?.business_name || profile?.username || 'Shop owner';
  const contact = profile?.phone || profile?.email;

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        {/* Padding comes from the live inset rather than a guessed constant,
            so the avatar clears the notch on every device. */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.lg }]}>
          {/* A lighter panel behind the lower half, the same trick the splash
              uses, so the block has depth without a gradient library. */}
          <View style={styles.headerGlow} pointerEvents="none" />

          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(shopName)}</Text>
            </View>

            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {shopName}
              </Text>
              {/* The signed-in person, below the shop they are signing in
                  for — the two are usually different and both matter. */}
              {!!profile?.username && !!profile?.business_name && (
                <Text style={styles.meta} numberOfLines={1}>
                  {profile.username}
                </Text>
              )}
              {!!contact && (
                <Text style={styles.meta} numberOfLines={1}>
                  {contact}
                </Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => go('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={({ pressed }) => [
              styles.profileLink,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="person-circle-outline" size={16} color={COLORS.white} />
            <Text style={styles.profileLinkText}>View profile</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Menu</Text>

        <View style={styles.items}>
          {DRAWER_ITEMS.map((item) => (
            <DrawerRow
              key={item.route}
              item={item}
              active={active === item.route}
              onPress={() => go(item.route)}
            />
          ))}
        </View>
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Pressable
          onPress={logout}
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={19} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.version}>Billing · v1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  scroll: { paddingTop: 0 },
  pressed: { opacity: 0.7 },

  // ── Header ─────────────────────────────────────────────────────────
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: COLORS.primaryDark,
    borderTopLeftRadius: 40,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    // A translucent ring lifts the avatar off the blue without a hard border.
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  identityText: { flex: 1, marginLeft: SPACING.md },
  name: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  meta: { color: COLORS.primaryLight, fontSize: FONT_SIZES.xs, marginTop: 3 },
  // A filled pill reads as a control; bare text with a chevron looked like a
  // caption nobody would think to tap.
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  profileLinkText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    marginHorizontal: SPACING.xs,
  },

  // ── Items ──────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    marginHorizontal: SPACING.md,
  },
  items: { paddingHorizontal: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: 2,
  },
  rowActive: { backgroundColor: COLORS.primaryLight },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  rowIconActive: { backgroundColor: COLORS.primary },
  rowLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowLabelActive: { color: COLORS.primaryDark, fontWeight: '700' },

  // ── Footer ─────────────────────────────────────────────────────────
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  version: {
    textAlign: 'center',
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
});

export default DrawerContent;
