/**
 * Pilates Espaço Mulher — Large Title Header & Transitions
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) Collapsible Large Title.
 * Provides smooth 60fps native-driver animated scroll transitions from
 * 34pt Large Title to a compact 17pt inline navigation bar.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  StyleProp,
  ViewStyle,
  RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Layout } from './tokens';

export interface LargeTitleHeaderProps {
  title: string;
  subtitle?: string;
  compactTitle?: string;
  scrollY: Animated.Value;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  collapseThreshold?: number;
}

export interface LargeTitleHeroProps {
  title: string;
  subtitle?: string;
  scrollY: Animated.Value;
  accessory?: React.ReactNode;
  collapseThreshold?: number;
}

export interface LargeTitleNavBarProps {
  title: string;
  compactTitle?: string;
  scrollY: Animated.Value;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  collapseThreshold?: number;
}

export interface LargeTitleLayoutProps {
  title: string;
  subtitle?: string;
  compactTitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Hook to manage native scroll animation for Large Titles
 */
export function useLargeTitleScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  return {
    scrollY,
    scrollProps: {
      onScroll,
      scrollEventThrottle: 16,
      showsVerticalScrollIndicator: true,
    },
  };
}

/**
 * Fixed top navigation bar with animated compact title and background transition
 */
export function LargeTitleNavBar({
  title,
  compactTitle,
  scrollY,
  leftAction,
  rightAction,
  collapseThreshold = 52,
}: LargeTitleNavBarProps) {
  const insets = useSafeAreaInsets();
  const displayTitle = compactTitle ?? title;

  // Background and border opacity: fades in as user scrolls
  const bgOpacity = scrollY.interpolate({
    inputRange: [collapseThreshold * 0.4, collapseThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Compact title opacity and subtle translation
  const titleOpacity = scrollY.interpolate({
    inputRange: [collapseThreshold * 0.6, collapseThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [collapseThreshold * 0.6, collapseThreshold],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.navBarContainer,
        { paddingTop: insets.top, height: insets.top + 44 },
      ]}
      pointerEvents="box-none"
    >
      {/* Animated solid background & separator */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.navBarBackground,
          { opacity: bgOpacity },
        ]}
      />

      {/* Content row (44pt standard iOS navbar height) */}
      <View style={styles.navBarContent}>
        <View style={styles.navBarSideSlot}>
          {leftAction}
        </View>

        <Animated.View
          style={[
            styles.navBarTitleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.navBarTitleText} numberOfLines={1}>
            {displayTitle}
          </Text>
        </Animated.View>

        <View style={[styles.navBarSideSlot, styles.navBarRightSlot]}>
          {rightAction}
        </View>
      </View>
    </View>
  );
}

/**
 * Hero large title section rendered at the top of the scrollable content
 */
export function LargeTitleHero({
  title,
  subtitle,
  scrollY,
  accessory,
  collapseThreshold = 52,
}: LargeTitleHeroProps) {
  // Opacity: fades out as user scrolls up
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, collapseThreshold * 0.8],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Translation: drifts slightly upwards during scroll
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, collapseThreshold],
    outputRange: [15, 0, -12],
    extrapolate: 'clamp',
  });

  // Elastic scale on rubber-band pull down
  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.12, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.heroContainer,
        {
          opacity: heroOpacity,
          transform: [
            { translateY: heroTranslateY },
            { scale: heroScale },
          ],
        },
      ]}
    >
      <View style={styles.heroTextContainer}>
        {subtitle ? (
          <Text style={styles.heroSubtitleText}>{subtitle}</Text>
        ) : null}
        <Text
          style={styles.heroTitleText}
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
      </View>
      {accessory ? <View style={styles.heroAccessory}>{accessory}</View> : null}
    </Animated.View>
  );
}

/**
 * All-in-one Layout Component for screens with standard scroll content
 */
export function LargeTitleLayout({
  title,
  subtitle,
  compactTitle,
  leftAction,
  rightAction,
  children,
  refreshControl,
  contentContainerStyle,
}: LargeTitleLayoutProps) {
  const insets = useSafeAreaInsets();
  const { scrollY, scrollProps } = useLargeTitleScroll();

  return (
    <View style={styles.screenRoot}>
      <LargeTitleNavBar
        title={title}
        compactTitle={compactTitle}
        scrollY={scrollY}
        leftAction={leftAction}
        rightAction={rightAction}
      />
      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: insets.top + 44 + 8, paddingBottom: insets.bottom + 24 },
          contentContainerStyle,
        ]}
      >
        <LargeTitleHero
          title={title}
          subtitle={subtitle}
          scrollY={scrollY}
        />
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  navBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  navBarBackground: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  navBarContent: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenMarginHorizontal,
  },
  navBarSideSlot: {
    minWidth: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  navBarRightSlot: {
    alignItems: 'flex-end',
  },
  navBarTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  navBarTitleText: {
    ...Typography.headline,
    color: Colors.text,
  },
  scrollContainer: {
    paddingHorizontal: Layout.screenMarginHorizontal,
  },
  heroContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroSubtitleText: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  heroTitleText: {
    ...Typography.largeTitle,
    color: Colors.text,
  },
  heroAccessory: {
    marginLeft: Spacing.md,
    marginBottom: Spacing.xs,
  },
});
