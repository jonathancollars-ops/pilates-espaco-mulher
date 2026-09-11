/**
 * Proposed File: src/features/patients/components/AppLoadingSplash.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Clean branded Apple HIG Loading & Splash Screen.
 * Displayed while SQLite database initializes and versioned migrations execute.
 * 
 * Features:
 * - Brand palette: Off-white background (#FAF8F5), Primary Lilac (#9B6CBA), Accent (#6A1B15)
 * - Professional credentials: Dra. Rogéria Collares (CREFITO 23093-F)
 * - ActivityIndicator with animated feedback
 * - Offline-first badge indicator (100% Local-First)
 * - Graceful error state with Retry button if database initialization encounters failure
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../../design-system/tokens';
import { CLINIC_IDENTITY } from '../../../design-system/ClinicIdentity';
import { Haptics } from '../../../design-system/Haptics';

export interface AppLoadingSplashProps {
  statusMessage?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function AppLoadingSplash({
  statusMessage = 'Inicializando banco de dados local...',
  error,
  onRetry,
}: AppLoadingSplashProps) {
  const hasError = Boolean(error);

  const handleRetry = () => {
    Haptics.impactMedium();
    onRetry?.();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.container}>
        {/* Upper Brand Monogram / Emblem */}
        <View style={styles.brandingSection}>
          <View style={styles.emblemWrapper}>
            <View style={styles.emblemBackground}>
              <Ionicons
                name={hasError ? 'alert-circle' : 'flower'}
                size={44}
                color={hasError ? Colors.accent : Colors.primary}
              />
            </View>
          </View>

          <Text style={styles.clinicTitle}>{CLINIC_IDENTITY.clinicName}</Text>
          <Text style={styles.professionalName}>
            {CLINIC_IDENTITY.professionalName}
          </Text>
          <View style={styles.crefitoBadge}>
            <Text style={styles.crefitoText}>{CLINIC_IDENTITY.crefito}</Text>
          </View>
        </View>

        {/* Center Loading or Error State */}
        <View style={styles.statusSection}>
          {hasError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Falha na Inicialização</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              {onRetry ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color={Colors.textInverse} style={styles.retryIcon} />
                  <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
              <Text style={styles.statusText}>{statusMessage}</Text>
              
              <View style={styles.offlineBadge}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineText}>100% Offline • SQLite WAL Ativo</Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Location & Security Tag */}
        <View style={styles.footerSection}>
          <Text style={styles.locationText}>{CLINIC_IDENTITY.location}</Text>
          <Text style={styles.taglineText}>
            Avaliação Postural, Bioimpedância & Prescrição Clínica
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  emblemWrapper: {
    marginBottom: Spacing.base,
    ...Shadows.card,
  },
  emblemBackground: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  clinicTitle: {
    ...Typography.title1,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  professionalName: {
    ...Typography.headline,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  crefitoBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  crefitoText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  spinner: {
    marginBottom: Spacing.base,
  },
  statusText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  offlineText: {
    ...Typography.caption2,
    color: Colors.successDark,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.accentSubtle,
    ...Shadows.card,
  },
  errorTitle: {
    ...Typography.headline,
    color: Colors.accent,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    ...Shadows.button,
  },
  retryIcon: {
    marginRight: Spacing.xs,
  },
  retryButtonText: {
    ...Typography.headline,
    color: Colors.textInverse,
    fontWeight: '600',
  },
  footerSection: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
  },
  taglineText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
