# E2E Test Infra: Pilates Espaço Mulher

## Test Philosophy
- Opaque-box, requirement-driven, derived directly from `ORIGINAL_REQUEST.md`.
- No dependency on implementation internals.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory Coverage Target
| # | Feature Area | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|--------------|:----------------:|:-----------------:|:-----------------:|:-------------------:|
| F1 | Apple HIG & Theme Tokens | ≥5 | ≥5 | ✓ | ✓ |
| F2 | Inset Grouped List & Large Titles | ≥5 | ≥5 | ✓ | ✓ |
| F3 | Haptics & Sensory Feedback | ≥5 | ≥5 | ✓ | ✓ |
| F4 | Professional Branding & Identity | ≥5 | ≥5 | ✓ | ✓ |
| F5 | SQLite Engine & Migrations (9 tables) | ≥5 | ≥5 | ✓ | ✓ |
| F6 | Classical Exercise Catalog Seeding | ≥5 | ≥5 | ✓ | ✓ |
| F7 | Local-First CRUD Repositories | ≥5 | ≥5 | ✓ | ✓ |
| F8 | Firebase Quota Protection & Consolidation | ≥5 | ≥5 | ✓ | ✓ |
| F9 | Dirty Flag State Machine & Batch Sync | ≥5 | ≥5 | ✓ | ✓ |
| F10 | Patient Intake & Search | ≥5 | ≥5 | ✓ | ✓ |
| F11 | Anamnesis & Pain Map (EVA) | ≥5 | ≥5 | ✓ | ✓ |
| F12 | Postural Assessment & Photogrammetry Grid | ≥5 | ≥5 | ✓ | ✓ |
| F13 | Bioimpedance Calculations & Biometrics | ≥5 | ≥5 | ✓ | ✓ |
| F14 | Temporal Evolution & SVG Charts | ≥5 | ≥5 | ✓ | ✓ |
| F15 | Classical Pilates Apparatus Catalog | ≥5 | ≥5 | ✓ | ✓ |
| F16 | Workout Routine Builder & Springs | ≥5 | ≥5 | ✓ | ✓ |
| F17 | Session Execution Logs & Tracking | ≥5 | ≥5 | ✓ | ✓ |
| F18 | Clinical Report HTML Template & PDF | ≥5 | ≥5 | ✓ | ✓ |
| F19 | WhatsApp Direct Share URL Format | ≥5 | ≥5 | ✓ | ✓ |
| F20 | Strict TypeScript Typecheck | ≥5 | ≥5 | ✓ | ✓ |

## Test Architecture
- Test Runner: Node.js / Jest or standalone TypeScript automated test execution scripts.
- Execution Command: `npm test` and `npx tsc --noEmit`.
- Directory Layout: `tests/`
  - `tests/tier1-features/`
  - `tests/tier2-boundary/`
  - `tests/tier3-pairwise/`
  - `tests/tier4-scenarios/`
  - `tests/tier5-adversarial/`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Patient Intake -> Anamnesis with lumbar hernia -> Postural evaluation with photo grid | F4, F5, F7, F10, F11, F12 | High |
| 2 | Bioimpedance progression over 6 months with comparative delta calculations and SVG chart data | F7, F13, F14 | High |
| 3 | Classical Pilates Prescription for Scoliosis on Reformer + Cadillac with spring calibrations | F6, F7, F15, F16, F17 | High |
| 4 | Offline patient evaluation followed by explicit batch sync to Firebase Spark tier | F5, F8, F9, F10, F12 | High |
| 5 | Complete clinical report generation, Dra. Rogéria signature, PDF export and WhatsApp share link | F4, F10, F11, F12, F13, F16, F18, F19 | High |

## Coverage Thresholds
- Tier 1: ≥100 test cases (≥5 per feature area)
- Tier 2: ≥100 test cases (boundary and corner cases)
- Tier 3: ≥20 pairwise cross-feature interaction cases
- Tier 4: ≥5 realistic end-to-end clinical workflow scenarios
- Tier 5: Adversarial edge cases and stress tests
