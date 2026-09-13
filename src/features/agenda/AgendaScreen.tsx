/**
 * AgendaScreen.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Agenda & Clinical Scheduling Screen.
 * Features:
 * - Top SegmentedControl: [ Hoje | Mês ]
 * - Header right Settings gear opening SettingsModalSheet
 * - Highlight Card "Atendimento Agora & A Seguir" with quick presence action
 * - Daily Timeline (07:00 to 20:00) with quick status transitions & WhatsApp confirmation
 * - Monthly Calendar Grid with status indicator dots and day appointments
 * - Apple Inset Grouped layout, Haptic feedback, and offline SQLite synchronization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
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
  LargeTitleLayout,
  Haptics,
  SegmentedControl,
  Card,
  Badge,
  Button,
} from '../../design-system';
import { usePatients } from '../patients/PatientContext';
import { appointmentRepository } from '../../database/repositories/appointmentRepository';
import { Appointment, AppointmentStatus } from '../../types/appointment';
import { AppointmentModal } from './AppointmentModal';
import { SettingsModalSheet } from '../settings/SettingsModalSheet';
import {
  formatDateBR,
  formatAppointmentConfirmationWhatsApp,
} from '../../utils/formatters';

function getInitials(name: string): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AgendaScreenProps {
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToRoutine?: (patientId: string) => void;
}

export function AgendaScreen({
  onNavigateToPatient,
  onNavigateToRoutine,
}: AgendaScreenProps) {
  const { patients } = usePatients();

  // Navigation / Modal States
  const [selectedSegment, setSelectedSegment] = useState<number>(0); // 0: Hoje, 1: Mês
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Date States
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayISO); // YYYY-MM-DD
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(todayISO.slice(0, 7)); // YYYY-MM

  // Data States
  const [refreshing, setRefreshing] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [monthSummary, setMonthSummary] = useState<{ date: string; count: number; attendedCount: number }[]>([]);

  // Load Day & Current/Next Appointments
  const loadDayData = useCallback(async (date: string) => {
    try {
      const appointments = await appointmentRepository.listByDate(date);
      setDayAppointments(appointments);

      // Format current time HH:mm
      const now = new Date();
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHH}:${currentMM}`;

      const { current, next } = await appointmentRepository.getCurrentAndNext(currentTimeStr, date);
      setCurrentAppointment(current);
      setNextAppointment(next);
    } catch (err: any) {
      console.warn('Error loading day appointments:', err?.message);
    }
  }, []);

  // Load Month Summary
  const loadMonthData = useCallback(async (yearMonth: string) => {
    try {
      const summary = await appointmentRepository.getMonthSummary(yearMonth);
      setMonthSummary(summary);
    } catch (err: any) {
      console.warn('Error loading month summary:', err?.message);
    }
  }, []);

  // Refresh All
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDayData(selectedDate), loadMonthData(currentYearMonth)]);
    setRefreshing(false);
  }, [selectedDate, currentYearMonth, loadDayData, loadMonthData]);

  useEffect(() => {
    loadDayData(selectedDate);
  }, [selectedDate, loadDayData]);

  useEffect(() => {
    loadMonthData(currentYearMonth);
  }, [currentYearMonth, loadMonthData]);

  // Status update with Haptic feedback and automatic package deduction
  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    Haptics.impactLight();
    try {
      await appointmentRepository.updateStatus(id, status);
      if (status === 'attended') {
        Haptics.success();
      }
      await refreshData();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Falha ao atualizar status.');
    }
  };

  // WhatsApp Confirmation
  const handleSendWhatsApp = async (app: Appointment) => {
    Haptics.selection();
    const patient = patients.find((p) => p.id === app.patient_id);
    const phone = patient?.phone || '';

    if (!phone) {
      Alert.alert('Telefone Indisponível', 'Cadastre o WhatsApp na ficha da paciente para enviar confirmação.');
      return;
    }

    const { deepLink, webUrl } = formatAppointmentConfirmationWhatsApp(
      app.patient_name,
      formatDateBR(app.date),
      app.start_time,
      phone
    );

    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  // Shift Day (< Ontem | Hoje | Amanhã >)
  const shiftDay = (days: number) => {
    Haptics.selection();
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);

    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    const newDateStr = `${newY}-${newM}-${newD}`;

    setSelectedDate(newDateStr);
    if (`${newY}-${newM}` !== currentYearMonth) {
      setCurrentYearMonth(`${newY}-${newM}`);
    }
  };

  // Shift Month (< Mês Anterior | Próximo Mês >)
  const shiftMonth = (months: number) => {
    Haptics.selection();
    const [y, m] = currentYearMonth.split('-').map(Number);
    const dateObj = new Date(y, m - 1 + months, 1);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newYearMonth = `${newY}-${newM}`;
    setCurrentYearMonth(newYearMonth);
    // select first day of that month
    setSelectedDate(`${newYearMonth}-01`);
  };

  // Helper for Session Type Label
  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'pilates_individual':
        return 'Pilates Individual';
      case 'pilates_group':
        return 'Pilates em Grupo';
      case 'clinical_evaluation':
        return 'Avaliação Clínica';
      case 'rehabilitation':
        return 'Reabilitação';
      default:
        return 'Atendimento';
    }
  };

  // Build Month Calendar Matrix
  const renderMonthCalendar = () => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const firstDayOfWeek = new Date(y, m - 1, 1).getDay(); // 0 = Dom, 1 = Seg...
    const daysInMonth = new Date(y, m, 0).getDate();

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthTitle = `${monthNames[m - 1]} de ${y}`;

    const summaryMap = new Map<string, { count: number; attendedCount: number }>();
    monthSummary.forEach((s) => summaryMap.set(s.date, s));

    const cells: React.ReactNode[] = [];
    // Empty prefix cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const cellDateStr = `${currentYearMonth}-${dayStr}`;
      const isSelected = cellDateStr === selectedDate;
      const isToday = cellDateStr === todayISO;
      const summary = summaryMap.get(cellDateStr);
      const hasAppointments = summary && summary.count > 0;
      const allAttended = hasAppointments && summary.attendedCount >= summary.count;

      cells.push(
        <TouchableOpacity
          key={cellDateStr}
          style={[
            styles.calendarCell,
            isSelected && styles.calendarCellSelected,
            isToday && !isSelected && styles.calendarCellToday,
          ]}
          onPress={() => {
            Haptics.selection();
            setSelectedDate(cellDateStr);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Dia ${day}`}
        >
          <Text
            style={[
              styles.calendarDayText,
              isSelected && styles.calendarDayTextSelected,
              isToday && !isSelected && styles.calendarDayTextToday,
            ]}
          >
            {day}
          </Text>

          {/* Dots Indicator */}
          {hasAppointments && (
            <View
              style={[
                styles.calendarDot,
                allAttended ? styles.calendarDotSuccess : styles.calendarDotPrimary,
                isSelected && styles.calendarDotSelected,
              ]}
            />
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.monthContainer}>
        {/* Month Navigator Header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => shiftMonth(-1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <Text style={styles.monthHeaderTitle}>{monthTitle}</Text>

          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => shiftMonth(1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Weekday Row */}
        <View style={styles.weekdayRow}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((wd, i) => (
            <Text key={i} style={styles.weekdayText}>
              {wd}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.calendarGrid}>{cells}</View>
      </View>
    );
  };

  const currentPatient = patients.find((p) => p.id === currentAppointment?.patient_id);
  const nextPatient = patients.find((p) => p.id === nextAppointment?.patient_id);

  return (
    <LargeTitleLayout
      title="Agenda"
      subtitle="Pilates Espaço Mulher"
      rightAction={
        <TouchableOpacity
          onPress={() => {
            Haptics.selection();
            setSettingsVisible(true);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Ajustes da clínica"
        >
          <Ionicons name="settings-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshData}
          tintColor={Colors.primary}
        />
      }
    >
      {/* 1. Top Segmented Control: [ Hoje | Mês ] */}
      <View style={styles.segmentedContainer}>
        <SegmentedControl
          values={['Hoje', 'Mês']}
          selectedIndex={selectedSegment}
          onChange={(index) => {
            setSelectedSegment(index);
            if (index === 0) {
              setSelectedDate(todayISO);
            }
          }}
        />
      </View>

      {/* 2. Highlight Card: Atendimento Agora & A Seguir */}
      <View style={styles.highlightSection}>
        <Card style={styles.highlightCard}>
          <View style={styles.highlightHeader}>
            <View style={styles.highlightBadgeRow}>
              <Ionicons name="radio-button-on" size={16} color={currentAppointment ? Colors.success : Colors.primary} />
              <Text style={styles.highlightTitle}>
                {currentAppointment ? 'ATENDIMENTO AGORA' : 'STATUS DA CLÍNICA'}
              </Text>
            </View>
            {currentAppointment && (
              <Badge
                label={currentAppointment.status === 'attended' ? 'Presente' : 'Em Andamento'}
                variant={currentAppointment.status === 'attended' ? 'success' : 'primary'}
                size="sm"
              />
            )}
          </View>

          {currentAppointment ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selection();
                if (onNavigateToPatient) {
                  onNavigateToPatient(currentAppointment.patient_id);
                } else if (onNavigateToRoutine) {
                  onNavigateToRoutine(currentAppointment.patient_id);
                }
              }}
              style={styles.currentPatientTouchable}
            >
              <View style={styles.currentPatientHeaderRow}>
                {/* Patient Avatar (Photo or Initials) */}
                <View style={styles.agendaAvatarCircle}>
                  {currentPatient?.avatar_uri ? (
                    <Image source={{ uri: currentPatient.avatar_uri }} style={styles.agendaAvatarImage} />
                  ) : (
                    <Text style={styles.agendaAvatarText}>{getInitials(currentAppointment.patient_name)}</Text>
                  )}
                </View>

                <View style={styles.currentPatientInfo}>
                  <Text style={styles.currentPatientName}>{currentAppointment.patient_name}</Text>
                  <View style={styles.currentTimeRow}>
                    <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
                    <Text style={styles.currentTimeText}>
                      {currentAppointment.start_time} - {currentAppointment.end_time} • {getSessionTypeLabel(currentAppointment.type)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Presence Action */}
              <View style={styles.quickActionRow}>
                <Button
                  title={currentAppointment.status === 'attended' ? 'Presença Confirmada' : 'Marcar Presença'}
                  variant={currentAppointment.status === 'attended' ? 'secondary' : 'primary'}
                  size="small"
                  leadingIcon={
                    <Ionicons
                      name={currentAppointment.status === 'attended' ? 'checkmark-circle' : 'checkmark'}
                      size={16}
                      color={currentAppointment.status === 'attended' ? Colors.primaryDark : '#fff'}
                    />
                  }
                  onPress={() => handleUpdateStatus(currentAppointment.id, 'attended')}
                  style={styles.markPresenceButton}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noCurrentSession}>
              <Text style={styles.noCurrentText}>Nenhum atendimento em andamento no momento.</Text>
            </View>
          )}

          {/* Next Patient Sub-line */}
          <View style={styles.nextPatientDivider} />
          <View style={styles.nextPatientRow}>
            {nextAppointment && nextPatient?.avatar_uri ? (
              <Image source={{ uri: nextPatient.avatar_uri }} style={styles.nextPatientAvatarImage} />
            ) : nextAppointment ? (
              <View style={styles.nextPatientAvatarCircle}>
                <Text style={styles.nextPatientAvatarText}>{getInitials(nextAppointment.patient_name)}</Text>
              </View>
            ) : (
              <Ionicons name="arrow-forward-circle-outline" size={16} color={Colors.textSecondary} />
            )}
            <Text style={styles.nextPatientLabel}>A Seguir:</Text>
            <Text style={styles.nextPatientValue} numberOfLines={1}>
              {nextAppointment
                ? `${nextAppointment.patient_name} às ${nextAppointment.start_time}`
                : 'Nenhum próximo atendimento agendado.'}
            </Text>
          </View>
        </Card>
      </View>

      {/* 3. Monthly Calendar (when segment === 1) */}
      {selectedSegment === 1 && renderMonthCalendar()}

      {/* 4. Date Bar for Day Timeline */}
      <View style={styles.dateBarContainer}>
        <TouchableOpacity
          onPress={() => shiftDay(-1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.dateNavArrow}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selection();
            setSelectedDate(todayISO);
          }}
          style={styles.dateCenterBtn}
        >
          <Text style={styles.dateBarText}>
            {selectedDate === todayISO ? 'Hoje: ' : ''}{formatDateBR(selectedDate)}
          </Text>
          {selectedDate !== todayISO && (
            <Badge label="Voltar para Hoje" variant="neutral" size="sm" style={styles.todayBadge} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => shiftDay(1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.dateNavArrow}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 5. Appointments List / Timeline for Selected Date */}
      <View style={styles.timelineSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Atendimentos ({dayAppointments.length})
          </Text>

          <TouchableOpacity
            style={styles.addAppointmentBtn}
            onPress={() => {
              Haptics.selection();
              setEditingAppointment(null);
              setAppointmentModalVisible(true);
            }}
          >
            <Ionicons name="add-circle" size={18} color={Colors.primary} />
            <Text style={styles.addAppointmentText}>Agendar</Text>
          </TouchableOpacity>
        </View>

        {dayAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>Nenhum atendimento agendado</Text>
            <Text style={styles.emptySubtitle}>
              Toque em Agendar para marcar uma sessão nesta data.
            </Text>
            <Button
              title="+ Agendar Atendimento"
              variant="outline"
              size="small"
              onPress={() => {
                Haptics.selection();
                setEditingAppointment(null);
                setAppointmentModalVisible(true);
              }}
              style={styles.emptyScheduleBtn}
            />
          </View>
        ) : (
          dayAppointments.map((item) => {
            const isAttended = item.status === 'attended';
            const isAbsent = item.status === 'absent';
            const isCancelled = item.status === 'cancelled';

            return (
              <View key={item.id} style={styles.timelineItemCard}>
                {/* Time Indicator column */}
                <View style={styles.timelineTimeCol}>
                  <Text style={styles.timelineStartTime}>{item.start_time}</Text>
                  <Text style={styles.timelineEndTime}>{item.end_time}</Text>
                </View>

                {/* Vertical Separator Line */}
                <View
                  style={[
                    styles.timelineVerticalLine,
                    isAttended && { backgroundColor: Colors.success },
                    isAbsent && { backgroundColor: Colors.accent },
                    isCancelled && { backgroundColor: Colors.border },
                  ]}
                />

                {/* Main Content */}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTitleRow}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selection();
                        if (onNavigateToPatient) {
                          onNavigateToPatient(item.patient_id);
                        }
                      }}
                      style={{ flex: 1 }}
                    >
                      <Text style={styles.patientItemName} numberOfLines={1}>
                        {item.patient_name}
                      </Text>
                    </TouchableOpacity>

                    {/* Status Badge */}
                    {isAttended && <Badge label="Presente" variant="success" size="sm" />}
                    {isAbsent && <Badge label="Falta" variant="alert" size="sm" />}
                    {isCancelled && <Badge label="Cancelado" variant="neutral" size="sm" />}
                    {item.status === 'scheduled' && <Badge label="Agendado" variant="primary" size="sm" />}
                  </View>

                  <Text style={styles.patientItemType}>
                    {getSessionTypeLabel(item.type)}
                    {item.notes ? ` • ${item.notes}` : ''}
                  </Text>

                  {/* Actions Row */}
                  <View style={styles.itemActionsRow}>
                    {/* Quick status actions */}
                    <TouchableOpacity
                      style={[styles.statusActionBtn, isAttended && styles.statusActionBtnActiveSuccess]}
                      onPress={() => handleUpdateStatus(item.id, 'attended')}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color={isAttended ? '#fff' : Colors.success}
                      />
                      <Text style={[styles.statusActionText, isAttended && styles.statusActionTextActive]}>
                        Presente
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusActionBtn, isAbsent && styles.statusActionBtnActiveError]}
                      onPress={() => handleUpdateStatus(item.id, 'absent')}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={14}
                        color={isAbsent ? '#fff' : Colors.accent}
                      />
                      <Text style={[styles.statusActionText, isAbsent && styles.statusActionTextActive]}>
                        Falta
                      </Text>
                    </TouchableOpacity>

                    {/* WhatsApp 1-tap confirmation */}
                    <TouchableOpacity
                      style={styles.whatsAppActionBtn}
                      onPress={() => handleSendWhatsApp(item)}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                      <Text style={styles.whatsAppActionText}>Confirmar</Text>
                    </TouchableOpacity>

                    {/* Edit button */}
                    <TouchableOpacity
                      style={styles.editActionBtn}
                      onPress={() => {
                        Haptics.selection();
                        setEditingAppointment(item);
                        setAppointmentModalVisible(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Settings Modal Sheet */}
      <SettingsModalSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Appointment Modal Sheet */}
      <AppointmentModal
        visible={appointmentModalVisible}
        appointment={editingAppointment}
        initialDate={selectedDate}
        onClose={() => {
          setAppointmentModalVisible(false);
          setEditingAppointment(null);
        }}
        onSaveSuccess={refreshData}
      />
    </LargeTitleLayout>
  );
}

const styles = StyleSheet.create({
  segmentedContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  highlightSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  highlightCard: {
    backgroundColor: Colors.surfaceCard,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  highlightBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightTitle: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  currentPatientTouchable: {
    paddingVertical: 2,
  },
  currentPatientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agendaAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: '#E6D8EF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  agendaAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  agendaAvatarText: {
    ...Typography.headline,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  currentPatientInfo: {
    flex: 1,
  },
  currentPatientName: {
    ...Typography.title3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  currentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  currentTimeText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
  nextPatientAvatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nextPatientAvatarImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  nextPatientAvatarText: {
    ...Typography.caption2,
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  quickActionRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  markPresenceButton: {
    alignSelf: 'flex-start',
  },
  noCurrentSession: {
    paddingVertical: Spacing.xs,
  },
  noCurrentText: {
    ...Typography.callout,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  nextPatientDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  nextPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextPatientLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nextPatientValue: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    flex: 1,
  },
  monthContainer: {
    backgroundColor: Colors.surfaceCard,
    marginHorizontal: Spacing.base,
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthNavBtn: {
    padding: 6,
  },
  monthHeaderTitle: {
    ...Typography.headline,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  weekdayText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    width: 38,
    textAlign: 'center',
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
  },
  calendarCellSelected: {
    backgroundColor: Colors.primary,
  },
  calendarCellToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  calendarDayText: {
    ...Typography.callout,
    color: Colors.textPrimary,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  calendarDotPrimary: {
    backgroundColor: Colors.primary,
  },
  calendarDotSuccess: {
    backgroundColor: Colors.success,
  },
  calendarDotSelected: {
    backgroundColor: '#fff',
  },
  dateBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  dateNavArrow: {
    padding: 6,
  },
  dateCenterBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dateBarText: {
    ...Typography.headline,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  todayBadge: {
    marginLeft: 4,
  },
  timelineSection: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  addAppointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addAppointmentText: {
    ...Typography.subhead,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
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
  emptyScheduleBtn: {
    alignSelf: 'center',
  },
  timelineItemCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    ...Shadows.subtle,
  },
  timelineTimeCol: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timelineStartTime: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timelineEndTime: {
    ...Typography.caption2,
    color: Colors.textTertiary,
  },
  timelineVerticalLine: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.sm,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientItemName: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  patientItemType: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  statusActionBtnActiveSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  statusActionBtnActiveError: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  statusActionText: {
    ...Typography.caption2,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusActionTextActive: {
    color: '#fff',
  },
  whatsAppActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#25D366',
    backgroundColor: '#E8F8EE',
  },
  whatsAppActionText: {
    ...Typography.caption2,
    fontWeight: '600',
    color: '#1B5235',
  },
  editActionBtn: {
    padding: 4,
    marginLeft: 'auto',
  },
});
