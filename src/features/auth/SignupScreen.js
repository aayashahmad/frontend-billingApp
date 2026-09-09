import { Formik } from 'formik';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import Input from '../../components/Input';
import { PHONE_MAX_LENGTH } from '../../constants/paymentTypes';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import {
  confirmEmailVerification,
  requestEmailVerification,
} from '../../services/authService';
import { useAuth } from '../../store/AuthContext';
import AuthScreenLayout from './AuthScreenLayout';
import {
  INITIAL_SIGNUP_VALUES,
  RESET_CODE_LENGTH,
  signupValidationSchema,
} from './authValidationSchemas';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Seconds before "Resend" becomes available, matching the server's limit. */
const RESEND_SECONDS = 60;

/**
 * Create-account screen.
 *
 * The email address is proved before the account is made, because it is the
 * only way back in after a forgotten password — a typo taken on trust locks
 * the owner out of their own books with nobody able to help them. So the
 * "Create account" button stays shut until a code from that inbox is typed
 * back in.
 */
const SignupScreen = ({ navigation }) => {
  const { signup, submitting, error, clearError } = useAuth();

  // 'idle' → 'sent' → 'verified'. The address that was verified is kept so
  // that editing the email afterwards drops back to 'idle' rather than
  // letting one inbox vouch for a different address.
  const [stage, setStage] = useState('idle');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const countdown = useRef(null);

  // Leaving the screen mid-countdown must not leave a timer ticking against
  // an unmounted component.
  useEffect(() => () => clearInterval(countdown.current), []);

  const startCooldown = useCallback((seconds = RESEND_SECONDS) => {
    clearInterval(countdown.current);
    setSecondsLeft(Math.max(Math.ceil(seconds), 1));
    countdown.current = setInterval(() => {
      setSecondsLeft((left) => {
        if (left <= 1) {
          clearInterval(countdown.current);
          return 0;
        }
        return left - 1;
      });
    }, 1000);
  }, []);

  const sendCode = useCallback(
    async (email) => {
      const address = String(email || '').trim().toLowerCase();
      if (!EMAIL_PATTERN.test(address)) {
        setVerifyError('Enter your email address first.');
        return;
      }

      setBusy(true);
      setVerifyError(null);
      setNotice(null);
      try {
        const message = await requestEmailVerification(address);
        setStage('sent');
        setCode('');
        setNotice(message || `We sent a code to ${address}.`);
        startCooldown();
      } catch (err) {
        // The server refusing a second code inside its cooldown is not a
        // failure — the first code is already in the inbox. Blocking the
        // code box here left the owner with a code and nowhere to type it.
        if (err?.status === 429) {
          const wait = Number(/(\d+)\s*seconds?/.exec(err.message)?.[1]);
          setStage('sent');
          setNotice(`A code is already on its way to ${address}.`);
          startCooldown(Number.isFinite(wait) ? wait : RESEND_SECONDS);
          return;
        }
        setVerifyError(err?.message || 'Could not send the code. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [startCooldown],
  );

  const confirmCode = useCallback(
    async (email) => {
      const address = String(email || '').trim().toLowerCase();
      setBusy(true);
      setVerifyError(null);
      try {
        await confirmEmailVerification({ email: address, code });
        setVerifiedEmail(address);
        setStage('verified');
        setNotice(null);
        clearInterval(countdown.current);
      } catch (err) {
        setVerifyError(err?.message || 'That code did not match.');
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  /** Any edit to the address invalidates a proof made for a different one. */
  const handleEmailChange = useCallback(
    (text, setFieldValue) => {
      setFieldValue('email', text);
      if (text.trim().toLowerCase() !== verifiedEmail) {
        setStage('idle');
        setNotice(null);
        setVerifyError(null);
      } else {
        setStage('verified');
      }
    },
    [verifiedEmail],
  );

  const handleSubmit = useCallback(
    async (values) => {
      clearError();
      await signup(values);
    },
    [clearError, signup],
  );

  const goToLogin = useCallback(() => {
    clearError();
    navigation.navigate('Login');
  }, [clearError, navigation]);

  return (
    <AuthScreenLayout
      title="Create account"
      subtitle="Set up the shop account used to record bills."
      footerPrompt="Already registered?"
      footerAction="Sign in"
      onFooterPress={goToLogin}
    >
      <Formik
        initialValues={INITIAL_SIGNUP_VALUES}
        validationSchema={signupValidationSchema}
        onSubmit={handleSubmit}
        validateOnChange={false}
      >
        {({ values, errors, touched, handleBlur, setFieldValue, handleSubmit: submit }) => {
          const fieldError = (name) =>
            touched[name] && errors[name] ? errors[name] : undefined;

          const isVerified = stage === 'verified';
          const locked = submitting || busy;

          return (
            <>
              <Input
                label="Your name"
                placeholder="Shop owner name"
                value={values.username}
                onChangeText={(text) => setFieldValue('username', text)}
                onBlur={handleBlur('username')}
                autoCapitalize="words"
                error={fieldError('username')}
                editable={!locked}
              />

              <Input
                label="Email"
                placeholder="you@shop.com"
                value={values.email}
                onChangeText={(text) => handleEmailChange(text, setFieldValue)}
                onBlur={handleBlur('email')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={fieldError('email')}
                // Locked once proved, so the verified address is the one that
                // gets saved. Editing means starting the check again.
                editable={!locked && !isVerified}
                containerStyle={styles.emailField}
              />

              {isVerified ? (
                <View style={styles.verifiedRow}>
                  <Text style={styles.verifiedText}>✓ Email verified</Text>
                  <Pressable
                    onPress={() => {
                      setStage('idle');
                      setVerifiedEmail('');
                      setNotice(null);
                    }}
                    disabled={locked}
                  >
                    <Text style={styles.link}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <Button
                  title={stage === 'sent' ? 'Resend code' : 'Verify email'}
                  variant="secondary"
                  onPress={() => sendCode(values.email)}
                  loading={busy && stage === 'idle'}
                  disabled={locked || (stage === 'sent' && secondsLeft > 0)}
                  style={styles.verifyButton}
                />
              )}

              {stage === 'sent' && secondsLeft > 0 && (
                <Text style={styles.hint}>
                  You can ask for another code in {secondsLeft}s.
                </Text>
              )}

              {stage === 'sent' && !!notice && (
                <Text style={styles.notice}>{notice}</Text>
              )}

              {stage === 'sent' && (
                <View style={styles.codeBlock}>
                  <Input
                    label="Verification code"
                    placeholder={'0'.repeat(RESET_CODE_LENGTH)}
                    value={code}
                    onChangeText={(text) =>
                      setCode(text.replace(/\D/g, '').slice(0, RESET_CODE_LENGTH))
                    }
                    keyboardType="number-pad"
                    maxLength={RESET_CODE_LENGTH}
                    editable={!locked}
                    containerStyle={styles.codeField}
                  />
                  <Button
                    title="Confirm code"
                    onPress={() => confirmCode(values.email)}
                    loading={busy}
                    disabled={locked || code.length !== RESET_CODE_LENGTH}
                  />
                </View>
              )}

              {stage !== 'sent' && !!notice && (
                <Text style={styles.notice}>{notice}</Text>
              )}
              {!!verifyError && <Text style={styles.error}>{verifyError}</Text>}

              <Input
                label="Phone"
                placeholder="9876543210"
                value={values.phone}
                onChangeText={(text) =>
                  setFieldValue('phone', text.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH))
                }
                onBlur={handleBlur('phone')}
                keyboardType="number-pad"
                maxLength={PHONE_MAX_LENGTH}
                error={fieldError('phone')}
                editable={!locked}
              />

              <Input
                label="Password"
                placeholder="At least 6 characters"
                value={values.password}
                onChangeText={(text) => setFieldValue('password', text)}
                onBlur={handleBlur('password')}
                secureTextEntry
                autoCapitalize="none"
                error={fieldError('password')}
                editable={!locked}
              />

              <Input
                label="Confirm password"
                placeholder="Re-enter your password"
                value={values.confirmPassword}
                onChangeText={(text) => setFieldValue('confirmPassword', text)}
                onBlur={handleBlur('confirmPassword')}
                secureTextEntry
                autoCapitalize="none"
                error={fieldError('confirmPassword')}
                editable={!locked}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              {!isVerified && (
                <Text style={styles.hint}>
                  Verify your email address to finish creating the account.
                </Text>
              )}

              <Button
                title="Create account"
                onPress={submit}
                loading={submitting}
                disabled={locked || !isVerified}
                testID="signup-submit"
              />
            </>
          );
        }}
      </Formik>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  emailField: { marginBottom: SPACING.sm },
  verifyButton: { marginBottom: SPACING.md },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  verifiedText: {
    color: COLORS.success,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  link: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  codeBlock: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  codeField: { marginBottom: SPACING.sm },
  notice: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});

export default SignupScreen;
