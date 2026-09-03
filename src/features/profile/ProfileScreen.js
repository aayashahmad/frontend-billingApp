import { Formik } from 'formik';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import StateView from '../../components/StateView';
import { PHONE_MAX_LENGTH } from '../../constants/paymentTypes';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants/theme';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useKeyboardInputScroll } from '../../hooks/useKeyboardInputScroll';
import { changePassword } from '../../services/authService';
import { useAuth } from '../../store/AuthContext';
import { useProfile } from '../../store/ProfileContext';
import { formatDateTime } from '../../utils/date';
import {
  INITIAL_CHANGE_PASSWORD_VALUES,
  changePasswordValidationSchema,
  createAccountValidationSchema,
} from '../auth/authValidationSchemas';

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
  const { profile, loading, saving, error, refresh, saveAccount, clearError } =
    useProfile();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef(null);
  const handleScroll = useKeyboardInputScroll(scrollRef);

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password changing keeps its own state: it talks straight to the service
  // rather than through the profile cache, since nothing on screen changes.
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleChangePassword = useCallback(async (values, helpers) => {
    setPasswordBusy(true);
    setPasswordError(null);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      helpers.resetForm();
      setChangingPassword(false);
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err?.message || 'Could not change the password.');
    } finally {
      setPasswordBusy(false);
    }
  }, []);

  const initialValues = useMemo(
    () => ({
      username: profile?.username ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      currentPassword: '',
    }),
    [profile],
  );

  const startEditing = useCallback(() => {
    clearError();
    setSaved(false);
    setEditing(true);
  }, [clearError]);

  const stopEditing = useCallback(() => {
    clearError();
    setEditing(false);
  }, [clearError]);

  const handleSubmit = useCallback(
    async (values, helpers) => {
      setSaved(false);
      const updated = await saveAccount(values);
      if (!updated) return;
      setSaved(true);
      setEditing(false);
      // Reset against what the server returned, not what was typed: it
      // lowercases the email, and the password field must not linger.
      helpers.resetForm({
        values: {
          username: updated.username,
          email: updated.email,
          phone: updated.phone,
          currentPassword: '',
        },
      });
    },
    [saveAccount],
  );

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
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      style={styles.fill}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom:
            keyboardHeight > 0
              ? keyboardHeight + SPACING.md
              : insets.bottom + SPACING.xl,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Card style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(profile?.username)}</Text>
        </View>
        <Text style={styles.name}>{profile?.username || 'Shop owner'}</Text>
        {!!profile?.email && <Text style={styles.email}>{profile.email}</Text>}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Account details</Text>
        {!editing && (
          <Pressable
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel="Edit account details"
            hitSlop={10}
            style={({ pressed }) => [styles.editLink, pressed && styles.pressed]}
          >
            <Text style={styles.editLinkText}>Edit</Text>
          </Pressable>
        )}
      </View>

      {editing ? (
        <Card>
          <Formik
            initialValues={initialValues}
            enableReinitialize
            onSubmit={handleSubmit}
            validateOnChange={false}
            // The password is demanded only for the two fields that are
            // credentials, so the rule is rebuilt as the form is edited.
            validationSchema={createAccountValidationSchema({
              requiresPassword: false,
            })}
          >
            {({
              values,
              errors,
              touched,
              handleBlur,
              setFieldValue,
              handleSubmit: submit,
              validateForm,
              setErrors,
            }) => {
              const contactChanged =
                values.email.trim().toLowerCase() !==
                  (profile?.email ?? '').toLowerCase() ||
                values.phone.trim() !== (profile?.phone ?? '');

              const submitWithRule = async () => {
                const schema = createAccountValidationSchema({
                  requiresPassword: contactChanged,
                });
                try {
                  await schema.validate(values, { abortEarly: false });
                } catch (validationError) {
                  const nextErrors = {};
                  (validationError.inner ?? []).forEach((issue) => {
                    if (issue.path && !nextErrors[issue.path]) {
                      nextErrors[issue.path] = issue.message;
                    }
                  });
                  setErrors(nextErrors);
                  await validateForm();
                  return;
                }
                submit();
              };

              return (
                <>
                  <Input
                    label="Name"
                    placeholder="Shop owner name"
                    value={values.username}
                    onChangeText={(text) => setFieldValue('username', text)}
                    onBlur={handleBlur('username')}
                    error={
                      touched.username && errors.username
                        ? errors.username
                        : undefined
                    }
                    editable={!saving}
                    testID="account-name"
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
                    error={touched.email && errors.email ? errors.email : undefined}
                    editable={!saving}
                    hint="Password reset codes are sent here."
                    testID="account-email"
                  />

                  <Input
                    label="Phone"
                    placeholder="9876543210"
                    value={values.phone}
                    onChangeText={(text) =>
                      setFieldValue(
                        'phone',
                        text.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH),
                      )
                    }
                    onBlur={handleBlur('phone')}
                    keyboardType="number-pad"
                    error={touched.phone && errors.phone ? errors.phone : undefined}
                    editable={!saving}
                    hint="You can sign in with this number."
                    testID="account-phone"
                  />

                  {/* Shown only once one of the credentials has actually been
                      edited — renaming yourself should not ask for a password. */}
                  {contactChanged && (
                    <Input
                      label="Current password"
                      placeholder="Enter your password to confirm"
                      value={values.currentPassword}
                      onChangeText={(text) =>
                        setFieldValue('currentPassword', text)
                      }
                      onBlur={handleBlur('currentPassword')}
                      secureTextEntry
                      autoCapitalize="none"
                      error={
                        touched.currentPassword && errors.currentPassword
                          ? errors.currentPassword
                          : undefined
                      }
                      editable={!saving}
                      hint="Email and phone are used to sign in, so we check it's you."
                      testID="account-password"
                    />
                  )}

                  {!!error && <Text style={styles.error}>{error}</Text>}

                  <Button
                    title="Save changes"
                    onPress={submitWithRule}
                    loading={saving}
                    disabled={saving}
                    testID="account-save"
                  />
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={stopEditing}
                    disabled={saving}
                    style={styles.cancel}
                  />
                </>
              );
            }}
          </Formik>
        </Card>
      ) : (
        <Card>
          {saved && <Text style={styles.saved}>Account details updated.</Text>}
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
      )}

      {!editing && !!error && <Text style={styles.error}>{error}</Text>}

      {!editing && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Password</Text>
            {!changingPassword && (
              <Pressable
                onPress={() => {
                  setPasswordError(null);
                  setPasswordSaved(false);
                  setChangingPassword(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Change password"
                hitSlop={10}
                style={({ pressed }) => [
                  styles.editLink,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.editLinkText}>Change</Text>
              </Pressable>
            )}
          </View>

          <Card>
            {changingPassword ? (
              <Formik
                initialValues={INITIAL_CHANGE_PASSWORD_VALUES}
                validationSchema={changePasswordValidationSchema}
                onSubmit={handleChangePassword}
                validateOnChange={false}
              >
                {({
                  values,
                  errors,
                  touched,
                  handleBlur,
                  setFieldValue,
                  handleSubmit: submit,
                  resetForm,
                }) => (
                  <>
                    <Input
                      label="Current password"
                      placeholder="Your password today"
                      value={values.currentPassword}
                      onChangeText={(text) =>
                        setFieldValue('currentPassword', text)
                      }
                      onBlur={handleBlur('currentPassword')}
                      secureTextEntry
                      autoCapitalize="none"
                      error={
                        touched.currentPassword && errors.currentPassword
                          ? errors.currentPassword
                          : undefined
                      }
                      editable={!passwordBusy}
                      testID="current-password"
                    />

                    <Input
                      label="New password"
                      placeholder="At least 6 characters"
                      value={values.newPassword}
                      onChangeText={(text) => setFieldValue('newPassword', text)}
                      onBlur={handleBlur('newPassword')}
                      secureTextEntry
                      autoCapitalize="none"
                      error={
                        touched.newPassword && errors.newPassword
                          ? errors.newPassword
                          : undefined
                      }
                      editable={!passwordBusy}
                      testID="new-password"
                    />

                    <Input
                      label="Confirm new password"
                      placeholder="Re-enter the new password"
                      value={values.confirmPassword}
                      onChangeText={(text) =>
                        setFieldValue('confirmPassword', text)
                      }
                      onBlur={handleBlur('confirmPassword')}
                      secureTextEntry
                      autoCapitalize="none"
                      error={
                        touched.confirmPassword && errors.confirmPassword
                          ? errors.confirmPassword
                          : undefined
                      }
                      editable={!passwordBusy}
                      testID="confirm-new-password"
                    />

                    {!!passwordError && (
                      <Text style={styles.error}>{passwordError}</Text>
                    )}

                    <Button
                      title="Update password"
                      onPress={submit}
                      loading={passwordBusy}
                      disabled={passwordBusy}
                      testID="submit-password"
                    />
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={() => {
                        resetForm();
                        setPasswordError(null);
                        setChangingPassword(false);
                      }}
                      disabled={passwordBusy}
                      style={styles.cancel}
                    />
                  </>
                )}
              </Formik>
            ) : (
              <>
                {passwordSaved && (
                  <Text style={styles.saved}>Password updated.</Text>
                )}
                <Text style={styles.passwordHint}>
                  Change it here whenever you like — no email needed. Forgot it
                  instead? Sign out and use “Forgot password?”.
                </Text>
              </>
            )}
          </Card>

          <Button
            title="Sign out"
            variant="danger"
            onPress={logout}
            style={styles.signOut}
          />
        </>
      )}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editLink: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  editLinkText: {
    color: COLORS.primaryDark,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  pressed: { opacity: 0.7 },
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
  saved: {
    color: COLORS.success,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  passwordHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  cancel: { marginTop: SPACING.sm },
  signOut: { marginTop: SPACING.xl },
});

export default ProfileScreen;
