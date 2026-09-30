import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import Input from './Input';

/**
 * A field that opens a list of choices.
 *
 * React Native has no cross-platform dropdown, and pulling in a picker
 * library for one field is a native dependency that has to survive every
 * future SDK bump. A pressable plus a modal list is a handful of lines and
 * behaves the same on both platforms.
 *
 * `allowCustom` adds an "Other…" row that reveals a text box, because the
 * list is a convenience and must never be a cage — a shop whose books are
 * lettered rather than numbered still has to be able to say so.
 */
const SelectField = ({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select',
  hint,
  disabled = false,
  allowCustom = true,
  customLabel = 'Other…',
  customPlaceholder = 'Type it in',
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [typing, setTyping] = useState(false);

  const choose = useCallback(
    (next) => {
      onChange?.(next);
      setOpen(false);
      setTyping(false);
      setCustom('');
    },
    [onChange],
  );

  const confirmCustom = useCallback(() => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    choose(trimmed);
  }, [choose, custom]);

  return (
    <View style={style}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value || placeholder}` : label}
        style={({ pressed }) => [
          styles.field,
          disabled && styles.fieldDisabled,
          pressed && styles.fieldPressed,
        ]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
      </Pressable>

      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Swallows taps so pressing inside the sheet does not dismiss it. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label || 'Choose'}</Text>

            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const active = option === value;
                return (
                  <Pressable
                    key={option}
                    onPress={() => choose(option)}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text
                      style={[styles.optionText, active && styles.optionTextActive]}
                    >
                      {option}
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>
                );
              })}

              {allowCustom && !typing && (
                <Pressable onPress={() => setTyping(true)} style={styles.option}>
                  <Text style={styles.customText}>{customLabel}</Text>
                </Pressable>
              )}

              {allowCustom && typing && (
                <View style={styles.customBlock}>
                  <Input
                    placeholder={customPlaceholder}
                    value={custom}
                    onChangeText={setCustom}
                    autoFocus
                    onSubmitEditing={confirmCustom}
                    returnKeyType="done"
                    containerStyle={styles.customInput}
                  />
                  <Pressable onPress={confirmCustom} style={styles.customUse}>
                    <Text style={styles.customUseText}>Use</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            <Pressable onPress={() => setOpen(false)} style={styles.close}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  fieldDisabled: { opacity: 0.6 },
  fieldPressed: { borderColor: COLORS.primary },
  value: { fontSize: FONT_SIZES.md, color: COLORS.text },
  placeholder: { color: COLORS.textMuted },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.md,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  options: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionActive: {},
  optionText: { fontSize: FONT_SIZES.md, color: COLORS.text },
  optionTextActive: { color: COLORS.primary, fontWeight: '700' },
  customText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '600' },
  customBlock: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: SPACING.md },
  customInput: { flex: 1, marginBottom: 0 },
  customUse: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginLeft: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  customUseText: { color: COLORS.white, fontWeight: '700' },
  close: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  closeText: { color: COLORS.textLight, fontWeight: '600' },
});

export default SelectField;
