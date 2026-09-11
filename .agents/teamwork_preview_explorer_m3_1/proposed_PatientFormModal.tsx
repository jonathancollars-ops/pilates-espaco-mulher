/**
 * Proposed Component: PatientFormModal.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Modal Form for creating and editing patients.
 * STRICT CLINICAL REQUIREMENTS (R4 & AC176):
 * - Strictly EXCLUDES CPF, Estado Civil, and CEP.
 * - city_state defaults to 'Rio das Ostras - RJ'.
 * - Masked Phone input with live (XX) XXXXX-XXXX mask.
 * - Birthdate input with DD/MM/YYYY mask and automatic age calculation.
 * - Adheres to official clinic brand palette.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows, Layout } from '../../../src/design-system/tokens';
import { Haptics } from '../../../src/design-system/Haptics';
import { SegmentedControl } from '../../../src/design-system/SegmentedControl';
import { Button } from '../../../src/design-system/Button';
import { formatPhone, maskDateInput, calculateAge, parseBRDateToISO, formatDateBR } from '../../../src/utils/formatters';
import { Patient, CreatePatientInput, UpdatePatientInput, PatientStatus } from '../../../src/types/patient';

export interface PatientFormModalProps {
  visible: boolean;
  patient?: Patient | null; // If provided, edit mode; otherwise, create mode
  onClose: () => void;
  onSave: (data: CreatePatientInput | UpdatePatientInput, patientId?: string) => Promise<void>;
}

export function PatientFormModal({
  visible,
  patient,
  onClose,
  onSave,
}: PatientFormModalProps) {
  const isEditing = Boolean(patient);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdateText, setBirthdateText] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityState, setCityState] = useState('Rio das Ostras - RJ');
  const [email, setEmail] = useState('');
  const [insurance, setInsurance] = useState('Particular');
  const [status, setStatus] = useState<PatientStatus>('active');
  const [saving, setSaving] = useState(false);

  // Initialize form when opening
  useEffect(() => {
    if (patient) {
      setName(patient.name || '');
      setPhone(formatPhone(patient.phone || ''));
      setBirthdateText(patient.birthdate ? formatDateBR(patient.birthdate) : '');
      setAge(patient.age ?? null);
      setAddress(patient.address || '');
      setNeighborhood(patient.neighborhood || '');
      setCityState(patient.city_state || 'Rio das Ostras - RJ');
      setEmail(patient.email || '');
      setInsurance(patient.insurance || 'Particular');
      setStatus(patient.status || 'active');
    } else {
      // Defaults for new patient
      setName('');
      setPhone('');
      setBirthdateText('');
      setAge(null);
      setAddress('');
      setNeighborhood('');
      setCityState('Rio das Ostras - RJ');
      setEmail('');
      setInsurance('Particular');
      setStatus('active');
    }
  }, [patient, visible]);

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const handleBirthdateChange = (text: string) => {
    const masked = maskDateInput(text);
    setBirthdateText(masked);

    if (masked.length === 10) {
      const iso = parseBRDateToISO(masked);
      if (iso) {
        const computedAge = calculateAge(iso);
        setAge(computedAge);
      }
    }
  };

  const handleClose = () => {
    Haptics.selection();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Haptics.warning();
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome completo do paciente.');
      return;
    }

    const rawPhoneDigits = phone.replace(/\D/g, '');
    if (rawPhoneDigits.length < 10) {
      Haptics.warning();
      Alert.alert('Telefone Inválido', 'Por favor, informe um número de WhatsApp/telefone válido com DDD.');
      return;
    }

    const birthdateISO = birthdateText.length === 10 ? parseBRDateToISO(birthdateText) : null;

    setSaving(true);
    try {
      if (isEditing && patient) {
        const updateData: UpdatePatientInput = {
          name: name.trim(),
          phone: rawPhoneDigits,
          birthdate: birthdateISO,
          age,
          address: address.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city_state: cityState.trim() || 'Rio das Ostras - RJ',
          email: email.trim() || null,
          insurance: insurance.trim() || null,
          status,
        };
        await onSave(updateData, patient.id);
      } else {
        const createData: CreatePatientInput = {
          name: name.trim(),
          phone: rawPhoneDigits,
          birthdate: birthdateISO,
          age,
          address: address.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city_state: cityState.trim() || 'Rio das Ostras - RJ',
          email: email.trim() || null,
          insurance: insurance.trim() || null,
          status,
        };
        await onSave(createData);
      }
      Haptics.success();
      onClose();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro ao Salvar', err?.message || 'Ocorreu um erro ao salvar o paciente.');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = ['Em Tratamento', 'Alta Clínica', 'Inativo'] as const;
  const statusValues: PatientStatus[] = ['active', 'discharged', 'archived'];
  const currentStatusIndex = statusValues.indexOf(status);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Navigation Bar / Modal Header */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitleText}>
            {isEditing ? 'Editar Cadastro' : 'Novo Paciente'}
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
          >
            <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Form Body */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Identificação */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Identificação Pessoal</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Completo *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex.: Mariana da Silva Costa"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.rowTwoInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.inputLabel}>Data de Nascimento</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={Colors.textTertiary}
                  value={birthdateText}
                  onChangeText={handleBirthdateChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View style={[styles.inputGroup, { width: 100 }]}>
                <Text style={styles.inputLabel}>Idade</Text>
                <TextInput
                  style={[styles.textInput, styles.readOnlyInput]}
                  placeholder="Anos"
                  placeholderTextColor={Colors.textTertiary}
                  value={age != null ? `${age} anos` : ''}
                  editable={false}
                />
              </View>
            </View>
          </View>

          {/* Section 2: Contato e Endereço */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contato & Localização</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WhatsApp / Telefone *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="(22) 99947-4304"
                placeholderTextColor={Colors.textTertiary}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="paciente@exemplo.com.br"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Endereço (sem CEP)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Rua, número e complemento"
                placeholderTextColor={Colors.textTertiary}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.rowTwoInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.inputLabel}>Bairro</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex.: Costa Azul"
                  placeholderTextColor={Colors.textTertiary}
                  value={neighborhood}
                  onChangeText={setNeighborhood}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Cidade / Estado</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Rio das Ostras - RJ"
                  placeholderTextColor={Colors.textTertiary}
                  value={cityState}
                  onChangeText={setCityState}
                />
              </View>
            </View>
          </View>

          {/* Section 3: Dados Clínicos */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Convênio & Situação Clínica</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Convênio / Plano de Saúde</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Particular, Unimed, Bradesco..."
                placeholderTextColor={Colors.textTertiary}
                value={insurance}
                onChangeText={setInsurance}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status de Atendimento</Text>
              <SegmentedControl
                values={statusOptions}
                selectedIndex={currentStatusIndex >= 0 ? currentStatusIndex : 0}
                onChange={(index) => setStatus(statusValues[index])}
              />
            </View>
          </View>

          {/* Save Button */}
          <Button
            title={isEditing ? 'Atualizar Cadastro' : 'Cadastrar Paciente'}
            onPress={handleSave}
            loading={saving}
            variant="primary"
            size="large"
            fullWidth
            style={styles.bottomSaveButton}
          />
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
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  modalTitleText: {
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
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  sectionTitle: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  rowTwoInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  textInput: {
    height: 44, // HIG standard touch height
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2D9E8',
  },
  readOnlyInput: {
    backgroundColor: '#EFEBF2',
    color: Colors.textSecondary,
  },
  bottomSaveButton: {
    marginTop: Spacing.md,
  },
});
