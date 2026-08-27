import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

  const openProfile = () => props.navigation.navigate('Profile');

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(profile?.username)}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {profile?.username || 'Shop owner'}
          </Text>
          {!!profile?.email && (
            <Text style={styles.meta} numberOfLines={1}>
              {profile.email}
            </Text>
          )}
          {!!profile?.phone && (
            <Text style={styles.meta} numberOfLines={1}>
              {profile.phone}
            </Text>
          )}
          <Text style={styles.viewProfile}>View profile</Text>
        </Pressable>

        <View style={styles.items}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      <Pressable
        onPress={logout}
        accessibilityRole="button"
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 0 },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    paddingTop: SPACING.xl + SPACING.md,
    marginBottom: SPACING.sm,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  name: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  meta: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  viewProfile: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    marginTop: SPACING.sm,
    textDecorationLine: 'underline',
  },
  items: { paddingTop: SPACING.xs },
  signOut: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});

export default DrawerContent;
