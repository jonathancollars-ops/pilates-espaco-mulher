/**
 * AppointmentModal.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Inset Grouped Modal for creating and editing clinical appointments.
 * Strictly offline-first SQLite integration.
 * Excludes CPF, CEP, and marital status.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Haptics,
  InsetGroupedList,
  InsetGroup,
  InsetRow,
  Badge,
} from '../../design-system';
import { usePatients } from '../patients/PatientContext';
import { appointmentRepository } from '../../database/repositories/appointmentRepository';
import { Appointment, AppointmentType } from '../../types/appointment';
import {
  formatDateBR,
  parseBRDateToISO,
  maskDateInput,
} from '../../utils/formatters';

export interface AppointmentModalProps {
  visible: boolean;
  appointment?: Appointment | null;
  initialDate?: string; // YYYY-MM-DD
  initialPatientId?: string;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

const APPOINTMENT_TYPES: { type: AppointmentType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: 'pilates_individual', label: 'Pilates Individual', icon: 'person', color: Colors.primary },
  { type: 'pilates_group', label: 'Pilates em Grupo', icon: 'people', color: '#5B4B8A' },
  { type: 'clinical_evaluation', label: 'Avaliação Clínica', icon: 'clipboard', color: Colors.accent },
  { type: 'rehabilitation', label: 'Reabilitação', icon: 'medkit', color: Colors.success },
];

export function AppointmentModal({
  visible,
  appointment,
  initialDate,
  initialPatientId,
  onClose,
  onSaveSuccess,
}: AppointmentModalProps) {
  const { patients } = usePatients();
  const activePatients = patients.filter((p) => p.status === 'active');

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [dateBR, setDateBR] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('08:50');
  const [sessionType, setSessionType] = useState<AppointmentType>('pilates_individual');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showPatientPicker, setShowPatientPicker] = useState(false);

  // Initialize form
  useEffect(() => {
    if (!visible) return;

    if (appointment) {
      setSelectedPatientId(appointment.patient_id);
      setDateBR(formatDateBR(appointment.date));
      setStartTime(appointment.start_time);
      setEndTime(appointment.end_time);
      setSessionType(appointment.type);
      setNotes(appointment.notes || '');
    } else {
      const todayISO = new Date().toISOString().split('T')[0];
      const targetDate = initialDate || todayISO;
      setDateBR(formatDateBR(targetDate));
      setSelectedPatientId(initialPatientId || (activePatients[0]?.id ?? ''));
      setStartTime('08:00');
      setEndTime('08:50');
      setSessionType('pilates_individual');
      setNotes('');
    }
    setShowPatientPicker(false);
  }, [visible, appointment, initialDate, initialPatientId]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Time mask helper (HH:mm)
  const handleStartTimeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    setStartTime(formatted);

    // Auto-calculate end time (+50 min) if complete start time entered
    if (formatted.length === 5) {
      const [hStr, mStr] = formatted.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
        let endH = h;
        let endM = m + 50;
        if (endM >= 60) {
          endH = (endH + Math.floor(endM / 60)) % 24;
          endM = endM % 60;
        }
        const endFormatted = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        setEndTime(endFormatted);
      }
    }
  };

  const handleEndTimeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    setEndTime(formatted);
  };

  const handleSave = async () => {
    if (!selectedPatientId) {
      Haptics.warning();
      Alert.alert('Paciente Obrigatório', 'Selecione um paciente para o atendimento.');
      return;
    }

    const isoDate = parseBRDateToISO(dateBR);
    if (!isoDate) {
      Haptics.warning();
      Alert.alert('Data Inválida', 'Informe a data no formato DD/MM/AAAA.');
      return;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime)) {
      Haptics.warning();
      Alert.alert('Horário de Início Inválido', 'Informe um horário válido no formato HH:mm.');
      return;
    }

    if (!timeRegex.test(endTime)) {
      Haptics.warning();
      Alert.alert('Horário de Término Inválido', 'Informe um horário válido no formato HH:mm.');
      return;
    }

    if (startTime >= endTime) {
      Haptics.warning();
      Alert.alert('Inconsistência de Horário', 'O horário de término deve ser após o horário de início.');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactMedium();

      if (appointment) {
        await appointmentRepository.update(appointment.id, {
          patient_id: selectedPatientId,
          patient_name: selectedPatient?.name || appointment.patient_name,
          date: isoDate,
          start_time: startTime,
          end_time: endTime,
          type: sessionType,
          notes: notes.trim() || null,
        });
      } else {
        await appointmentRepository.create({
          patient_id: selectedPatientId,
          patient_name: selectedPatient?.name,
          date: isoDate,
          start_time: startTime,
          end_time: endTime,
          type: sessionType,
          status: 'scheduled',
          notes: notes.trim() || null,
        });
      }

      Haptics.success();
      onClose();
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro ao Salvar', err?.message || 'Falha ao salvar atendimento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Apple HIG Modal Navigation Bar */}
        <View style={styles.modalNavBar}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              Haptics.selection();
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={saving}
          >
            <Text style={styles.navCancelText}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={styles.navTitle} numberOfLines={1}>
            {appointment ? 'Editar Atendimento' : 'Novo Agendamento'}
          </Text>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleSave}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={saving}
          >
            <Text style={[styles.navSaveText, saving && styles.navButtonDisabled]}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Patient Selector */}
          <InsetGroupedList scrollable={false}>
            <InsetGroup
              header="Paciente"
              footer="Selecione a paciente cadastrada para vincular à ficha e ao plano de sessões."
            >
              <InsetRow
                icon="person-circle-outline"
                iconBackgroundColor={Colors.primarySubtle}
                iconColor={Colors.primary}
                label="Paciente"
                value={selectedPatient ? selectedPatient.name : 'Selecionar'}
                subtitle={selectedPatient?.phone ? selectedPatient.phone : 'Toque para escolher'}
                onPress={() => {
                  Haptics.selection();
                  setShowPatientPicker(!showPatientPicker);
                }}
              />
            </InsetGroup>

            {/* Inline Patient Selection List */}
            {showPatientPicker && (
              <InsetGroup header="Escolha a Paciente">
                {activePatients.length === 0 ? (
                  <View style={styles.emptyPatientRow}>
                    <Text style={styles.emptyPatientText}>Nenhuma paciente ativa cadastrada.</Text>
                  </View>
                ) : (
                  activePatients.map((p) => {
                    const isSelected = p.id === selectedPatientId;
                    return (
                      <InsetRow
                        key={p.id}
                        label={p.name}
                        subtitle={p.phone}
                        value={isSelected ? '✓ Selecionada' : ''}
                        accessory={
                          isSelected ? (
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          ) : undefined
                        }
                        onPress={() => {
                          Haptics.selection();
                          setSelectedPatientId(p.id);
                          setShowPatientPicker(false);
                        }}
                      />
                    );
                  })
                )}
              </InsetGroup>
            )}

            {/* Date & Time */}
            <InsetGroup
              header="Data & Horário"
              footer="Duração padrão de 50 minutos recomendada para atendimentos clínicos."
            >
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.inputLabel}>Data</Text>
                <TextInput
                  style={styles.textInput}
                  value={dateBR}
                  onChangeText={(t) => setDateBR(maskDateInput(t))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View style={styles.separator} />

              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.inputLabel}>Início</Text>
                <TextInput
                  style={styles.textInput}
                  value={startTime}
                  onChangeText={handleStartTimeChange}
                  placeholder="08:00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.separator} />

              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="flag-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.inputLabel}>Término</Text>
                <TextInput
                  style={styles.textInput}
                  value={endTime}
                  onChangeText={handleEndTimeChange}
                  placeholder="08:50"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </InsetGroup>

            {/* Session Type */}
            <InsetGroup
              header="Modalidade"
              footer="Define o foco da prescrição e os objetivos do plano de exercícios."
            >
              {APPOINTMENT_TYPES.map((item) => {
                const isSelected = sessionType === item.type;
                return (
                  <InsetRow
                    key={item.type}
                    icon={item.icon}
                    iconBackgroundColor={isSelected ? Colors.primarySubtle : Colors.surfaceSecondary}
                    iconColor={isSelected ? Colors.primary : Colors.textSecondary}
                    label={item.label}
                    accessory={
                      isSelected ? (
                        <Badge label="Selecionado" variant="primary" size="sm" />
                      ) : undefined
                    }
                    onPress={() => {
                      Haptics.selection();
                      setSessionType(item.type);
                    }}
                  />
                );
              })}
            </InsetGroup>

            {/* Clinical Notes */}
            <InsetGroup
              header="Observações Clínicas"
              footer="Anotações para a sessão (ex: foco em coluna lombar, molas mais leves, etc.)."
            >
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Observações ou orientações específicas..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </InsetGroup>
          </InsetGroupedList>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalNavBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceCard,
  },
  navButton: {
    minWidth: 70,
    justifyContent: 'center',
  },
  navTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  navCancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  navSaveText: {
    ...Typography.headline,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xl * 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: Colors.surfaceCard,
  },
  inputIconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  inputLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    width: 70,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 58,
  },
  textAreaContainer: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.base,
  },
  textArea: {
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 70,
  },
  emptyPatientRow: {
    padding: Spacing.base,
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
  },
  emptyPatientText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
});
