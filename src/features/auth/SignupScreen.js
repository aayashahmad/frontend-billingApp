import { Formik } from 'formik';
import { useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';

import Button from '../../components/Button';
import Input from '../../components/Input';
import { PHONE_MAX_LENGTH } from '../../constants/paymentTypes';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import AuthScreenLayout from './AuthScreenLayout';
import {
  INITIAL_SIGNUP_VALUES,
  signupValidationSchema,
} from './authValidationSchemas';

const SignupScreen = ({ navigation }) => {
  const { signup, submitting, error, clearError } = useAuth();

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
                editable={!submitting}
              />

              <Input
                label="Email"
                placeholder="you@shop.com"
                value={values.email}
                onChangeText={(text) => setFieldValue('email', text)}
                onBlur={handleBlur('email')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={fieldError('email')}
                editable={!submitting}
              />

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
                editable={!submitting}
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
                editable={!submitting}
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
                editable={!submitting}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Button
                title="Create account"
                onPress={submit}
                loading={submitting}
                disabled={submitting}
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
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});

export default SignupScreen;
