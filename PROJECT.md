# Project: Pilates Espaço Mulher (Dra. Rogéria Collares)

## Overview
High-performance native mobile application (iOS & Android via Expo / React Native) for physiotherapy clinical assessment (postural & bioimpedance) and classical Pilates exercise prescription, developed for Dra. Rogéria Collares (CREFITO 23093-F), Pilates Espaço Mulher, Costa Azul, Rio das Ostras - RJ.

## Architecture
Local-First Single Source of Truth (SSOT) architecture using SQLite (`expo-sqlite`) with offline-first persistence, integrated with a quota-protected Firebase cloud synchronization engine designed strictly for the Spark Free Tier. The user interface strictly implements Apple Human Interface Guidelines (HIG) with Inset Grouped Lists, Large Titles, dynamic scroll transitions, and subtle haptic feedback.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UI & Presentation Layer                         │
│   Apple HIG Design System, Inset Grouped Lists, Large Titles, Haptics  │
├────────────────────────────────────────────────────────────────────────┤
│                           Navigation Layer                             │
│       Tabs: Pacientes | Treinos | Aparelhos | Relatórios | Ajustes     │
├────────────────────────────────────────────────────────────────────────┤
│                            Feature Modules                             │
│  - Patients & Search          - Postural Grid & Dynamic Assessment     │
│  - Clinical Anamnesis (EVA)   - Bioimpedance & Temporal SVG Charts     │
│  - Pilates Exercise Catalog   - Custom Workout Prescription Builder    │
│  - Session History & Logs     - Clinical Report & PDF/WhatsApp Export  │
├────────────────────────────────────────────────────────────────────────┤
│                       Local-First Database Layer                       │
│    SQLite Engine (expo-sqlite, WAL mode, foreign keys, 9 tables, SSOT) │
├────────────────────────────────────────────────────────────────────────┤
│                      Firebase Quota-Protected Sync                     │
│  Consolidated Doc Bundles | On-Demand Sync | Zero Poll / Zero Listeners│
└────────────────────────────────────────────────────────────────────────┘
```

## Code Layout
```
c:/Users/jonat/Documents/antigravity/goofy-archimedes/
├── package.json
├── tsconfig.json
├── app.json
├── App.tsx                          # App root & Provider tree
├── src/
│   ├── design-system/               # Apple HIG Tokens & Reusable Components
│   │   ├── tokens.ts                # Brand palette (#9B6CBA, #FAF8F5, #6A1B15, #1B5235), fonts, spacing
│   │   ├── InsetGroupedList.tsx     # Apple Inset Grouped List container & rows
│   │   ├── LargeTitleHeader.tsx     # Dynamic collapsible Large Title
│   │   ├── SegmentedControl.tsx     # iOS style Segmented Control
│   │   ├── Haptics.ts               # Haptic feedback triggers
│   │   └── Card.tsx, Button.tsx, Badge.tsx
│   ├── database/                    # Local-First SQLite SSOT Engine
│   │   ├── index.ts                 # Database connection & init
│   │   ├── schema.ts                # DDL for 9 tables & indices
│   │   ├── migrations.ts            # PRAGMA user_version migration runner
│   │   ├── seeds.ts                 # Classical Pilates exercise catalog seeds
│   │   └── repositories/            # Typed CRUD repositories
│   │       ├── patientRepository.ts
│   │       ├── anamnesisRepository.ts
│   │       ├── posturalRepository.ts
│   │       ├── bioimpedanceRepository.ts
│   │       ├── exerciseRepository.ts
│   │       ├── routineRepository.ts
│   │       └── syncRepository.ts
│   ├── services/                    # Cloud & Hardware Integrations
│   │   ├── firebase.ts              # Firebase client init (espacomulher-84137)
│   │   ├── syncService.ts           # Quota-safe consolidated document sync
│   │   ├── reportGenerator.ts       # HTML5 A4 template & Dra. Rogéria branding
│   │   ├── pdfService.ts            # expo-print PDF generator & expo-sharing
│   │   └── whatsappService.ts       # WhatsApp direct link generator
│   ├── features/                    # Clinical & Workout Modules
│   │   ├── patients/                # Patient list, search, intake, profile
│   │   ├── anamnesis/               # Clinical anamnesis form & pain map (EVA)
│   │   ├── postural/                # Postural evaluation & photogrammetry grid
│   │   ├── bioimpedance/            # Bioimpedance biometrics & temporal SVG charts
│   │   ├── exercises/               # Equipment-based exercise catalog
│   │   ├── routines/                # Routine prescription & session execution
│   │   └── reports/                 # Clinical report preview, signature & sharing
│   ├── types/                       # Strict TypeScript Domain Interfaces
│   │   ├── patient.ts
│   │   ├── anamnesis.ts
│   │   ├── postural.ts
│   │   ├── bioimpedance.ts
│   │   ├── exercise.ts
│   │   ├── routine.ts
│   │   ├── sync.ts
│   │   └── report.ts
│   └── utils/                       # Calculations, date formatters, validators
│       ├── biometrics.ts            # BMI, Body Fat kg, Lean Mass kg, TMB
│       └── formatters.ts            # CPF, Phone, Date (dd/MM/yyyy)
└── tests/                           # E2E & Unit Test Suites (Tiers 1-5)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Apple HIG Design System Tokens | Brand colors (#9B6CBA, #7A4F94, #FAF8F5, #F4EEF7, #6A1B15, #1B5235), SF Pro typography, radii | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Inset Grouped List Components | Container, InsetGroup, InsetRow, InsetLabel, InsetValue, Chevron navigation indicators | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Collapsible Large Titles | Dynamic header with smooth scroll transition from large title to inline navigation title | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Haptic Feedback Integration | Subtle sensory feedback on selections, confirmations, deletions, and segmented control changes | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Professional Identity Header/Footer | Dra. Rogéria Collares (CREFITO 23093-F), Costa Azul, Rio das Ostras, (22) 99947-4304 branding | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Native Navigation Shell | Tab bar and Stack navigation with custom tint and Apple-style transitions | M1 | ORIGINAL_REQUEST §R1 |
| 7 | SQLite Local-First Engine | Local SQLite database initialization with WAL mode, foreign key enforcement, and connection management | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Database Schema & Migrations | PRAGMA user_version migration system and DDL for 9 relational tables | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Classical Exercise Catalog Seeding | Pre-seeded exercises for Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat/Solo, and Accessories | M2 | ORIGINAL_REQUEST §R4 |
| 10 | Local CRUD Repositories | Typed repositories for patients, anamnesis, postural, bioimpedance, routines, and workout sessions | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Firebase Client Configuration | Initialization with provided credentials for project `espacomulher-84137` | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Consolidated Document Sync | Aggregating complete patient history into single document per patient in `clinics/espacomulher/patients/{patientId}` | M3 | ORIGINAL_REQUEST §R2 |
| 13 | Quota-Safe Sync Engine | Strictly zero persistent `onSnapshot` listeners and zero polling loops; on-demand/batched sync | M3 | ORIGINAL_REQUEST §R2 |
| 14 | Dirty Flag State Machine | Tracking modified entities (`dirty: 1/0`) and timestamps (`synced_at`) for efficient delta push | M3 | ORIGINAL_REQUEST §R2 |
| 15 | Patient CRUD & Instant Search | Patient registration, editing, soft-delete, and sub-millisecond local SQLite search | M4 | ORIGINAL_REQUEST §R3 |
| 16 | Clinical Anamnesis Form | Pathological history (hernia, scoliosis, osteoporosis), complaints, goals, and EVA visual analog pain scale | M4 | ORIGINAL_REQUEST §R3 |
| 17 | Postural Evaluation (Static/Dynamic) | Anatomical assessment across anterior, posterior, lateral views and dynamic tests (squat, Trendelenburg) | M4 | ORIGINAL_REQUEST §R3 |
| 18 | Photogrammetry Alignment Grid | Visual alignment grid (plumb line / horizontal benchmarks) overlay for postural photography | M4 | ORIGINAL_REQUEST §R3 |
| 19 | Bioimpedance Biometric Tracking | Weight, % fat, % muscle, water %, visceral fat, BMR/TMB, BMI/IMC with automatic derivations | M4 | ORIGINAL_REQUEST §R3 |
| 20 | Temporal Evolution SVG Charts | Lightweight pure SVG Bezier curves and comparative delta indicators over time | M4 | ORIGINAL_REQUEST §R3 |
| 21 | Pilates Exercise Catalog Browser | Filter and browse exercises by classical apparatus (Reformer, Cadillac, Chair, Barrel, Mat, Accessories) | M5 | ORIGINAL_REQUEST §R4 |
| 22 | Custom Routine Prescription Builder | Assemble personalized routines per patient with spring tension, reps, sets, and postural instructions | M5 | ORIGINAL_REQUEST §R4 |
| 23 | Session Execution & History Logging | Log completed sessions, exercise modifications, patient physical sensations, and dates | M5 | ORIGINAL_REQUEST §R4 |
| 24 | Clinical Report Generator | Formatted clinical assessment and progress reports with clinic visual identity and Dra. Rogéria credentials | M6 | ORIGINAL_REQUEST §R5 |
| 25 | Professional Signature Component | Digital signature capture/stamp block on clinical documentation | M6 | ORIGINAL_REQUEST §R5 |
| 26 | PDF Export & Native Sharing | Rendering A4 PDF via `expo-print` and invoking native share sheet via `expo-sharing` | M6 | ORIGINAL_REQUEST §R5 |
| 27 | Direct WhatsApp Sharing | Formatted summary and direct WhatsApp link (`https://wa.me/...`) for patient communication | M6 | ORIGINAL_REQUEST §R5 |
| 28 | Comprehensive Test Suite (Tiers 1-4) | Opaque-box tests covering features, boundary cases, pairwise interactions, and clinical workflows | M7 | ORIGINAL_REQUEST §Acceptance |
| 29 | Adversarial Coverage Hardening (Tier 5) | White-box stress testing and adversarial edge-case verification | M7 | ORIGINAL_REQUEST §Acceptance |
| 30 | Strict TypeScript Typecheck | Complete strict typing (`npx tsc --noEmit`) passing with zero errors across the entire project | M7 | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Apple HIG Design System & Core UI | Design tokens, Inset Grouped List, Large Titles, Haptics, Navigation Shell, Scaffold | None | IN_PROGRESS |
| M2 | Local-First SQLite Database Engine | Schema, PRAGMA user_version migrations, 9 tables, seed catalog, CRUD repositories | M1 | PLANNED |
| M3 | Firebase Quota-Protected Sync Service | Consolidated document schema, zero-listener sync engine, dirty flags, on-demand sync | M2 | PLANNED |
| M4 | Clinical Modules: Patients, Anamnesis, Postural & Bioimpedance | Patient CRUD, Anamnesis EVA, Postural grid overlay, Bioimpedance biometrics & SVG charts | M1, M2 | PLANNED |
| M5 | Pilates Catalog & Workout Routines | Apparatus exercise catalog, routine prescription builder, session execution logs | M1, M2, M4 | PLANNED |
| M6 | Clinical Reports, Signature & Export | HTML A4 template, Dra. Rogéria signature block, PDF export via expo-print, WhatsApp sharing | M1, M2, M4, M5 | PLANNED |
| M7 | E2E Testing Suite & Hardening | Dual track: Tiers 1-4 opaque-box test suite, Tier 5 adversarial tests, strict tsc verification | M1-M6 | PLANNED |

## Interface Contracts

### 1. Design System <-> Features
```typescript
// src/design-system/tokens.ts
export const Colors = {
  primary: '#9B6CBA',
  primaryDark: '#7A4F94',
  surface: '#FAF8F5',
  surfaceSecondary: '#F4EEF7',
  accent: '#6A1B15',
  success: '#1B5235',
  text: '#2C2530',
  textSecondary: '#6E6573',
  border: '#E8E0EC',
  separator: '#D8CFDC',
} as const;

export interface InsetRowProps {
  label: string;
  value?: string | React.ReactNode;
  icon?: string;
  onPress?: () => void;
  destructive?: boolean;
  accessory?: React.ReactNode;
}
```

### 2. Database Engine <-> Repositories
```typescript
// src/database/types.ts
export interface DatabaseConnection {
  runAsync(query: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(query: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(query: string, params?: any[]): Promise<T | null>;
  execAsync(queries: string): Promise<void>;
  withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
}
```

### 3. Firebase Sync Engine <-> Repositories
```typescript
// src/services/syncService.ts
export interface ConsolidatedPatientBundle {
  patient: Patient;
  anamnesis?: Anamnesis;
  posturalEvaluations: PosturalEvaluation[];
  bioimpedances: Bioimpedance[];
  routines: RoutineWithItems[];
  workoutSessions: WorkoutSession[];
  lastSyncedAt: string;
  version: number;
}

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  error?: string;
  timestamp: string;
}
```

### 4. Clinical Report <-> Export Services
```typescript
// src/services/reportGenerator.ts
export interface ReportData {
  patient: Patient;
  latestAnamnesis?: Anamnesis;
  latestPostural?: PosturalEvaluation;
  latestBioimpedance?: Bioimpedance;
  bioimpedanceHistory: Bioimpedance[];
  activeRoutines: RoutineWithItems[];
  clinician: {
    name: 'Dra. Rogéria Collares';
    crefito: 'CREFITO 23093-F';
    clinic: 'Pilates Espaço Mulher';
    location: 'Costa Azul, Rio das Ostras - RJ';
    phone: '(22) 99947-4304';
  };
  signatureBase64?: string;
  generatedAt: string;
}
```
