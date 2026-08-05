import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import AppText from './AppText';
import { colors, font } from '../theme';

type Variant = 'boxed' | 'underline';

type Props = TextInputProps & {
  label: string;
  error?: string;
  variant?: Variant;
};

export default function AppInput({ label, error, variant = 'boxed', style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const isUnderline = variant === 'underline';

  return (
    <View style={isUnderline ? styles.underlineWrap : styles.boxedWrap}>
      <AppText
        style={[
          styles.label,
          isUnderline ? styles.labelUnderline : styles.labelBoxed,
          error ? styles.labelError : focused ? styles.labelFocused : null,
        ]}
      >
        {label}
      </AppText>
      {isUnderline ? (
        <View style={styles.underlineField}>
          <TextInput
            allowFontScaling
            placeholderTextColor={colors.muted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.underlineInput, style]}
            {...rest}
          />
          <View
            style={[
              styles.underlineLine,
              error ? styles.underlineLineError : focused ? styles.underlineLineFocused : null,
            ]}
          />
        </View>
      ) : (
        <View
          style={[
            styles.boxedField,
            error ? styles.boxedError : focused ? styles.boxedFocused : null,
          ]}
        >
          <TextInput
            allowFontScaling
            placeholderTextColor={colors.muted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.boxedInput, style]}
            {...rest}
          />
        </View>
      )}
      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  boxedWrap: { marginBottom: 16 },
  underlineWrap: { marginBottom: 18 },
  label: { fontFamily: font.regular },
  labelBoxed: { fontSize: 13, marginBottom: 6, color: colors.muted },
  labelUnderline: { fontSize: 13, marginBottom: 4, color: colors.text },
  labelFocused: { color: colors.header },
  labelError: { color: colors.danger },
  boxedField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  boxedFocused: { borderColor: colors.header, borderWidth: 1.5 },
  boxedError: { borderColor: colors.danger, borderWidth: 1.5 },
  boxedInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    fontFamily: font.regular,
  },
  underlineField: { paddingTop: 4, paddingBottom: 6 },
  underlineInput: {
    paddingHorizontal: 0,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    fontFamily: font.regular,
  },
  underlineLine: {
    height: 1,
    width: '100%',
    marginTop: 4,
    backgroundColor: colors.text,
    opacity: 0.85,
  },
  underlineLineFocused: { backgroundColor: colors.header, opacity: 1 },
  underlineLineError: { backgroundColor: colors.danger, opacity: 1 },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 4 },
});
