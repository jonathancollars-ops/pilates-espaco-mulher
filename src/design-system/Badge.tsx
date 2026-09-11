/**
 * Pilates Espaço Mulher — Clinical Status & Metric Badge
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) status chips and metric tags.
 * Supports filled, subtle, and outline styles with semantic brand coloring.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Radii } from './tokens';
import { Haptics } from './Haptics';

export type BadgeVariant = 
  | 'primary'    // Lilás (#9B6CBA)
  | 'secondary'  // Lavanda suave
  | 'success'    // Verde floresta (#1B5235)
  | 'alert'      // Vinho alert (#6A1B15)
  | 'warning'    // Âmbar (#C27803)
  | 'neutral';   // Cinza neutro (#6E6573)

export type BadgeStyleType = 'filled' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
  styleType?: BadgeStyleType;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dot?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function Badge({
  label,
  variant = 'primary',
  styleType = 'subtle',
  size = 'md',
  icon,
  dot = false,
  onPress,
  style,
  textStyle,
  testID,
}: BadgeProps) {
  const getTheme = () => {
    switch (variant) {
      case 'success':
        return {
          filledBg: Colors.success,
          filledText: Colors.textInverse,
          subtleBg: Colors.successLight,
          subtleText: Colors.success,
          subtleBorder: '#B9DFCA',
        };
      case 'alert':
        return {
          filledBg: Colors.destructive,
          filledText: Colors.textInverse,
          subtleBg: Colors.destructiveLight,
          subtleText: Colors.destructive,
          subtleBorder: '#F4BFBC',
        };
      case 'warning':
        return {
          filledBg: Colors.warning,
          filledText: Colors.textInverse,
          subtleBg: Colors.warningLight,
          subtleText: '#A06102',
          subtleBorder: '#FAD7A0',
        };
      case 'secondary':
        return {
          filledBg: Colors.primaryLight,
          filledText: Colors.textPrimary,
          subtleBg: Colors.surfaceSecondary,
          subtleText: Colors.primaryDark,
          subtleBorder: Colors.border,
        };
      case 'neutral':
        return {
          filledBg: Colors.textSecondary,
          filledText: Colors.textInverse,
          subtleBg: '#F0ECF3',
          subtleText: Colors.textSecondary,
          subtleBorder: '#E0D9E5',
        };
      case 'primary':
      default:
        return {
          filledBg: Colors.primary,
          filledText: Colors.textInverse,
          subtleBg: Colors.primarySubtle,
          subtleText: Colors.primaryDark,
          subtleBorder: Colors.primaryLight,
        };
    }
  };

  const theme = getTheme();

  let bg = theme.subtleBg;
  let textColor = theme.subtleText;
  let borderColor = theme.subtleBorder;
  let borderWidth = StyleSheet.hairlineWidth;

  if (styleType === 'filled') {
    bg = theme.filledBg;
    textColor = theme.filledText;
    borderWidth = 0;
  } else if (styleType === 'outline') {
    bg = 'transparent';
    textColor = theme.subtleText;
    borderColor = theme.filledBg;
    borderWidth = 1;
  }

  const handlePress = () => {
    if (!onPress) return;
    Haptics.selection();
    onPress();
  };

  const content = (
    <View
      style={[
        styles.badgeBase,
        styles[`size_${size}`],
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
        },
        style,
      ]}
      testID={testID}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            styles[`dot_${size}`],
            { backgroundColor: textColor },
          ]}
        />
      )}

      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}

      <Text
        style={[
          styles.labelText,
          styles[`text_${size}`],
          { color: textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.badgePressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  badgePressed: {
    opacity: 0.8,
  },
  size_sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  size_lg: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dot: {
    borderRadius: Radii.pill,
    marginRight: 5,
  },
  dot_sm: {
    width: 4,
    height: 4,
  },
  dot_md: {
    width: 6,
    height: 6,
  },
  dot_lg: {
    width: 8,
    height: 8,
  },
  iconSlot: {
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_sm: {
    ...Typography.caption2,
    fontSize: 10,
    lineHeight: 12,
  },
  text_md: {
    ...Typography.caption1,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  text_lg: {
    ...Typography.footnote,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
