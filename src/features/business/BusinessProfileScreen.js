import { Formik } from 'formik';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import StateView from '../../components/StateView';
import { COLORS, FONT_SIZES, SPACING } from '../../constants/theme';
import { toBusinessFormValues } from '../../services/businessService';
import { useProfile } from '../../store/ProfileContext';
import { buildLetterhead } from '../printing/documentTemplates';
import {
  businessValidationSchema,
} from './businessValidationSchema';

/** Mirrors exactly what the PDF letterhead will render. */
const LetterheadPreview = ({ values }) => {
  const head = useMemo(
    () =>
      buildLetterhead({
        business_name: values.businessName,
        business_address: values.businessAddress,
        business_email: values.businessEmail,
        business_phone: values.businessPhone,
        business_alt_phone: values.businessAltPhone,
        registration_number: values.registrationNumber,
        bill_footer_note: values.billFooterNote,
      }),
    [values],
  );

  return (
    <Card style={styles.preview}>
      <Text style={styles.previewLabel}>Preview on bill</Text>
      <Text style={styles.previewName}>{head.name}</Text>
      {head.addressLines.map((line) => (
        <Text key={line} style={styles.previewMeta}>
          {line}
        </Text>
      ))}
      {!!head.email && <Text style={styles.previewMeta}>{head.email}</Text>}
      {head.phones.length > 0 && (
        <Text style={styles.previewMeta}>{head.phones.join(' · ')}</Text>
      )}
      {!!head.registrationNumber && (
        <Text style={styles.previewMeta}>Reg. No: {head.registrationNumber}</Text>
      )}
      {!!head.footerNote && (
        <Text style={styles.previewFooter}>{head.footerNote}</Text>
      )}
    </Card>
  );
};

/**
 * Bill letterhead editor.
 *
 * `onboarding` mode is what a new owner sees immediately after signing up —
 * same form, different framing, and saving drops them into the app. In
 * settings mode it is an ordinary editable screen reached from the drawer.
 */
const BusinessProfileScreen = ({ onboarding = false }) => {
  const { profile, loading, saving, error, refresh, saveBusinessProfile } =
    useProfile();
  const [saved, setSaved] = useState(false);

  const initialValues = useMemo(() => {
    const values = toBusinessFormValues(profile);
    // A brand-new owner has no business name yet — seed it from the name they
    // signed up with so the form is never blank on first sight.
    if (!values.businessName && profile?.username) {
      return { ...values, businessName: profile.username };
    }
    return values;
  }, [profile]);

  const handleSubmit = useCallback(
    async (values, helpers) => {
      setSaved(false);
      const updated = await saveBusinessProfile(values);
      if (updated) {
        setSaved(true);
        // Reset against the saved values so the form is no longer dirty.
        // In onboarding mode the navigator swaps this screen out once the
        // profile reports `onboarded`, so nothing more to do here.
        helpers.resetForm({ values });
      }
    },
    [saveBusinessProfile],
  );

  if (loading && !profile) {
    return <StateView variant="loading" style={styles.fill} />;
  }

  if (error && !profile) {
    return (
      <StateView
        variant="error"
        title="Could not load your bill details"
        message={error}
        onRetry={refresh}
        style={styles.fill}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {onboarding && (
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Set up your bill</Text>
            <Text style={styles.welcomeStep}>Step 1 of 1 · takes a minute</Text>
          </View>
        )}

        <Text style={styles.intro}>
          {onboarding
            ? 'Tell us about your business. These details print at the top of every bill, receipt and PDF you share with customers. You can change them any time from Bill Details in the menu.'
            : 'These details appear at the top of every printed bill, receipt and PDF statement you share with customers.'}
        </Text>

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={businessValidationSchema}
          onSubmit={handleSubmit}
          validateOnChange={false}
        >
          {({
            values,
            errors,
            touched,
            handleBlur,
            setFieldValue,
            handleSubmit: submit,
            dirty,
          }) => {
            const fieldError = (name) =>
              touched[name] && errors[name] ? errors[name] : undefined;

            const onChange = (name) => (text) => {
              setSaved(false);
              setFieldValue(name, text);
            };

            return (
              <>
                <LetterheadPreview values={values} />

                <Card>
                  <Input
                    label="Business name"
                    placeholder="e.g. Demo Hardware & Paints"
                    value={values.businessName}
                    onChangeText={onChange('businessName')}
                    onBlur={handleBlur('businessName')}
                    autoCapitalize="words"
                    error={fieldError('businessName')}
                    editable={!saving}
                  />

                  <Input
                    label="Address"
                    placeholder={'Street\nCity, State PIN'}
                    value={values.businessAddress}
                    onChangeText={onChange('businessAddress')}
                    onBlur={handleBlur('businessAddress')}
                    multiline
                    numberOfLines={3}
                    hint="Each line you type prints as its own line."
                    error={fieldError('businessAddress')}
                    editable={!saving}
                  />

                  <Input
                    label="Contact email"
                    placeholder="billing@yourshop.com"
                    value={values.businessEmail}
                    onChangeText={onChange('businessEmail')}
                    onBlur={handleBlur('businessEmail')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    error={fieldError('businessEmail')}
                    editable={!saving}
                  />

                  <Input
                    label="Contact number"
                    placeholder="+91 194 2345678"
                    value={values.businessPhone}
                    onChangeText={onChange('businessPhone')}
                    onBlur={handleBlur('businessPhone')}
                    keyboardType="phone-pad"
                    error={fieldError('businessPhone')}
                    editable={!saving}
                  />

                  <Input
                    label="Alternate number"
                    placeholder="Optional second number"
                    value={values.businessAltPhone}
                    onChangeText={onChange('businessAltPhone')}
                    onBlur={handleBlur('businessAltPhone')}
                    keyboardType="phone-pad"
                    error={fieldError('businessAltPhone')}
                    editable={!saving}
                  />

                  <Input
                    label="Registration number"
                    placeholder="e.g. GSTIN 01ABCDE1234F1Z5"
                    value={values.registrationNumber}
                    onChangeText={onChange('registrationNumber')}
                    onBlur={handleBlur('registrationNumber')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    error={fieldError('registrationNumber')}
                    editable={!saving}
                  />

                  <Input
                    label="Footer note"
                    placeholder="e.g. Goods once sold will not be taken back."
                    value={values.billFooterNote}
                    onChangeText={onChange('billFooterNote')}
                    onBlur={handleBlur('billFooterNote')}
                    multiline
                    numberOfLines={2}
                    hint="Printed at the bottom of every bill."
                    error={fieldError('billFooterNote')}
                    editable={!saving}
                  />
                </Card>

                {!!error && <Text style={styles.error}>{error}</Text>}
                {saved && !dirty && (
                  <Text style={styles.saved}>
                    Saved — new bills will use these details.
                  </Text>
                )}

                <Button
                  title={onboarding ? 'Save & continue' : 'Save bill details'}
                  onPress={submit}
                  loading={saving}
                  disabled={saving}
                  style={styles.save}
                  testID="save-business"
                />

                {onboarding && (
                  <>
                    {/* Skipping still saves — the business name defaults to
                        the signup name, so bills are never unbranded. */}
                    <Button
                      title="Skip for now"
                      variant="secondary"
                      onPress={submit}
                      disabled={saving}
                      style={styles.skip}
                    />
                    <Text style={styles.skipHint}>
                      You can add the rest later from Bill Details.
                    </Text>
                  </>
                )}
              </>
            );
          }}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  intro: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  preview: {
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  previewLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  previewName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  previewFooter: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  saved: {
    color: COLORS.success,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  save: { marginTop: SPACING.md },
  skip: { marginTop: SPACING.sm },
  skipHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  welcome: { marginBottom: SPACING.md },
  welcomeTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  welcomeStep: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default BusinessProfileScreen;
