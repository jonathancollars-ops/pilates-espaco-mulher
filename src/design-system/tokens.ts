/**
 * Pilates Espaço Mulher — Design System Tokens
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Strict Apple Human Interface Guidelines (HIG) compliance with
 * official clinic brand color palette and typography scales.
 */

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

  // Semantic & Clinical Alert Colors (Wine Red)
  accent: '#6A1B15',          // Vinho / Bordô Escuro (Contraindicações, Dor EVA 7-10, Alertas)
  accentAlert: '#6A1B15',     // Vinho Alert (alias)
  destructive: '#6A1B15',     // Ações destrutivas (exclusão de paciente, reset)
  destructiveLight: '#FDECEB',// Fundo de alerta suave para banners clínicos

  // Semantic Success & Progression (Forest Green)
  success: '#1B5235',         // Verde Floresta Profundo (Parâmetros saudáveis, Conclusão, Sync)
  accentSuccess: '#1B5235',   // Verde Sucesso (alias)
  successLight: '#E8F4EC',    // Fundo de sucesso suave para badges de evolução

  // Semantic Warning & Caution (Amber)
  warning: '#C27803',         // Âmbar / Laranja Queimado (Sobrepeso, Dor moderada EVA 4-6)
  warningLight: '#FEF5E7',    // Fundo de aviso suave

  // Typography & Neutrals
  text: '#2C2530',            // Charcoal escuro com tom quente
  textPrimary: '#1F1A24',     // Preto carvão com subtom lilás escuro (Alto contraste HIG)
  textSecondary: '#6E6573',   // Cinza médio para subtítulos, legendas e rótulos
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

export type SpacingKey = keyof typeof Spacing;

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

export type RadiusKey = keyof typeof Radii;

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

export type ShadowKey = keyof typeof Shadows;

export const Layout = {
  minTouchTarget: 44,             // HIG Minimum Touch Target (44x44pt)
  screenMarginHorizontal: 16,     // Horizontal padding on iPhone
  insetGroupMarginHorizontal: 16, // Inset Grouped margin
  rowMinHeight: 48,               // Standard iOS list row height
  iconBoxSize: 30,                // Standard leading icon square
  separatorIndentWithIcon: 58,    // Hairline divider indent after icon
  separatorIndentWithoutIcon: 16, // Hairline divider indent when no icon
} as const;
