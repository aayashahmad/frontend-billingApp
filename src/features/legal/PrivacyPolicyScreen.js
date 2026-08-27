import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
  PRIVACY_POLICY_URL,
} from './privacyPolicyContent';

const Bullet = ({ children }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

const PrivacyPolicyScreen = () => (
  <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
    <Text style={styles.updated}>Last updated {PRIVACY_LAST_UPDATED}</Text>

    {PRIVACY_SECTIONS.map((section) => (
      <Card key={section.title} style={styles.section}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {!!section.body && <Text style={styles.body}>{section.body}</Text>}
        {section.bullets?.map((line) => (
          <Bullet key={line}>{line}</Bullet>
        ))}
      </Card>
    ))}

    <Text
      style={styles.link}
      accessibilityRole="link"
      onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
    >
      Read the full policy online
      <Ionicons name="open-outline" size={13} color={COLORS.primary} />
    </Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  updated: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  section: { marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  body: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', marginTop: SPACING.xs },
  bulletDot: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    marginRight: SPACING.sm,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  link: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});

export default PrivacyPolicyScreen;
