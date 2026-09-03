import { Formik } from 'formik';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import Button from '../../components/Button';
import Input from '../../components/Input';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { requestPasswordReset, resetPassword } from '../../services/authService';
import { useAuth } from '../../store/AuthContext';
import AuthScreenLayout from './AuthScreenLayout';
import {
  INITIAL_FORGOT_VALUES,
  INITIAL_RESET_VALUES,
  RESET_CODE_LENGTH,
  forgotPasswordValidationSchema,
  resetPasswordValidationSchema,
} from './authValidationSchemas';

/**
 * Password recovery, in two steps on one screen.
 *
 * The owner starts from their phone number — the thing they know by heart —
 * but the code travels by email, because no SMS provider sends OTPs free of
 * charge worldwide. The account's email is already required and unique, so
 * every account can be recovered this way.
 */
const ForgotPasswordScreen = ({ navigation }) => {
  const { adoptSession } = useAuth();
  // 'request' asks for the number; 'verify' takes the code and new password.
  const [stage, setStage] = useState('request');
  const [phone, setPhone] = useState('');
  const [emailHint, setEmailHint] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const goToLogin = useCallback(() => navigation.navigate('Login'), [navigation]);

  const handleRequest = useCallback(async (values) => {
    setBusy(true);
    setError(null);
    try {
      const result = await requestPasswordReset(values.phone);
      setPhone(values.phone.trim());
      setEmailHint(result.emailHint);
      setStage('verify');
    } catch (err) {
      setError(err?.message || 'Could not start the reset. Please try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleReset = useCallback(
    async (values) => {
      setBusy(true);
      setError(null);
      try {
        const session = await resetPassword({
          phone,
          code: values.code,
          newPassword: values.password,
        });
        // Signing in here saves the owner retyping the password they have
        // just chosen twice.
        await adoptSession(session);
      } catch (err) {
        setError(err?.message || 'Could not reset the password.');
      } finally {
        setBusy(false);
      }
    },
    [adoptSession, phone],
  );

  const handleResend = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await requestPasswordReset(phone);
      setEmailHint(result.emailHint);
    } catch (err) {
      setError(err?.message || 'Could not send another code.');
    } finally {
      setBusy(false);
    }
  }, [phone]);

  if (stage === 'request') {
    return (
      <AuthScreenLayout
        title="Reset password"
        subtitle="Enter the phone number on your shop account. We'll email a code to the address on it."
        footerPrompt="Remembered it?"
        footerAction="Back to sign in"
        onFooterPress={goToLogin}
      >
        <Formik
          initialValues={INITIAL_FORGOT_VALUES}
          validationSchema={forgotPasswordValidationSchema}
          onSubmit={handleRequest}
          validateOnChange={false}
        >
          {({ values, errors, touched, handleBlur, setFieldValue, handleSubmit }) => (
            <>
              <Input
                label="Phone number"
                placeholder="9876543210"
                value={values.phone}
                onChangeText={(text) =>
                  setFieldValue('phone', text.replace(/\D/g, ''))
                }
                onBlur={handleBlur('phone')}
                keyboardType="number-pad"
                error={touched.phone && errors.phone ? errors.phone : undefined}
                editable={!busy}
                testID="forgot-phone"
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Button
                title="Send code"
                onPress={handleSubmit}
                loading={busy}
                disabled={busy}
                testID="forgot-submit"
              />
            </>
          )}
        </Formik>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title="Enter the code"
      subtitle={
        emailHint
          ? `We sent a ${RESET_CODE_LENGTH}-digit code to ${emailHint}. It expires in 15 minutes.`
          : `If that number has an account, a ${RESET_CODE_LENGTH}-digit code is on its way to the email address on it.`
      }
      footerPrompt="Wrong number?"
      footerAction="Start again"
      onFooterPress={() => {
        setStage('request');
        setError(null);
        setEmailHint(null);
      }}
    >
      <Formik
        initialValues={INITIAL_RESET_VALUES}
        validationSchema={resetPasswordValidationSchema}
        onSubmit={handleReset}
        validateOnChange={false}
      >
        {({ values, errors, touched, handleBlur, setFieldValue, handleSubmit }) => (
          <>
            <Input
              label="Code from email"
              placeholder="123456"
              value={values.code}
              onChangeText={(text) =>
                setFieldValue(
                  'code',
                  text.replace(/\D/g, '').slice(0, RESET_CODE_LENGTH),
                )
              }
              onBlur={handleBlur('code')}
              keyboardType="number-pad"
              error={touched.code && errors.code ? errors.code : undefined}
              editable={!busy}
              testID="reset-code"
            />

            <Input
              label="New password"
              placeholder="At least 6 characters"
              value={values.password}
              onChangeText={(text) => setFieldValue('password', text)}
              onBlur={handleBlur('password')}
              secureTextEntry
              autoCapitalize="none"
              error={
                touched.password && errors.password ? errors.password : undefined
              }
              editable={!busy}
              testID="reset-password"
            />

            <Input
              label="Confirm new password"
              placeholder="Re-enter your password"
              value={values.confirmPassword}
              onChangeText={(text) => setFieldValue('confirmPassword', text)}
              onBlur={handleBlur('confirmPassword')}
              secureTextEntry
              autoCapitalize="none"
              error={
                touched.confirmPassword && errors.confirmPassword
                  ? errors.confirmPassword
                  : undefined
              }
              editable={!busy}
              testID="reset-confirm"
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Set new password"
              onPress={handleSubmit}
              loading={busy}
              disabled={busy}
              testID="reset-submit"
            />

            <Pressable
              onPress={handleResend}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.resend, pressed && styles.pressed]}
            >
              <Text style={styles.resendText}>Send another code</Text>
            </Pressable>
          </>
        )}
      </Formik>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  resend: {
    alignSelf: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  pressed: { opacity: 0.7 },
});

export default ForgotPasswordScreen;
