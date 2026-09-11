/**
 * PatientStatusBadge.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Semantic Apple HIG status badges for Patient status and Insurance.
 * Adheres strictly to brand palette:
 * - Active: Deep Forest Green (#1B5235) with subtle green background
 * - Discharged (Alta): Deep Lilac (#7A4F94) with lavender background
 * - Archived: Neutral Gray (#6E6573) with neutral background
 * - Insurance: Primary Lilac (#9B6CBA) outline or subtle badge
 */

import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Badge, BadgeVariant, BadgeSize } from '../../design-system/Badge';
import { PatientStatus } from '../../types/patient';

export interface PatientStatusBadgeProps {
  status: PatientStatus;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
}

export function PatientStatusBadge({
  status,
  size = 'sm',
  style,
}: PatientStatusBadgeProps) {
  const getStatusConfig = (): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case 'active':
        return { label: 'Em Tratamento', variant: 'success' };
      case 'discharged':
        return { label: 'Alta Clínica', variant: 'secondary' };
      case 'archived':
      default:
        return { label: 'Inativo', variant: 'neutral' };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      label={config.label}
      variant={config.variant}
      styleType="subtle"
      size={size}
      dot={true}
      style={style}
    />
  );
}

export interface PatientInsuranceBadgeProps {
  insurance?: string | null;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
}

export function PatientInsuranceBadge({
  insurance,
  size = 'sm',
  style,
}: PatientInsuranceBadgeProps) {
  const label = insurance && insurance.trim().length > 0 ? insurance.trim() : 'Particular';
  const isParticular = label.toLowerCase() === 'particular';

  return (
    <Badge
      label={label}
      variant={isParticular ? 'primary' : 'secondary'}
      styleType="outline"
      size={size}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
