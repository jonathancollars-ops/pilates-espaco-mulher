/**
 * Proposed Component: PatientEmptyState.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Empty State for the Patient Dashboard.
 * Handles both "zero search results" and "empty database" states
 * with brand iconography, clear copywriting, and tactile action buttons.
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../../../src/design-system/tokens';
import { Button } from '../../../src/design-system/Button';
import { Haptics } from '../../../src/design-system/Haptics';

export interface PatientEmptyStateProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  onAddPatient?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PatientEmptyState({
  searchQuery,
  onClearSearch,
  onAddPatient,
  style,
}: PatientEmptyStateProps) {
  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);

  const handleClear = () => {
    Haptics.selection();
    onClearSearch?.();
  };

  const handleAdd = () => {
    Haptics.impactMedium();
    onAddPatient?.();
  };

  if (isSearchActive) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.iconCircle}>
          <Ionicons name="search-outline" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.titleText}>Nenhum paciente encontrado</Text>
        <Text style={styles.bodyText}>
          Não localizamos resultados correspondentes a "{searchQuery?.trim()}". Verifique o nome ou telefone digitado.
        </Text>
        {onClearSearch ? (
          <Button
            title="Limpar Busca"
            onPress={handleClear}
            variant="secondary"
            size="regular"
            leadingIcon={<Ionicons name="close-circle-outline" size={18} color={Colors.primaryDark} />}
            style={styles.actionButton}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name="people-outline" size={40} color={Colors.primary} />
      </View>
      <Text style={styles.titleText}>Nenhum paciente cadastrado</Text>
      <Text style={styles.bodyText}>
        Comece adicionando seu primeiro paciente para registrar anamneses, avaliações posturais, bioimpedância e prescrever rotinas de Pilates.
      </Text>
      {onAddPatient ? (
        <Button
          title="+ Novo Paciente"
          onPress={handleAdd}
          variant="primary"
          size="regular"
          leadingIcon={<Ionicons name="add" size={20} color={Colors.textInverse} />}
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  titleText: {
    ...Typography.title3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  bodyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    minWidth: 180,
  },
});
