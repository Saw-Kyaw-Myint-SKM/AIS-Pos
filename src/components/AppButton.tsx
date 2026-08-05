import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import AppText from './AppText';
import { colors, font } from '../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'pill';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  fullWidth?: boolean;
  disabled?: boolean;
};

const STYLE: Record<Variant, { bg: string; fg: string; border?: string; radius: number }> = {
  primary: { bg: colors.header, fg: colors.headerText, radius: 12 },
  secondary: { bg: colors.accentSoft, fg: colors.header, radius: 12 },
  outline: { bg: 'transparent', fg: colors.header, border: colors.header, radius: 12 },
  pill: { bg: '#757575', fg: '#FFFFFF', radius: 50 },
};

export default function AppButton({
  label,
  variant = 'primary',
  fullWidth,
  disabled,
  ...rest
}: Props) {
  const palette = STYLE[variant];
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderRadius: palette.radius,
          borderWidth: palette.border ? 1.5 : 0,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.96 : 1,
        },
        fullWidth ? styles.fullWidth : null,
      ]}
      {...rest}
    >
      <AppText style={[styles.label, { color: palette.fg }]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontFamily: font.bold, fontSize: 14 },
});
