import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '../constants/theme';

// Use the generated logo asset.
const logo = require('../../assets/logo.png');

/**
 * Full-screen animated splash shown once on cold start.
 *
 * Animation sequence (all use the built-in Animated API so there are no
 * extra native-module requirements):
 *
 *  0ms – 600ms   Logo scales up from 0 → 1 with a spring overshoot.
 *  400ms – 800ms App title fades in and slides up.
 *  700ms – 1100ms Tagline fades in and slides up.
 *  After 2.2s     Entire screen fades out, then `onFinish` is called.
 */
const AnimatedSplash = ({ onFinish }) => {
  // ── Animated values ──────────────────────────────────────────────────
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Pulsing glow behind the logo (loops until the splash fades out).
  const pulseScale = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Looping pulse (background glow ring).
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.35,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        // Reset.
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();

    // Main entrance sequence.
    Animated.sequence([
      // 1) Logo pops in with spring + slight rotation.
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.3)),
          useNativeDriver: true,
        }),
      ]),

      // Small pause so the logo settles.
      Animated.delay(100),

      // 2) Title slides up.
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // 3) Tagline slides up.
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // 4) Hold for a beat …
      Animated.delay(800),

      // 5) Fade out the whole splash.
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      pulse.stop();
      onFinish?.();
    });
  }, []);

  const spin = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Gradient-ish background built from layered Views */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      {/* Pulsing glow ring */}
      <Animated.View
        style={[
          styles.pulse,
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoBox,
          { transform: [{ scale: logoScale }, { rotate: spin }] },
        ]}
      >
        <Image source={logo} style={styles.logo} />
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        Billing
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          },
        ]}
      >
        Smart invoicing for your business
      </Animated.Text>

      {/* Subtle footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>by Aayash Ahmad</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
  },
  pulse: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primary,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    marginTop: 28,
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
  },
  footerText: {
    fontSize: 12,
    color: '#475569',
  },
});

export default AnimatedSplash;
