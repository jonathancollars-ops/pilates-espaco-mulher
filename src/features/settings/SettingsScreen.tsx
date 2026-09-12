/**
 * SettingsScreen.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Settings & Clinic Administration Screen.
 * Features:
 * - Local Offline-First Backup: Export JSON (with expo-sharing) and Restore JSON.
 * - App Version & Dual Update Verification (expo-updates OTA + GitHub Releases).
 * - 100% Offline-First Privacy & Local SQLite Status.
 * - Institutional Signature: Dra. Rogéria Collares (CREFITO 23093-F), Costa Azul, Rio das Ostras.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
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
  Badge,
  Button,
  ClinicIdentity,
  CLINIC_IDENTITY,
} from '../../design-system';
import { exportDatabaseBackup, importDatabaseBackup } from '../../services/backupService';
import { checkForUpdates, getCurrentAppVersion, UpdateCheckResult } from '../../services/updateService';
import { getDatabase } from '../../database';
import { usePatients } from '../patients/PatientContext';

export interface SettingsScreenProps {
  onClose?: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps = {}) {
  const { refreshPatients, totalCount } = usePatients();

  // Loading States
  const [exportingBackup, setExportingBackup] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);

  // Restore Modal State
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');

  const currentVersion = getCurrentAppVersion();

  // ---------------------------------------------------------------------------
  // 1. Export Local Backup (JSON)
  // ---------------------------------------------------------------------------
  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      Haptics.impactMedium();

      const result = await exportDatabaseBackup();

      Haptics.success();
      Alert.alert(
        'Backup Exportado com Sucesso',
        `Arquivo: ${result.filename}\n\nRegistros exportados:\n` +
          `• ${result.counts.patients} pacientes\n` +
          `• ${result.counts.anamnesis} anamneses\n` +
          `• ${result.counts.postural_evaluations} avaliações posturais\n` +
          `• ${result.counts.bioimpedance} bioimpedâncias\n` +
          `• ${result.counts.exercises} exercícios\n` +
          `• ${result.counts.routines} rotinas de treino`
      );
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro ao Exportar Backup', err?.message || 'Falha na geração do backup JSON local.');
    } finally {
      setExportingBackup(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Restore Local Backup (JSON)
  // ---------------------------------------------------------------------------
  const handleOpenRestoreModal = () => {
    Haptics.impactMedium();
    setRestoreJsonInput('');
    setRestoreModalVisible(true);
  };

  const handleConfirmRestore = async () => {
    if (!restoreJsonInput.trim()) {
      Haptics.warning();
      Alert.alert('Conteúdo Vazio', 'Cole o conteúdo do arquivo JSON de backup para continuar.');
      return;
    }

    Haptics.warning();
    Alert.alert(
      'Confirmar Restauração de Dados',
      'ATENÇÃO: A restauração substituirá os dados atuais do aplicativo pelo conteúdo do backup. Deseja prosseguir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar Dados',
          style: 'destructive',
          onPress: async () => {
            try {
              setRestoringBackup(true);
              const db = await getDatabase();
              const result = await importDatabaseBackup(db, restoreJsonInput.trim());

              Haptics.success();
              setRestoreModalVisible(false);
              setRestoreJsonInput('');

              // Refresh reactive patient provider
              await refreshPatients();

              Alert.alert(
                'Restauração Concluída',
                `Dados restaurados com sucesso!\n\n` +
                  `• ${result.restoredCounts.patients} pacientes\n` +
                  `• ${result.restoredCounts.anamnesis} anamneses\n` +
                  `• ${result.restoredCounts.postural_evaluations} avaliações posturais\n` +
                  `• ${result.restoredCounts.bioimpedance} bioimpedâncias\n` +
                  `• ${result.restoredCounts.routines} rotinas de treino`
              );
            } catch (err: any) {
              Haptics.error();
              Alert.alert('Falha na Restauração', err?.message || 'O arquivo de backup é inválido ou incompatível.');
            } finally {
              setRestoringBackup(false);
            }
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------------------------
  // 3. Check for App Updates
  // ---------------------------------------------------------------------------
  const handleCheckUpdates = async () => {
    try {
      setCheckingUpdates(true);
      Haptics.impactLight();

      const result: UpdateCheckResult = await checkForUpdates();

      Haptics.selection();
      if (result.isAvailable) {
        Alert.alert(
          'Atualização Disponível',
          `Nova versão ${result.latestVersion || 'atualizada'} disponível!\n\n${
            result.releaseNotes ? `Novidades:\n${result.releaseNotes}\n\n` : ''
          }Origem: ${result.source === 'expo-updates' ? 'OTA Direto (EAS)' : 'Versão Oficial GitHub'}`
        );
      } else if (result.error) {
        Alert.alert(
          'Verificação de Versão',
          `Aplicativo na versão ${result.currentVersion}.\n\nNão foi possível checar servidores remotos no momento (dispositivo offline ou sem conexão externa).`
        );
      } else {
        Alert.alert(
          'Aplicativo Atualizado',
          `Você já está utilizando a versão mais recente (${result.currentVersion}) do Pilates Espaço Mulher.`
        );
      }
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Atualização', `Versão atual: ${currentVersion}. Verificação não disponível no momento.`);
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <LargeTitleLayout
      title="Ajustes"
      subtitle={`${CLINIC_IDENTITY.clinicName} • Configurações`}
      rightAction={
        onClose ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.selection();
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar ajustes"
          >
            <Text style={{ ...Typography.headline, color: Colors.primary, fontWeight: '600' }}>
              OK
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <InsetGroupedList scrollable={false}>
        {/* 1. Backup Local */}
        <InsetGroup
          header="Backup Local (100% Offline)"
          footer="Exporte ou restaure todos os prontuários, avaliações físicas e treinos em arquivo JSON seguro, sem envio a servidores externos."
        >
          <InsetRow
            icon="cloud-upload-outline"
            iconBackgroundColor={Colors.primarySubtle}
            iconColor={Colors.primaryDark}
            label="Exportar Backup (JSON)"
            subtitle={`${totalCount} pacientes cadastrados`}
            value={exportingBackup ? 'Exportando...' : 'Gerar Arquivo'}
            onPress={handleExportBackup}
            disabled={exportingBackup}
            accessory={
              exportingBackup ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : undefined
            }
          />
          <InsetRow
            icon="cloud-download-outline"
            iconBackgroundColor="#EFE6F6"
            iconColor={Colors.primaryDark}
            label="Restaurar Backup (JSON)"
            subtitle="Substituição atômica e segura"
            value="Importar"
            onPress={handleOpenRestoreModal}
          />
        </InsetGroup>

        {/* 2. Versão e Atualizações */}
        <InsetGroup
          header="Versão do Aplicativo"
          footer="Verificação dupla não-bloqueante: atualizações remotas OTA via EAS e pacotes oficiais da clínica."
        >
          <InsetRow
            icon="phone-portrait-outline"
            label="Versão Atual Instalada"
            value={`v${currentVersion}`}
            accessory={<Badge label="Produção" variant="success" size="sm" />}
          />
          <InsetRow
            icon="refresh-circle-outline"
            label="Verificar Atualizações"
            subtitle="Buscar novidades de sistema"
            value={checkingUpdates ? 'Checando...' : 'Verificar'}
            onPress={handleCheckUpdates}
            disabled={checkingUpdates}
            accessory={
              checkingUpdates ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : undefined
            }
          />
        </InsetGroup>

        {/* 3. Privacidade e Armazenamento */}
        <InsetGroup
          header="Privacidade & Blindagem de Dados"
          footer="Garantia de segurança: prontuários, fotos e parâmetros biométricos permanecem estritamente no dispositivo."
        >
          <InsetRow
            icon="shield-checkmark"
            iconBackgroundColor={Colors.successLight}
            iconColor={Colors.success}
            label="Modo de Operação"
            value="100% Local-First"
            accessory={<Badge label="Zero Nuvem" variant="success" styleType="subtle" size="sm" />}
          />
          <InsetRow
            icon="server-outline"
            label="Banco de Dados Local"
            value="SQLite (WAL Ativo)"
          />
          <InsetRow
            icon="lock-closed-outline"
            label="Telemetria & Rastreamento"
            value="Desativada (Zero Leakage)"
          />
        </InsetGroup>

        {/* 4. Identidade Institucional da Clínica */}
        <InsetGroup
          header="Responsável Técnica & Clínica"
          footer="Documento e informações regulamentadas pelo Conselho Regional de Fisioterapia e Terapia Ocupacional."
        >
          <InsetRow
            icon="person-outline"
            label="Fisioterapeuta"
            value={CLINIC_IDENTITY.professionalName}
          />
          <InsetRow
            icon="ribbon-outline"
            label="Registro Profissional"
            value={CLINIC_IDENTITY.crefito}
          />
          <InsetRow
            icon="location-outline"
            label="Localização"
            value={CLINIC_IDENTITY.location}
          />
          <InsetRow
            icon="logo-whatsapp"
            iconBackgroundColor={Colors.successLight}
            iconColor={Colors.success}
            label="Contato da Clínica"
            value={CLINIC_IDENTITY.phone}
            onPress={() => {
              const digits = CLINIC_IDENTITY.phone.replace(/\D/g, '');
              Linking.openURL(`https://wa.me/55${digits}`);
            }}
          />
        </InsetGroup>
      </InsetGroupedList>

      {/* Institutional Clinic Card */}
      <View style={styles.identityCardContainer}>
        <ClinicIdentity variant="header" />
      </View>

      <View style={styles.footerContainer}>
        <ClinicIdentity variant="footer" />
      </View>

      {/* ============================================================= */}
      {/* MODAL: RESTAURAR BACKUP JSON */}
      {/* ============================================================= */}
      <Modal
        visible={restoreModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setRestoreModalVisible(false)}
              style={styles.modalNavButton}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Restaurar Backup</Text>
            <TouchableOpacity
              onPress={handleConfirmRestore}
              disabled={restoringBackup || !restoreJsonInput.trim()}
              style={styles.modalNavButton}
            >
              <Text
                style={[
                  styles.modalSaveText,
                  (!restoreJsonInput.trim() || restoringBackup) && styles.modalSaveTextDisabled,
                ]}
              >
                {restoringBackup ? 'Restaurando...' : 'Restaurar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.warningNoticeBox}>
              <Ionicons name="warning-outline" size={24} color={Colors.warning} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.warningNoticeTitle}>Atenção com a Restauração</Text>
                <Text style={styles.warningNoticeText}>
                  A importação substituirá integralmente os pacientes e avaliações atuais pelo arquivo restaurado. Certifique-se de que o conteúdo JSON é de origem confiável.
                </Text>
              </View>
            </View>

            <InsetGroupedList scrollable={false}>
              <InsetGroup header="Conteúdo do Backup (JSON)">
                <View style={styles.jsonInputCell}>
                  <TextInput
                    style={styles.jsonTextInput}
                    value={restoreJsonInput}
                    onChangeText={setRestoreJsonInput}
                    placeholder="Cole aqui o texto completo do arquivo JSON de backup..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </InsetGroup>
            </InsetGroupedList>

            <View style={styles.modalActionButton}>
              <Button
                title="Validar Integridade & Restaurar"
                onPress={handleConfirmRestore}
                loading={restoringBackup}
                disabled={!restoreJsonInput.trim()}
                variant="destructive"
                size="large"
                fullWidth
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </LargeTitleLayout>
  );
}

const styles = StyleSheet.create({
  identityCardContainer: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
  },
  footerContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
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
  modalTitle: {
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
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingVertical: Spacing.base,
  },
  warningNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8D5B5',
  },
  warningNoticeTitle: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 2,
  },
  warningNoticeText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  jsonInputCell: {
    padding: 12,
  },
  jsonTextInput: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    padding: 12,
    minHeight: 220,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalActionButton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
});
