/**
 * PatientsDashboardScreen.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Patient Dashboard Screen.
 * Complete integration:
 * - Collapsible Large Title Layout ("Pacientes")
 * - Prominent Apple HIG "+ Novo" header action button
 * - Instant real-time search calling usePatients()
 * - Status filter segmented control ('Todos', 'Em Tratamento', 'Alta', 'Inativos')
 * - Inset Grouped Patient Cards with quick actions & Action Sheet
 * - Add/Edit modal (PatientFormModal) excluding CPF/CEP/Estado Civil
 * - Pull-to-refresh and empty states
 * - Clinic Identity footer
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Layout,
  LargeTitleLayout,
  Haptics,
  SegmentedControl,
  ClinicIdentity,
  CLINIC_IDENTITY,
} from '../../design-system';
import { Patient, CreatePatientInput, UpdatePatientInput } from '../../types/patient';
import { usePatients, PatientFilterStatus } from './PatientContext';
import { PatientCard } from './PatientCard';
import { PatientSearchBar } from './PatientSearchBar';
import { PatientEmptyState } from './PatientEmptyState';
import { PatientFormModal } from './PatientFormModal';

export interface PatientsDashboardScreenProps {
  onNavigateToEvaluation?: (patientId: string) => void;
  onNavigateToWorkouts?: (patientId: string) => void;
}

export function PatientsDashboardScreen({
  onNavigateToEvaluation,
  onNavigateToWorkouts,
}: PatientsDashboardScreenProps) {
  const {
    filteredPatients,
    loading,
    refreshing,
    refreshPatients,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    clearFilters,
    createPatient,
    updatePatient,
    deletePatient,
  } = usePatients();

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Filter definitions
  const filterOptions = ['Todos', 'Em Tratamento', 'Alta', 'Inativos'] as const;
  const statusMap: Record<number, PatientFilterStatus> = {
    0: 'all',
    1: 'active',
    2: 'discharged',
    3: 'archived',
  };

  const getFilterIndex = (): number => {
    switch (statusFilter) {
      case 'active':
        return 1;
      case 'discharged':
        return 2;
      case 'archived':
        return 3;
      case 'all':
      default:
        return 0;
    }
  };

  const handleOpenAddModal = () => {
    Haptics.impactMedium();
    setEditingPatient(null);
    setModalVisible(true);
  };

  const handleEditPatient = (patient: Patient) => {
    Haptics.selection();
    setEditingPatient(patient);
    setModalVisible(true);
  };

  const handleViewEvaluation = (patient: Patient) => {
    Haptics.selection();
    if (onNavigateToEvaluation) {
      onNavigateToEvaluation(patient.id);
    } else {
      Alert.alert(
        'Ficha de Avaliação',
        `Prontuário de ${patient.name}:\nAnamnese, Avaliação Postural e Bioimpedância (Módulo Clínico M4).`
      );
    }
  };

  const handleManageWorkouts = (patient: Patient) => {
    Haptics.selection();
    if (onNavigateToWorkouts) {
      onNavigateToWorkouts(patient.id);
    } else {
      Alert.alert(
        'Gerenciar Treinos',
        `Rotinas de Pilates e exercícios prescritos para ${patient.name} (Módulo de Treinos M5).`
      );
    }
  };

  const handleDeletePatient = async (patient: Patient) => {
    try {
      await deletePatient(patient.id);
    } catch (err: any) {
      Alert.alert('Erro ao excluir', err?.message || 'Não foi possível excluir o paciente.');
    }
  };

  const handleSavePatient = async (
    data: CreatePatientInput | UpdatePatientInput,
    patientId?: string
  ) => {
    if (patientId) {
      await updatePatient(patientId, data as UpdatePatientInput);
    } else {
      await createPatient(data as CreatePatientInput);
    }
  };

  // Live count summary
  const summaryCountText = useMemo(() => {
    if (loading) return '';
    const count = filteredPatients.length;
    if (searchQuery.trim().length > 0) {
      return `${count} paciente${count === 1 ? '' : 's'} encontrado${count === 1 ? '' : 's'}`;
    }
    return `${count} paciente${count === 1 ? '' : 's'} cadastrado${count === 1 ? '' : 's'}`;
  }, [filteredPatients.length, searchQuery, loading]);

  return (
    <LargeTitleLayout
      title="Pacientes"
      subtitle={`${CLINIC_IDENTITY.professionalName} • ${CLINIC_IDENTITY.crefito}`}
      rightAction={
        <TouchableOpacity
          onPress={handleOpenAddModal}
          style={styles.headerAddButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Cadastrar novo paciente"
        >
          <Ionicons name="add" size={20} color={Colors.textInverse} style={styles.addIcon} />
          <Text style={styles.headerAddButtonText}>Novo</Text>
        </TouchableOpacity>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshPatients}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* 1. Real-time Search Field */}
      <View style={styles.searchSection}>
        <PatientSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={clearFilters}
        />
      </View>

      {/* 2. Status Filter Segmented Control */}
      <View style={styles.filterSection}>
        <SegmentedControl
          values={filterOptions}
          selectedIndex={getFilterIndex()}
          onChange={(index) => {
            Haptics.selection();
            setStatusFilter(statusMap[index]);
          }}
        />
      </View>

      {/* 3. Result Count / Header Info */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{summaryCountText}</Text>
      </View>

      {/* 4. Patients List or Empty State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando prontuários...</Text>
        </View>
      ) : filteredPatients.length === 0 ? (
        <PatientEmptyState
          searchQuery={searchQuery}
          onClearSearch={clearFilters}
          onAddPatient={handleOpenAddModal}
        />
      ) : (
        <View style={styles.listContainer}>
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onPress={() => handleViewEvaluation(patient)}
              onViewEvaluation={handleViewEvaluation}
              onEditPatient={handleEditPatient}
              onManageWorkouts={handleManageWorkouts}
              onDeletePatient={handleDeletePatient}
            />
          ))}
        </View>
      )}

      {/* 5. Professional Clinic Identity Footer */}
      <View style={styles.footerContainer}>
        <ClinicIdentity variant="footer" />
      </View>

      {/* 6. Patient Creation / Editing Modal */}
      <PatientFormModal
        visible={modalVisible}
        patient={editingPatient}
        onClose={() => setModalVisible(false)}
        onSave={handleSavePatient}
      />
    </LargeTitleLayout>
  );
}

const styles = StyleSheet.create({
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary, // Official Brand Lilás #9B6CBA
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill, // HIG pill button
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  addIcon: {
    marginRight: 2,
  },
  headerAddButtonText: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  searchSection: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterSection: {
    marginBottom: Spacing.sm,
  },
  countRow: {
    paddingHorizontal: 4,
    marginBottom: Spacing.sm,
  },
  countText: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  listContainer: {
    paddingBottom: Spacing.base,
  },
  footerContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
