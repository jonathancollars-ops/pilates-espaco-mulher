/**
 * Proposed Screen: PatientsDashboardScreen.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Patient Dashboard Screen.
 * Complete integration:
 * - Collapsible Large Title Layout ("Pacientes")
 * - Prominent Apple HIG "+ Novo Paciente" header action button
 * - Instant real-time search calling `patientRepository.search(query)`
 * - Status filter segmented control with dynamic badges
 * - Inset Grouped Patient Cards with quick action sheet & dialog
 * - Add/Edit modal (PatientFormModal) excluding CPF/CEP/Estado Civil
 * - Pull-to-refresh and empty states
 * - Clinic Identity footer
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '../../../src/design-system';
import { Patient, PatientStatus, CreatePatientInput, UpdatePatientInput } from '../../../src/types/patient';
import { patientRepository } from '../../../src/database/repositories/patientRepository';
import { PatientCard } from './proposed_PatientCard';
import { PatientSearchBar } from './proposed_PatientSearchBar';
import { PatientEmptyState } from './proposed_PatientEmptyState';
import { PatientFormModal } from './proposed_PatientFormModal';

export interface PatientsDashboardScreenProps {
  onNavigateToEvaluation?: (patientId: string) => void;
  onNavigateToWorkouts?: (patientId: string) => void;
}

export function PatientsDashboardScreen({
  onNavigateToEvaluation,
  onNavigateToWorkouts,
}: PatientsDashboardScreenProps) {
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Filter definitions
  const filterOptions = ['Todos', 'Em Tratamento', 'Alta'] as const;
  const filterStatuses: (PatientStatus | undefined)[] = [undefined, 'active', 'discharged'];

  /**
   * Load patients from SQLite repository
   */
  const loadPatients = useCallback(async (query = searchQuery, filterIdx = selectedFilterIndex) => {
    try {
      const status = filterStatuses[filterIdx];
      let results: Patient[] = [];

      if (query && query.trim().length > 0) {
        results = await patientRepository.search(query.trim(), { status });
      } else {
        results = await patientRepository.listAll({ status });
      }

      setPatients(results);
    } catch (err: any) {
      console.error('[PatientsDashboard] Error loading patients:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedFilterIndex]);

  // Initial load
  useEffect(() => {
    loadPatients(searchQuery, selectedFilterIndex);
  }, [loadPatients]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.selection();
    loadPatients(searchQuery, selectedFilterIndex);
  }, [loadPatients, searchQuery, selectedFilterIndex]);

  // Search query change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    loadPatients(text, selectedFilterIndex);
  };

  // Filter change
  const handleFilterChange = (index: number) => {
    setSelectedFilterIndex(index);
    loadPatients(searchQuery, index);
  };

  // Quick Action Handlers
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
      await patientRepository.delete(patient.id);
      Haptics.warning();
      await loadPatients(searchQuery, selectedFilterIndex);
    } catch (err: any) {
      Alert.alert('Erro ao excluir', err?.message || 'Não foi possível excluir o paciente.');
    }
  };

  // Save creation / update
  const handleSavePatient = async (
    data: CreatePatientInput | UpdatePatientInput,
    patientId?: string
  ) => {
    if (patientId) {
      await patientRepository.update(patientId, data as UpdatePatientInput);
    } else {
      await patientRepository.create(data as CreatePatientInput);
    }
    await loadPatients(searchQuery, selectedFilterIndex);
  };

  // Live count summary
  const summaryCountText = useMemo(() => {
    if (loading) return '';
    const count = patients.length;
    if (searchQuery.trim().length > 0) {
      return `${count} paciente${count === 1 ? '' : 's'} encontrado${count === 1 ? '' : 's'}`;
    }
    return `${count} paciente${count === 1 ? '' : 's'} cadastrado${count === 1 ? '' : 's'}`;
  }, [patients.length, searchQuery, loading]);

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
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* 1. Real-time Search Field */}
      <View style={styles.searchSection}>
        <PatientSearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          onClear={() => handleSearchChange('')}
        />
      </View>

      {/* 2. Status Filter Segmented Control */}
      <View style={styles.filterSection}>
        <SegmentedControl
          values={filterOptions}
          selectedIndex={selectedFilterIndex}
          onChange={handleFilterChange}
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
      ) : patients.length === 0 ? (
        <PatientEmptyState
          searchQuery={searchQuery}
          onClearSearch={() => handleSearchChange('')}
          onAddPatient={handleOpenAddModal}
        />
      ) : (
        <View style={styles.listContainer}>
          {patients.map((patient) => (
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
    marginHorizontal: Layout.screenMarginHorizontal,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterSection: {
    marginBottom: Spacing.sm,
  },
  countRow: {
    marginHorizontal: Layout.screenMarginHorizontal + 4,
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
