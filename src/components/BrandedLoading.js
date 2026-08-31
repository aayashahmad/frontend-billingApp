import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../constants/theme';

const logo = require('../../assets/logo-mark.png');

/**
 * Startup loading state, styled as a continuation of the splash.
 *
 * The bare spinner this replaces sat on the light app background, so a cold
 * start jumped from the dark splash to a light spinner and back — three
 * different screens before the app appeared. Holding the same dark, branded
 * frame makes the wait read as one launch.
 */
const BrandedLoading = ({ message, style }) => (
  <View style={[styles.container, style]}>
    <Image source={logo} style={styles.logo} resizeMode="contain" />
    <ActivityIndicator
      size="small"
      color={COLORS.primary}
      style={styles.spinner}
    />
    {!!message && <Text style={styles.message}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Matches the splash's mark so the launch reads as one screen.
  logo: { width: 88, height: 88 },
  spinner: { marginTop: 28 },
  message: {
    marginTop: 14,
    fontSize: 13,
    color: '#94A3B8',
  },
});

export default BrandedLoading;
