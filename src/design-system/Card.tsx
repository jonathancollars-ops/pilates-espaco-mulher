/**
 * Pilates Espaço Mulher — Elevated Surface Card
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) continuous squircle container
 * with elevated shadows, header slots, and touch interaction.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Radii, Shadows, Spacing } from './tokens';
import { Haptics } from './Haptics';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'base' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  backgroundColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  title,
  subtitle,
  headerRight,
  footer,
  variant = 'elevated',
  padding = 'base',
  backgroundColor,
  onPress,
  style,
  testID,
}: CardProps) {
  const hasPress = Boolean(onPress);

  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactLight();
    onPress();
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return styles.cardOutlined;
      case 'filled':
        return styles.cardFilled;
      case 'elevated':
      default:
        return styles.cardElevated;
    }
  };

  const getPaddingStyle = () => {
    switch (padding) {
      case 'none':
        return styles.paddingNone;
      case 'sm':
        return styles.paddingSm;
      case 'lg':
        return styles.paddingLg;
      case 'base':
      default:
        return styles.paddingBase;
    }
  };

  const hasHeader = Boolean(title || subtitle || headerRight);

  const content = (
    <View
      style={[
        styles.cardBase,
        getVariantStyle(),
        backgroundColor ? { backgroundColor } : null,
        style,
      ]}
      testID={testID}
      accessibilityRole={hasPress ? 'button' : undefined}
    >
      {/* Optional Card Header */}
      {hasHeader && (
        <View style={styles.headerContainer}>
          <View style={styles.headerTitles}>
            {title ? (
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.headerSubtitleText} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {headerRight ? (
            <View style={styles.headerRightSlot}>{headerRight}</View>
          ) : null}
        </View>
      )}

      {/* Main Body Content */}
      <View style={getPaddingStyle()}>{children}</View>

      {/* Optional Card Footer */}
      {footer ? (
        <View style={styles.footerContainer}>
          {typeof footer === 'string' ? (
            <Text style={styles.footerText}>{footer}</Text>
          ) : (
            footer
          )}
        </View>
      ) : null}
    </View>
  );

  if (!hasPress) {
    return content;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => pressed && styles.cardPressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardElevated: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  cardOutlined: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardFilled: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D7E4',
  },
  paddingNone: {
    padding: 0,
  },
  paddingSm: {
    padding: Spacing.sm,
  },
  paddingBase: {
    padding: Spacing.base,
  },
  paddingLg: {
    padding: Spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitleText: {
    ...Typography.headline,
    color: Colors.textPrimary,
  },
  headerSubtitleText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRightSlot: {
    marginLeft: Spacing.sm,
  },
  footerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(244, 238, 247, 0.4)',
  },
  footerText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
});
