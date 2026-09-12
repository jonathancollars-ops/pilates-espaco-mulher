/**
 * PackagesScreen.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Session Packages & Attendance Tracking Screen.
 * Features:
 * - Renewal Alert Card (Wine #6A1B15) for packages with <= 1 session remaining
 * - Inset Grouped list of active and completed packages
 * - Visual progress bars (completed / total sessions)
 * - Patient attendance history (% presence vs absences via appointmentRepository)
 * - "+ Novo Pacote" and "Renovar Pacote" modal sheet
 * - Header right Settings gear opening SettingsModalSheet
 * - Strictly offline-first SQLite integration, excluding CPF, CEP, and marital status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
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
  Shadows,
  LargeTitleLayout,
  Haptics,
  InsetGroupedList,
  InsetGroup,
  InsetRow,
  Badge,
  Button,
  Card,
} from '../../design-system';
import { usePatients } from '../patients/PatientContext';
import { packageRepository } from '../../database/repositories/packageRepository';
import { appointmentRepository } from '../../database/repositories/appointmentRepository';
import { PackagePlan } from '../../types/package';
import { SettingsModalSheet } from '../settings/SettingsModalSheet';
import {
  formatDateBR,
  parseBRDateToISO,
  maskDateInput,
} from '../../utils/formatters';

interface PatientPackageSummary {
  package: PackagePlan;
  patientName: string;
  patientPhone: string;
  attendance: {
    total: number;
    attended: number;
    absent: number;
    cancelled: number;
    attendanceRate: number;
  };
}

export interface PackagesScreenProps {
  onNavigateToPatient?: (patientId: string) => void;
}

export function PackagesScreen({ onNavigateToPatient }: PackagesScreenProps) {
  const { patients } = usePatients();
  const activePatients = patients.filter((p) => p.status === 'active');

  // Modal States
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [newPackageModalVisible, setNewPackageModalVisible] = useState(false);
  const [selectedPatientForNew, setSelectedPatientForNew] = useState<string>('');

  // Form States for New/Renew Package Modal
  const [formSessions, setFormSessions] = useState<number>(8);
  const [formStartDateBR, setFormStartDateBR] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('400,00');
  const [formNotes, setFormNotes] = useState<string>('');
  const [savingPackage, setSavingPackage] = useState(false);

  // Data States
  const [refreshing, setRefreshing] = useState(false);
  const [packageSummaries, setPackageSummaries] = useState<PatientPackageSummary[]>([]);

  // Load Packages and Attendance Stats
  const loadData = useCallback(async () => {
    try {
      const allPackages = await packageRepository.listAllWithPatient();
      const summaries: PatientPackageSummary[] = [];

      for (const pkg of allPackages) {
        const stats = await appointmentRepository.getAttendanceStats(pkg.patient_id);
        summaries.push({
          package: pkg,
          patientName: pkg.patient_name,
          patientPhone: pkg.patient_phone,
          attendance: stats,
        });
      }

      setPackageSummaries(summaries);
    } catch (err: any) {
      console.warn('Error loading package summaries:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Identify packages that need renewal: active and (total - completed) <= 1
  const renewalAlerts = packageSummaries.filter(
    (s) => s.package.status === 'active' && s.package.total_sessions - s.package.completed_sessions <= 1
  );

  const activePackages = packageSummaries.filter((s) => s.package.status === 'active');
  const completedPackages = packageSummaries.filter((s) => s.package.status !== 'active');

  // Open modal for a specific patient (e.g. from Renewal Alert or + Button)
  const openNewPackageModal = (preselectedPatientId?: string) => {
    Haptics.selection();
    const targetId = preselectedPatientId || (activePatients[0]?.id ?? '');
    setSelectedPatientForNew(targetId);
    setFormSessions(8);
    setFormStartDateBR(formatDateBR(new Date().toISOString().split('T')[0]));
    setFormPrice('400,00');
    setFormNotes('');
    setNewPackageModalVisible(true);
  };

  const handleSavePackage = async () => {
    if (!selectedPatientForNew) {
      Haptics.warning();
      Alert.alert('Paciente Obrigatório', 'Selecione a paciente para o plano de sessões.');
      return;
    }

    const isoDate = parseBRDateToISO(formStartDateBR);
    if (!isoDate) {
      Haptics.warning();
      Alert.alert('Data Inválida', 'Informe a data de início no formato DD/MM/AAAA.');
      return;
    }

    if (formSessions <= 0) {
      Haptics.warning();
      Alert.alert('Sessões Inválidas', 'O total de sessões deve ser maior que zero.');
      return;
    }

    // Parse price in cents (e.g. "400,00" -> 40000)
    let priceCents: number | null = null;
    if (formPrice.trim()) {
      const cleanPrice = formPrice.replace(/[^\d,.]/g, '').replace(',', '.');
      const floatVal = parseFloat(cleanPrice);
      if (!isNaN(floatVal)) {
        priceCents = Math.round(floatVal * 100);
      }
    }

    try {
      setSavingPackage(true);
      Haptics.impactMedium();

      await packageRepository.create({
        patient_id: selectedPatientForNew,
        total_sessions: formSessions,
        completed_sessions: 0,
        start_date: isoDate,
        status: 'active',
        price_cents: priceCents,
        notes: formNotes.trim() || null,
      });

      Haptics.success();
      setNewPackageModalVisible(false);
      await loadData();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro ao Salvar', err?.message || 'Falha ao cadastrar pacote.');
    } finally {
      setSavingPackage(false);
    }
  };

  // Quick action: manually increment session
  const handleIncrementSession = async (pkgId: string) => {
    Haptics.impactLight();
    try {
      await packageRepository.incrementSession(pkgId);
      Haptics.success();
      await loadData();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Falha ao atualizar sessão.');
    }
  };

  return (
    <LargeTitleLayout
      title="Sessões"
      subtitle="Controle de Pacotes & Frequência"
      rightAction={
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => openNewPackageModal()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Novo pacote de sessões"
          >
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.selection();
              setSettingsVisible(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Ajustes da clínica"
          >
            <Ionicons name="settings-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* 1. Renewal Alert Card (Bordô #6A1B15) */}
      {renewalAlerts.length > 0 && (
        <View style={styles.renewalAlertContainer}>
          {renewalAlerts.map((alertItem) => {
            const remaining = alertItem.package.total_sessions - alertItem.package.completed_sessions;
            return (
              <View key={alertItem.package.id} style={styles.renewalAlertCard}>
                <View style={styles.renewalAlertHeader}>
                  <View style={styles.renewalAlertIcon}>
                    <Ionicons name="alert-circle" size={20} color="#fff" />
                  </View>
                  <View style={styles.renewalAlertTitleCol}>
                    <Text style={styles.renewalAlertTitle}>
                      Pacote terminando: Renovar com {alertItem.patientName}
                    </Text>
                    <Text style={styles.renewalAlertSubtitle}>
                      {remaining === 0
                        ? 'Todas as sessões foram realizadas.'
                        : `Resta apenas ${remaining} sessão de ${alertItem.package.total_sessions}.`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.renewActionBtn}
                  onPress={() => openNewPackageModal(alertItem.package.patient_id)}
                >
                  <Text style={styles.renewActionBtnText}>Renovar Pacote</Text>
                  <Ionicons name="arrow-forward" size={14} color="#6A1B15" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* 2. Active Packages Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          Pacotes Ativos ({activePackages.length})
        </Text>

        <TouchableOpacity
          style={styles.addPackageLink}
          onPress={() => openNewPackageModal()}
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={styles.addPackageLinkText}>Novo Pacote</Text>
        </TouchableOpacity>
      </View>

      {activePackages.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="hourglass-outline" size={38} color={Colors.border} />
          <Text style={styles.emptyTitle}>Nenhum pacote ativo</Text>
          <Text style={styles.emptySubtitle}>
            Cadastre planos de 4, 8 ou 12 sessões para acompanhar a frequência das pacientes.
          </Text>
          <Button
            title="+ Cadastrar Pacote"
            variant="outline"
            size="small"
            onPress={() => openNewPackageModal()}
          />
        </View>
      ) : (
        <View style={styles.cardsList}>
          {activePackages.map((item) => {
            const { package: pkg, patientName, attendance } = item;
            const progress = Math.min(1, pkg.completed_sessions / pkg.total_sessions);
            const remaining = pkg.total_sessions - pkg.completed_sessions;
            const percent = Math.round(progress * 100);

            return (
              <Card key={pkg.id} style={styles.packageCard}>
                {/* Header: Name + Badge */}
                <View style={styles.cardHeaderRow}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selection();
                      if (onNavigateToPatient) {
                        onNavigateToPatient(pkg.patient_id);
                      }
                    }}
                  >
                    <Text style={styles.cardPatientName}>{patientName}</Text>
                  </TouchableOpacity>

                  <Badge
                    label={remaining <= 1 ? 'Quase no Fim' : 'Ativo'}
                    variant={remaining <= 1 ? 'alert' : 'success'}
                    size="sm"
                  />
                </View>

                {/* Subtitle / Dates */}
                <Text style={styles.cardDetailsText}>
                  Plano de {pkg.total_sessions} Sessões • Início: {formatDateBR(pkg.start_date)}
                </Text>

                {/* Visual Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${percent}%` },
                        remaining <= 1 && { backgroundColor: Colors.accent },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabelsRow}>
                    <Text style={styles.progressCountText}>
                      {pkg.completed_sessions} de {pkg.total_sessions} sessões ({percent}%)
                    </Text>
                    <Text style={styles.progressRemainingText}>
                      {remaining > 0 ? `${remaining} restantes` : 'Concluído'}
                    </Text>
                  </View>
                </View>

                {/* Attendance Metric */}
                <View style={styles.attendanceStatsRow}>
                  <Ionicons name="stats-chart-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.attendanceStatsText}>
                    Frequência Geral: {attendance.attendanceRate}% ({attendance.attended} presenças, {attendance.absent} faltas)
                  </Text>
                </View>

                {/* Card Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.incrementSessionBtn}
                    onPress={() => handleIncrementSession(pkg.id)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    <Text style={styles.incrementSessionText}>+ 1 Presença</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardRenewBtn}
                    onPress={() => openNewPackageModal(pkg.patient_id)}
                  >
                    <Ionicons name="repeat" size={16} color={Colors.textSecondary} />
                    <Text style={styles.cardRenewText}>Renovar</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* 3. Completed Packages History */}
      {completedPackages.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>
            Histórico de Pacotes Concluídos ({completedPackages.length})
          </Text>

          <InsetGroupedList scrollable={false}>
            <InsetGroup>
              {completedPackages.map((cp) => (
                <InsetRow
                  key={cp.package.id}
                  icon="checkmark-done-circle"
                  iconBackgroundColor={Colors.surfaceSecondary}
                  iconColor={Colors.textSecondary}
                  label={cp.patientName}
                  value={`${cp.package.completed_sessions}/${cp.package.total_sessions} sessões`}
                  subtitle={`Iniciado em ${formatDateBR(cp.package.start_date)}`}
                />
              ))}
            </InsetGroup>
          </InsetGroupedList>
        </View>
      )}

      {/* Settings Modal Sheet */}
      <SettingsModalSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* New / Renew Package Modal */}
      <Modal
        visible={newPackageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNewPackageModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header Bar */}
          <View style={styles.modalNavBar}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                Haptics.selection();
                setNewPackageModalVisible(false);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              disabled={savingPackage}
            >
              <Text style={styles.navCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <Text style={styles.navTitle} numberOfLines={1}>
              Novo Pacote de Sessões
            </Text>

            <TouchableOpacity
              style={styles.navButton}
              onPress={handleSavePackage}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              disabled={savingPackage}
            >
              <Text style={[styles.navSaveText, savingPackage && styles.navButtonDisabled]}>
                {savingPackage ? 'Salvando...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <InsetGroupedList scrollable={false}>
              {/* Patient Selection */}
              <InsetGroup
                header="Paciente"
                footer="Vincule o pacote à paciente para dedução automática ao marcar presença."
              >
                {activePatients.map((p) => {
                  const isSelected = p.id === selectedPatientForNew;
                  return (
                    <InsetRow
                      key={p.id}
                      icon="person"
                      label={p.name}
                      subtitle={p.phone}
                      accessory={
                        isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        ) : undefined
                      }
                      onPress={() => {
                        Haptics.selection();
                        setSelectedPatientForNew(p.id);
                      }}
                    />
                  );
                })}
              </InsetGroup>

              {/* Number of Sessions Chips */}
              <InsetGroup
                header="Quantidade de Sessões"
                footer="Pacotes de 8 sessões (2x por semana) ou 12 sessões (3x por semana) são os mais comuns."
              >
                <View style={styles.sessionChipsRow}>
                  {[4, 8, 12, 16, 24].map((num) => {
                    const isSelected = formSessions === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[styles.sessionChip, isSelected && styles.sessionChipSelected]}
                        onPress={() => {
                          Haptics.selection();
                          setFormSessions(num);
                        }}
                      >
                        <Text style={[styles.sessionChipText, isSelected && styles.sessionChipTextSelected]}>
                          {num} sessões
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </InsetGroup>

              {/* Start Date & Price */}
              <InsetGroup header="Detalhes do Plano">
                <View style={styles.inputRow}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.inputLabel}>Início</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formStartDateBR}
                    onChangeText={(t) => setFormStartDateBR(maskDateInput(t))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                <View style={styles.separator} />

                <View style={styles.inputRow}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="cash-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.inputLabel}>Valor (R$)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formPrice}
                    onChangeText={setFormPrice}
                    placeholder="0,00"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                  />
                </View>
              </InsetGroup>

              {/* Notes */}
              <InsetGroup header="Observações (Opcional)">
                <View style={styles.textAreaContainer}>
                  <TextInput
                    style={styles.textArea}
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="Ex: Pagamento à vista, plano mensal..."
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
    </LargeTitleLayout>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  renewalAlertContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  renewalAlertCard: {
    backgroundColor: '#6A1B15', // Official Brand Wine
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.elevated,
  },
  renewalAlertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  renewalAlertIcon: {
    marginTop: 2,
  },
  renewalAlertTitleCol: {
    flex: 1,
  },
  renewalAlertTitle: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  renewalAlertSubtitle: {
    ...Typography.footnote,
    color: '#F8D7DA',
    marginTop: 2,
  },
  renewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
    gap: 6,
  },
  renewActionBtnText: {
    ...Typography.caption1,
    color: '#6A1B15',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  addPackageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addPackageLinkText: {
    ...Typography.subhead,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    ...Shadows.subtle,
  },
  emptyTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.base,
  },
  cardsList: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  packageCard: {
    backgroundColor: Colors.surfaceCard,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardPatientName: {
    ...Typography.title3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  cardDetailsText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    marginBottom: Spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCountText: {
    ...Typography.caption1,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  progressRemainingText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  attendanceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  attendanceStatsText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: Spacing.xs,
  },
  incrementSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.sm,
  },
  incrementSessionText: {
    ...Typography.caption1,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  cardRenewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cardRenewText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  historySection: {
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },
  historySectionTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '600',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
  },
  modalContainer: {
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
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xl * 2,
  },
  sessionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: Spacing.base,
    backgroundColor: Colors.surfaceCard,
  },
  sessionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  sessionChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sessionChipText: {
    ...Typography.subhead,
    color: Colors.textPrimary,
  },
  sessionChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
    width: 90,
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
});
