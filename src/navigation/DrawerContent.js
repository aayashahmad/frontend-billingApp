import { Ionicons } from '@expo/vector-icons';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, SPACING } from '../constants/theme';
import { useAuth } from '../store/AuthContext';
import { useProfile } from '../store/ProfileContext';

const initialsOf = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/** Drawer panel: signed-in owner's details above the navigation items. */
const DrawerContent = (props) => {
  const { profile } = useProfile();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const openProfile = () => props.navigation.navigate('Profile');

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        {/* Padding comes from the live inset rather than a guessed constant,
            so the avatar clears the notch on every device. */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
          <Pressable
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.identityRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {initialsOf(profile?.business_name || profile?.username)}
                </Text>
              </View>
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile?.business_name || profile?.username || 'Shop owner'}
                </Text>
                {!!profile?.email && (
                  <Text style={styles.meta} numberOfLines={1}>
                    {profile.email}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.viewProfileRow}>
              <Text style={styles.viewProfile}>View profile</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={COLORS.white}
                style={styles.chevron}
              />
            </View>
          </Pressable>
        </View>

        <View style={styles.items}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      <Pressable
        onPress={logout}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.signOut,
          { paddingBottom: insets.bottom + SPACING.md },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.card },
  scroll: { paddingTop: 0 },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.sm,
  },
  pressed: { opacity: 0.85 },
  identityRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  identityText: { flex: 1, marginLeft: SPACING.sm },
  name: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  meta: { color: COLORS.primaryLight, fontSize: FONT_SIZES.xs, marginTop: 2 },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  viewProfile: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  chevron: { marginLeft: 2 },
  items: { paddingTop: SPACING.xs },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
});

export default DrawerContent;
