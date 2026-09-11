/**
 * Pilates Espaço Mulher — Main Application Root
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * 100% Local-First Physiotherapy & Clinical Pilates Mobile Application
 * 
 * Startup Lifecycle:
 * 1. Zero-Login Direct Launch: Opens straight to the Patient Dashboard (Pacientes tab).
 * 2. SQLite Database Initialization: Calls getDatabase() to ensure WAL mode,
 *    foreign key enforcement, and versioned schema migrations run before rendering screens.
 * 3. Branded Splash/Loading Screen: Displays AppLoadingSplash with clinic branding
 *    while database migrations and seedings execute.
 * 4. Reactive State Provider: Mounts <PatientProvider> at root level, granting
 *    instant reactive re-render to all screens upon patient additions/edits/deletions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation';
import { Colors } from './src/design-system/tokens';
import { getDatabase } from './src/database';
import { PatientProvider } from './src/features/patients/PatientContext';
import { AppLoadingSplash } from './src/components/AppLoadingSplash';

/**
 * Custom Navigation Theme strictly aligned with Apple HIG & official clinic palette:
 * - Primary Lilac (#9B6CBA)
 * - Off-white grouped surface (#FAF8F5)
 * - Text Charcoal (#2C2530)
 * - Border Subtle (#E8E0EC)
 */
const PilatesTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.surface,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.accent,
  },
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const initializeApp = useCallback(async () => {
    try {
      setInitError(null);
      // Initialize SQLite database singleton and run migrations/seeds
      await getDatabase();
      setIsReady(true);
    } catch (err: any) {
      console.error('[App] Database startup initialization failed:', err);
      setInitError(
        err?.message || 'Falha ao conectar e inicializar o banco de dados local SQLite.'
      );
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // If database is not ready or failed, display branded loading/splash screen
  if (!isReady) {
    return (
      <AppLoadingSplash
        statusMessage="Inicializando banco de dados local SQLite..."
        error={initError}
        onRetry={initializeApp}
      />
    );
  }

  // Zero login gate — mounts directly into NavigationContainer and Pacientes tab
  return (
    <SafeAreaProvider>
      <PatientProvider>
        <NavigationContainer theme={PilatesTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </PatientProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
