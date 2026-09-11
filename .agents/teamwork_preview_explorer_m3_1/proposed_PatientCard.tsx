/**
 * Proposed Component: PatientCard.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Inset Grouped Card for each patient.
 * Displays:
 * - Patient Name with Initials Avatar
 * - Status Badge (Em Tratamento / Alta / Inativo) & Insurance Badge (Particular / Unimed / etc.)
 * - Phone with formatted (22) 99947-4304 mask & WhatsApp deep link trigger
 * - Age and formatted Birthdate (DD/MM/YYYY)
 * - Neighborhood and City/State ("Costa Azul, Rio das Ostras - RJ")
 * - Quick Action buttons & Action Sheet (Ver Avaliação, Editar, Treinos, Excluir)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Linking,
  Alert,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows, Layout } from '../../../src/design-system/tokens';
import { Haptics } from '../../../src/design-system/Haptics';
import { formatPhone, formatDateBR, calculateAge } from '../../../src/utils/formatters';
import { Patient } from '../../../src/types/patient';
import { PatientStatusBadge, PatientInsuranceBadge } from './proposed_PatientStatusBadge';
import { PatientQuickActions } from './proposed_PatientQuickActions';

export interface PatientCardProps {
  patient: Patient;
  onPress?: (patient: Patient) => void;
  onViewEvaluation: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onManageWorkouts: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function getInitials(name: string): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PatientCard({
  patient,
  onPress,
  onViewEvaluation,
  onEditPatient,
  onManageWorkouts,
  onDeletePatient,
  style,
  testID,
}: PatientCardProps) {
  const formattedPhone = formatPhone(patient.phone);
  const formattedBirthdate = patient.birthdate ? formatDateBR(patient.birthdate) : null;
  const computedAge = patient.age ?? (patient.birthdate ? calculateAge(patient.birthdate) : null);
  const initials = getInitials(patient.name);

  // Neighborhood and City/State
  const locationText = [patient.neighborhood, patient.city_state || 'Rio das Ostras - RJ']
    .filter(Boolean)
    .join(', ');

  const handleCardPress = () => {
    Haptics.selection();
    if (onPress) {
      onPress(patient);
    } else {
      onViewEvaluation(patient);
    }
  };

  const handleWhatsAppPress = async () => {
    Haptics.selection();
    const rawDigits = patient.phone.replace(/\D/g, '');
    const phoneWithCountry = rawDigits.startsWith('55') ? rawDigits : `55${rawDigits}`;
    const url = `whatsapp://send?phone=${phoneWithCountry}`;
    const webUrl = `https://wa.me/${phoneWithCountry}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert('WhatsApp', `Telefone: ${formattedPhone}`);
    }
  };

  return (
    <Pressable
      onPress={handleCardPress}
      style={({ pressed }) => [
        styles.cardContainer,
        pressed && styles.cardPressed,
        style,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Cartão do paciente ${patient.name}`}
    >
      {/* 1. Header: Avatar, Name, and Badges */}
      <View style={styles.headerRow}>
        {/* Initials Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Patient Identity & Meta */}
        <View style={styles.identityContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {patient.name}
          </Text>

          {/* Age & Birthdate */}
          <View style={styles.metaRow}>
            {computedAge != null && (
              <Text style={styles.metaText}>{computedAge} anos</Text>
            )}
            {computedAge != null && formattedBirthdate && (
              <Text style={styles.metaDot}>•</Text>
            )}
            {formattedBirthdate && (
              <Text style={styles.metaText}>Nasc. {formattedBirthdate}</Text>
            )}
          </View>
        </View>

        {/* Badges Column (Status & Insurance) */}
        <View style={styles.badgesColumn}>
          <PatientStatusBadge status={patient.status} size="sm" />
          <PatientInsuranceBadge insurance={patient.insurance} size="sm" style={styles.insuranceBadge} />
        </View>
      </View>

      {/* 2. Details: Phone/WhatsApp and Location */}
      <View style={styles.detailsContainer}>
        {/* Phone / WhatsApp interactive pill */}
        <TouchableOpacity
          onPress={handleWhatsAppPress}
          style={styles.phonePill}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Conversar no WhatsApp com ${patient.name}`}
        >
          <Ionicons name="logo-whatsapp" size={14} color={Colors.success} style={styles.phoneIcon} />
          <Text style={styles.phoneText}>{formattedPhone || 'Sem telefone'}</Text>
        </TouchableOpacity>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} style={styles.locationIcon} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationText}
          </Text>
        </View>
      </View>

      {/* 3. Hairline Divider */}
      <View style={styles.separator} />

      {/* 4. Quick Actions Bar */}
      <View style={styles.actionsFooter}>
        <Text style={styles.actionsHintText}>Ações Rápidas</Text>
        <PatientQuickActions
          patient={patient}
          onViewEvaluation={onViewEvaluation}
          onEditPatient={onEditPatient}
          onManageWorkouts={onManageWorkouts}
          onDeletePatient={onDeletePatient}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card, // Apple HIG 14pt Continuous Squircle
    marginHorizontal: Layout.insetGroupMarginHorizontal, // 16pt
    marginBottom: Spacing.md, // 12pt
    padding: Spacing.base, // 16pt
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  cardPressed: {
    opacity: 0.92,
    backgroundColor: '#FAF7FC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarCircle: {
    width: 44, // HIG touch ergonomic target
    height: 44,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: '#E6D8EF',
  },
  avatarText: {
    ...Typography.headline,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  identityContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  metaDot: {
    ...Typography.caption1,
    color: Colors.textTertiary,
    marginHorizontal: 4,
  },
  badgesColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  insuranceBadge: {
    marginTop: 4,
  },
  detailsContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  phoneIcon: {
    marginRight: 5,
  },
  phoneText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.success,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 2,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
    marginVertical: Spacing.sm,
  },
  actionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsHintText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
