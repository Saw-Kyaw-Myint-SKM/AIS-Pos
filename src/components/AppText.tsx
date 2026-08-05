import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, font } from '../theme';

type Props = TextProps & { bold?: boolean };

export default function AppText({ bold, style, ...rest }: Props) {
  return <Text allowFontScaling {...rest} style={[styles.base, bold ? styles.bold : null, style]} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: font.regular, color: colors.text, fontSize: 15, lineHeight: 24 },
  bold: { fontFamily: font.bold },
});
