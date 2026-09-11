# Milestone 1: Navigation Shell, Large Titles & Haptics Analysis & Specification

**Project**: Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)  
**Author**: M1 Navigation & UX Explorer (`teamwork_preview_explorer_m1_3`)  
**Date**: 2026-09-11  
**Status**: Ready for Implementation (M1)  
**Target Framework**: Expo SDK 52+ / React Native (TypeScript Strict Mode)

---

## 1. Executive Summary

Milestone 1 establishes the foundational user experience, visual navigation shell, and sensory feedback layer for "Pilates Espaço Mulher". Adhering strictly to the **Apple Human Interface Guidelines (HIG)** and the official brand identity, this milestone delivers:

1. **`src/design-system/LargeTitleHeader.tsx`**: A native iOS collapsible Large Title header with smooth 60fps animated scroll interpolation, transitioning seamlessly from an expansive 34pt headline to a compact 17pt inline navigation bar with translucent surface and subtle divider.
2. **`src/design-system/Haptics.ts`**: A sensory feedback utility wrapping `expo-haptics` with bulletproof fallback handling for React Native Web, simulators, and devices lacking haptic motors.
3. **`src/navigation/index.tsx` & Shell Screens**: A native Bottom Tab Navigator featuring 5 core clinical tabs (**Pacientes**, **Treinos**, **Aparelhos**, **Relatórios**, **Ajustes**), styled with official brand tokens (`#9B6CBA` active lilac, `#FAF8F5` off-white surface, `#6A1B15` wine accent, `#1B5235` forest green success), tactile feedback on tab transitions, and rich shell screens incorporating `LargeTitleHeader`, `InsetGroupedList`, and `ClinicIdentity`.
4. **`App.tsx`**: The application root coordinating `SafeAreaProvider`, `NavigationContainer` with custom theme tokens, and `StatusBar` configuration.

---

## 2. Apple HIG Navigation Architecture & Brand Styling

### 2.1 Navigation Hierarchy

The application navigation is organized into a primary **Bottom Tab Navigator** hosting the five core workspaces of the clinic, with extensible support for a **Native Stack Navigator** to handle modal forms and deep clinical evaluations in subsequent milestones (Anamnesis, Photogrammetry Grid, Routine Builder, PDF Preview).

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│             SafeAreaProvider + NavigationContainer (Theme)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   RootTabNavigator   │
                         │   (5 Core Tabs)     │
                         └──────────┬──────────┘
                                    │
  ┌──────────────┬──────────────┬───┴──────────┬──────────────┬──────────────┐
  ▼              ▼              ▼              ▼              ▼              ▼
Pacientes     Treinos       Aparelhos      Relatórios      Ajustes       [Future Stacks]
(Patients)   (Routines)    (Apparatus)     (Reports)     (Settings)     (Modals / Forms)
```

### 2.2 Brand Color Palette in Navigation

Navigation chrome and UI components strictly apply the brand palette defined in `ORIGINAL_REQUEST.md`:

| Token | Hex Value | Navigation Application |
|---|---|---|
| `Colors.primary` | `#9B6CBA` | Active Tab icon & text tint, primary action icons, active indicator pills |
| `Colors.primaryDark` | `#7A4F94` | Header subtitle, clinician credentials, institutional accents |
| `Colors.surface` | `#FAF8F5` | Off-white canvas background, tab bar background, compact navbar background |
| `Colors.surfaceSecondary` | `#F4EEF7` | Search input background, selected row background, secondary badges |
| `Colors.accent` | `#6A1B15` | Wine accent for clinical alerts, high EVA pain badges, contraindications |
| `Colors.success` | `#1B5235` | Forest green for synced cloud badges, completed session badges |
| `Colors.text` | `#2C2530` | High-contrast charcoal text for headers and titles |
| `Colors.textSecondary` | `#6E6573` | Inactive tab tint, subtitles, section headers, metadata |
| `Colors.border` | `#E8E0EC` | Top border of tab bar (0.5pt), card borders |
| `Colors.separator` | `#D8CFDC` | Bottom separator of scrolled compact navigation bar |

### 2.3 Apple HIG Sensory Details
- **Tab Bar Layout**: Fixed height of 88pt on iOS (including 34pt home indicator inset) and 64pt on Android, with a 0.5pt top border.
- **Elevation**: Flat design with 0 Android elevation and subtle iOS shadow, relying on surface contrast (`#FAF8F5` vs `#FFFFFF` cards) and borders (`#E8E0EC`).
- **Tactile Feedback**: Every tab press triggers `Haptics.selection()` for native responsiveness.

---

## 3. Design of `src/design-system/LargeTitleHeader.tsx`

### 3.1 Physics & Animated Scroll Interpolation

The collapsible Large Title header follows standard iOS UIKit / SwiftUI behaviors:

1. **Expanded State (`scrollY <= 0`)**:
   - The large title is prominently displayed at 34pt bold (`lineHeight: 41`, `letterSpacing: 0.37`).
   - The fixed compact navbar is transparent (`opacity: 0`), and its centered compact title is invisible (`opacity: 0`).
   - Pulling down (rubber-banding / overscroll, `scrollY < 0`) triggers an elastic scale interpolation:
     $$\text{scale} \in [1.0, 1.15] \quad \text{for} \quad \text{scrollY} \in [0, -100]$$
2. **Transitioning State (`0 < scrollY < 52`)**:
   - The large title scrolls upward and fades out:
     $$\text{opacity}_{\text{large}} = \text{clamp}\left(1 - \frac{\text{scrollY}}{40}, 0, 1\right)$$
     $$\text{translateY}_{\text{large}} = \text{interpolate}(\text{scrollY}, [0, 40], [0, -12])$$
   - The compact navbar background fades in smoothly:
     $$\text{opacity}_{\text{navBg}} = \text{clamp}\left(\frac{\text{scrollY} - 15}{35}, 0, 1\right)$$
   - The compact title (17pt semibold) fades in and slides into place:
     $$\text{opacity}_{\text{compactTitle}} = \text{clamp}\left(\frac{\text{scrollY} - 28}{24}, 0, 1\right)$$
     $$\text{translateY}_{\text{compactTitle}} = \text{interpolate}(\text{scrollY}, [28, 52], [6, 0])$$
3. **Collapsed State (`scrollY >= 52`)**:
   - The large title is fully hidden (`opacity: 0`).
   - The compact navbar is fully opaque (`#FAF8F5`), displaying the centered title, bottom separator (`#E8E0EC`), and action accessories.

```
 Scroll Offset (scrollY)
   < 0 pt     [ Rubber-band overscroll: Large Title scales up to 1.15x ]
   0 pt       [ Rest: Large Title 100% visible, Navbar 0% opacity ]
   0 - 30 pt  [ Scrolling: Large Title translating up and fading ]
   30 - 52 pt [ Crossover: Compact Title fading in (0 -> 100%) ]
   > 52 pt    [ Collapsed: Compact Navbar 100% visible with separator ]
```

### 3.2 Modular Component Architecture

To give screen authors maximum flexibility while guaranteeing performance, `LargeTitleHeader.tsx` exports three composable primitives plus one convenience screen wrapper:

1. **`useLargeTitleScroll()`**: Custom hook providing the animated scroll value, the native driver scroll handler, and standard scroll props.
2. **`LargeTitleNavBar`**: The sticky/fixed top bar rendered at the top of the screen (outside the scroll view), housing safe-area spacing, left/right actions, the animated compact title, and the animated background.
3. **`LargeTitleHero`**: The expandable title block placed inside the scrollable content container, rendering the 34pt title, subtitle, and optional hero accessories.
4. **`LargeTitleLayout`**: An all-in-one container component wrapping `LargeTitleNavBar` and an `Animated.ScrollView` with `LargeTitleHero` for screens that do not require custom scroll containers.

### 3.3 Complete Production Specification: `src/design-system/LargeTitleHeader.tsx`

```tsx
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from './tokens';

export interface LargeTitleHeaderProps {
  title: string;
  subtitle?: string;
  compactTitle?: string;
  scrollY: Animated.Value;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  collapseThreshold?: number;
}

export interface LargeTitleHeroProps {
  title: string;
  subtitle?: string;
  scrollY: Animated.Value;
  accessory?: React.ReactNode;
  collapseThreshold?: number;
}

export interface LargeTitleNavBarProps {
  title: string;
  compactTitle?: string;
  scrollY: Animated.Value;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  collapseThreshold?: number;
}

export interface LargeTitleLayoutProps {
  title: string;
  subtitle?: string;
  compactTitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  refreshControl?: React.ReactElement;
  contentContainerStyle?: object;
}

/**
 * Hook to manage native scroll animation for Large Titles
 */
export function useLargeTitleScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  return {
    scrollY,
    scrollProps: {
      onScroll,
      scrollEventThrottle: 16,
      showsVerticalScrollIndicator: true,
    },
  };
}

/**
 * Fixed top navigation bar with animated title and background transition
 */
export function LargeTitleNavBar({
  title,
  compactTitle,
  scrollY,
  leftAction,
  rightAction,
  collapseThreshold = 52,
}: LargeTitleNavBarProps) {
  const insets = useSafeAreaInsets();
  const displayTitle = compactTitle ?? title;

  // Background and border opacity: fades in as user scrolls
  const bgOpacity = scrollY.interpolate({
    inputRange: [collapseThreshold * 0.4, collapseThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Compact title opacity and subtle translation
  const titleOpacity = scrollY.interpolate({
    inputRange: [collapseThreshold * 0.6, collapseThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [collapseThreshold * 0.6, collapseThreshold],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.navBarContainer,
        { paddingTop: insets.top, height: insets.top + 44 },
      ]}
      pointerEvents="box-none"
    >
      {/* Animated solid background & separator */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.navBarBackground,
          { opacity: bgOpacity },
        ]}
      />

      {/* Content row (44pt standard iOS navbar height) */}
      <View style={styles.navBarContent}>
        <View style={styles.navBarSideSlot}>
          {leftAction}
        </View>

        <Animated.View
          style={[
            styles.navBarTitleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.navBarTitleText} numberOfLines={1}>
            {displayTitle}
          </Text>
        </Animated.View>

        <View style={[styles.navBarSideSlot, styles.navBarRightSlot]}>
          {rightAction}
        </View>
      </View>
    </View>
  );
}

/**
 * Hero large title section rendered at the top of the scrollable content
 */
export function LargeTitleHero({
  title,
  subtitle,
  scrollY,
  accessory,
  collapseThreshold = 52,
}: LargeTitleHeroProps) {
  // Opacity: fades out as user scrolls up
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, collapseThreshold * 0.8],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Translation: drifts slightly upwards during scroll
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, collapseThreshold],
    outputRange: [15, 0, -12],
    extrapolate: 'clamp',
  });

  // Elastic scale on rubber-band pull down
  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.12, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.heroContainer,
        {
          opacity: heroOpacity,
          transform: [
            { translateY: heroTranslateY },
            { scale: heroScale },
          ],
        },
      ]}
    >
      <View style={styles.heroTextContainer}>
        {subtitle ? (
          <Text style={styles.heroSubtitleText}>{subtitle}</Text>
        ) : null}
        <Text
          style={styles.heroTitleText}
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
      </View>
      {accessory ? <View style={styles.heroAccessory}>{accessory}</View> : null}
    </Animated.View>
  );
}

/**
 * All-in-one Layout Component for screens with standard scroll content
 */
export function LargeTitleLayout({
  title,
  subtitle,
  compactTitle,
  leftAction,
  rightAction,
  children,
  refreshControl,
  contentContainerStyle,
}: LargeTitleLayoutProps) {
  const insets = useSafeAreaInsets();
  const { scrollY, scrollProps } = useLargeTitleScroll();

  return (
    <View style={styles.screenRoot}>
      <LargeTitleNavBar
        title={title}
        compactTitle={compactTitle}
        scrollY={scrollY}
        leftAction={leftAction}
        rightAction={rightAction}
      />
      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: insets.top + 44 + 8, paddingBottom: insets.bottom + 24 },
          contentContainerStyle,
        ]}
      >
        <LargeTitleHero
          title={title}
          subtitle={subtitle}
          scrollY={scrollY}
        />
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  navBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  navBarBackground: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  navBarContent: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navBarSideSlot: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  navBarRightSlot: {
    alignItems: 'flex-end',
  },
  navBarTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  navBarTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.41,
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  heroContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
    transformOrigin: 'left bottom',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroSubtitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroTitleText: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.37,
  },
  heroAccessory: {
    marginLeft: 12,
    marginBottom: 4,
  },
});
```

---

## 4. Design of `src/design-system/Haptics.ts`

### 4.1 Requirements & Device Fallback Strategy

The `expo-haptics` module interacts with device vibration hardware (iOS Taptic Engine, Android Vibration API). In development environments, React Native Web, and devices where haptics are disabled or unsupported, direct unhandled calls can throw runtime errors or generate console noise.

The design implements:
1. **Universal Safety**: Every method is wrapped in a `try ... catch` block and returns a resolved `Promise<void>`, guaranteeing callers never encounter uncaught rejections.
2. **Web Fallback**: On Web browsers supporting the standard W3C `navigator.vibrate` API, distinct vibration duration patterns simulate native haptic impulses:
   - Selection: `10ms` micro-pulse.
   - Light impact: `15ms` pulse.
   - Medium impact: `30ms` pulse.
   - Heavy impact: `50ms` solid pulse.
   - Notification Success: `[20ms, 40ms, 20ms]` double-tap.
   - Notification Warning: `[40ms, 60ms, 40ms]`.
   - Notification Error: `[50ms, 50ms, 50ms, 50ms, 100ms]` triple alert.
3. **Semantic Convenience Shortcuts**: Along with the standard `selectionAsync`, `notificationAsync`, and `impactAsync` method signatures, the module exports intuitive shorthand helpers: `Haptics.selection()`, `Haptics.success()`, `Haptics.warning()`, `Haptics.error()`, `Haptics.impactLight()`, `Haptics.impactMedium()`, and `Haptics.impactHeavy()`.

### 4.2 Complete Production Specification: `src/design-system/Haptics.ts`

```typescript
import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

export type NotificationType = 'success' | 'warning' | 'error';
export type ImpactStyle = 'light' | 'medium' | 'heavy';

/**
 * Triggers web browser vibration fallback if available
 */
function triggerWebVibration(pattern: number | number[]): void {
  try {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      'navigator' in window &&
      typeof window.navigator.vibrate === 'function'
    ) {
      window.navigator.vibrate(pattern);
    }
  } catch {
    // Gracefully ignore web vibration failure
  }
}

/**
 * Standard Selection Feedback
 * Triggered on tab switches, segmented control changes, picker steps
 */
export async function selectionAsync(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      triggerWebVibration(10);
      return;
    }
    await ExpoHaptics.selectionAsync();
  } catch {
    // Fallback silently if device lacks hardware
  }
}

/**
 * Notification Feedback (Success, Warning, Error)
 * Triggered on clinical saves, sync completions, validations, warnings
 */
export async function notificationAsync(type: NotificationType): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      switch (type) {
        case 'success':
          triggerWebVibration([20, 40, 20]);
          break;
        case 'warning':
          triggerWebVibration([40, 60, 40]);
          break;
        case 'error':
          triggerWebVibration([50, 50, 50, 50, 100]);
          break;
      }
      return;
    }

    let feedbackType = ExpoHaptics.NotificationFeedbackType.Success;
    if (type === 'warning') feedbackType = ExpoHaptics.NotificationFeedbackType.Warning;
    if (type === 'error') feedbackType = ExpoHaptics.NotificationFeedbackType.Error;

    await ExpoHaptics.notificationAsync(feedbackType);
  } catch {
    // Fallback silently
  }
}

/**
 * Impact Feedback (Light, Medium, Heavy)
 * Triggered on button presses, cards, deletions, physical actions
 */
export async function impactAsync(style: ImpactStyle = 'medium'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      switch (style) {
        case 'light':
          triggerWebVibration(15);
          break;
        case 'medium':
          triggerWebVibration(30);
          break;
        case 'heavy':
          triggerWebVibration(50);
          break;
      }
      return;
    }

    let feedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Medium;
    if (style === 'light') feedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Light;
    if (style === 'heavy') feedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Heavy;

    await ExpoHaptics.impactAsync(feedbackStyle);
  } catch {
    // Fallback silently
  }
}

/**
 * Unified Haptics Controller Object
 */
export const Haptics = {
  // Standard async methods
  selectionAsync,
  notificationAsync,
  impactAsync,

  // Semantic convenience helpers
  selection: selectionAsync,
  success: () => notificationAsync('success'),
  warning: () => notificationAsync('warning'),
  error: () => notificationAsync('error'),
  impactLight: () => impactAsync('light'),
  impactMedium: () => impactAsync('medium'),
  impactHeavy: () => impactAsync('heavy'),
};

export default Haptics;
```

---

## 5. Design of `src/navigation/index.tsx` & Shell Screens

### 5.1 Tab Hierarchy & Specifications

The Bottom Tab Navigator coordinates the 5 essential clinical domains:

| Tab Name | Route Key | Icon (Active / Inactive) | Primary Title & Subtitle | Shell Content Description |
|---|---|---|---|---|
| **Pacientes** | `Pacientes` | `people` / `people-outline` | "Pacientes"<br>*Dra. Rogéria Collares • CREFITO 23093-F* | Search bar, Quick Add button, Inset Grouped Patient list samples (Mariana Silva, Beatriz Costa, Camila Santos), EVA pain indicators, ClinicIdentity footer. |
| **Treinos** | `Treinos` | `fitness` / `fitness-outline` | "Treinos"<br>*Prescrições Clínicas & Sessões* | Active workout routines, prescribed apparatus summary, quick session execution trigger, session logs. |
| **Aparelhos** | `Aparelhos` | `layers` / `layers-outline` | "Aparelhos"<br>*Catálogo Clássico Joseph Pilates* | The 6 classical Pilates apparatuses (Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat / Solo, Pequenos Acessórios) with exercise counters. |
| **Relatórios** | `Relatórios` | `document-text` / `document-text-outline` | "Relatórios"<br>*Evolução & Compartilhamento* | Clinical A4 report generation card, WhatsApp direct share trigger, Dra. Rogéria signature stamp preview. |
| **Ajustes** | `Ajustes` | `settings` / `settings-outline` | "Ajustes"<br>*Clínica & Sincronização* | Firebase quota-protected sync status (`espacomulher-84137`, 0 listeners), local SQLite engine status (`pilates_espacomulher.db`, WAL), manual sync trigger, ClinicIdentity card. |

### 5.2 Sensory Tab Switch Binding
Every tab press registers an explicit event listener:
```typescript
listeners: {
  tabPress: () => {
    Haptics.selection();
  },
}
```
This guarantees an immediate, tactile response identical to Apple native apps.

### 5.3 Complete Production Specification: `src/navigation/index.tsx`

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design-system/tokens';
import { LargeTitleLayout } from '../design-system/LargeTitleHeader';
import { Haptics } from '../design-system/Haptics';
import {
  InsetGroupedList,
  InsetGroup,
  InsetRow,
} from '../design-system/InsetGroupedList';
import { ClinicIdentity } from '../design-system/ClinicIdentity';

export type RootTabParamList = {
  Pacientes: undefined;
  Treinos: undefined;
  Aparelhos: undefined;
  Relatórios: undefined;
  Ajustes: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// ---------------------------------------------------------------------------
// Shell Screen 1: Pacientes
// ---------------------------------------------------------------------------
function PacientesScreen() {
  const [search, setSearch] = useState('');

  const handleAddPatient = () => {
    Haptics.impactMedium();
    Alert.alert(
      'Novo Cadastro',
      'O cadastro completo de pacientes (anamnese, dados clínicos e queixa) será implementado no Módulo Clínico (M4).'
    );
  };

  const handleSelectPatient = (name: string, condition: string) => {
    Haptics.selection();
    Alert.alert(name, `Condição clínica: ${condition}\nProntuário completo disponível no M4.`);
  };

  return (
    <LargeTitleLayout
      title="Pacientes"
      subtitle="Dra. Rogéria Collares • CREFITO 23093-F"
      rightAction={
        <TouchableOpacity
          onPress={handleAddPatient}
          style={styles.headerIconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Adicionar novo paciente"
        >
          <Ionicons name="add-circle" size={30} color={Colors.primary} />
        </TouchableOpacity>
      }
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome, CPF ou queixa..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Patients Inset Grouped List */}
      <InsetGroupedList>
        <InsetGroup
          header="Pacientes em Tratamento Ativo"
          footer="3 pacientes selecionadas para demonstração da casca de navegação M1."
        >
          <InsetRow
            icon="person"
            label="Mariana Silva"
            value="Lombalgia L4-L5 (EVA 7)"
            accessory={
              <View style={[styles.badge, { backgroundColor: Colors.accent }]}>
                <Text style={styles.badgeText}>Dor Aguda</Text>
              </View>
            }
            onPress={() => handleSelectPatient('Mariana Silva', 'Lombalgia crônica L4-L5')}
          />
          <InsetRow
            icon="person"
            label="Beatriz Costa"
            value="Escoliose em S (EVA 3)"
            accessory={
              <View style={[styles.badge, { backgroundColor: Colors.primary }]}>
                <Text style={styles.badgeText}>Estável</Text>
              </View>
            }
            onPress={() => handleSelectPatient('Beatriz Costa', 'Escoliose idiopática lombar')}
          />
          <InsetRow
            icon="person"
            label="Camila Santos"
            value="Pós-parto / Diástase (EVA 1)"
            accessory={
              <View style={[styles.badge, { backgroundColor: Colors.success }]}>
                <Text style={styles.badgeText}>Evolução +</Text>
              </View>
            }
            onPress={() => handleSelectPatient('Camila Santos', 'Reabilitação de assoalho pélvico e core')}
          />
        </InsetGroup>

        <InsetGroup header="Ações Rápidas">
          <InsetRow
            icon="camera"
            label="Nova Avaliação Postural"
            value="Grid Fotogramétrico"
            onPress={() => {
              Haptics.selection();
              Alert.alert('Avaliação Postural', 'Módulo de grade com fio de prumo disponível no M4.');
            }}
          />
          <InsetRow
            icon="stats-chart"
            label="Novo Registro de Bioimpedância"
            value="Gráficos SVG"
            onPress={() => {
              Haptics.selection();
              Alert.alert('Bioimpedância', 'Registro biométrico disponível no M4.');
            }}
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="footer" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Shell Screen 2: Treinos
// ---------------------------------------------------------------------------
function TreinosScreen() {
  const handleStartSession = () => {
    Haptics.success();
    Alert.alert('Sessão Iniciada', 'Registro de execução e percepção de esforço será ativado no M5.');
  };

  return (
    <LargeTitleLayout
      title="Treinos"
      subtitle="Prescrições Clínicas & Sessões"
      rightAction={
        <TouchableOpacity
          onPress={() => {
            Haptics.impactMedium();
            Alert.alert('Nova Prescrição', 'Montagem personalizada por aparelho disponível no M5.');
          }}
          style={styles.headerIconButton}
        >
          <Ionicons name="create-outline" size={26} color={Colors.primary} />
        </TouchableOpacity>
      }
    >
      <InsetGroupedList>
        <InsetGroup
          header="Rotinas Prescritas Recentes"
          footer="Prescrições personalizadas com regulagem de molas e foco postural."
        >
          <InsetRow
            icon="fitness"
            label="Mariana Silva"
            value="Reformer & Cadillac (50 min)"
            onPress={handleStartSession}
          />
          <InsetRow
            icon="fitness"
            label="Beatriz Costa"
            value="Wunda Chair & Barrel (50 min)"
            onPress={handleStartSession}
          />
          <InsetRow
            icon="fitness"
            label="Camila Santos"
            value="Mat Pilates & Overball (45 min)"
            onPress={handleStartSession}
          />
        </InsetGroup>

        <InsetGroup header="Registro de Aula">
          <InsetRow
            icon="play-circle"
            label="Iniciar Aula ao Vivo"
            value="Cronômetro & EVA"
            onPress={handleStartSession}
          />
          <InsetRow
            icon="time"
            label="Histórico de Sessões Realizadas"
            value="142 aulas este mês"
            onPress={() => {
              Haptics.selection();
              Alert.alert('Histórico', 'Histórico completo no SQLite disponível no M5.');
            }}
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="footer" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Shell Screen 3: Aparelhos
// ---------------------------------------------------------------------------
function AparelhosScreen() {
  const handleSelectApparatus = (name: string, count: number) => {
    Haptics.selection();
    Alert.alert(name, `Catálogo clássico com ${count} exercícios cadastrados.\nNavegação e filtros no M5.`);
  };

  return (
    <LargeTitleLayout
      title="Aparelhos"
      subtitle="Catálogo Clássico Joseph Pilates"
    >
      <InsetGroupedList>
        <InsetGroup
          header="Equipamentos Clássicos de Pilates"
          footer="Exercícios categorizados por nível (iniciante, intermediário e avançado)."
        >
          <InsetRow
            icon="cube"
            label="Universal Reformer"
            value="14 exercícios"
            onPress={() => handleSelectApparatus('Universal Reformer', 14)}
          />
          <InsetRow
            icon="bed"
            label="Cadillac / Trapeze Table"
            value="12 exercícios"
            onPress={() => handleSelectApparatus('Cadillac', 12)}
          />
          <InsetRow
            icon="file-tray-stacked"
            label="Wunda Chair"
            value="10 exercícios"
            onPress={() => handleSelectApparatus('Wunda Chair', 10)}
          />
          <InsetRow
            icon="git-commit"
            label="Ladder Barrel"
            value="8 exercícios"
            onPress={() => handleSelectApparatus('Ladder Barrel', 8)}
          />
          <InsetRow
            icon="body"
            label="Matwork / Solo"
            value="16 exercícios"
            onPress={() => handleSelectApparatus('Mat / Solo', 16)}
          />
          <InsetRow
            icon="radio-button-on"
            label="Pequenos Acessórios"
            value="Magic Circle, Faixas, Overball"
            onPress={() => handleSelectApparatus('Pequenos Acessórios', 11)}
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="footer" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Shell Screen 4: Relatórios
// ---------------------------------------------------------------------------
function RelatóriosScreen() {
  const handleExportPdf = () => {
    Haptics.success();
    Alert.alert(
      'Exportar Relatório Clínico',
      'Gerando modelo HTML5 A4 profissional com assinatura da Dra. Rogéria Collares via expo-print (M6).'
    );
  };

  const handleShareWhatsApp = () => {
    Haptics.success();
    Alert.alert(
      'Compartilhar via WhatsApp',
      'Link direto wa.me com resumo clínico formatado e anexo PDF (M6).'
    );
  };

  return (
    <LargeTitleLayout
      title="Relatórios"
      subtitle="Evolução & Compartilhamento"
    >
      <InsetGroupedList>
        <InsetGroup
          header="Emissão de Relatório Clínico"
          footer="Documento oficial com timbre, dados do CREFITO 23093-F e assinatura."
        >
          <InsetRow
            icon="document-text"
            label="Relatório Completo de Avaliação"
            value="PDF A4 Timbrado"
            onPress={handleExportPdf}
          />
          <InsetRow
            icon="logo-whatsapp"
            label="Enviar Resumo no WhatsApp"
            value="Link Direto wa.me"
            onPress={handleShareWhatsApp}
          />
        </InsetGroup>

        <InsetGroup header="Evolução Bioimpedância">
          <InsetRow
            icon="trending-up"
            label="Comparativo de Composição Corporal"
            value="Massa Magra & Gordura"
            onPress={() => {
              Haptics.selection();
              Alert.alert('Gráficos', 'Curvas de evolução Bezier disponíveis no M4.');
            }}
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="footer" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Shell Screen 5: Ajustes
// ---------------------------------------------------------------------------
function AjustesScreen() {
  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = () => {
    Haptics.impactLight();
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      Haptics.success();
      Alert.alert(
        'Sincronização Concluída',
        'Todos os dados locais do SQLite foram consolidados com a nuvem Firebase espacomulher-84137 com 0 ouvintes persistentes.'
      );
    }, 1200);
  };

  return (
    <LargeTitleLayout
      title="Ajustes"
      subtitle="Clínica & Sincronização"
    >
      <InsetGroupedList>
        <InsetGroup
          header="Sincronização & Nuvem (Firebase Spark)"
          footer="Proteção estrita da cota gratuita: 0 ouvintes em tempo real e sincronização sob demanda."
        >
          <InsetRow
            icon="cloud-done"
            label="Status da Nuvem"
            value={syncing ? 'Sincronizando...' : '🟢 Tudo sincronizado'}
            accessory={
              <View style={[styles.badge, { backgroundColor: Colors.success }]}>
                <Text style={styles.badgeText}>Spark Seguro</Text>
              </View>
            }
          />
          <InsetRow
            icon="sync"
            label="Sincronizar Agora"
            value="Consolidar Documentos"
            onPress={handleSyncNow}
          />
          <InsetRow
            icon="server"
            label="Banco de Dados Local"
            value="SQLite (WAL Mode Ativo)"
          />
        </InsetGroup>

        <InsetGroup header="Identidade Profissional da Clínica">
          <InsetRow
            icon="medkit"
            label="Responsável Técnica"
            value="Dra. Rogéria Collares"
          />
          <InsetRow
            icon="card"
            label="Registro Profissional"
            value="CREFITO 23093-F"
          />
          <InsetRow
            icon="location"
            label="Localização"
            value="Costa Azul, Rio das Ostras - RJ"
          />
          <InsetRow
            icon="call"
            label="Contato WhatsApp"
            value="(22) 99947-4304"
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="header" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Main Bottom Tab Navigator
// ---------------------------------------------------------------------------
export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.07,
        },
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'people';

          if (route.name === 'Pacientes') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Treinos') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Aparelhos') {
            iconName = focused ? 'layers' : 'layers-outline';
          } else if (route.name === 'Relatórios') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Ajustes') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
      screenListeners={{
        tabPress: () => {
          Haptics.selection();
        },
      }}
    >
      <Tab.Screen name="Pacientes" component={PacientesScreen} />
      <Tab.Screen name="Treinos" component={TreinosScreen} />
      <Tab.Screen name="Aparelhos" component={AparelhosScreen} />
      <Tab.Screen name="Relatórios" component={RelatóriosScreen} />
      <Tab.Screen name="Ajustes" component={AjustesScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 16,
    marginTop: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  identityFooterContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
});
```

---

## 6. Design of `App.tsx`

### 6.1 Requirements & Structure

`App.tsx` acts as the root coordinator:
- Wraps the entire hierarchy with `SafeAreaProvider` from `react-native-safe-area-context` to safely handle device notches, dynamic islands, and home indicators across iOS and Android.
- Provides a custom React Navigation theme matching the off-white `#FAF8F5` canvas and `#9B6CBA` brand primary tint.
- Sets the `StatusBar` style to `dark` to maintain high-contrast legibility over the `#FAF8F5` surface.
- Mounts `RootNavigator` cleanly.

### 6.2 Complete Production Specification: `App.tsx`

```tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation';
import { Colors } from './src/design-system/tokens';

/**
 * Custom Navigation Theme aligned with Pilates Espaço Mulher official palette
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
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={PilatesTheme}>
        <StatusBar style="dark" backgroundColor={Colors.surface} />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

---

## 7. Step-by-Step Worker Implementation Plan

To ensure clean builds, zero missing imports, and passing TypeScript checks (`npx tsc --noEmit`), the Worker should execute Milestone 1 implementation in the following sequence:

### Phase 1: Dependency & Scaffolding Check
1. Verify `package.json`, `tsconfig.json`, and `app.json` created by Explorer 2.
2. Confirm npm dependencies installed:
   - `@react-navigation/native`, `@react-navigation/bottom-tabs`
   - `react-native-safe-area-context`, `react-native-screens`
   - `expo-haptics`, `@expo/vector-icons`

### Phase 2: Design Tokens & Base UI (Miner 1 Collaboration)
1. Ensure `src/design-system/tokens.ts` exists with `Colors`.
2. Ensure `src/design-system/InsetGroupedList.tsx` exists with `InsetGroupedList`, `InsetGroup`, and `InsetRow`.
3. Ensure `src/design-system/ClinicIdentity.tsx` exists with Dra. Rogéria credentials.

### Phase 3: Sensory Feedback Layer
1. Create `src/design-system/Haptics.ts`:
   - Implement `selectionAsync`, `notificationAsync`, `impactAsync` with safe web fallback.
   - Verify zero unhandled exceptions on web or headless runners.

### Phase 4: Apple HIG Large Titles Header
1. Create `src/design-system/LargeTitleHeader.tsx`:
   - Implement `useLargeTitleScroll`, `LargeTitleNavBar`, `LargeTitleHero`, and `LargeTitleLayout`.
   - Verify smooth 60fps native driver scroll interpolation.

### Phase 5: Navigation Shell & Root App
1. Create `src/navigation/index.tsx`:
   - Configure `RootTabParamList` and `RootNavigator`.
   - Implement all 5 shell screens (`Pacientes`, `Treinos`, `Aparelhos`, `Relatórios`, `Ajustes`).
   - Wire `Haptics.selection()` on tab switch events.
2. Create `App.tsx`:
   - Wrap with `SafeAreaProvider`, `NavigationContainer`, and `StatusBar`.

### Phase 6: Verification & Hardening
1. Run strict TypeScript check:
   ```bash
   npx tsc --noEmit
   ```
2. Verify zero type errors, zero undefined imports, and complete strict mode compliance.

---

## 8. Acceptance Criteria Verification Traceability

| ID | Criterion | Addressed in this Specification |
|---|---|---|
| **AC50** | Official brand palette (`#9B6CBA`, `#FAF8F5`, `#6A1B15`, `#1B5235`) & Apple Inset Grouped List | Applied across all 5 tab shell screens, nav bar background, borders, and rows. |
| **AC51** | Dynamic Large Titles with smooth scroll transition | Fully specified in `LargeTitleHeader.tsx` with animated opacity, translateY, and rubber-band scaling. |
| **AC52** | Haptic feedbacks (`Haptics`) on selections, saves, and tab switches | Fully specified in `Haptics.ts` with web safety and bound to `tabPress` and button actions. |
| **AC53** | Header/footer with Dra. Rogéria Collares (CREFITO 23093-F) & Costa Azul / Rio das Ostras | Displayed in LargeTitleHeader subtitle, Shell screen 1, Shell screen 5, and ClinicIdentity integration. |
| **AC66** | Strict TypeScript typecheck (`npx tsc --noEmit`) passes with zero errors | Fully typed interfaces, zero `any`, strict null safety throughout all code blocks. |
