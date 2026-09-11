/**
 * Pilates Espaço Mulher — iOS-Native Segmented Control
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) Segmented Control with
 * animated sliding pill indicator, responsive layout measurements,
 * badge counters, and tactile haptic feedback.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Radii, Shadows } from './tokens';
import { Haptics } from './Haptics';

export interface SegmentedControlProps<T extends string = string> {
  values: readonly T[] | T[];
  selectedIndex: number;
  onChange: (index: number, value: T) => void;
  badges?: Record<number, string | number>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentedControl<T extends string = string>({
  values,
  selectedIndex,
  onChange,
  badges,
  disabled = false,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(false);

  const numSegments = values.length;
  // Account for 2pt inner padding on left and right
  const segmentWidth = numSegments > 0 && containerWidth > 0
    ? (containerWidth - 4) / numSegments
    : 0;

  // Animate sliding pill on index change or dimension update
  useEffect(() => {
    if (segmentWidth <= 0) return;

    const toValue = Math.max(0, Math.min(selectedIndex, numSegments - 1)) * segmentWidth;

    if (!isMounted.current) {
      translateX.setValue(toValue);
      isMounted.current = true;
    } else {
      Animated.spring(translateX, {
        toValue,
        stiffness: 300,
        damping: 30,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedIndex, segmentWidth, numSegments, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  const handlePress = (index: number) => {
    if (disabled || index === selectedIndex || index < 0 || index >= values.length) {
      return;
    }
    Haptics.selection();
    onChange(index, values[index]);
  };

  if (values.length === 0) {
    return <View style={[styles.container, styles.emptyContainer, style]} />;
  }

  return (
    <View
      style={[styles.container, disabled && styles.containerDisabled, style]}
      onLayout={handleLayout}
      accessibilityRole="tablist"
      testID={testID}
    >
      {/* Sliding Pill Indicator */}
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.indicatorPill,
            {
              width: segmentWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {/* Segments */}
      <View style={styles.segmentsRow}>
        {values.map((value, index) => {
          const isSelected = index === selectedIndex;
          const badgeValue = badges ? badges[index] : undefined;

          return (
            <Pressable
              key={`${value}-${index}`}
              style={styles.segmentButton}
              onPress={() => handlePress(index)}
              disabled={disabled}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={String(value)}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected ? styles.segmentTextSelected : styles.segmentTextUnselected,
                ]}
                numberOfLines={1}
              >
                {value}
              </Text>

              {badgeValue !== undefined && badgeValue !== null ? (
                <View
                  style={[
                    styles.badgeContainer,
                    isSelected ? styles.badgeSelected : styles.badgeUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isSelected ? styles.badgeTextSelected : styles.badgeTextUnselected,
                    ]}
                  >
                    {badgeValue}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    backgroundColor: '#EFE9F3', // Soft lilac track
    borderRadius: Radii.md,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D7E4',
    position: 'relative',
    justifyContent: 'center',
  },
  emptyContainer: {
    opacity: 0.5,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  indicatorPill: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    height: 32,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.sm,
    ...Shadows.subtle,
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  segmentButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 4,
    zIndex: 2,
  },
  segmentText: {
    ...Typography.footnote,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  segmentTextUnselected: {
    color: Colors.textSecondary,
  },
  badgeContainer: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.pill,
  },
  badgeSelected: {
    backgroundColor: Colors.primarySubtle,
  },
  badgeUnselected: {
    backgroundColor: Colors.border,
  },
  badgeText: {
    ...Typography.caption2,
    fontWeight: '700',
  },
  badgeTextSelected: {
    color: Colors.primaryDark,
  },
  badgeTextUnselected: {
    color: Colors.textSecondary,
  },
});
