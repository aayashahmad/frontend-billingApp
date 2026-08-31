import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../constants/theme';

// Use the generated logo asset.
const logo = require('../../assets/logo.png');

/**
 * Full-screen splash shown once on cold start.
 *
 * Deliberately restrained — one flat background, one gentle fade-and-settle
 * for the mark, then the wordmark. Built on the standard Animated API so
 * there is no extra native-module requirement.
 *
 *  0ms – 500ms    Logo fades in and settles from 92% to full size.
 *  360ms – 700ms  Wordmark and tagline fade in and rise.
 *  1200ms         Whole screen fades out, then `onFinish` is called.
 */
const AnimatedSplash = ({ onFinish }) => {
  // The splash is absolutely positioned, so it cannot inherit a height from
  // its parent — measure the window instead. Without this it collapses to
  // whatever the provider tree happens to lay out.
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1) The mark settles into place.
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 2) Wordmark and tagline follow as one block.
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 3) Hold briefly, then hand over to the app.
      Animated.delay(450),

      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onFinish?.());
  }, []);

  return (
    <Animated.View
      style={[styles.container, { width, height, opacity: screenOpacity }]}
    >
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoBox,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Text style={styles.title}>Billing</Text>
          <View style={styles.rule} />
          <Text style={styles.tagline}>Smart invoicing for your business</Text>
        </Animated.View>
      </View>

      <Animated.Text
        style={[
          styles.footerText,
          { opacity: textOpacity, bottom: insets.bottom + 24 },
        ]}
      >
        by Aayash Ahmad
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#0F172A',
    zIndex: 999,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 28,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  rule: {
    alignSelf: 'center',
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
    marginVertical: 14,
  },
  tagline: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  footerText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: '#475569',
  },
});

export default AnimatedSplash;
