import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import { colors } from '../theme';
import AppText from '../components/AppText';
import Receipt from '../components/Receipt';

type Props = {
  saleId: number;
  onBack: () => void;
};

export default function SaleDetailScreen({ saleId, onBack }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <AppText bold style={styles.backText}>‹</AppText>
        </Pressable>
        <AppText bold style={styles.title}>{t.receipt.title}</AppText>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Receipt saleId={saleId} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.header,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14, gap: 10,
  },
  backBtn: { width: 40, height: 40 },
  backText: { color: '#fff', fontSize: 26, lineHeight: 30, textAlign: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 20, textAlign: 'center' },
});
