/**
 * Pilates Espaço Mulher — HIG Action Button
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) touch ergonomics button
 * with brand palette variants, loading states, and haptic feedback.
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  Insets,
} from 'react-native';
import { Colors, Typography, Radii, Layout } from './tokens';
import { Haptics } from './Haptics';

export type ButtonVariant = 
  | 'primary'      // Filled Lilás (#9B6CBA)
  | 'secondary'    // Tinted Lavanda (#F4EEF7) with #7A4F94 text
  | 'outline'      // Transparent with Lilás border
  | 'ghost'        // Plain text button
  | 'destructive'  // Alert wine (#6A1B15)
  | 'success';     // Forest green (#1B5235)

export type ButtonSize = 'small' | 'regular' | 'large';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  hapticFeedback,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const isInteractive = !disabled && !loading;

  const handlePress = () => {
    if (!isInteractive) return;

    // Trigger specified or default haptic feedback
    const feedbackMode = hapticFeedback ?? (variant === 'destructive' ? 'warning' : 'light');
    switch (feedbackMode) {
      case 'light':
        Haptics.impactLight();
        break;
      case 'medium':
        Haptics.impactMedium();
        break;
      case 'heavy':
        Haptics.impactHeavy();
        break;
      case 'success':
        Haptics.success();
        break;
      case 'warning':
        Haptics.warning();
        break;
      case 'error':
        Haptics.error();
        break;
      case 'none':
        break;
    }

    onPress();
  };

  // Get color configurations
  const getColors = (pressed: boolean) => {
    switch (variant) {
      case 'primary':
        return {
          bg: pressed ? Colors.primaryDark : Colors.primary,
          text: Colors.textInverse,
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: pressed ? '#E8DDF0' : Colors.surfaceSecondary,
          text: Colors.primaryDark,
          border: 'transparent',
        };
      case 'outline':
        return {
          bg: pressed ? Colors.surfaceSecondary : 'transparent',
          text: Colors.primaryDark,
          border: Colors.primary,
        };
      case 'ghost':
        return {
          bg: pressed ? 'rgba(155, 108, 186, 0.08)' : 'transparent',
          text: Colors.primary,
          border: 'transparent',
        };
      case 'destructive':
        return {
          bg: pressed ? '#501410' : Colors.destructive,
          text: Colors.textInverse,
          border: 'transparent',
        };
      case 'success':
        return {
          bg: pressed ? '#143E28' : Colors.success,
          text: Colors.textInverse,
          border: 'transparent',
        };
    }
  };

  // Touch target padding / hitSlop for small size
  const hitSlop: Insets | undefined = size === 'small'
    ? { top: 6, bottom: 6, left: 6, right: 6 }
    : undefined;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      hitSlop={hitSlop}
      style={({ pressed }) => {
        const colors = getColors(pressed && isInteractive);
        return [
          styles.baseButton,
          styles[`size_${size}`],
          fullWidth && styles.fullWidth,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: variant === 'outline' ? 1.5 : 0,
          },
          disabled && styles.buttonDisabled,
          style,
        ];
      }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
    >
      {({ pressed }) => {
        const colors = getColors(pressed && isInteractive);

        if (loading) {
          return (
            <ActivityIndicator
              size="small"
              color={colors.text}
            />
          );
        }

        return (
          <View style={styles.contentRow}>
            {leadingIcon ? (
              <View style={styles.leadingIconSlot}>{leadingIcon}</View>
            ) : null}

            <Text
              style={[
                styles.baseText,
                styles[`text_${size}`],
                { color: colors.text },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>

            {trailingIcon ? (
              <View style={styles.trailingIconSlot}>{trailingIcon}</View>
            ) : null}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  size_small: {
    height: 32,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
  },
  size_regular: {
    height: Layout.rowMinHeight, // 48pt
    borderRadius: Radii.md,
    paddingHorizontal: 20,
  },
  size_large: {
    height: 54,
    borderRadius: Radii.card,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    textAlign: 'center',
  },
  text_small: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  text_regular: {
    ...Typography.callout,
    fontWeight: '600',
  },
  text_large: {
    ...Typography.headline,
    fontWeight: '700',
  },
  leadingIconSlot: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingIconSlot: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
