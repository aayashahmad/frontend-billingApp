import { Formik } from 'formik';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import Button from '../../components/Button';
import Input from '../../components/Input';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import AuthScreenLayout from './AuthScreenLayout';
import {
  INITIAL_LOGIN_VALUES,
  loginValidationSchema,
} from './authValidationSchemas';

const LoginScreen = ({ navigation }) => {
  const { login, submitting, error, sessionNotice, clearError } = useAuth();

  const handleSubmit = useCallback(
    async (values) => {
      clearError();
      await login(values);
    },
    [clearError, login],
  );

  const goToSignup = useCallback(() => {
    clearError();
    navigation.navigate('Signup');
  }, [clearError, navigation]);

  const goToForgotPassword = useCallback(() => {
    clearError();
    navigation.navigate('ForgotPassword');
  }, [clearError, navigation]);

  return (
    <AuthScreenLayout
      title="Sign in"
      subtitle="Use the email or phone number on your shop account."
      footerPrompt="New here?"
      footerAction="Create an account"
      onFooterPress={goToSignup}
    >
      {!!sessionNotice && <Text style={styles.notice}>{sessionNotice}</Text>}
      <Formik
        initialValues={INITIAL_LOGIN_VALUES}
        validationSchema={loginValidationSchema}
        onSubmit={handleSubmit}
        validateOnChange={false}
      >
        {({ values, errors, touched, handleBlur, setFieldValue, handleSubmit: submit }) => (
          <>
            <Input
              label="Email or phone"
              placeholder="you@shop.com or 9876543210"
              value={values.login}
              onChangeText={(text) => setFieldValue('login', text)}
              onBlur={handleBlur('login')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              error={touched.login && errors.login ? errors.login : undefined}
              editable={!submitting}
              testID="login-identifier"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={values.password}
              onChangeText={(text) => setFieldValue('password', text)}
              onBlur={handleBlur('password')}
              secureTextEntry
              autoCapitalize="none"
              error={
                touched.password && errors.password ? errors.password : undefined
              }
              editable={!submitting}
              testID="login-password"
            />

            <Pressable
              onPress={goToForgotPassword}
              accessibilityRole="button"
              style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Sign in"
              onPress={submit}
              loading={submitting}
              disabled={submitting}
              testID="login-submit"
            />
          </>
        )}
      </Formik>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
  notice: {
    color: COLORS.warning,
    backgroundColor: '#FEF3C7',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});

export default LoginScreen;
