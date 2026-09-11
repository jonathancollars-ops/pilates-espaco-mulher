/**
 * PatientFormModal.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) Inset Grouped Modal Form
 * for creating and editing patient records.
 * 
 * AUTHORITATIVE CLINICAL REQUIREMENTS (R4 & AC176):
 * 1. Inset Grouped List layout for all form sections.
 * 2. Permitted Fields:
 *    - Nome Completo (required, text, autoCapitalize='words')
 *    - Data de Nascimento (optional, text with mask 'DD/MM/YYYY')
 *    - Idade (number, calculated automatically via calculateAge if birthdate provided, editable)
 *    - Telefone / WhatsApp (required, text with mask '(XX) XXXXX-XXXX', uses formatPhone)
 *    - Endereço (optional, text, sem CEP)
 *    - Bairro (optional, text, ex: Costa Azul)
 *    - Cidade / Estado (text, DEFAULT value: 'Rio das Ostras - RJ')
 *    - E-mail (optional, email keyboard, autoCapitalize='none')
 *    - Convênio (segmented control: 'Particular' | 'Unimed' | 'Bradesco' | 'Outro')
 * 3. Strictly EXCLUDED Fields:
 *    - NO CPF (strictly excluded)
 *    - NO Estado Civil (strictly excluded)
 *    - NO CEP (strictly excluded)
 * 4. Form state management, validation logic, automatic age calculation via calculateAge,
 *    and haptic feedback on save/cancel/errors via Haptics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows, Layout } from '../../design-system/tokens';
import { Haptics } from '../../design-system/Haptics';
import { SegmentedControl } from '../../design-system/SegmentedControl';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { InsetGroup } from '../../design-system/InsetGroupedList';
import {
  formatPhone,
  maskDateInput,
  calculateAge,
  parseBRDateToISO,
  formatDateBR,
  cleanDigits,
} from '../../utils/formatters';
import {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
  PatientStatus,
} from '../../types/patient';

// ---------------------------------------------------------------------------
// Props & Type Definitions
// ---------------------------------------------------------------------------

export type InsuranceOption = 'Particular' | 'Unimed' | 'Bradesco' | 'Outro';

export interface PatientFormModalProps {
  visible: boolean;
  patient?: Patient | null; // null/undefined for create mode; Patient object for edit mode
  onClose: () => void;
  onSave: (data: CreatePatientInput | UpdatePatientInput, patientId?: string) => Promise<void> | void;
}

export interface FormErrors {
  name?: string;
  phone?: string;
  birthdate?: string;
  age?: string;
  email?: string;
  insuranceOther?: string;
}

// ---------------------------------------------------------------------------
// InsetInputRow (Apple HIG Inset Group Form Row)
// ---------------------------------------------------------------------------

export interface InsetInputRowProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor?: string;
  iconColor?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  maxLength?: number;
  editable?: boolean;
  required?: boolean;
  errorMessage?: string;
  accessory?: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
  hideSeparator?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  testID?: string;
}

export function InsetInputRow({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  iconBackgroundColor,
  iconColor,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  maxLength,
  editable = true,
  required = false,
  errorMessage,
  accessory,
  isFirst = false,
  isLast = false,
  hideSeparator = false,
  returnKeyType,
  onSubmitEditing,
  testID,
}: InsetInputRowProps) {
  const hasIcon = Boolean(icon);
  const iconTone = iconColor ?? Colors.primary;
  const bgTone = iconBackgroundColor ?? Colors.primarySubtle;

  // Squircle corner styling for group edges
  const cornerStyle: any = {};
  if (isFirst && isLast) {
    cornerStyle.borderRadius = Radii.card;
  } else if (isFirst) {
    cornerStyle.borderTopLeftRadius = Radii.card;
    cornerStyle.borderTopRightRadius = Radii.card;
  } else if (isLast) {
    cornerStyle.borderBottomLeftRadius = Radii.card;
    cornerStyle.borderBottomRightRadius = Radii.card;
  }

  return (
    <View style={[styles.inputRowContainer, cornerStyle, !editable && styles.rowDisabled]} testID={testID}>
      {/* Leading Icon */}
      {hasIcon && (
        <View style={[styles.iconWrapper, { backgroundColor: bgTone }]}>
          <Ionicons name={icon!} size={18} color={iconTone} />
        </View>
      )}

      {/* Center Input Column */}
      <View style={styles.inputCenterColumn}>
        <View style={styles.labelHeaderRow}>
          <Text style={styles.inputLabelText}>
            {label}
            {required && <Text style={styles.requiredAsterisk}> *</Text>}
          </Text>

          {errorMessage ? (
            <Text style={styles.errorInlineText} numberOfLines={1}>
              {errorMessage}
            </Text>
          ) : null}
        </View>

        <TextInput
          style={[
            styles.textInput,
            Boolean(errorMessage) && styles.textInputError,
            !editable && styles.textInputDisabled,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          selectionColor={Colors.primary}
        />
      </View>

      {/* Right Accessory Slot */}
      {accessory ? <View style={styles.accessoryWrapper}>{accessory}</View> : null}

      {/* Hairline Separator */}
      {!isLast && !hideSeparator ? (
        <View
          style={[
            styles.separator,
            { left: hasIcon ? Layout.separatorIndentWithIcon : Layout.separatorIndentWithoutIcon },
          ]}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PatientFormModal Component
// ---------------------------------------------------------------------------

export function PatientFormModal({
  visible,
  patient,
  onClose,
  onSave,
}: PatientFormModalProps) {
  const isEditing = Boolean(patient);

  // Form Fields State
  const [name, setName] = useState('');
  const [birthdateText, setBirthdateText] = useState('');
  const [ageText, setAgeText] = useState('');
  const [isAgeAutoCalculated, setIsAgeAutoCalculated] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cityState, setCityState] = useState('Rio das Ostras - RJ');
  const [email, setEmail] = useState('');
  const [insuranceType, setInsuranceType] = useState<InsuranceOption>('Particular');
  const [insuranceOther, setInsuranceOther] = useState('');
  const [status, setStatus] = useState<PatientStatus>('active');

  // Form Meta State
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Insurance segmented values
  const insuranceOptions: readonly InsuranceOption[] = ['Particular', 'Unimed', 'Bradesco', 'Outro'];
  const currentInsuranceIndex = insuranceOptions.indexOf(insuranceType);

  // Status options (for edit mode)
  const statusOptions = ['Em Tratamento', 'Alta Clínica', 'Inativo'] as const;
  const statusValues: PatientStatus[] = ['active', 'discharged', 'archived'];
  const currentStatusIndex = statusValues.indexOf(status);

  // Reset or Populate form on modal visibility / patient change
  useEffect(() => {
    if (!visible) return;

    if (patient) {
      setName(patient.name || '');
      setPhone(formatPhone(patient.phone || ''));
      setBirthdateText(patient.birthdate ? formatDateBR(patient.birthdate) : '');
      setAgeText(patient.age != null ? String(patient.age) : '');
      setIsAgeAutoCalculated(Boolean(patient.birthdate && patient.age != null));
      setAddress(patient.address || '');
      setNeighborhood(patient.neighborhood || '');
      setCityState(patient.city_state || 'Rio das Ostras - RJ');
      setEmail(patient.email || '');

      // Resolve insurance
      const pInsurance = patient.insurance || 'Particular';
      if (pInsurance === 'Particular' || pInsurance === 'Unimed' || pInsurance === 'Bradesco') {
        setInsuranceType(pInsurance as InsuranceOption);
        setInsuranceOther('');
      } else {
        setInsuranceType('Outro');
        setInsuranceOther(pInsurance);
      }

      setStatus(patient.status || 'active');
    } else {
      // Clean defaults for new patient
      setName('');
      setPhone('');
      setBirthdateText('');
      setAgeText('');
      setIsAgeAutoCalculated(false);
      setAddress('');
      setNeighborhood('');
      setCityState('Rio das Ostras - RJ'); // Authoritative default
      setEmail('');
      setInsuranceType('Particular');
      setInsuranceOther('');
      setStatus('active');
    }

    setErrors({});
    setIsDirty(false);
    setSaving(false);
  }, [visible, patient]);

  // Name change handler
  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setIsDirty(true);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  }, [errors.name]);

  // Phone / WhatsApp change handler with automatic formatPhone mask
  const handlePhoneChange = useCallback((text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
    setIsDirty(true);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  }, [errors.phone]);

  // Birthdate change handler with DD/MM/YYYY mask and automatic age calculation
  const handleBirthdateChange = useCallback((text: string) => {
    setIsDirty(true);
    const masked = maskDateInput(text);
    setBirthdateText(masked);

    if (errors.birthdate) {
      setErrors((prev) => ({ ...prev, birthdate: undefined }));
    }

    if (masked.length === 10) {
      const iso = parseBRDateToISO(masked);
      if (iso) {
        const computed = calculateAge(iso);
        if (computed !== null) {
          setAgeText(String(computed));
          setIsAgeAutoCalculated(true);
          Haptics.selection();
        }
      } else {
        setErrors((prev) => ({ ...prev, birthdate: 'Data de nascimento inválida' }));
      }
    } else if (masked.length === 0) {
      setIsAgeAutoCalculated(false);
    }
  }, [errors.birthdate]);

  // Age change handler (allows manual entry or override)
  const handleAgeChange = useCallback((text: string) => {
    setIsDirty(true);
    const sanitized = text.replace(/\D/g, '').slice(0, 3);
    setAgeText(sanitized);
    setIsAgeAutoCalculated(false);
    if (errors.age) {
      setErrors((prev) => ({ ...prev, age: undefined }));
    }
  }, [errors.age]);

  // Insurance segment change handler
  const handleInsuranceChange = useCallback((_index: number, val: InsuranceOption) => {
    Haptics.selection();
    setInsuranceType(val);
    setIsDirty(true);
    if (val !== 'Outro') {
      setInsuranceOther('');
      setErrors((prev) => ({ ...prev, insuranceOther: undefined }));
    }
  }, []);

  // Validation Logic
  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    // 1. Nome Completo (required, >= 3 chars)
    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = 'Nome completo é obrigatório';
    } else if (trimmedName.length < 3) {
      nextErrors.name = 'Mínimo de 3 caracteres';
    }

    // 2. Telefone / WhatsApp (required, 10 or 11 clean digits)
    const digits = cleanDigits(phone);
    if (!digits) {
      nextErrors.phone = 'Telefone / WhatsApp é obrigatório';
    } else if (digits.length < 10 || digits.length > 11) {
      nextErrors.phone = 'Informe DDD + número (10 ou 11 dígitos)';
    }

    // 3. Data de Nascimento (optional, but if filled must be valid)
    if (birthdateText.trim().length > 0) {
      if (birthdateText.length !== 10 || !parseBRDateToISO(birthdateText)) {
        nextErrors.birthdate = 'Data inválida (DD/MM/AAAA)';
      }
    }

    // 4. Idade (optional, but if filled must be between 0 and 125)
    if (ageText.trim().length > 0) {
      const parsedAge = parseInt(ageText, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 125) {
        nextErrors.age = 'Idade deve ser entre 0 e 125 anos';
      }
    }

    // 5. E-mail (optional, but if filled must match email pattern)
    if (email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        nextErrors.email = 'E-mail em formato inválido';
      }
    }

    // 6. Convênio 'Outro'
    if (insuranceType === 'Outro' && !insuranceOther.trim()) {
      nextErrors.insuranceOther = 'Informe o nome do convênio';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Close / Cancel with dirty state confirmation
  const handleCancel = () => {
    Keyboard.dismiss();
    if (isDirty) {
      Haptics.warning();
      Alert.alert(
        'Descartar Alterações?',
        'As alterações preenchidas não foram salvas e serão descartadas.',
        [
          { text: 'Continuar Editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              Haptics.impactLight();
              onClose();
            },
          },
        ]
      );
    } else {
      Haptics.selection();
      onClose();
    }
  };

  // Save submission
  const handleSave = async () => {
    Keyboard.dismiss();

    const isValid = validateForm();
    if (!isValid) {
      Haptics.error();
      return;
    }

    setSaving(true);
    try {
      const resolvedInsurance = insuranceType === 'Outro'
        ? (insuranceOther.trim() || 'Outro')
        : insuranceType;

      const resolvedBirthdate = birthdateText.trim().length === 10
        ? parseBRDateToISO(birthdateText.trim())
        : null;

      const resolvedAge = ageText.trim().length > 0
        ? parseInt(ageText.trim(), 10)
        : (resolvedBirthdate ? calculateAge(resolvedBirthdate) : null);

      const resolvedPhone = formatPhone(phone);
      const resolvedCityState = cityState.trim() || 'Rio das Ostras - RJ';

      if (isEditing && patient) {
        const updateData: UpdatePatientInput = {
          name: name.trim(),
          phone: resolvedPhone,
          birthdate: resolvedBirthdate,
          age: resolvedAge,
          address: address.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city_state: resolvedCityState,
          email: email.trim() || null,
          insurance: resolvedInsurance,
          status,
        };
        await onSave(updateData, patient.id);
      } else {
        const createData: CreatePatientInput = {
          name: name.trim(),
          phone: resolvedPhone,
          birthdate: resolvedBirthdate,
          age: resolvedAge,
          address: address.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city_state: resolvedCityState,
          email: email.trim() || null,
          insurance: resolvedInsurance,
          status: 'active',
        };
        await onSave(createData);
      }

      Haptics.success();
      setIsDirty(false);
      onClose();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro ao Salvar', err?.message || 'Não foi possível salvar o paciente no SQLite.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Apple HIG Modal Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable
            onPress={handleCancel}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          >
            <Text style={styles.navCancelText}>Cancelar</Text>
          </Pressable>

          <Text style={styles.navTitleText} numberOfLines={1}>
            {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Salvar dados do paciente"
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.navSaveText}>Salvar</Text>
            )}
          </Pressable>
        </View>

        {/* Inset Grouped Scrollable Form Body */}
        <ScrollView
          style={styles.scrollRoot}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: IDENTIFICAÇÃO PESSOAL */}
          <InsetGroup header="IDENTIFICAÇÃO PESSOAL">
            {/* 1. Nome Completo */}
            <InsetInputRow
              label="Nome Completo"
              value={name}
              onChangeText={handleNameChange}
              placeholder="Nome e sobrenome"
              icon="person-outline"
              iconColor={Colors.primary}
              iconBackgroundColor={Colors.primarySubtle}
              autoCapitalize="words"
              required
              errorMessage={errors.name}
              testID="input-patient-name"
            />

            {/* 2. Data de Nascimento */}
            <InsetInputRow
              label="Data de Nascimento"
              value={birthdateText}
              onChangeText={handleBirthdateChange}
              placeholder="DD/MM/AAAA"
              icon="calendar-outline"
              iconColor={Colors.primary}
              iconBackgroundColor={Colors.primarySubtle}
              keyboardType="number-pad"
              maxLength={10}
              errorMessage={errors.birthdate}
              testID="input-patient-birthdate"
            />

            {/* 3. Idade */}
            <InsetInputRow
              label="Idade"
              value={ageText}
              onChangeText={handleAgeChange}
              placeholder="Ex.: 42"
              icon="hourglass-outline"
              iconColor={Colors.primary}
              iconBackgroundColor={Colors.primarySubtle}
              keyboardType="number-pad"
              maxLength={3}
              errorMessage={errors.age}
              accessory={
                isAgeAutoCalculated ? (
                  <Badge
                    label="Automático"
                    variant="primary"
                    styleType="subtle"
                    size="sm"
                  />
                ) : ageText ? (
                  <Text style={styles.ageUnitText}>anos</Text>
                ) : null
              }
              testID="input-patient-age"
            />
          </InsetGroup>

          {/* SECTION 2: CONTATO & CONVÊNIO */}
          <InsetGroup header="CONTATO & CONVÊNIO">
            {/* 4. Telefone / WhatsApp */}
            <InsetInputRow
              label="Telefone / WhatsApp"
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="(22) 99947-4304"
              icon="logo-whatsapp"
              iconColor={Colors.success}
              iconBackgroundColor={Colors.successLight}
              keyboardType="phone-pad"
              maxLength={15}
              required
              errorMessage={errors.phone}
              testID="input-patient-phone"
            />

            {/* 5. E-mail */}
            <InsetInputRow
              label="E-mail (opcional)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setIsDirty(true);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="paciente@exemplo.com.br"
              icon="mail-outline"
              iconColor={Colors.primary}
              iconBackgroundColor={Colors.primarySubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              errorMessage={errors.email}
              testID="input-patient-email"
            />

            {/* 6. Convênio (Segmented Control) */}
            <View style={styles.segmentedContainer}>
              <View style={styles.segmentedHeaderRow}>
                <View style={[styles.iconWrapperSmall, { backgroundColor: Colors.primarySubtle }]}>
                  <Ionicons name="card-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.segmentedLabel}>Convênio / Plano de Saúde</Text>
              </View>

              <SegmentedControl
                values={insuranceOptions}
                selectedIndex={currentInsuranceIndex >= 0 ? currentInsuranceIndex : 0}
                onChange={handleInsuranceChange}
                style={styles.segmentedControlStyle}
              />
            </View>

            {/* 6b. Conditional Sub-input for Convênio Outro */}
            {insuranceType === 'Outro' && (
              <InsetInputRow
                label="Qual convênio?"
                value={insuranceOther}
                onChangeText={(text) => {
                  setInsuranceOther(text);
                  setIsDirty(true);
                  if (errors.insuranceOther) {
                    setErrors((prev) => ({ ...prev, insuranceOther: undefined }));
                  }
                }}
                placeholder="Ex.: Cassi, Petrobras, SulAmérica..."
                icon="business-outline"
                iconColor={Colors.primary}
                iconBackgroundColor={Colors.primarySubtle}
                autoCapitalize="words"
                required
                errorMessage={errors.insuranceOther}
                testID="input-patient-insurance-other"
              />
            )}
          </InsetGroup>

          {/* SECTION 3: ENDEREÇO (COSTA AZUL & REGIÃO) */}
          <InsetGroup
            header="ENDEREÇO (SEM CEP)"
            footer="Atendimento prioritário em Rio das Ostras e Região dos Lagos."
          >
            {/* 7. Endereço */}
            <InsetInputRow
              label="Endereço"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setIsDirty(true);
              }}
              placeholder="Rua, número e complemento"
              icon="home-outline"
              iconColor={Colors.primary}
              iconBackgroundColor={Colors.primarySubtle}
              autoCapitalize="words"
              testID="input-patient-address"
            />

            {/* 8. Bairro */}
            <InsetInputRow
              label="Bairro"
              value={neighborhood}
              onChangeText={(text) => {
                setNeighborhood(text);
                setIsDirty(true);
              }}
              placeholder="Ex.: Costa Azul"
              icon="map-outline"
              iconColor={Colors.primary}
              iconBackgroundColor={Colors.primarySubtle}
              autoCapitalize="words"
              testID="input-patient-neighborhood"
            />

            {/* 9. Cidade / Estado (Default: Rio das Ostras - RJ) */}
            <InsetInputRow
              label="Cidade / Estado"
              value={cityState}
              onChangeText={(text) => {
                setCityState(text);
                setIsDirty(true);
              }}
              placeholder="Rio das Ostras - RJ"
              icon="location-outline"
              iconColor={Colors.primary}
              iconBackgroundColor={Colors.primarySubtle}
              autoCapitalize="words"
              testID="input-patient-citystate"
            />
          </InsetGroup>

          {/* SECTION 4 (Edit Mode Only): STATUS DE ATENDIMENTO */}
          {isEditing && (
            <InsetGroup header="SITUAÇÃO CLÍNICA">
              <View style={styles.segmentedContainer}>
                <Text style={[styles.segmentedLabel, { marginBottom: 8 }]}>Status do Paciente</Text>
                <SegmentedControl
                  values={statusOptions}
                  selectedIndex={currentStatusIndex >= 0 ? currentStatusIndex : 0}
                  onChange={(index) => {
                    Haptics.selection();
                    setStatus(statusValues[index]);
                    setIsDirty(true);
                  }}
                />
              </View>
            </InsetGroup>
          )}

          {/* Bottom Full-Width Action Button */}
          <View style={styles.bottomButtonContainer}>
            <Button
              title={isEditing ? 'Atualizar Cadastro' : 'Cadastrar Paciente'}
              onPress={handleSave}
              loading={saving}
              variant="primary"
              size="large"
              fullWidth
              testID="button-patient-submit"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

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
    paddingHorizontal: Layout.screenMarginHorizontal,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  navCancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  navTitleText: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  navSaveText: {
    ...Typography.headline,
    color: Colors.primary,
    fontWeight: '700',
  },
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: Spacing.section,
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceCard,
    position: 'relative',
  },
  rowDisabled: {
    backgroundColor: '#FAF7FA',
  },
  iconWrapper: {
    width: Layout.iconBoxSize,
    height: Layout.iconBoxSize,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapperSmall: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputCenterColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  labelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  inputLabelText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  requiredAsterisk: {
    color: Colors.accent,
    fontWeight: '700',
  },
  errorInlineText: {
    ...Typography.caption2,
    color: Colors.destructive,
    fontWeight: '600',
    marginLeft: 8,
    flexShrink: 1,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    padding: 0,
    margin: 0,
    height: 24,
  },
  textInputError: {
    color: Colors.destructive,
  },
  textInputDisabled: {
    color: Colors.textSecondary,
  },
  accessoryWrapper: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageUnitText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceCard,
    position: 'relative',
  },
  segmentedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  segmentedLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  segmentedControlStyle: {
    marginTop: 2,
  },
  bottomButtonContainer: {
    marginTop: 12,
    marginHorizontal: Layout.insetGroupMarginHorizontal,
  },
});
