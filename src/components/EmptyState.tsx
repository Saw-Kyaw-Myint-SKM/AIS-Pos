import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import AppText from './AppText';

type Props = { title: string; hint?: string };

export default function EmptyState({ title, hint }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.circle}><AppText bold style={styles.mark}>∅</AppText></View>
      <AppText bold style={styles.title}>{title}</AppText>
      {hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24 },
  circle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  mark: { color: colors.muted, fontSize: 24 },
  title: { color: colors.text, fontSize: 16, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 6 },
});
