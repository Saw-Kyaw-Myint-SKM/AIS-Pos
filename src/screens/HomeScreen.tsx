import React from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CustomerProfile, TodaySummary } from '../db';
import { formatKyat, formatDateMM, t, toMM } from '../i18n';
import { colors, font, radius, tileShadow } from '../theme';
import AppText from '../components/AppText';
import {
  DollarIcon,
  PackageIcon,
  ReceiptIcon,
  ScanIcon,
  SettingsIcon,
} from '../components/ServiceIcon';

const LOGO = require('../../assets/source-mm-logo.png');
const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 24;
const GAP = 12;
const COL = (SCREEN_W - H_PAD * 2 - GAP * 2) / 3;

type Props = {
  summary: TodaySummary;
  profile: CustomerProfile | null;
  onStartSale: () => void;
  onOpenItems: () => void;
  onOpenHistory: () => void;
  onScan: () => void;
  onOpenSettings: () => void;
};

type ServiceTile = {
  key: string;
  label: string;
  iconBg: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
};

export default function HomeScreen({
  summary,
  profile,
  onStartSale,
  onOpenItems,
  onOpenHistory,
  onScan,
  onOpenSettings,
}: Props) {
  const insets = useSafeAreaInsets();
  const customerName = profile?.name?.trim() || t.appName;

  const stats = [
    { key: 'today', label: t.home.todaySale, value: formatKyat(summary.total) },
    { key: 'orders', label: t.home.orderHistory, value: toMM(summary.saleCount) },
    { key: 'products', label: t.home.saleProduct, value: toMM(summary.itemCount) },
  ];

  const services: ServiceTile[] = [
    { key: 'sale', label: t.home.sale, iconBg: colors.iconGreen, Icon: DollarIcon, onPress: onStartSale },
    { key: 'products', label: t.home.products, iconBg: colors.iconPurple, Icon: PackageIcon, onPress: onOpenItems },
    { key: 'history', label: t.home.salesHistory, iconBg: colors.iconBlue, Icon: ReceiptIcon, onPress: onOpenHistory },
    { key: 'scan', label: t.home.scan, iconBg: colors.iconCyan, Icon: ScanIcon, onPress: onScan },
    { key: 'setting', label: t.home.setting, iconBg: colors.iconTeal, Icon: SettingsIcon, onPress: onOpenSettings },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.banner, { paddingTop: insets.top + 16 }]}>
          <View style={styles.bannerTop}>
            <View style={styles.logoNameRow}>
              <View style={styles.avatar}>
                <Image source={LOGO} style={styles.avatarImage} resizeMode="contain" />
              </View>
              <View style={styles.textWrap}>
                <AppText bold style={styles.projectName}>AISource MM</AppText>
                <AppText style={styles.name}>{customerName}</AppText>
              </View>
            </View>
            <View style={styles.dateWrap}>
              <AppText style={styles.dateDay}>{new Date().getDate()}</AppText>
              <AppText style={styles.dateMonth}>{formatDateMM(new Date()).split(' ').slice(1).join(' ')}</AppText>
            </View>
          </View>
          <View style={styles.statsInline}>
            <View style={styles.statItem}>
              <AppText bold style={styles.statValue}>{formatKyat(summary.total)}</AppText>
              <AppText style={styles.statLabel}>{t.home.todaySale}</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText bold style={styles.statValue}>{toMM(summary.saleCount)}</AppText>
              <AppText style={styles.statLabel}>{t.home.orderHistory}</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText bold style={styles.statValue}>{toMM(summary.itemCount)}</AppText>
              <AppText style={styles.statLabel}>{t.home.saleProduct}</AppText>
            </View>
          </View>
        </View>

        <AppText bold style={styles.sectionTitle}>
          {t.home.services}
        </AppText>

        <View style={styles.grid}>
          {services.map((item) => {
            const Icon = item.Icon;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={item.onPress}
                style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                  <Icon size={22} color="#FFFFFF" />
                </View>
                <AppText style={styles.serviceLabel} numberOfLines={2}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flex: 1 },
  content: { paddingBottom: 110 },
  banner: {
    backgroundColor: '#4A6CF7',
    paddingHorizontal: H_PAD,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  logoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  textWrap: {
    marginLeft: 12,
  },
  projectName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: font.bold,
  },
  name: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: font.regular,
    marginTop: 2,
  },
  dateWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dateDay: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: font.bold,
  },
  dateMonth: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontFamily: font.regular,
    marginTop: 2,
  },
  statsInline: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#22302B',
    fontSize: 14,
    fontFamily: font.bold,
  },
  statLabel: {
    color: '#7A8880',
    marginTop: 4,
    fontSize: 10,
    fontFamily: font.regular,
    marginTop: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: -24,
    marginHorizontal: H_PAD,
    gap: GAP,
  },
  statCard: {
    flex: 1,
    minHeight: 76,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...tileShadow,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontFamily: font.regular,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 4,
  },
  statValue: {
    color: '#111827',
    marginBottom: 6,
    fontSize: 14,
    fontFamily: font.bold,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontFamily: font.bold,
    marginTop: 22,
    marginBottom: 12,
    marginHorizontal: H_PAD,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: H_PAD,
    gap: GAP,
  },
  serviceCard: {
    width: COL,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...tileShadow,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    color: '#374151',
    fontSize: 11,
    fontFamily: font.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
});
