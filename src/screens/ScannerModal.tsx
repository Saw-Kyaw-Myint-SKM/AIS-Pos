import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { ClothingItem } from '../db';
import { t as i18n, formatKyat, toMM } from '../i18n';
import { avatarPalette, colors, radius, shadow } from '../theme';
import AppText from '../components/AppText';
import { BackArrowIcon, CartIcon } from '../components/ServiceIcon';

const SUPPORTED_TYPES = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;
const DUPLICATE_WINDOW_MS = 1500;

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (value: string, format: string, keepOpen: boolean) => void;
  onOpenCart: () => void;
  lastItem: ClothingItem | null;
  cart: Record<number, number>;
  cartOpen: boolean;
};


export default function ScannerModal({
  visible,
  onClose,
  onScanned,
  onOpenCart,
  lastItem,
  cart,
  cartOpen,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [singleDone, setSingleDone] = useState(false);
  const [multiScan, setMultiScan] = useState(false);
  const lastScan = useRef<{ data: string; time: number } | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const bracketsAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardSwapAnim = useRef(new Animated.Value(1)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSingleDone(false);
      lastScan.current = null;
      requestPermission();
      cardAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  useEffect(() => {
    if (lastItem) {
      cardSwapAnim.setValue(0.6);
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 90, friction: 12 }),
        Animated.timing(cardSwapAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      bracketsAnim.setValue(0);
      Animated.sequence([
        Animated.timing(bracketsAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(120),
        Animated.timing(bracketsAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [lastItem]);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: multiScan ? 1 : 0,
      tension: 120,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [multiScan, toggleAnim]);

  const handleScan = (result: BarcodeScanningResult) => {
    const now = Date.now();
    if (lastScan.current && lastScan.current.data === result.data && now - lastScan.current.time < DUPLICATE_WINDOW_MS) {
      return;
    }
    lastScan.current = { data: result.data, time: now };

    if (multiScan) {
      onScanned(result.data, result.type, true);
    } else {
      setSingleDone(true);
      onScanned(result.data, result.type, false);
    }
  };

  const cartCount = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const isPaused = cartOpen;
  const avatarColor = lastItem ? avatarPalette[lastItem.id % avatarPalette.length] : colors.accent;

  const scanLineTranslate = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 210] });
  const bracketsColor = bracketsAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.accent, colors.success] });
  const bracketsScale = bracketsAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
  const cardOpacity = cardSwapAnim;
  const thumbTranslate = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  const trackColor = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View pointerEvents="none" style={styles.bgGradientTop} />
        <View pointerEvents="none" style={styles.bgGradientBottom} />
        <View pointerEvents="none" style={styles.bgGlow} />

        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.iconBtn}
              hitSlop={10}
            >
              <BackArrowIcon size={22} color="#FFFFFF" />
            </Pressable>

            <View style={styles.titleArea}>
              <AppText bold numberOfLines={1} style={styles.title}>
                QR / ဘားကုဒ် စကင်
              </AppText>
            </View>
          </View>

          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="switch"
              onPress={() => setMultiScan((v) => !v)}
              hitSlop={8}
              style={styles.togglePill}
            >
              <Animated.View
                style={[
                  styles.toggleTrack,
                  { backgroundColor: trackColor.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(255,255,255,0.2)', colors.success],
                  }) },
                ]}
              >
                <Animated.View
                  style={[
                    styles.toggleThumb,
                    { transform: [{ translateX: thumbTranslate }] },
                  ]}
                />
              </Animated.View>
              <AppText bold style={styles.toggleText}>ဆက်တိုက် စကင်</AppText>
            </Pressable>

            <View style={styles.topRowRight} />

            {multiScan ? (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenCart}
                style={styles.iconBtn}
                hitSlop={10}
              >
                <CartIcon size={22} color="#FFFFFF" />
                {cartCount > 0 ? (
                  <View style={styles.cartBadge}>
                    <AppText bold style={styles.cartBadgeText}>
                      {toMM(cartCount)}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.viewfinderWrap}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: [...SUPPORTED_TYPES] }}
              onBarcodeScanned={
                isPaused || (!multiScan && singleDone) ? undefined : handleScan
              }
            />
          ) : null}
          {permission?.granted ? (
            <View pointerEvents="none" style={styles.frameWrap}>
              <Animated.View
                style={[
                  styles.bracketTL,
                  { borderColor: bracketsColor, transform: [{ scale: bracketsScale }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.bracketTR,
                  { borderColor: bracketsColor, transform: [{ scale: bracketsScale }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.bracketBL,
                  { borderColor: bracketsColor, transform: [{ scale: bracketsScale }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.bracketBR,
                  { borderColor: bracketsColor, transform: [{ scale: bracketsScale }] },
                ]}
              />
              {!isPaused ? (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslate }] },
                  ]}
                />
              ) : null}
              {isPaused ? (
                <View style={styles.pausedBadge}>
                  <AppText bold style={styles.pausedText}>စကင်ဖတ်ခြင်း ရပ်ထားသည်</AppText>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.permission}>
              <View style={styles.camIcon}>
                <View style={styles.camBody} />
                <View style={styles.camLens} />
                <View style={styles.camFlash} />
              </View>
              <AppText bold style={styles.permissionText}>
                ကင်မရာခွင့်ပြုချက် လိုအပ်ပါသည်
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={requestPermission}
                style={styles.allowBtn}
              >
                <AppText bold style={styles.allowText}>ခွင့်ပြုရန်</AppText>
              </Pressable>
            </View>
          )}
        </View>

        {lastItem ? (
          <View style={styles.cardWrap}>
            <AppText style={styles.cardLabel}>မကြာသေးမီက စကင်ထားသော</AppText>
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [
                    {
                      translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <AppText bold style={styles.avatarText}>
                  {lastItem.name.slice(0, 1)}
                </AppText>
              </View>
              <View style={styles.cardInfo}>
                <AppText bold style={styles.cardName} numberOfLines={1}>
                  {lastItem.name}
                </AppText>
                {lastItem.size ? (
                  <AppText style={styles.cardSize} numberOfLines={1}>
                    {lastItem.size}
                  </AppText>
                ) : null}
              </View>
              <AppText bold style={styles.cardPrice}>
                {formatKyat(lastItem.price)}
              </AppText>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#3B3F76',
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  bgGradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 420,
    backgroundColor: '#4A4F8F', opacity: 0.85,
  },
  bgGradientBottom: {
    position: 'absolute', top: 380, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1B1F3A',
  },
  bgGlow: {
    position: 'absolute', top: -80, left: '50%', marginLeft: -160,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: colors.accent, opacity: 0.18,
  },
  topBar: {
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 40,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  titleArea: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 15 },
  topRowRight: { flex: 1 },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 10 },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTrack: {
    width: 44, height: 26, borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleText: { color: '#fff', fontSize: 12 },
  viewfinderWrap: {
    height: 280, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: '#000', position: 'relative',
  },
  camera: { ...StyleSheet.absoluteFillObject, borderRadius: radius.lg },
  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  bracketTL: {
    position: 'absolute', top: 40, left: 40, width: 34, height: 34,
    borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12,
  },
  bracketTR: {
    position: 'absolute', top: 40, right: 40, width: 34, height: 34,
    borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12,
  },
  bracketBL: {
    position: 'absolute', bottom: 40, left: 40, width: 34, height: 34,
    borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12,
  },
  bracketBR: {
    position: 'absolute', bottom: 40, right: 40, width: 34, height: 34,
    borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    width: 260, height: 2,
    backgroundColor: colors.accent,
    opacity: 0.85,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  pausedBadge: {
    position: 'absolute', top: 12, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.md,
  },
  pausedText: { color: '#fff', fontSize: 12 },
  permission: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 14, padding: 24,
  },
  camIcon: { width: 60, height: 50, alignItems: 'center', justifyContent: 'center' },
  camBody: { width: 60, height: 44, borderRadius: 10, borderWidth: 2, borderColor: '#fff', opacity: 0.7 },
  camLens: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#fff', opacity: 0.7,
  },
  camFlash: {
    position: 'absolute', top: 4, right: 12,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#fff', opacity: 0.5,
  },
  permissionText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  allowBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: radius.md,
  },
  allowText: { color: '#fff', fontSize: 14 },
  cardWrap: { marginTop: 16 },
  cardLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 11,
    marginBottom: 8, letterSpacing: 0.4,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 14,
    ...shadow,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: { color: colors.text, fontSize: 15 },
  cardSize: { color: colors.muted, fontSize: 12, marginTop: 2 },
  cardPrice: { color: colors.text, fontSize: 15, marginLeft: 8 },
});
