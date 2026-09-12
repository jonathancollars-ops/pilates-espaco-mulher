/**
 * RoutineManagerScreen.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Workout Routine Prescription Screen.
 * Features:
 * - Patient selector with reactive patient context.
 * - Active / Archived routine list with session initiation.
 * - Interactive Routine Creator/Editor with sets, reps, springs, and postural cues.
 * - Exercise selector filtered by apparatus (Reformer, Cadillac, Wunda Chair,
 *   Ladder Barrel, Mat, Cinesioterapia) across all 49 classical exercises.
 * - "+ Criar Novo Exercício" Action Sheet / Modal with immediate SQLite persistence.
 * - Haptic feedback on all actions.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Shadows,
  Layout,
  LargeTitleLayout,
  Haptics,
  InsetGroupedList,
  InsetGroup,
  InsetRow,
  SegmentedControl,
  Button,
  Badge,
  Card,
  ClinicIdentity,
} from '../../design-system';
import { Patient } from '../../types/patient';
import {
  Routine,
  RoutineItem,
  RoutineWithItems,
  CreateRoutineInput,
  CreateRoutineItemInput,
  RoutineStatus,
} from '../../types/routine';
import { Exercise, ApparatusType } from '../../types/exercise';
import { usePatients } from '../patients/PatientContext';
import { routineRepository } from '../../database/repositories/routineRepository';
import { exerciseRepository } from '../../database/repositories/exerciseRepository';
import { NewExerciseModal } from './NewExerciseModal';
import { formatDateBR } from '../../utils/formatters';

export interface RoutineManagerScreenProps {
  patientId?: string;
  onGoBack?: () => void;
}

const APPARATUS_TABS: readonly (ApparatusType | 'Todos')[] = [
  'Todos',
  'Reformer',
  'Cadillac',
  'Wunda Chair',
  'Ladder Barrel',
  'Mat',
  'Cinesioterapia',
];

export function RoutineManagerScreen({
  patientId: initialPatientId,
  onGoBack,
}: RoutineManagerScreenProps) {
  const { patients, getPatientById } = usePatients();

  // Selected Patient State
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialPatientId || (patients.length > 0 ? patients[0].id : '')
  );

  const activePatient = useMemo<Patient | undefined>(() => {
    return getPatientById(selectedPatientId) || patients.find((p) => p.id === selectedPatientId);
  }, [selectedPatientId, getPatientById, patients]);

  // Routines State
  const [routines, setRoutines] = useState<RoutineWithItems[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Exercise Library State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState<string>('');
  const [selectedApparatusTab, setSelectedApparatusTab] = useState<number>(0);

  // Creator / Editor State
  const [isEditorVisible, setIsEditorVisible] = useState<boolean>(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState<string>('');
  const [routineNotes, setRoutineNotes] = useState<string>('');
  const [routineStatus, setRoutineStatus] = useState<RoutineStatus>('active');
  const [prescribedItems, setPrescribedItems] = useState<CreateRoutineItemInput[]>([]);

  // Exercise Picker Sheet Modal State
  const [isPickerVisible, setIsPickerVisible] = useState<boolean>(false);
  // Custom Exercise Creation Modal State
  const [isNewExerciseModalVisible, setIsNewExerciseModalVisible] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Load Routines and Exercises
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [loadedExercises, loadedRoutines] = await Promise.all([
        exerciseRepository.listAll(),
        selectedPatientId ? routineRepository.listByPatientId(selectedPatientId) : Promise.resolve([]),
      ]);

      setExercises(loadedExercises);
      setRoutines(loadedRoutines);
    } catch (err) {
      console.error('[RoutineManagerScreen] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Filtered Exercises for the Picker
  // ---------------------------------------------------------------------------
  const filteredExercises = useMemo(() => {
    let result = exercises;
    const currentTab = APPARATUS_TABS[selectedApparatusTab];

    if (currentTab !== 'Todos') {
      result = result.filter((ex) => ex.apparatus === currentTab);
    }

    if (exerciseSearch.trim().length > 0) {
      const q = exerciseSearch.toLowerCase();
      result = result.filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          (ex.description && ex.description.toLowerCase().includes(q)) ||
          (ex.postural_focus && ex.postural_focus.toLowerCase().includes(q))
      );
    }

    return result;
  }, [exercises, selectedApparatusTab, exerciseSearch]);

  // ---------------------------------------------------------------------------
  // Open Routine Creator
  // ---------------------------------------------------------------------------
  const handleOpenNewRoutine = () => {
    Haptics.impactMedium();
    setEditingRoutineId(null);
    setRoutineName('Treino Clínico A - Descompressão e Core');
    setRoutineNotes('');
    setRoutineStatus('active');
    setPrescribedItems([]);
    setIsEditorVisible(true);
  };

  // Open Routine Editor
  const handleEditRoutine = (routine: RoutineWithItems) => {
    Haptics.selection();
    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setRoutineNotes(routine.notes || '');
    setRoutineStatus(routine.status);

    const items: CreateRoutineItemInput[] = routine.items.map((item, idx) => ({
      id: item.id,
      exercise_id: item.exercise_id,
      sets: item.sets,
      reps: item.reps,
      springs_resistance: item.springs_resistance,
      postural_notes: item.postural_notes,
      sort_order: item.sort_order ?? idx,
    }));

    setPrescribedItems(items);
    setIsEditorVisible(true);
  };

  // Add Exercise to Routine
  const handleSelectExercise = (exercise: Exercise) => {
    Haptics.selection();
    const newItem: CreateRoutineItemInput = {
      exercise_id: exercise.id,
      sets: exercise.default_sets || 1,
      reps: exercise.default_reps || '10',
      springs_resistance: exercise.default_springs || null,
      postural_notes: exercise.postural_focus || null,
      sort_order: prescribedItems.length,
    };

    setPrescribedItems((prev) => [...prev, newItem]);
    setIsPickerVisible(false);
  };

  // Update Item Property
  const handleUpdateItem = (
    index: number,
    field: keyof CreateRoutineItemInput,
    value: any
  ) => {
    setPrescribedItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    Haptics.warning();
    setPrescribedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Move Item Up / Down
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    Haptics.selection();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= prescribedItems.length) return;

    setPrescribedItems((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((it, idx) => ({ ...it, sort_order: idx }));
    });
  };

  // Save Routine (Create or Update)
  const handleSaveRoutine = async () => {
    if (!selectedPatientId) {
      Alert.alert('Atenção', 'Selecione um paciente para prescrever o treino.');
      return;
    }

    if (!routineName.trim()) {
      Haptics.warning();
      Alert.alert('Campo Obrigatório', 'Informe o nome do treino.');
      return;
    }

    if (prescribedItems.length === 0) {
      Haptics.warning();
      Alert.alert('Treino Vazio', 'Adicione pelo menos um exercício ao treino.');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactMedium();

      if (editingRoutineId) {
        // Update existing
        await routineRepository.update(editingRoutineId, {
          name: routineName.trim(),
          notes: routineNotes.trim() || null,
          status: routineStatus,
          items: prescribedItems,
        });
      } else {
        // Create new
        await routineRepository.create(selectedPatientId, {
          name: routineName.trim(),
          notes: routineNotes.trim() || null,
          status: routineStatus,
          items: prescribedItems,
        });
      }

      Haptics.success();
      setIsEditorVisible(false);
      await loadData();
      Alert.alert('Sucesso', 'Prescrição de treino salva com sucesso!');
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro ao Salvar', err?.message || 'Falha ao salvar a rotina de treino.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Routine
  const handleDeleteRoutine = (routine: RoutineWithItems) => {
    Haptics.warning();
    Alert.alert(
      'Excluir Treino',
      `Deseja realmente remover a prescrição "${routine.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await routineRepository.delete(routine.id);
              Haptics.success();
              setRoutines((prev) => prev.filter((r) => r.id !== routine.id));
            } catch (err: any) {
              Haptics.error();
              Alert.alert('Erro', err?.message || 'Falha ao excluir a rotina.');
            }
          },
        },
      ]
    );
  };

  // Helper to find exercise metadata by id
  const getExerciseMetadata = (exerciseId: string): Exercise | undefined => {
    return exercises.find((e) => e.id === exerciseId);
  };

  return (
    <LargeTitleLayout
      title="Treinos"
      subtitle={activePatient ? `Prescrições de ${activePatient.name}` : 'Prescrição & Catálogo'}
      leftAction={
        onGoBack ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.selection();
              onGoBack();
            }}
            style={styles.headerIconButton}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        ) : null
      }
      rightAction={
        <TouchableOpacity
          onPress={handleOpenNewRoutine}
          style={styles.headerAddButton}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={Colors.textInverse} style={{ marginRight: 2 }} />
          <Text style={styles.headerAddButtonText}>Novo Treino</Text>
        </TouchableOpacity>
      }
    >
      {/* 1. Patient Switcher */}
      {patients.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.patientScroll}
          contentContainerStyle={styles.patientScrollContent}
        >
          {patients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => {
                  if (p.id !== selectedPatientId) {
                    Haptics.selection();
                    setSelectedPatientId(p.id);
                  }
                }}
                style={[
                  styles.patientPill,
                  isSelected && styles.patientPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.patientPillText,
                    isSelected && styles.patientPillTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {p.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 2. Overview Banner */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerTitle}>
            {activePatient ? activePatient.name : 'Selecione um Paciente'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {routines.length} rotina{routines.length === 1 ? '' : 's'} cadastrada{routines.length === 1 ? '' : 's'} • {exercises.length} exercícios disponíveis
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactMedium();
            setIsNewExerciseModalVisible(true);
          }}
          style={styles.bannerNewExerciseButton}
        >
          <Ionicons name="add-circle" size={16} color={Colors.primaryDark} style={{ marginRight: 4 }} />
          <Text style={styles.bannerNewExerciseText}>+ Exercício</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Routines List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando prescrições de treinos...</Text>
        </View>
      ) : routines.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="fitness-outline" size={48} color={Colors.primaryLight} />
          <Text style={styles.emptyCardTitle}>Nenhum Treino Prescrito</Text>
          <Text style={styles.emptyCardSub}>
            Monte uma rotina personalizada selecionando exercícios de Reformer, Cadillac, Chair, Barrel, Mat ou Cinesioterapia.
          </Text>
          <View style={{ marginTop: Spacing.base, width: '100%' }}>
            <Button
              title="Prescrever Primeiro Treino"
              onPress={handleOpenNewRoutine}
              leadingIcon={<Ionicons name="add" size={18} color={Colors.textInverse} />}
              size="regular"
            />
          </View>
        </View>
      ) : (
        <View style={styles.routinesListContainer}>
          {routines.map((routine) => {
            return (
              <View key={routine.id} style={styles.routineCard}>
                {/* Routine Card Header */}
                <View style={styles.routineCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.routineTitleRow}>
                      <Text style={styles.routineNameText}>{routine.name}</Text>
                      <Badge
                        label={routine.status === 'active' ? 'Ativo' : 'Arquivado'}
                        variant={routine.status === 'active' ? 'success' : 'neutral'}
                        size="sm"
                      />
                    </View>
                    <Text style={styles.routineDateText}>
                      Prescrito em {formatDateBR(routine.created_at)} • {routine.items.length} exercícios
                    </Text>
                    {routine.notes ? (
                      <Text style={styles.routineNotesText}>{routine.notes}</Text>
                    ) : null}
                  </View>

                  <View style={styles.routineHeaderActions}>
                    <TouchableOpacity
                      onPress={() => handleEditRoutine(routine)}
                      style={styles.iconActionCircle}
                    >
                      <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRoutine(routine)}
                      style={styles.iconActionCircle}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items Preview */}
                <View style={styles.itemsPreviewContainer}>
                  {routine.items.map((item, idx) => {
                    const ex = item.exercise || getExerciseMetadata(item.exercise_id);
                    return (
                      <View key={item.id} style={styles.itemRowPreview}>
                        <View style={styles.itemOrderCircle}>
                          <Text style={styles.itemOrderText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.itemContent}>
                          <Text style={styles.itemExerciseName}>{ex ? ex.name : 'Exercício'}</Text>
                          <View style={styles.itemMetaRow}>
                            <Badge
                              label={ex?.apparatus || 'Geral'}
                              variant="primary"
                              styleType="subtle"
                              size="sm"
                            />
                            <Text style={styles.itemSpecsText}>
                              {item.sets}x {item.reps}
                              {item.springs_resistance ? ` • ${item.springs_resistance}` : ''}
                            </Text>
                          </View>
                          {item.postural_notes ? (
                            <Text style={styles.itemCueText}>"{item.postural_notes}"</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Bottom Action */}
                <View style={styles.routineCardFooter}>
                  <Button
                    title="Iniciar Sessão de Aula"
                    onPress={() => {
                      Haptics.success();
                      Alert.alert(
                        'Aula Iniciada',
                        `Sessão guiada de "${routine.name}" iniciada para ${activePatient?.name || 'paciente'}.`
                      );
                    }}
                    variant="secondary"
                    size="small"
                    leadingIcon={<Ionicons name="play" size={14} color={Colors.primaryDark} />}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer Clinic Identity */}
      <View style={styles.footerContainer}>
        <ClinicIdentity variant="footer" />
      </View>

      {/* ============================================================= */}
      {/* MODAL 1: CRIADOR / EDITOR DE TREINO COMPLETO */}
      {/* ============================================================= */}
      <Modal
        visible={isEditorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditorVisible(false)}
      >
        <View style={styles.editorModalRoot}>
          {/* Header */}
          <View style={styles.modalNav}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selection();
                setIsEditorVisible(false);
              }}
              style={styles.modalNavButton}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalNavTitle}>
              {editingRoutineId ? 'Editar Treino' : 'Prescrever Treino'}
            </Text>
            <TouchableOpacity
              onPress={handleSaveRoutine}
              disabled={saving || !routineName.trim() || prescribedItems.length === 0}
              style={styles.modalNavButton}
            >
              <Text
                style={[
                  styles.modalSaveText,
                  (!routineName.trim() || prescribedItems.length === 0 || saving) &&
                    styles.modalSaveTextDisabled,
                ]}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorScrollContent}>
            {/* Header info */}
            <InsetGroupedList scrollable={false}>
              <InsetGroup header="Dados do Treino">
                <View style={styles.inputCell}>
                  <Text style={styles.fieldLabel}>Nome da Rotina / Foco*</Text>
                  <TextInput
                    style={styles.textInput}
                    value={routineName}
                    onChangeText={setRoutineName}
                    placeholder="Ex.: Treino A - Alinhamento Postural & Core"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
                <View style={styles.inputCell}>
                  <Text style={styles.fieldLabel}>Observações Clínicas / Recomendações</Text>
                  <TextInput
                    style={styles.textInput}
                    value={routineNotes}
                    onChangeText={setRoutineNotes}
                    placeholder="Ex.: Priorizar respiração costolateral e evitar flexão extrema"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
              </InsetGroup>

              {/* Prescribed Items Section */}
              <InsetGroup
                header={`Exercícios Prescritos (${prescribedItems.length})`}
                footer="Ajuste as séries, repetições, molas e instruções posturais para cada aparelho."
              >
                {prescribedItems.length === 0 ? (
                  <View style={styles.emptyItemsInEditor}>
                    <Ionicons name="layers-outline" size={32} color={Colors.textTertiary} />
                    <Text style={styles.emptyItemsInEditorText}>
                      Nenhum exercício incluído ainda. Toque em "+ Adicionar Exercício" abaixo para selecionar do catálogo clássico Joseph Pilates.
                    </Text>
                  </View>
                ) : (
                  prescribedItems.map((item, idx) => {
                    const ex = getExerciseMetadata(item.exercise_id);
                    return (
                      <View key={`${item.exercise_id}-${idx}`} style={styles.editorItemCard}>
                        <View style={styles.editorItemHeader}>
                          <View style={styles.editorItemIndexBox}>
                            <Text style={styles.editorItemIndexText}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.editorItemTitle}>{ex?.name || 'Exercício'}</Text>
                            <Badge
                              label={ex?.apparatus || 'Pilates'}
                              variant="primary"
                              styleType="subtle"
                              size="sm"
                            />
                          </View>
                          <View style={styles.itemRearrangeButtons}>
                            <TouchableOpacity
                              onPress={() => handleMoveItem(idx, 'up')}
                              disabled={idx === 0}
                              style={[styles.miniArrowButton, idx === 0 && { opacity: 0.3 }]}
                            >
                              <Ionicons name="arrow-up" size={16} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleMoveItem(idx, 'down')}
                              disabled={idx === prescribedItems.length - 1}
                              style={[
                                styles.miniArrowButton,
                                idx === prescribedItems.length - 1 && { opacity: 0.3 },
                              ]}
                            >
                              <Ionicons name="arrow-down" size={16} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRemoveItem(idx)}
                              style={styles.miniTrashButton}
                            >
                              <Ionicons name="close" size={16} color={Colors.destructive} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Config Inputs: Sets, Reps, Springs */}
                        <View style={styles.editorItemInputsRow}>
                          <View style={[styles.inputCellSmall, { width: 70 }]}>
                            <Text style={styles.smallInputLabel}>Séries</Text>
                            <TextInput
                              style={styles.smallTextInput}
                              keyboardType="numeric"
                              value={String(item.sets ?? 1)}
                              onChangeText={(val) =>
                                handleUpdateItem(idx, 'sets', parseInt(val, 10) || 1)
                              }
                            />
                          </View>
                          <View style={[styles.inputCellSmall, { width: 110 }]}>
                            <Text style={styles.smallInputLabel}>Repetições</Text>
                            <TextInput
                              style={styles.smallTextInput}
                              value={item.reps ?? '10'}
                              onChangeText={(val) => handleUpdateItem(idx, 'reps', val)}
                              placeholder="10"
                            />
                          </View>
                          <View style={[styles.inputCellSmall, { flex: 1 }]}>
                            <Text style={styles.smallInputLabel}>Molas / Carga</Text>
                            <TextInput
                              style={styles.smallTextInput}
                              value={item.springs_resistance ?? ''}
                              onChangeText={(val) =>
                                handleUpdateItem(idx, 'springs_resistance', val)
                              }
                              placeholder="1 Vermelha..."
                            />
                          </View>
                        </View>

                        {/* Postural Cues input */}
                        <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                          <Text style={styles.smallInputLabel}>Orientação / Cues Posturais</Text>
                          <TextInput
                            style={styles.smallTextInput}
                            value={item.postural_notes ?? ''}
                            onChangeText={(val) => handleUpdateItem(idx, 'postural_notes', val)}
                            placeholder="Ex.: Manter pelve neutra e escápulas conectadas"
                          />
                        </View>
                      </View>
                    );
                  })
                )}
              </InsetGroup>
            </InsetGroupedList>

            {/* Action to Add Exercise */}
            <View style={styles.editorButtonsRow}>
              <Button
                title="+ Adicionar Exercício do Catálogo"
                onPress={() => {
                  Haptics.selection();
                  setIsPickerVisible(true);
                }}
                variant="outline"
                size="regular"
                fullWidth
                leadingIcon={<Ionicons name="search" size={16} color={Colors.primary} />}
              />
            </View>

            <View style={{ marginHorizontal: Spacing.base, marginTop: Spacing.md, marginBottom: Spacing.xxl }}>
              <Button
                title="Salvar Prescrição de Treino"
                onPress={handleSaveRoutine}
                loading={saving}
                disabled={!routineName.trim() || prescribedItems.length === 0}
                size="large"
                fullWidth
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: SELETOR DE EXERCÍCIOS FILTRÁVEL POR APARELHOS */}
      {/* ============================================================= */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.pickerModalRoot}>
          {/* Picker Header */}
          <View style={styles.modalNav}>
            <TouchableOpacity
              onPress={() => setIsPickerVisible(false)}
              style={styles.modalNavButton}
            >
              <Text style={styles.modalCancelText}>Fechar</Text>
            </TouchableOpacity>
            <Text style={styles.modalNavTitle}>Catálogo de Exercícios</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactMedium();
                setIsNewExerciseModalVisible(true);
              }}
              style={styles.modalNavButton}
            >
              <Text style={styles.modalSaveText}>+ Criar</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.pickerSearchBox}>
            <Ionicons name="search" size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.pickerSearchInput}
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
              placeholder="Buscar por nome, objetivo ou foco postural..."
              placeholderTextColor={Colors.textTertiary}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Apparatus Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.apparatusTabsScroll}
            contentContainerStyle={styles.apparatusTabsContent}
          >
            {APPARATUS_TABS.map((tab, idx) => {
              const isSelected = idx === selectedApparatusTab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => {
                    Haptics.selection();
                    setSelectedApparatusTab(idx);
                  }}
                  style={[
                    styles.apparatusFilterPill,
                    isSelected && styles.apparatusFilterPillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.apparatusFilterText,
                      isSelected && styles.apparatusFilterTextSelected,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Exercises List */}
          <ScrollView style={styles.pickerListScroll} contentContainerStyle={styles.pickerListContent}>
            <Text style={styles.pickerResultsSummary}>
              {filteredExercises.length} exercícios encontrados
            </Text>

            {filteredExercises.map((exercise) => {
              return (
                <TouchableOpacity
                  key={exercise.id}
                  onPress={() => handleSelectExercise(exercise)}
                  style={styles.exerciseCardSelectable}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.exerciseCardHeader}>
                      <Text style={styles.exerciseCardTitle}>{exercise.name}</Text>
                      {exercise.is_custom === 1 ? (
                        <Badge label="Personalizado" variant="primary" styleType="subtle" size="sm" />
                      ) : null}
                    </View>

                    <View style={styles.exerciseCardBadgesRow}>
                      <Badge label={exercise.apparatus} variant="primary" size="sm" />
                      {exercise.default_springs ? (
                        <Badge label={exercise.default_springs} variant="neutral" size="sm" />
                      ) : null}
                      {exercise.level ? (
                        <Badge label={exercise.level} variant="neutral" size="sm" />
                      ) : null}
                    </View>

                    {exercise.description ? (
                      <Text style={styles.exerciseCardDescription} numberOfLines={2}>
                        {exercise.description}
                      </Text>
                    ) : null}

                    {exercise.postural_focus ? (
                      <Text style={styles.exerciseCardFocus} numberOfLines={1}>
                        🎯 Foco: {exercise.postural_focus}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.exerciseSelectChevron}>
                    <Ionicons name="add-circle" size={26} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: "+ CRIAR NOVO EXERCÍCIO" PERSISTIDO NO SQLITE */}
      {/* ============================================================= */}
      <NewExerciseModal
        visible={isNewExerciseModalVisible}
        onClose={() => setIsNewExerciseModalVisible(false)}
        initialApparatus={
          APPARATUS_TABS[selectedApparatusTab] !== 'Todos'
            ? (APPARATUS_TABS[selectedApparatusTab] as ApparatusType)
            : 'Reformer'
        }
        onExerciseCreated={(newExercise) => {
          // Immediately include in state
          setExercises((prev) => [newExercise, ...prev]);
          // If in editor, also add to prescribed items directly!
          if (isEditorVisible) {
            handleSelectExercise(newExercise);
          }
        }}
      />
    </LargeTitleLayout>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    marginLeft: 2,
  },
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    ...Shadows.subtle,
  },
  headerAddButtonText: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  patientScroll: {
    marginHorizontal: -Layout.screenMarginHorizontal,
    marginBottom: Spacing.md,
  },
  patientScrollContent: {
    paddingHorizontal: Layout.screenMarginHorizontal,
    gap: 8,
  },
  patientPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  patientPillSelected: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  patientPillText: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  patientPillTextSelected: {
    color: Colors.textInverse,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bannerSubtitle: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bannerNewExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    marginLeft: Spacing.sm,
  },
  bannerNewExerciseText: {
    ...Typography.caption1,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  loadingBox: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  emptyCardTitle: {
    ...Typography.title3,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyCardSub: {
    ...Typography.callout,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  routinesListContainer: {
    gap: Spacing.base,
  },
  routineCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  routineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  routineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  routineNameText: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  routineDateText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  routineNotesText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  routineHeaderActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: Spacing.sm,
  },
  iconActionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsPreviewContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
    paddingTop: Spacing.sm,
    gap: 8,
  },
  itemRowPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemOrderCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemOrderText: {
    ...Typography.caption2,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  itemContent: {
    flex: 1,
  },
  itemExerciseName: {
    ...Typography.subhead,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  itemSpecsText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  itemCueText: {
    ...Typography.caption2,
    color: Colors.primaryDark,
    fontStyle: 'italic',
    marginTop: 2,
  },
  routineCardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerContainer: {
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },

  // Editor Modal Styles
  editorModalRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalNav: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surfaceCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  modalNavButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  modalCancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  modalNavTitle: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSaveText: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalSaveTextDisabled: {
    opacity: 0.35,
  },
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    paddingVertical: Spacing.base,
  },
  inputCell: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fieldLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  emptyItemsInEditor: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyItemsInEditorText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  editorItemCard: {
    backgroundColor: Colors.surfaceCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  editorItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  editorItemIndexBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  editorItemIndexText: {
    ...Typography.caption2,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  editorItemTitle: {
    ...Typography.subhead,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemRearrangeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniArrowButton: {
    padding: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 6,
  },
  miniTrashButton: {
    padding: 6,
    backgroundColor: Colors.destructiveLight,
    borderRadius: 6,
  },
  editorItemInputsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  inputCellSmall: {},
  smallInputLabel: {
    ...Typography.caption2,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  smallTextInput: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  editorButtonsRow: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
  },

  // Picker Modal Styles
  pickerModalRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pickerSearchInput: {
    flex: 1,
    ...Typography.subhead,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  apparatusTabsScroll: {
    maxHeight: 44,
    marginVertical: Spacing.sm,
  },
  apparatusTabsContent: {
    paddingHorizontal: Spacing.base,
    gap: 6,
    alignItems: 'center',
  },
  apparatusFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  apparatusFilterPillSelected: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  apparatusFilterText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  apparatusFilterTextSelected: {
    color: Colors.textInverse,
  },
  pickerListScroll: {
    flex: 1,
  },
  pickerListContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    gap: 8,
  },
  pickerResultsSummary: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginVertical: 4,
  },
  exerciseCardSelectable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  exerciseCardTitle: {
    ...Typography.subhead,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exerciseCardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  exerciseCardDescription: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  exerciseCardFocus: {
    ...Typography.caption2,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginTop: 4,
  },
  exerciseSelectChevron: {
    marginLeft: Spacing.sm,
  },
});
