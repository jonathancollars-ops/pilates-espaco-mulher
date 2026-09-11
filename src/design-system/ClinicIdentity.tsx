/**
 * Pilates Espaço Mulher — Professional Clinical Identity
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Embeds official practice identity, professional licensure credentials,
 * physical clinic address, and direct WhatsApp deep linking.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from './tokens';
import { Haptics } from './Haptics';

export const CLINIC_IDENTITY = {
  professionalName: 'Dra. Rogéria Collares',
  professionalTitle: 'Fisioterapeuta',
  crefito: 'CREFITO 23093-F',
  clinicName: 'Pilates Espaço Mulher',
  specialties: 'Fisioterapia Especializada • Reabilitação Postural • Pilates Clínico',
  location: 'Costa Azul, Rio das Ostras - RJ',
  city: 'Rio das Ostras',
  state: 'RJ',
  neighborhood: 'Costa Azul',
  phone: '(22) 99947-4304',
  phoneDigitsOnly: '5522999474304',
  whatsAppUrl: 'https://wa.me/5522999474304',
  whatsAppDeepLink: 'whatsapp://send?phone=5522999474304',
} as const;

/**
 * Direct WhatsApp Deep Linking with Web URL Fallback
 */
export async function openClinicWhatsApp(customMessage?: string): Promise<void> {
  const encoded = customMessage ? encodeURIComponent(customMessage) : '';
  const nativeUrl = encoded
    ? `${CLINIC_IDENTITY.whatsAppDeepLink}&text=${encoded}`
    : CLINIC_IDENTITY.whatsAppDeepLink;
  const webUrl = encoded
    ? `${CLINIC_IDENTITY.whatsAppUrl}?text=${encoded}`
    : CLINIC_IDENTITY.whatsAppUrl;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    Alert.alert('Contato WhatsApp', `WhatsApp: ${CLINIC_IDENTITY.phone}`);
  }
}

export interface ClinicIdentityHeaderProps {
  variant?: 'compact' | 'full';
  showSubtitle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ClinicIdentityHeader({
  variant = 'full',
  showSubtitle = true,
  style,
}: ClinicIdentityHeaderProps) {
  return (
    <View style={[styles.headerRoot, style]}>
      <View style={styles.badgeIcon}>
        <Ionicons name="sparkles" size={18} color={Colors.primary} />
      </View>
      <View style={styles.headerTextGroup}>
        <Text style={styles.clinicTitle}>{CLINIC_IDENTITY.clinicName}</Text>
        <Text style={styles.clinicianName}>
          {CLINIC_IDENTITY.professionalName} •{' '}
          <Text style={styles.crefitoText}>{CLINIC_IDENTITY.crefito}</Text>
        </Text>
        {variant === 'full' && showSubtitle ? (
          <Text style={styles.locationText}>{CLINIC_IDENTITY.location}</Text>
        ) : null}
      </View>
    </View>
  );
}

export interface ClinicIdentityFooterProps {
  showWhatsAppAction?: boolean;
  style?: StyleProp<ViewStyle>;
  onWhatsAppPress?: () => void;
}

export function ClinicIdentityFooter({
  showWhatsAppAction = true,
  style,
  onWhatsAppPress,
}: ClinicIdentityFooterProps) {
  const handleWhatsApp = () => {
    Haptics.selection();
    if (onWhatsAppPress) {
      onWhatsAppPress();
    } else {
      openClinicWhatsApp('Olá Dra. Rogéria, gostaria de falar sobre o atendimento no Pilates Espaço Mulher.');
    }
  };

  return (
    <View style={[styles.footerRoot, style]}>
      <View style={styles.footerInfoSection}>
        <Text style={styles.footerClinic}>{CLINIC_IDENTITY.clinicName}</Text>
        <Text style={styles.footerClinician}>
          {CLINIC_IDENTITY.professionalName} — {CLINIC_IDENTITY.crefito}
        </Text>
        <Text style={styles.footerLocation}>{CLINIC_IDENTITY.location}</Text>
      </View>

      {showWhatsAppAction && (
        <TouchableOpacity
          onPress={handleWhatsApp}
          style={styles.whatsAppButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Abrir WhatsApp da clínica: ${CLINIC_IDENTITY.phone}`}
        >
          <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" style={styles.whatsAppIcon} />
          <Text style={styles.whatsAppButtonText}>{CLINIC_IDENTITY.phone}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export interface ClinicIdentityProps {
  variant?: 'header' | 'footer' | 'compact';
  showWhatsAppAction?: boolean;
  onWhatsAppPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ClinicIdentity({
  variant = 'footer',
  showWhatsAppAction = true,
  onWhatsAppPress,
  style,
}: ClinicIdentityProps) {
  if (variant === 'header') {
    return <ClinicIdentityHeader variant="full" style={style} />;
  }
  if (variant === 'compact') {
    return <ClinicIdentityHeader variant="compact" style={style} />;
  }
  return (
    <ClinicIdentityFooter
      showWhatsAppAction={showWhatsAppAction}
      onWhatsAppPress={onWhatsAppPress}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  headerRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTextGroup: {
    flex: 1,
  },
  clinicTitle: {
    ...Typography.headline,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  clinicianName: {
    ...Typography.subhead,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  crefitoText: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  locationText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footerRoot: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  footerInfoSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  footerClinic: {
    ...Typography.headline,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  footerClinician: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 3,
  },
  footerLocation: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    ...Shadows.subtle,
  },
  whatsAppIcon: {
    marginRight: 6,
  },
  whatsAppButtonText: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textInverse,
  },
});
