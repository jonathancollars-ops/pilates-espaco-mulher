/**
 * Proposed Component: PatientSearchBar.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Search Field for real-time patient filtering by name or phone.
 * Includes debounced input handling, clear button, and haptic feedback.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Layout } from '../../../src/design-system/tokens';
import { Haptics } from '../../../src/design-system/Haptics';

export interface PatientSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PatientSearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Buscar por nome ou telefone...',
  debounceMs = 150,
  style,
  testID,
}: PatientSearchBarProps) {
  const [internalText, setInternalText] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize internal text if external value resets or changes externally
  useEffect(() => {
    setInternalText(value);
  }, [value]);

  const handleChangeText = (text: string) => {
    setInternalText(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (debounceMs <= 0) {
      onChangeText(text);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        onChangeText(text);
      }, debounceMs);
    }
  };

  const handleClear = () => {
    Haptics.impactLight();
    setInternalText('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onChangeText('');
    onClear?.();
  };

  const hasValue = internalText.length > 0;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Ionicons
        name="search"
        size={18}
        color={Colors.textSecondary}
        style={styles.searchIcon}
      />

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={internalText}
        onChangeText={handleChangeText}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        clearButtonMode="never" // Using custom cross-platform clear button
        accessibilityLabel="Campo de busca de pacientes por nome ou telefone"
      />

      {hasValue && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearButton}
          accessibilityLabel="Limpar busca"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2D9E8',
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.subhead,
    color: Colors.textPrimary,
    height: '100%',
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  clearButton: {
    padding: Spacing.xxs,
    marginLeft: Spacing.xs,
  },
});
