# Orchestration Plan: Pilates Espaço Mulher (Dra. Rogéria Collares)

## Objective
Deliver a production-ready, fully typed, local-first native mobile application (Expo / React Native) complying with Apple HIG, Local-First SQLite architecture, Firebase Spark Plan quota protection, clinical modules (Patients, Anamnesis, Postural Grid, Bioimpedance), Pilates Exercise Catalog & Workout Prescription, and Clinical Report Generation/Export.

## Phases

### Phase 0: Survey & Project Blueprint
- Dispatch 3 Explorers / Spec Miners in parallel:
  - Explorer 1 (`teamwork_preview_spec_miner`): Deep requirements extraction from `ORIGINAL_REQUEST.md`, identifying exact acceptance criteria, UI/HIG specs, color codes, clinical fields, exercises, report structure.
  - Explorer 2 (`teamwork_preview_explorer`): Codebase inventory — check package.json, installed dependencies, Expo version, existing files/scaffolding, directory structure.
  - Explorer 3 (`teamwork_preview_explorer`): Technical integration analysis — evaluate Expo SQLite, Firebase modular SDK, chart libraries, camera/image picker, PDF generation, haptics in the project environment.
- Merge reports into `PROJECT.md` at root with full Feature Inventory and interface contracts.

### Phase 1: Implementation Track
- Iteration loops (Explorer -> Worker -> Reviewer x2 -> Challenger x2 -> Auditor -> Gate check) for each milestone:
  - M1: Apple HIG Design System, Design Tokens, Navigation, Layout & Components.
  - M2: SQLite Local-First Database Engine (expo-sqlite), Schema Migrations, Types & Repositories.
  - M3: Firebase Quota-Protected Remote Sync Service (Consolidated documents, batch write, on-demand sync, dirty flags).
  - M4: Patient Management, Clinical Anamnesis, Postural Evaluation (Visual Grid/Guides), Bioimpedance & Temporal Charts.
  - M5: Pilates Classical Equipment Catalog (Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat, Accessories) & Routine Prescription.
  - M6: Clinical Reports Generation, Dra. Rogéria Collares Signature, Clinic Identity, PDF/WhatsApp Share.

### Phase 2: Dual Track — E2E Testing Track
- Test writer dispatches for:
  - Tier 1: Feature Coverage (≥5 per feature)
  - Tier 2: Boundary & Corner Cases (≥5 per feature)
  - Tier 3: Cross-Feature Interactions (Pairwise)
  - Tier 4: Real-World Clinical Workload Scenarios
- `TEST_READY.md` publication and verification.

### Phase 3: Final Verification & Coverage Hardening
- Run 100% of E2E tests and unit tests.
- Tier 5 adversarial coverage hardening.
- Forensic integrity audit.
- Final completion handoff.
