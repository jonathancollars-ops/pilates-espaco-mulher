/**
 * Pilates Espaço Mulher — Inset Grouped List Components
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Strict Apple Human Interface Guidelines (HIG) Inset Grouped List layout.
 * Features squircle corner clipping, indented hairline separators,
 * touch-target compliance, and haptic integration.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radii, Layout, Shadows } from './tokens';
import { Haptics } from './Haptics';

// ---------------------------------------------------------------------------
// InsetGroupedList (Root Container)
// ---------------------------------------------------------------------------

export interface InsetGroupedListProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

export function InsetGroupedList({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
}: InsetGroupedListProps) {
  if (!scrollable) {
    return (
      <View style={[styles.listContainer, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollRoot, style]}
      contentContainerStyle={[styles.listContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// InsetGroup (Section Group Card)
// ---------------------------------------------------------------------------

export interface InsetGroupProps {
  children: React.ReactNode;
  header?: string | React.ReactNode;
  footer?: string | React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function InsetGroup({
  children,
  header,
  footer,
  style,
}: InsetGroupProps) {
  const childArray = React.Children.toArray(children).filter(Boolean);
  const totalRows = childArray.length;

  return (
    <View style={[styles.groupWrapper, style]}>
      {/* Section Header */}
      {header ? (
        typeof header === 'string' ? (
          <Text style={styles.sectionHeaderText}>{header}</Text>
        ) : (
          header
        )
      ) : null}

      {/* Group Card */}
      <View style={styles.groupCard}>
        {childArray.map((child, index) => {
          if (!React.isValidElement(child)) {
            return child;
          }

          const isFirst = index === 0;
          const isLast = index === totalRows - 1;

          // If child already explicitly defined isFirst/isLast, preserve it
          const existingProps = child.props as InsetRowProps;
          return React.cloneElement(child as React.ReactElement<InsetRowProps>, {
            isFirst: existingProps.isFirst ?? isFirst,
            isLast: existingProps.isLast ?? isLast,
          });
        })}
      </View>

      {/* Section Footer */}
      {footer ? (
        typeof footer === 'string' ? (
          <Text style={styles.sectionFooterText}>{footer}</Text>
        ) : (
          footer
        )
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// InsetRow (List Row Item)
// ---------------------------------------------------------------------------

export interface InsetRowProps {
  label: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap | string | React.ReactNode;
  iconBackgroundColor?: string;
  iconColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  destructive?: boolean;
  accessory?: React.ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  hideSeparator?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function InsetRow({
  label,
  subtitle,
  value,
  icon,
  iconBackgroundColor,
  iconColor,
  onPress,
  onLongPress,
  destructive = false,
  accessory,
  showChevron,
  disabled = false,
  isFirst = false,
  isLast = false,
  hideSeparator = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: InsetRowProps) {
  const hasPress = Boolean(onPress || onLongPress);
  const shouldShowChevron = showChevron ?? (hasPress && !accessory);
  const hasIcon = Boolean(icon);

  // Determine corner radii based on position within group
  const cornerStyle: ViewStyle = {};
  if (isFirst && isLast) {
    cornerStyle.borderRadius = Radii.card;
  } else if (isFirst) {
    cornerStyle.borderTopLeftRadius = Radii.card;
    cornerStyle.borderTopRightRadius = Radii.card;
  } else if (isLast) {
    cornerStyle.borderBottomLeftRadius = Radii.card;
    cornerStyle.borderBottomRightRadius = Radii.card;
  }

  const handlePress = () => {
    if (disabled || !onPress) return;
    if (destructive) {
      Haptics.warning();
    } else {
      Haptics.selection();
    }
    onPress();
  };

  const handleLongPress = () => {
    if (disabled || !onLongPress) return;
    Haptics.impactMedium();
    onLongPress();
  };

  // Render leading icon slot
  const renderIcon = () => {
    if (!icon) return null;

    if (React.isValidElement(icon)) {
      return (
        <View
          style={[
            styles.iconWrapper,
            iconBackgroundColor ? { backgroundColor: iconBackgroundColor } : null,
          ]}
        >
          {icon}
        </View>
      );
    }

    if (typeof icon === 'string') {
      const iconTone = iconColor ?? (destructive ? Colors.destructive : Colors.primary);
      const bgTone = iconBackgroundColor ?? (destructive ? Colors.destructiveLight : Colors.primarySubtle);

      return (
        <View style={[styles.iconWrapper, { backgroundColor: bgTone }]}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={iconTone}
          />
        </View>
      );
    }

    return null;
  };

  const content = (
    <View
      style={[
        styles.rowContainer,
        cornerStyle,
        disabled && styles.rowDisabled,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityRole={hasPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
    >
      {/* Leading Icon */}
      {renderIcon()}

      {/* Main Label & Subtitle */}
      <View style={styles.labelWrapper}>
        <Text
          style={[
            styles.labelText,
            destructive && styles.labelDestructive,
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitleText} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Value */}
      {value !== undefined && value !== null ? (
        typeof value === 'string' || typeof value === 'number' ? (
          <Text style={styles.valueText} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <View style={styles.valueNodeWrapper}>{value}</View>
        )
      ) : null}

      {/* Custom Accessory */}
      {accessory ? (
        <View style={styles.accessoryWrapper}>{accessory}</View>
      ) : null}

      {/* Apple Navigation Chevron */}
      {shouldShowChevron ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={disabled ? Colors.separator : Colors.textTertiary}
          style={styles.chevronIcon}
        />
      ) : null}

      {/* Hairline Separator */}
      {!isLast && !hideSeparator ? (
        <View
          style={[
            styles.separator,
            { left: hasIcon ? Layout.separatorIndentWithIcon : Layout.separatorIndentWithoutIcon },
          ]}
        />
      ) : null}
    </View>
  );

  if (!hasPress) {
    return content;
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={disabled}
      style={({ pressed }) => [
        cornerStyle,
        pressed && !disabled && styles.rowPressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  listContainer: {
    paddingVertical: 12,
  },
  groupWrapper: {
    marginBottom: 20,
    marginHorizontal: Layout.insetGroupMarginHorizontal,
  },
  sectionHeaderText: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 16,
  },
  sectionFooterText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginTop: 6,
    marginLeft: 16,
    marginRight: 16,
    lineHeight: 18,
  },
  groupCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.rowMinHeight,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: Colors.surfaceCard,
    position: 'relative',
  },
  rowPressed: {
    backgroundColor: Colors.surfaceSecondary,
    opacity: 0.88,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  iconWrapper: {
    width: Layout.iconBoxSize,
    height: Layout.iconBoxSize,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  labelWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  labelText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  labelDestructive: {
    color: Colors.destructive,
    fontWeight: '600',
  },
  subtitleText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  valueText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: 8,
    textAlign: 'right',
  },
  valueNodeWrapper: {
    marginLeft: 8,
  },
  accessoryWrapper: {
    marginLeft: 8,
  },
  chevronIcon: {
    marginLeft: 6,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
  },
});
