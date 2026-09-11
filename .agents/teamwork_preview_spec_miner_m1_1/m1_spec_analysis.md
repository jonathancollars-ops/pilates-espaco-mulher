# Milestone 1 Specification Analysis: Apple HIG Design System & Core UI
**Project**: Pilates Espaço Mulher (Dra. Rogéria Collares - CREFITO 23093-F)  
**Author**: M1 HIG Spec Miner (`teamwork_preview_spec_miner_m1_1`)  
**Date**: 2026-09-11T20:20:00Z  
**Authoritative Sources**:
- `ORIGINAL_REQUEST.md` (R1, Acceptance Criteria)
- `PROJECT.md` (Design System Architecture & Code Layout)
- `survey_spec.md` (Clinical & Brand Survey)
- `TEST_INFRA.md` (Feature Areas F1-F4)
- Apple Human Interface Guidelines (HIG) for iOS / iPadOS

---

## 1. Executive Summary & Design System Foundations

Milestone 1 establishes the foundational design language and reusable UI component kit for **Pilates Espaço Mulher**. The system is built for clinical utility by **Dra. Rogéria Collares**, balancing Apple Human Interface Guidelines (HIG) standards with the distinctive, feminine, and clinical identity of the practice.

### Core HIG Design Principles Enforced:
1. **Visual Hierarchy & Inset Grouped Architecture**: Forms, clinical summaries, and navigation menus are housed within Apple-standard `Inset Grouped Lists`, featuring card-style groupings with continuous squircle corners (`14pt`), `#FAF8F5` canvas backgrounds, and `#FFFFFF` / `#F4EEF7` row surfaces.
2. **Authoritative Brand Palette Integration**:
   - **Primary Lilac (`#9B6CBA`) & Deep Plum (`#7A4F94`)**: Core brand accents, primary buttons, interactive controls, and active tab highlights.
   - **Canvas Off-White (`#FAF8F5`) & Soft Lavender (`#F4EEF7`)**: Native iOS grouped surface backgrounds, unselected states, and card surfaces.
   - **Accent Alert Wine (`#6A1B15`)**: Clinical contraindications, acute pain indicators (EVA 7-10), high visceral fat alerts, and destructive actions.
   - **Accent Success Forest Green (`#1B5235`)**: Healthy biometric classifications, completed workouts, and cloud synchronization confirmations.
3. **SF Pro / Native System Typography**: Strict typographic scale conforming to Apple HIG display and text metrics (from 34pt Large Titles to 11pt Caption 2), with calibrated letter spacings, line heights, and weights.
4. **Touch Ergonomics & Accessibility**: Guaranteed minimum touch targets of `44x44pt` across all buttons, segmented controls, rows, and interactive chips; full support for accessibility roles (`tablist`, `tab`, `button`, `switch`).
5. **Continuous Tactile Feedback**: Integrated haptic feedback via `expo-haptics` calibrated to user interactions (selection, success, warning, error, light impact).
6. **Infallible Clinical Identity**: Dra. Rogéria Collares' professional registration (CREFITO 23093-F), clinic name, location (Costa Azul, Rio das Ostras - RJ), and WhatsApp contact ((22) 99947-4304) embedded directly into system headers, footers, and export structures.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Design Tokens | Official Brand Palette (`Colors`) | Strict palette definitions: `#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235` plus neutrals and borders. | Color token keys | Immutable color hex strings | Compile-time error on unauthorized hex keys | `ORIGINAL_REQUEST.md` R1, `PROJECT.md` §1 |
| 2 | Design Tokens | SF Pro Typography Hierarchy (`Typography`) | Full Apple HIG scale (Large Title 34pt to Caption 2 11pt) with exact fontSize, lineHeight, fontWeight, letterSpacing. | Type scale key | React Native `TextStyle` object | Rejects invalid scale keys via strict TypeScript enum | `ORIGINAL_REQUEST.md` R1, `survey_spec.md` §6.2 |
| 3 | Design Tokens | 8-Point Spacing Scale (`Spacing`) | Calibrated layout spacing scale: xs(4), sm(8), md(12), base(16), lg(20), xl(24), xxl(32), section(48). | Spacing key | Pixel/point dimension numbers | Clamped to defined scale steps | `PROJECT.md` §Code Layout |
| 4 | Design Tokens | Continuous Corner Radii (`Radii`) | HIG squircle curve approximations: small(8), medium(12), card(14), modal(20), pill(9999). | Radius key | Numeric corner radius in pt | Fallback to medium(12) if undefined | `ORIGINAL_REQUEST.md` R1, HIG standard |
| 5 | Design Tokens | HIG Shadows & Elevation (`Shadows`) | Cross-platform shadow definitions (iOS shadowColor/Offset/Opacity/Radius + Android elevation). | Shadow tier (`subtle`, `card`, `elevated`, `modal`) | Combined ViewStyle object | Gracefully falls back to flat border on web/test | HIG standard, `PROJECT.md` |
| 6 | Inset Grouped List | Inset Group Container (`InsetGroup`) | Inset grouped card container with 16pt horizontal margins, 14pt radius, white surface, and 0.5pt subtle border. | Children, optional header/footer | Rendered grouped iOS card | Wraps single child without clipping | `ORIGINAL_REQUEST.md` R1, `PROJECT.md` §1 |
| 7 | Inset Grouped List | Section Header & Footer | Header (13pt uppercase footnote in textSecondary) and Footer (13pt descriptive footnote). | Header/footer text or ReactNode | Styled section boundaries | Omitted gracefully if not provided | HIG Table View spec |
| 8 | Inset Grouped List | Standard Inset Row (`InsetRow`) | Interactive or static table row with min height 48pt (touch target >=44pt), leading icon, label, subtitle, and value. | `label`, `value`, `icon`, `subtitle`, `onPress` | Pressable or static horizontal row layout | Truncates overlong labels with ellipsis | `ORIGINAL_REQUEST.md` R1, `PROJECT.md` §1 |
| 9 | Inset Grouped List | Navigation Chevron Indicator | Apple-style disclosure chevron (`›`) indicating push navigation when `onPress` is active. | `showChevron: boolean`, `onPress` | Rendered chevron icon in muted grey | Automatically hidden if custom accessory provided | HIG Table View spec |
| 10 | Inset Grouped List | Inset Row Accessory Slot | Support for custom right-aligned accessories (e.g. Switch, ActivityIndicator, Badges). | `accessory: ReactNode` | Positioned right accessory container | Accessory click doesn't trigger row press unexpectedly | `ORIGINAL_REQUEST.md` R1 |
| 11 | Inset Grouped List | Destructive Row Styling | Visual alert styling for destructive actions (label and icon in `#6A1B15` wine red). | `destructive: true` | Red alert row with warning haptic trigger | Distinguishes destructive from standard row | `PROJECT.md` §1 |
| 12 | Inset Grouped List | Inset Hairline Separator | 0.5pt hairline divider between rows indented 58pt (with icon) or 16pt (without icon). | Row index, total row count | Rendered bottom separator line | Automatically suppressed on last row in group | HIG Table View spec |
| 13 | Segmented Control | iOS Sliding Pill Segmented Control | Segment switch with soft lilac track (`#EFE9F3`) and animated white card sliding indicator. | `values: string[]`, `selectedIndex`, `onChange` | Animated tab switch bar | Clamps index within range [0, values.length - 1] | `ORIGINAL_REQUEST.md` R1, AC50 |
| 14 | Segmented Control | Dynamic Layout Measurement | Measures container width via `onLayout` to calculate exact segment width across device sizes (iPhone/iPad). | LayoutEvent layout dimensions | Dynamically recalculated segment width and translation | Fallback to percentage width before first measurement | HIG Adaptive Layout |
| 15 | Segmented Control | Segment Badges & Counters | Badges embedded in segment tabs (e.g., showing count of pending items or patient records). | `badges?: Record<number, string | number>` | Numerical/text badge overlaid on segment label | Auto-sizes for single vs double-digit counts | `survey_spec.md` §6.3 |
| 16 | Button | Primary Action Button | High-prominence button filled with `#9B6CBA`, white text, 48pt height, 12pt radius. | `title`, `onPress`, `variant="primary"` | Highlighted pressable action | Triggers light impact haptic on press | `ORIGINAL_REQUEST.md` R1 |
| 17 | Button | Secondary & Tinted Button | Subtle button with `#F4EEF7` lavender fill and `#7A4F94` text for non-primary actions. | `variant="secondary"` | Subtle pressable action | Highlight state darkens fill slightly | HIG Button spec |
| 18 | Button | Destructive Button | Alert button with `#6A1B15` filled or bordered styling for delete / discard actions. | `variant="destructive"` | Wine red action button | Triggers heavy/warning haptic on tap | `ORIGINAL_REQUEST.md` R1 |
| 19 | Button | Loading State Spinner | Replaces button label with centered ActivityIndicator while maintaining fixed dimensions. | `loading: true` | Animated spinner in matching tint | Disables clicks (`pointerEvents="none"`) | UI Best Practices |
| 20 | Button | Touch Target Compliance | Enforces minimum touch target of 44pt height for regular/large buttons and 44pt hitSlop for small buttons. | `size?: 'small' | 'regular' | 'large'` | HIG-compliant tap area | Prevents mis-taps on small mobile screens | Apple HIG Touch Targets |
| 21 | Badge | Clinical Status & Metric Badge | Visual chip indicator for biometrics, sync status, and triage tags with filled/subtle variants. | `label`, `variant`, `styleType` | Compact rounded or pill chip | Clamps long text; scales font appropriately | `ORIGINAL_REQUEST.md` R1, `PROJECT.md` |
| 22 | Badge | Semantic Status Variants | Dedicated color mappings: `success` (`#1B5235`), `alert` (`#6A1B15`), `warning` (`#C27803`), `primary` (`#9B6CBA`). | `variant` string | Context-colored badge | Fallback to neutral lavender if unrecognized | `survey_spec.md` §5.3, §6.1 |
| 23 | Card | HIG Surface Container | Versatile elevated container with 14pt radius, subtle shadow, and optional pressable feedback. | `children`, `title`, `onPress` | Elevated surface card | Preserves padding when title is omitted | HIG Card architecture |
| 24 | Clinic Identity | Clinical Header Banner | Top header component presenting "Pilates Espaço Mulher", Dra. Rogéria Collares (CREFITO 23093-F), and location. | `variant?: 'compact' | 'full'` | Branded header banner | Gracefully stacks subtitles on narrow screens | `ORIGINAL_REQUEST.md` R1, AC53 |
| 25 | Clinic Identity | Professional Footer & Watermark | Bottom footer displaying clinic credentials, location, and interactive WhatsApp direct link. | `onWhatsAppPress?: () => void` | Branded footer with touchable WhatsApp link | Opens WhatsApp via URL or system fallback | `ORIGINAL_REQUEST.md` R1, AC53 |
| 26 | Clinic Identity | Direct WhatsApp Deep Linking | One-touch contact action linking directly to `whatsapp://send?phone=5522999474304` or `https://wa.me/...`. | Tap event on WhatsApp badge/phone | Triggers WhatsApp messaging intent | Falls back to browser URL if app not installed | `ORIGINAL_REQUEST.md` R5, `PROJECT.md` §117 |
| 27 | Clinic Identity | Identity Constants (`CLINIC_IDENTITY`) | Single source of truth constant object storing Dra. Rogéria Collares' credentials, clinic name, and phone. | None (static export) | Immutable metadata dictionary | Prevents hardcoded typo discrepancies | `ORIGINAL_REQUEST.md` R1 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | InsetRow | Extremely long label string (e.g. 100+ characters) | Label wraps up to 2 lines; value aligns cleanly to trailing edge without overflowing container width; row expands height gracefully while preserving 48pt minimum. |
| 2 | InsetRow | Both `value` (string) and `accessory` (custom component) provided | Value renders immediately to the left of the accessory; accessory maintains fixed trailing position; separator remains aligned. |
| 3 | InsetRow | `destructive={true}` with custom icon | Both row label and icon render in `#6A1B15` alert wine; tapping triggers warning/error haptic feedback instead of default light selection. |
| 4 | InsetRow | `onPress` provided, but `disabled={true}` | Row renders with 0.45 opacity; tap events ignored; touch ripple disabled; chevron icon rendered in muted `#D8CFDC`. |
| 5 | InsetGroup | Group contains exactly 1 row (single item list) | Row receives continuous corner radius (14pt) on all 4 corners (top-left, top-right, bottom-left, bottom-right); separator line is hidden. |
| 6 | InsetGroup | Group contains 5+ rows | First row clips top-left and top-right (14pt); middle rows have 0pt corner radius; last row clips bottom-left and bottom-right (14pt); rows 1-4 render bottom separator indented by 58pt (with icon) or 16pt (without icon). |
| 7 | SegmentedControl | Empty array `values=[]` passed | Component renders an empty container of standard height (36pt) with subtle background without throwing division-by-zero errors. |
| 8 | SegmentedControl | Single item `values=['Único']` passed | Sliding pill occupies 100% of inner track width; renders single active tab with no animation glitches. |
| 9 | SegmentedControl | Device rotation (portrait to landscape) or tablet split-view resize | `onLayout` handler fires on dimension change; recalculates segment width dynamically; smoothly repositions active pill to correct offset for current `selectedIndex`. |
| 10 | SegmentedControl | User taps the currently active segment | `onChange` is not fired (or no-op); no redundant haptic trigger; no redundant layout animation. |
| 11 | Button | `loading={true}` while user taps repeatedly | Button renders centered `ActivityIndicator` in matching foreground color; label is hidden; button pointer events disabled; rapid taps produce zero duplicate `onPress` triggers. |
| 12 | Button | `disabled={true}` with `variant="destructive"` | Button renders at 0.45 opacity in muted wine tone; tap events produce no callback and no haptic vibration. |
| 13 | Button | Small button (`size="small"`, height 32pt) on touchscreen | Internal `hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}` ensures active touch target meets Apple HIG 44x44pt threshold. |
| 14 | Badge | Number value `label={0}` or negative delta `label="-2.5 kg"` | Handled cleanly as valid label string; formats appropriately with badge background without converting to boolean `false`. |
| 15 | Badge | Metric comparison delta with `dot={true}` | Small 6pt circle indicator prepended before text; colored to match badge text tone (`#1B5235` for green, `#6A1B15` for alert). |
| 16 | Card | Card rendered with `onPress` provided | Card wraps in `Pressable`; responds with subtle active opacity (0.85) or light background tint on touch; triggers light impact haptic on press. |
| 17 | ClinicIdentity | Tapping WhatsApp on a device without WhatsApp installed | Deep link `whatsapp://send` fails or is caught; handler falls back gracefully to opening `https://wa.me/5522999474304` in system browser. |
| 18 | ClinicIdentity | Narrow mobile screen (e.g. iPhone SE / 375pt width) in full header mode | Header gracefully stacks clinic title, professional name, and CREFITO on separate lines without clipping or horizontal scrolling. |

---

## 2. Detailed Component Specifications

### 2.1 Design System Tokens (`src/design-system/tokens.ts`)

The token architecture provides strict, typed constants for colors, typography, spacing, corner radii, shadows, and layout dimensions.

```typescript
// src/design-system/tokens.ts

export const Colors = {
  // Official Brand Primaries
  primary: '#9B6CBA',         // Lilás Oficial Espaço Mulher (Destaques, Botões Principais)
  primaryDark: '#7A4F94',     // Roxo Profundo / Identidade institucional (Headers, Active States)
  primaryLight: '#D4BFE3',    // Lilás Claro (Badges, destaques secundários)
  primarySubtle: '#F0E6F6',   // Lavanda suave para seleções e active pills

  // Apple HIG Grouped Surfaces & Backgrounds
  surface: '#FAF8F5',         // Off-white / Nude Suave (Fundo padrão da aplicação e listas)
  surfaceSecondary: '#F4EEF7',// Lavanda Nude Suave (Fundo dos cards e containers agrupados)
  surfaceCard: '#FFFFFF',     // Branco puro para células Inset Grouped e modais
  surfaceElevated: '#FFFFFF', // Superfície elevada com sombra para popovers e sheets

  // Semantic & Clinical Alert Colors
  accentAlert: '#6A1B15',     // Vinho / Bordô Escuro (Contraindicações, Dor EVA 7-10, Alertas)
  destructive: '#6A1B15',     // Ações destrutivas (exclusão de paciente, reset)
  destructiveLight: '#FDECEB',// Fundo de alerta suave para banners clínicos
  accentSuccess: '#1B5235',   // Verde Floresta Profundo (Parâmetros saudáveis, Conclusão, Sync)
  successLight: '#E8F4EC',    // Fundo de sucesso suave para badges de evolução
  warning: '#C27803',         // Âmbar / Laranja Queimado (Sobrepeso, Dor moderada EVA 4-6)
  warningLight: '#FEF5E7',    // Fundo de aviso suave

  // Typography & Neutrals
  textPrimary: '#1F1A24',     // Preto carvão com subtom lilás escuro (Alto contraste HIG)
  textSecondary: '#6B6472',   // Cinza médio para subtítulos, legendas e rótulos
  textTertiary: '#9E97A6',    // Cinza claro para placeholders e ícones inativos
  textInverse: '#FFFFFF',     // Texto branco para botões e contrastes escuros

  // Borders & Separators
  border: '#E8E0EC',          // Bordas sutis de cartões e inputs
  borderLight: '#F0EAF2',     // Divisores ultra-leves
  separator: '#D8CFDC',       // Divisores de células do Inset Grouped List
  hairline: '#E2DAE8',        // Linhas divisórias finas (0.5pt)
} as const;

export type ColorKey = keyof typeof Colors;

export const Typography = {
  // Apple SF Pro Display & Text Hierarchy
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.0,
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
  },
} as const;

export type TypographyKey = keyof typeof Typography;

export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  section: 48,
} as const;

export const Radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 10,
  card: 14,      // Apple HIG Continuous Corner Curve (Squircle padrão)
  lg: 16,
  modal: 20,
  pill: 9999,
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#1F1A24',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: '#1F1A24',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#1F1A24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  modal: {
    shadowColor: '#1F1A24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const Layout = {
  minTouchTarget: 44,             // HIG Minimum Touch Target (44x44pt)
  screenMarginHorizontal: 16,     // Horizontal padding on iPhone
  insetGroupMarginHorizontal: 16, // Inset Grouped margin
  rowMinHeight: 48,               // Standard iOS list row height
  iconBoxSize: 30,                // Standard leading icon square
  separatorIndentWithIcon: 58,    // Hairline divider indent after icon
  separatorIndentWithoutIcon: 16, // Hairline divider indent when no icon
} as const;
```

---

### 2.2 Inset Grouped List (`src/design-system/InsetGroupedList.tsx`)

Implements the official iOS `UITableViewStyleInsetGrouped` layout pattern:
- **`InsetGroupedList`**: Container ScrollView or View with `#FAF8F5` surface.
- **`InsetGroup`**: Grouped card section wrapping rows with 14pt continuous squircle radius, 0.5pt border, optional uppercase section header and descriptive footnote footer.
- **`InsetRow`**: The interactive or static list row with minHeight 48pt, leading icon container, title, subtitle, right value, optional accessory, and chevron indicator.

```typescript
// Interface Definitions for InsetGroupedList

export interface InsetGroupedListProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean; // Defaults to true
}

export interface InsetGroupProps {
  children: React.ReactNode;
  header?: string | React.ReactNode; // e.g. "DADOS CLÍNICOS"
  footer?: string | React.ReactNode; // e.g. "Informações sigilosas de prontuário"
  style?: StyleProp<ViewStyle>;
}

export interface InsetRowProps {
  label: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  icon?: React.ReactNode;
  iconBackgroundColor?: string;
  iconColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  destructive?: boolean;
  accessory?: React.ReactNode; // e.g. Switch or Badge
  showChevron?: boolean; // Defaults to true if onPress is present and no accessory
  disabled?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  hideSeparator?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}
```

#### Row Corner Clipping & Separator Logic:
1. When `isFirst && isLast` (single row):
   `borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 14`
2. When `isFirst && !isLast`:
   `borderTopLeftRadius: 14, borderTopRightRadius: 14`
3. When `!isFirst && isLast`:
   `borderBottomLeftRadius: 14, borderBottomRightRadius: 14`
4. Between rows: Renders an absolute bottom separator with height `StyleSheet.hairlineWidth`, left margin equal to `icon ? 58 : 16`, right margin `0`, background `Colors.separator`.

---

### 2.3 Segmented Control (`src/design-system/SegmentedControl.tsx`)

iOS-native segmented tab switch with animated sliding pill indicator:

```typescript
// Interface Definitions for SegmentedControl

export interface SegmentedControlProps<T extends string = string> {
  values: readonly T[] | T[];
  selectedIndex: number;
  onChange: (index: number, value: T) => void;
  badges?: Record<number, string | number>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
```

#### Implementation Mechanics:
1. **Container**: Height `36pt`, background `#EFE9F3`, padding `2pt`, border radius `10pt`, border `0.5pt` `#E0D7E4`.
2. **Dynamic Segment Width**: Measured via `onLayout` on container:
   `segmentWidth = (totalWidth - 4) / values.length`.
3. **Sliding Indicator Pill**:
   - Width: `segmentWidth`.
   - Height: `32pt`.
   - Background: `#FFFFFF`.
   - Border radius: `8pt`.
   - Shadow: `Shadows.subtle`.
   - Translation: Animated via `Animated.spring` or `Animated.timing` on `translateX: selectedIndex * segmentWidth`.
4. **Haptics**: On press of a new segment index, triggers `Haptics.selectionAsync()`.
5. **Accessibility**: Container has `accessibilityRole="tablist"`, each segment has `accessibilityRole="tab"`, `accessibilityState={{ selected: index === selectedIndex }}`.

---

### 2.4 Button Component (`src/design-system/Button.tsx`)

Compliant with Apple HIG touch ergonomics and brand colors:

```typescript
// Interface Definitions for Button

export type ButtonVariant = 
  | 'primary'      // Filled Lilás (#9B6CBA)
  | 'secondary'    // Tinted Lavanda (#F4EEF7) with #7A4F94 text
  | 'outline'      // Transparent with Lilás border
  | 'ghost'        // Plain text button
  | 'destructive'  // Alert wine (#6A1B15)
  | 'success';     // Forest green (#1B5235)

export type ButtonSize = 'small' | 'regular' | 'large';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}
```

#### Variant Styling Matrix:
| Variant | Background | Border | Text Color | Pressed Background |
|---|---|---|---|---|
| `primary` | `#9B6CBA` | None | `#FFFFFF` | `#7A4F94` |
| `secondary` | `#F4EEF7` | None | `#7A4F94` | `#E8DDF0` |
| `outline` | Transparent | 1.5pt `#9B6CBA` | `#7A4F94` | `#F4EEF7` |
| `ghost` | Transparent | None | `#9B6CBA` | `rgba(155, 108, 186, 0.08)` |
| `destructive` | `#6A1B15` | None | `#FFFFFF` | `#501410` |
| `success` | `#1B5235` | None | `#FFFFFF` | `#143E28` |

#### Size Heights & Radii:
- `small`: Height `32pt`, Radius `8pt`, Font `13pt Footnote (Semibold)`, hitSlop 6pt.
- `regular`: Height `48pt`, Radius `12pt`, Font `16pt Callout (Semibold)`.
- `large`: Height `54pt`, Radius `14pt`, Font `17pt Headline (Bold)`.

---

### 2.5 Badge Component (`src/design-system/Badge.tsx`)

Compact status chips for biometrics, contraindications, and workout adherence:

```typescript
// Interface Definitions for Badge

export type BadgeVariant = 
  | 'primary'    // Lilás (#9B6CBA)
  | 'secondary'  // Lavanda suave
  | 'success'    // Verde floresta (#1B5235)
  | 'alert'      // Vinho alert (#6A1B15)
  | 'warning'    // Âmbar (#C27803)
  | 'neutral';   // Cinza neutro (#6B6472)

export type BadgeStyleType = 'filled' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
  styleType?: BadgeStyleType;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dot?: boolean; // Small status circle
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}
```

#### Color Tone Tokens for Subtle Badges:
- `success`: Background `#E8F4EC`, Text `#1B5235`, Border `#B9DFCA`.
- `alert`: Background `#FDECEB`, Text `#6A1B15`, Border `#F4BFBC`.
- `warning`: Background `#FEF5E7`, Text `#A06102`, Border `#FAD7A0`.
- `primary`: Background `#F4EEF7`, Text `#7A4F94`, Border `#D4BFE3`.
- `neutral`: Background `#F0ECF3`, Text `#6B6472`, Border `#E0D9E5`.

---

### 2.6 Card Component (`src/design-system/Card.tsx`)

Elevated surface container with squircle continuous corners:

```typescript
// Interface Definitions for Card

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'base' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  backgroundColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
```

#### Visual Styles:
- `elevated`: Background `#FFFFFF`, Border `0.5pt` `#E8E0EC`, `Shadows.card`.
- `outlined`: Background `#FFFFFF`, Border `1pt` `#E8E0EC`, no shadow.
- `filled`: Background `#F4EEF7`, Border `0.5pt` `#E0D7E4`, no shadow.
- Corner radius: `14pt` across all variants.

---

### 2.7 Clinic Identity Component (`src/design-system/ClinicIdentity.tsx`)

Embeds Dra. Rogéria Collares' professional registration and practice location:

```typescript
// Interface Definitions for ClinicIdentity

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

export interface ClinicIdentityHeaderProps {
  variant?: 'compact' | 'full';
  showSubtitle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface ClinicIdentityFooterProps {
  showWhatsAppAction?: boolean;
  style?: StyleProp<ViewStyle>;
  onWhatsAppPress?: () => void;
}
```

#### WhatsApp Linking Handler:
```typescript
import { Linking, Alert } from 'react-native';

export async function openClinicWhatsApp(customMessage?: string): Promise<void> {
  const messageParam = customMessage ? `?text=${encodeURIComponent(customMessage)}` : '';
  const nativeUrl = `${CLINIC_IDENTITY.whatsAppDeepLink}${messageParam ? '&text=' + encodeURIComponent(customMessage || '') : ''}`;
  const webUrl = `${CLINIC_IDENTITY.whatsAppUrl}${messageParam}`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    Alert.alert('Contato WhatsApp', `WhatsApp: ${CLINIC_IDENTITY.phone}`);
  }
}
```

---

### 2.8 Barrel Export Structure (`src/design-system/index.ts`)

Clean unified exports for all feature modules:

```typescript
// src/design-system/index.ts

export * from './tokens';
export * from './InsetGroupedList';
export * from './SegmentedControl';
export * from './Button';
export * from './Badge';
export * from './Card';
export * from './ClinicIdentity';
```

---

## 3. Worker Implementation Checklist for Milestone 1

1. **Verify or create directory**: `src/design-system/`.
2. **Implement `src/design-system/tokens.ts`**:
   - Export `Colors`, `Typography`, `Spacing`, `Radii`, `Shadows`, `Layout`.
   - Ensure all hex codes match exactly: `#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235`.
3. **Implement `src/design-system/InsetGroupedList.tsx`**:
   - Export `InsetGroupedList`, `InsetGroup`, `InsetRow`.
   - Implement first/last squircle corner clipping.
   - Implement hairline indented separators (58pt with icon, 16pt without).
   - Implement chevron indicator (`›`) when `onPress` is present.
   - Implement destructive alert styling in `#6A1B15`.
4. **Implement `src/design-system/SegmentedControl.tsx`**:
   - Implement animated active pill sliding indicator.
   - Implement `onLayout` responsive width recalculation.
   - Implement `Haptics.selectionAsync()` on change.
   - Add tablist/tab accessibility roles.
5. **Implement `src/design-system/Button.tsx`**:
   - Implement variants: `primary`, `secondary`, `outline`, `ghost`, `destructive`, `success`.
   - Enforce 48pt regular / 54pt large touch targets.
   - Add ActivityIndicator loading state with disabled interactions.
6. **Implement `src/design-system/Badge.tsx`**:
   - Implement status variants: `success`, `alert`, `warning`, `primary`, `neutral`.
   - Implement `filled`, `subtle`, and `outline` style modes with optional status dot.
7. **Implement `src/design-system/Card.tsx`**:
   - Implement `elevated`, `outlined`, `filled` with 14pt radius and card shadow.
8. **Implement `src/design-system/ClinicIdentity.tsx`**:
   - Export `CLINIC_IDENTITY` constant object.
   - Export `ClinicIdentityHeader` (compact & full modes).
   - Export `ClinicIdentityFooter` with interactive WhatsApp deep link.
   - Export `openClinicWhatsApp` helper.
9. **Implement `src/design-system/index.ts`**:
   - Re-export all tokens, components, and types.
10. **Run verification**:
    - `npx tsc --noEmit` must pass with 0 errors in strict mode.
