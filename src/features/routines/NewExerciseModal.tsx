/**
 * NewExerciseModal.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Modal for Creating a Clinician Custom Exercise.
 * Saves directly into the SQLite database with is_custom = 1.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Shadows,
  Haptics,
  Button,
  InsetGroupedList,
  InsetGroup,
} from '../../design-system';
import { ApparatusType, ExerciseLevel, Exercise } from '../../types/exercise';
import { exerciseRepository } from '../../database/repositories/exerciseRepository';

export interface NewExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onExerciseCreated: (exercise: Exercise) => void;
  initialApparatus?: ApparatusType;
}

const APPARATUS_OPTIONS: readonly ApparatusType[] = [
  'Reformer',
  'Cadillac',
  'Wunda Chair',
  'Ladder Barrel',
  'Mat',
  'Cinesioterapia',
];

const LEVEL_OPTIONS: readonly ExerciseLevel[] = [
  'iniciante',
  'intermediário',
  'avançado',
];

export function NewExerciseModal({
  visible,
  onClose,
  onExerciseCreated,
  initialApparatus = 'Reformer',
}: NewExerciseModalProps) {
  const [name, setName] = useState('');
  const [apparatus, setApparatus] = useState<ApparatusType>(initialApparatus);
  const [description, setDescription] = useState('');
  const [springs, setSprings] = useState('');
  const [reps, setReps] = useState('10');
  const [sets, setSets] = useState('1');
  const [level, setLevel] = useState<ExerciseLevel>('iniciante');
  const [posturalFocus, setPosturalFocus] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSprings('');
    setReps('10');
    setSets('1');
    setLevel('iniciante');
    setPosturalFocus('');
    setContraindications('');
  };

  const handleClose = () => {
    Haptics.selection();
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Haptics.warning();
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome do exercício.');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactMedium();

      const created = await exerciseRepository.createCustomExercise({
        name: name.trim(),
        apparatus,
        description: description.trim() || null,
        default_springs: springs.trim() || null,
        default_reps: reps.trim() || '10',
        default_sets: parseInt(sets, 10) || 1,
        level,
        postural_focus: posturalFocus.trim() || null,
        contraindications: contraindications.trim() || null,
      });

      Haptics.success();
      resetForm();
      onExerciseCreated(created);
      onClose();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Falha ao cadastrar o exercício.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        {/* iOS FormSheet Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novo Exercício</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name.trim()}
            style={styles.headerButton}
          >
            <Text style={[styles.saveText, (!name.trim() || saving) && styles.saveTextDisabled]}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollRoot}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <InsetGroupedList scrollable={false}>
            {/* Seção 1: Identificação & Aparelho */}
            <InsetGroup header="Aparelho & Identificação">
              <View style={styles.apparatusSelectorBox}>
                <Text style={styles.fieldLabel}>Selecione o Aparelho / Modalidade:</Text>
                <View style={styles.chipsWrap}>
                  {APPARATUS_OPTIONS.map((app) => {
                    const isSelected = app === apparatus;
                    return (
                      <TouchableOpacity
                        key={app}
                        onPress={() => {
                          Haptics.selection();
                          setApparatus(app);
                        }}
                        style={[
                          styles.apparatusChip,
                          isSelected && styles.apparatusChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.apparatusChipText,
                            isSelected && styles.apparatusChipTextSelected,
                          ]}
                        >
                          {app === 'Mat' ? 'Solo / Mat' : app}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputCell}>
                <Text style={styles.fieldLabel}>Nome do Exercício*</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex.: Spine Stretch com Overball"
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus
                />
              </View>

              <View style={styles.inputCell}>
                <Text style={styles.fieldLabel}>Nível de Dificuldade:</Text>
                <View style={styles.chipsWrap}>
                  {LEVEL_OPTIONS.map((lvl) => {
                    const isSelected = lvl === level;
                    return (
                      <TouchableOpacity
                        key={lvl}
                        onPress={() => {
                          Haptics.selection();
                          setLevel(lvl);
                        }}
                        style={[
                          styles.levelChip,
                          isSelected && styles.levelChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.levelChipText,
                            isSelected && styles.levelChipTextSelected,
                          ]}
                        >
                          {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </InsetGroup>

            {/* Seção 2: Carga, Molas e Repetições */}
            <InsetGroup header="Regulagem de Molas & Repetições">
              <View style={styles.inputCell}>
                <Text style={styles.fieldLabel}>Carga / Molas Padrão</Text>
                <TextInput
                  style={styles.input}
                  value={springs}
                  onChangeText={setSprings}
                  placeholder="Ex.: 1 Vermelha + 1 Azul, ou N/A (Solo)"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputCell, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Séries Padrão</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={sets}
                    onChangeText={setSets}
                    placeholder="1"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <View style={[styles.inputCell, { flex: 1.5 }]}>
                  <Text style={styles.fieldLabel}>Repetições Padrão</Text>
                  <TextInput
                    style={styles.input}
                    value={reps}
                    onChangeText={setReps}
                    placeholder="10 repetições"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
              </View>
            </InsetGroup>

            {/* Seção 3: Biomecânica & Cuidados */}
            <InsetGroup header="Instruções Posturais & Restrições">
              <View style={styles.inputCell}>
                <Text style={styles.fieldLabel}>Descrição & Cues Biomecânicos</Text>
                <TextInput
                  style={styles.textArea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Posicionamento, comando verbal, trajetória do movimento..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputCell}>
                <Text style={styles.fieldLabel}>Foco Postural / Cadeia Muscular</Text>
                <TextInput
                  style={styles.input}
                  value={posturalFocus}
                  onChangeText={setPosturalFocus}
                  placeholder="Ex.: Fortalecimento do Core, Descompressão lombar"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.inputCell}>
                <Text style={styles.fieldLabel}>Contraindicações & Cuidados</Text>
                <TextInput
                  style={styles.input}
                  value={contraindications}
                  onChangeText={setContraindications}
                  placeholder="Ex.: Evitar em hérnia de disco lombar aguda em flexão"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </InsetGroup>
          </InsetGroupedList>

          <View style={styles.footerAction}>
            <Button
              title="Cadastrar Exercício no Catálogo"
              onPress={handleSave}
              loading={saving}
              disabled={!name.trim()}
              size="large"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surfaceCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  headerTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  saveText: {
    ...Typography.headline,
    color: Colors.primary,
    fontWeight: '700',
  },
  saveTextDisabled: {
    opacity: 0.35,
  },
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.base,
  },
  apparatusSelectorBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  apparatusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  apparatusChipSelected: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  apparatusChipText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  apparatusChipTextSelected: {
    color: Colors.textInverse,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  levelChipText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  levelChipTextSelected: {
    color: Colors.textInverse,
  },
  inputCell: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  input: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  textArea: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  footerAction: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
});
