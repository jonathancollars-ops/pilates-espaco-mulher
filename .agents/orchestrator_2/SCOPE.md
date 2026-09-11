# Scope: Pilates Espaço Mulher (Dra. Rogéria Collares)

## Overview
100% Local-First (offline-first, zero backend, zero login) native mobile application (iOS & Android via Expo / React Native with strict TypeScript) for "Pilates Espaço Mulher" (Dra. Rogéria Collares - CREFITO 23093-F, Costa Azul, Rio das Ostras - RJ, WhatsApp: (22) 99947-4304).

## Architecture
- **Presentation Layer**: Apple Human Interface Guidelines (HIG) with Inset Grouped Lists, dynamic collapsible Large Titles, SF Pro typography, official brand palette (`#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235`), and tactile haptics via `expo-haptics`.
- **Navigation**: Direct entry to Patient Dashboard (zero login/auth screen), tabbed navigation (Pacientes, Treinos, Biblioteca, Relatórios, Ajustes).
- **Storage Layer**: SQLite relational Single Source of Truth (`expo-sqlite`) with WAL mode, foreign keys, and versioned migrations (`PRAGMA user_version`).
- **Backup & Restore**: JSON export and import in Settings using `expo-sharing` and `expo-file-system`.
- **Startup Update Detection**: Dual-strategy OTA check via `expo-updates` with fallback to GitHub Releases API and native iOS Alert ("Atualizar Agora"), gracefully non-blocking when offline.
- **Reports & Sharing**: A4 PDF clinical evaluation and progression reports via `expo-print` and `expo-sharing` featuring Dra. Rogéria Collares CREFITO 23093-F signature.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Entry point and Expo config fix | Create `index.ts` registering root component; remove invalid `"expo-print"` from `app.json` plugins; fix InsetGroup squircle corner clipping | M1 | Reviewer 2 / Challengers |
| 2 | Apple HIG Tokens & Components | Hex colors, SF Pro typography, Large Titles, Inset Grouped Lists, Segmented Controls, Haptics | M1 | ORIGINAL_REQUEST §R1 |
| 3 | SQLite Local-First Engine | `expo-sqlite` setup with WAL mode, foreign keys, and `PRAGMA user_version` migrations | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Relational Clinical Schema | Tables: patients, anamnesis, postural_evaluations, bioimpedance, exercises, routines, routine_items | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Classical Exercise Seed Catalog | >30 (49 pre-seeded) Pilates exercises across Mat, Reformer, Cadillac, Chair, Barrel, Accessories | M2 | ORIGINAL_REQUEST §R6 |
| 6 | Typed CRUD Repositories | Type-safe data access layer for all 7 relational tables | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Patient Dashboard & Real-time Search | Apple HIG cards, instant search by name/phone, direct app launch without login | M3 | ORIGINAL_REQUEST §R2, §R4 |
| 8 | Patient Intake & Profile Form | Excludes CPF, Estado Civil, CEP; default "Rio das Ostras - RJ"; phone mask; quick actions | M3 | ORIGINAL_REQUEST §R4 |
| 9 | Physiotherapeutic Evaluation Wizard | Segmented tabs per patient: Personal Data, Anamnesis, Postural, Bioimpedance, PDF | M4 | ORIGINAL_REQUEST §R5 |
| 10 | Clinical Anamnesis Module | Detailed records: surgeries, fractures, luxations, pregnancies, abortions, pain complaints | M4 | ORIGINAL_REQUEST §R5 |
| 11 | Postural Evaluation Module | Frontal, lateral, posterior, and muscular assessments with clinical annotations | M4 | ORIGINAL_REQUEST §R5 |
| 12 | Evolutive Bioimpedance Tracker | Temporal metrics, automatic BMI and TMB calculations, segmental fat, clinical opinions | M4 | ORIGINAL_REQUEST §R5 |
| 13 | A4 PDF Clinical Report Generation | `expo-print` formatted A4 PDF with clinic palette, tables, and Dra. Rogéria signature | M4 | ORIGINAL_REQUEST §R5 |
| 14 | Native Report Sharing | Native share modal via `expo-sharing` (WhatsApp, AirDrop, files) | M4 | ORIGINAL_REQUEST §R5 |
| 15 | Dynamic Pilates Exercise Library | Apparatus browsing + "+ Criar Novo" button persisting custom exercises to SQLite | M5 | ORIGINAL_REQUEST §R6 |
| 16 | Workout Routine Prescription Builder | Assemble custom routines per patient with sets, reps, springs/resistance, postural notes | M5 | ORIGINAL_REQUEST §R6 |
| 17 | Local JSON Backup & Restore | Full database export/import via JSON using `expo-sharing` and `expo-file-system` in Settings | M6 | ORIGINAL_REQUEST §R2 |
| 18 | Startup Update Detection | `expo-updates` check + GitHub Releases fallback, native Alert with "Atualizar Agora", silent offline handling | M6 | ORIGINAL_REQUEST §R3 |
| 19 | Strict TypeScript & Test Hardening | `npm run typecheck` zero errors, unit tests passing (`npm test`), .gitignore, README.md | M7 | ORIGINAL_REQUEST §R7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | HIG Polish & App Entry / Packaging Fixes | index.ts, app.json plugins, InsetGroup corner fix, hitSlop | None | DONE |
| M2 | Local-First SQLite SSOT Engine | expo-sqlite, migrations, schema, 49 seeds, repositories, biometrics, backup | M1 | DONE |
| M3 | Patient Management & Search Dashboard | Patient list, instant search, profile form, quick actions, App.tsx startup | M1, M2 | IN_PROGRESS |
| M4 | Clinical Evaluation Sheet Wizard & PDF | Anamnesis, Postural, Bioimpedance, PDF export & sharing | M1, M2, M3 | PLANNED |
| M5 | Pilates Prescription & Dynamic Exercises | Dynamic exercise library, routine prescription builder | M1, M2, M3 | PLANNED |
| M6 | Local Backup/Restore & Update Detection | JSON export/import in Settings, startup update detector | M1, M2, M3 | PLANNED |
| M7 | Testing, Quality Verification & GitHub | Strict tsc, unit test suite, README.md, .gitignore | M1-M6 | PLANNED |
