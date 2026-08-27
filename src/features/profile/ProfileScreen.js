import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { useProfile } from '../../store/ProfileContext';
import { formatDateTime } from '../../utils/date';

const DetailRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={2}>
      {value || '—'}
    </Text>
  </View>
);

const initialsOf = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const ProfileScreen = () => {
  const { profile, loading, error, refresh } = useProfile();
  const { logout } = useAuth();

  if (loading && !profile) {
    return <StateView variant="loading" style={styles.fill} />;
  }

  if (error && !profile) {
    return (
      <StateView
        variant="error"
        title="Could not load your profile"
        message={error}
        onRetry={refresh}
        style={styles.fill}
      />
    );
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
      <Card style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(profile?.username)}</Text>
        </View>
        <Text style={styles.name}>{profile?.username || 'Shop owner'}</Text>
        {!!profile?.email && <Text style={styles.email}>{profile.email}</Text>}
      </Card>

      <Text style={styles.sectionTitle}>Account details</Text>
      <Card>
        <DetailRow label="Name" value={profile?.username} />
        <DetailRow label="Email" value={profile?.email} />
        <DetailRow label="Phone" value={profile?.phone} />
        <DetailRow
          label="Member since"
          value={formatDateTime(profile?.created_at)}
        />
        <DetailRow
          label="Account ID"
          value={profile?.id ? `#${profile.id}` : null}
        />
      </Card>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Sign out"
        variant="danger"
        onPress={logout}
        style={styles.signOut}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  identityCard: { alignItems: 'center', paddingVertical: SPACING.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  name: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text },
  email: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textLight },
  rowValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  signOut: { marginTop: SPACING.xl },
});

export default ProfileScreen;
