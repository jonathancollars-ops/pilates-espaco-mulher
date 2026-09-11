/**
 * PatientQuickActions.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Action Sheet and Action Bar for Patient Cards.
 * Implements the 4 required clinical actions:
 * 1. "Ver Avaliação" (navigates to clinical evaluation sheet)
 * 2. "Editar Cadastro" (opens edit modal)
 * 3. "Gerenciar Treinos" (navigates to workout routines)
 * 4. "Excluir" (with native Alert.alert confirmation and Haptics.warning())
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActionSheetIOS,
  Alert,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '../../design-system/tokens';
import { Haptics } from '../../design-system/Haptics';
import { Patient } from '../../types/patient';

export interface PatientQuickActionsProps {
  patient: Patient;
  onViewEvaluation: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onManageWorkouts: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
  style?: StyleProp<ViewStyle>;
}

export function showPatientActionSheet({
  patient,
  onViewEvaluation,
  onEditPatient,
  onManageWorkouts,
  onDeletePatient,
}: {
  patient: Patient;
  onViewEvaluation: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onManageWorkouts: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
}) {
  const confirmDelete = () => {
    Haptics.warning();
    Alert.alert(
      'Excluir Paciente',
      `Tem certeza que deseja excluir ${patient.name}?\n\nEsta ação é irreversível e excluirá permanentemente todo o histórico de avaliações posturais, bioimpedância e rotinas de treino associadas.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir Paciente',
          style: 'destructive',
          onPress: () => {
            Haptics.warning();
            onDeletePatient(patient);
          },
        },
      ]
    );
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: patient.name,
        message: 'Ações clínicas e cadastrais',
        options: ['Cancelar', 'Ver Avaliação', 'Editar Cadastro', 'Gerenciar Treinos', 'Excluir'],
        destructiveButtonIndex: 4,
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        switch (buttonIndex) {
          case 1: // Ver Avaliação
            Haptics.selection();
            onViewEvaluation(patient);
            break;
          case 2: // Editar Cadastro
            Haptics.selection();
            onEditPatient(patient);
            break;
          case 3: // Gerenciar Treinos
            Haptics.selection();
            onManageWorkouts(patient);
            break;
          case 4: // Excluir
            confirmDelete();
            break;
        }
      }
    );
  } else {
    // Cross-platform fallback Alert menu
    Alert.alert(
      patient.name,
      'Selecione uma ação:',
      [
        { text: 'Ver Avaliação', onPress: () => onViewEvaluation(patient) },
        { text: 'Gerenciar Treinos', onPress: () => onManageWorkouts(patient) },
        { text: 'Editar Cadastro', onPress: () => onEditPatient(patient) },
        { text: 'Excluir', style: 'destructive', onPress: confirmDelete },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }
}

export function PatientQuickActions({
  patient,
  onViewEvaluation,
  onEditPatient,
  onManageWorkouts,
  onDeletePatient,
  style,
}: PatientQuickActionsProps) {
  const handleOpenActionSheet = () => {
    Haptics.impactLight();
    showPatientActionSheet({
      patient,
      onViewEvaluation,
      onEditPatient,
      onManageWorkouts,
      onDeletePatient,
    });
  };

  const handleEvaluationPress = () => {
    Haptics.selection();
    onViewEvaluation(patient);
  };

  const handleWorkoutsPress = () => {
    Haptics.selection();
    onManageWorkouts(patient);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Primary Action Button: Ver Avaliação */}
      <TouchableOpacity
        style={[styles.actionPill, styles.actionPillPrimary]}
        onPress={handleEvaluationPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Ver avaliação clínica de ${patient.name}`}
      >
        <Ionicons name="clipboard-outline" size={15} color={Colors.primaryDark} style={styles.buttonIcon} />
        <Text style={styles.actionTextPrimary}>Avaliação</Text>
      </TouchableOpacity>

      {/* Secondary Action Button: Gerenciar Treinos */}
      <TouchableOpacity
        style={[styles.actionPill, styles.actionPillSecondary]}
        onPress={handleWorkoutsPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Gerenciar treinos de ${patient.name}`}
      >
        <Ionicons name="fitness-outline" size={15} color={Colors.primaryDark} style={styles.buttonIcon} />
        <Text style={styles.actionTextSecondary}>Treinos</Text>
      </TouchableOpacity>

      {/* Overflow Action Sheet Button */}
      <TouchableOpacity
        style={styles.moreButton}
        onPress={handleOpenActionSheet}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Mais opções para ${patient.name}`}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: Radii.pill,
  },
  actionPillPrimary: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D4BFE3',
  },
  actionPillSecondary: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D7E4',
  },
  buttonIcon: {
    marginRight: 4,
  },
  actionTextPrimary: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  actionTextSecondary: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0D7E4',
  },
});
