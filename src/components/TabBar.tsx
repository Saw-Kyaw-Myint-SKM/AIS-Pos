import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { HomeIcon, PackageIcon, ReceiptIcon } from './ServiceIcon';
import { font } from '../theme';

type Tab = {
  key: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  activeKey: string;
  onTab: (key: string) => void;
};

const ACCENT = '#4F46E5';
const INACTIVE = '#9CA3AF';
const BAR_HEIGHT = 56;
const ICON_SIZE = 22;
const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_WIDTH = SCREEN_WIDTH - 100;
const TAB_COUNT = 3;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;
const INDICATOR_W = 32;

const ICONS: Record<string, React.ComponentType<{ color: string; size?: number }>> = {
  home: HomeIcon,
  clothes: PackageIcon,
  history: ReceiptIcon,
};

export default function TabBar({ tabs, activeKey, onTab }: Props) {
  const insets = useSafeAreaInsets();
  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.key === activeKey);
    if (activeIndex >= 0) {
      const targetX = activeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_W) / 2;
      Animated.spring(indicatorX, {
        toValue: targetX,
        tension: 50,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [activeKey, tabs, indicatorX]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 6 }]}>
      <View style={styles.bar}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: INDICATOR_W,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          const Icon = ICONS[tab.key];

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              onPress={() => onTab(tab.key)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
            >
              <View style={styles.iconWrap}>
                {Icon && (
                  <Icon
                    color={active ? ACCENT : INACTIVE}
                    size={active ? ICON_SIZE : 20}
                  />
                )}
              </View>
              <AppText style={[styles.label, active && styles.labelActive]}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: BAR_WIDTH,
    marginBottom: 12,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: BAR_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    bottom: 4,
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  itemPressed: {
    opacity: 0.6,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: font.regular,
    color: INACTIVE,
    marginTop: 2,
  },
  labelActive: {
    fontSize: 10,
    fontFamily: font.bold,
    color: ACCENT,
  },
});
