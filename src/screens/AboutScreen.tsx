import React, { useCallback } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { BackArrowIcon, ChevronRightIcon, StoreIcon } from '../components/ServiceIcon';
import { t } from '../i18n';
import { font } from '../theme';

type Props = {
  onBack: () => void;
};

function BulletItem({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />
      <AppText style={styles.bulletText}>{children}</AppText>
    </View>
  );
}

export default function AboutScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  const openTelegram = useCallback(async () => {
    try {
      await Linking.openURL(t.about.telegramUrl);
    } catch {
      // The device may not have an application capable of opening the URL.
    }
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="နောက်သို့"
          onPress={onBack}
          style={styles.backBtn}
        >
          <BackArrowIcon size={26} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerText}>
          <AppText bold style={styles.title}>{t.about.title}</AppText>
          <AppText style={styles.subtitle}>{t.about.subtitle}</AppText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <StoreIcon size={32} color="#4A6CF7" />
          </View>
          <AppText bold style={styles.appName}>{t.about.appName}</AppText>
          <AppText style={styles.version}>{t.about.versionLabel}</AppText>
        </View>

        <View style={styles.section}>
          <AppText bold style={styles.sectionTitle}>{t.about.appSection}</AppText>
          <AppText style={styles.body}>{t.about.descriptionFirst}</AppText>
          <AppText style={styles.body}>{t.about.descriptionSecond}</AppText>
        </View>

        <View style={styles.section}>
          <AppText bold style={styles.sectionTitle}>{t.about.featuresSection}</AppText>
          {t.about.features.map((feature) => <BulletItem key={feature}>{feature}</BulletItem>)}
        </View>

        <View style={styles.section}>
          <AppText bold style={styles.sectionTitle}>{t.about.suitableSection}</AppText>
          <AppText style={styles.body}>{t.about.suitableIntro}</AppText>
          {t.about.suitableBusinesses.map((business) => <BulletItem key={business}>{business}</BulletItem>)}
        </View>

        <View style={styles.section}>
          <AppText bold style={styles.sectionTitle}>{t.about.contactSection}</AppText>
          <AppText style={styles.body}>{t.about.contactIntro}</AppText>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t.about.telegramLabel}
            onPress={openTelegram}
            style={({ pressed }) => [styles.telegramCard, pressed && styles.pressed]}
          >
            <View style={styles.telegramIcon}>
              <AppText bold style={styles.telegramIconText}>T</AppText>
            </View>
            <View style={styles.telegramTextWrap}>
              <AppText bold style={styles.telegramLabel}>{t.about.telegramLabel}</AppText>
              <AppText style={styles.telegramUrl}>{t.about.telegramUrl}</AppText>
            </View>
            <ChevronRightIcon size={20} color="#8A90A6" />
          </Pressable>
          <AppText style={styles.body}>{t.about.contactOutro}</AppText>
        </View>

        <View style={styles.infoCard}>
          <AppText bold style={styles.infoTitle}>{t.about.infoSection}</AppText>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>{t.about.version}</AppText>
            <AppText bold style={styles.infoValue}>{t.about.versionValue}</AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>{t.about.creator}</AppText>
            <AppText bold style={styles.infoValue}>{t.about.creatorValue}</AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    backgroundColor: '#4A6CF7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 56,
    paddingVertical: 8,
    gap: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 18, fontFamily: font.bold },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: font.regular, marginTop: 2 },
  scroll: { padding: 20 },
  hero: { alignItems: 'center', paddingVertical: 12, marginBottom: 6 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appName: { color: '#1F2330', fontSize: 19, fontFamily: font.bold, textAlign: 'center' },
  version: { color: '#8A90A6', fontSize: 12, fontFamily: font.regular, marginTop: 4 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginTop: 14, elevation: 2 },
  sectionTitle: { color: '#4A6CF7', fontSize: 16, fontFamily: font.bold, marginBottom: 10 },
  body: { color: '#4B5563', fontSize: 13, fontFamily: font.regular, lineHeight: 22, marginTop: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A6CF7', marginTop: 8, marginRight: 10 },
  bulletText: { flex: 1, color: '#4B5563', fontSize: 13, fontFamily: font.regular, lineHeight: 21 },
  telegramCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EEF0FF',
  },
  pressed: { opacity: 0.78 },
  telegramIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A6CF7', alignItems: 'center', justifyContent: 'center' },
  telegramIconText: { color: '#FFFFFF', fontSize: 16, fontFamily: font.bold },
  telegramTextWrap: { flex: 1, marginLeft: 10, marginRight: 8 },
  telegramLabel: { color: '#1F2330', fontSize: 13, fontFamily: font.bold },
  telegramUrl: { color: '#4A6CF7', fontSize: 11, fontFamily: font.regular, marginTop: 2 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginTop: 14, elevation: 2 },
  infoTitle: { color: '#4A6CF7', fontSize: 16, fontFamily: font.bold, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, gap: 16 },
  infoLabel: { color: '#8A90A6', fontSize: 13, fontFamily: font.regular },
  infoValue: { flex: 1, color: '#1F2330', fontSize: 13, fontFamily: font.bold, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F0F0F4' },
});
