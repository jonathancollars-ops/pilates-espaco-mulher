# Technical Architecture & Integration Handoff Report

## 1. Observation
- **Authoritative Request Inspection:** Inspected `ORIGINAL_REQUEST.md` (lines 12-68). Observed exact requirements:
  - R1: Apple HIG design system with SF Pro typography, Large Titles, Inset Grouped List, Segmented Controls, `expo-haptics`, official brand palette (`#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235`), and identity of Dra. Rogéria Collares (CREFITO 23093-F), Costa Azul, Rio das Ostras, WhatsApp (22) 99947-4304.
  - R2: Strict Local-First SQLite architecture (`expo-sqlite`) as Single Source of Truth (SSOT), 100% offline functionality. Firebase Spark Plan quota protection requiring consolidated document reads/writes, zero continuous polling or persistent `onSnapshot` listeners, on-demand/batched sync with dirty flags. Provided Firebase credentials for `espacomulher-84137`.
  - R3: Clinical modules for Patient Records, Anamnesis, Postural Evaluation with visual grid/alignment benchmarks, and Bioimpedance with temporal charts.
  - R4: Pilates Exercise Catalog across classical apparatus (Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat, Accessories) and routine prescription.
  - R5: Clinical report generation with visual identity and professional signature, shareable via PDF and WhatsApp.
- **Environment & Workspace Inspection:**
  - Ran `node --version` (`v24.19.0`), `npm --version` (`11.17.0`), `git status` (clean repository with untracked `.agents/` and `ORIGINAL_REQUEST.md`).
  - Observed project root does not yet have a scaffolded `package.json` or `src/` directory, confirming that Phase 0 requires pure read-only architectural design.

## 2. Logic Chain
1. **Local-First SSOT:** Because clinical evaluation occurs face-to-face in physical consultation rooms with potentially unstable mobile connectivity in Costa Azul / Rio das Ostras, SQLite via `expo-sqlite` must be the authoritative source of truth. All CRUD operations execute directly against local SQLite with WAL mode enabled.
2. **Quota Protection Optimization:** Firebase Spark free tier allows 50,000 reads and 20,000 writes per day. A normalized document approach (separate documents for patient, anamnesis, evaluations, routine items, workout logs) multiplies read/write operations by 10-15x per patient interaction. By aggregating all textual patient records into a single **Consolidated Patient Document** (`clinics/espacomulher/patients/{patientId}`), each clinical visit consumes exactly 1 write and 1 read. Calculations show 2 years of history for a patient consumes ~76 KB, well below Firestore's 1 MiB document ceiling.
3. **Absence of Real-Time Listeners:** Collection snapshot listeners (`onSnapshot`) continuously consume read quotas and keep open connections. By relying strictly on explicit on-demand sync ("Sincronizar Agora" button) and non-blocking debounced on-save writes, cloud quota consumption is minimized by >95%.
4. **Pure SVG Charting & Postural Grid:** Heavy chart libraries introduce large bundle footprints and build errors in React Native. Developing custom SVG curves (cubic Bezier) and SVG plumb lines using `react-native-svg` ensures lightweight execution, zero build conflicts, and pixel-perfect adherence to brand colors (`#9B6CBA`, `#7A4F94`).
5. **Print-to-PDF & Sharing Pipeline:** `expo-print` accepts standard HTML5/CSS3. Rendering an A4-optimized responsive template incorporating Dra. Rogéria Collares' CREFITO credentials and a signature block produces a vector PDF. `expo-sharing` triggers native iOS/Android sharing sheets, and `Linking.openURL('https://wa.me/55...')` enables one-tap WhatsApp sharing with pre-filled clinical messages.

## 3. Caveats
- Photogrammetry images: Only image metadata and local URIs are stored in SQLite/Firestore. If cloud backup of physical photos is enabled, they must be streamed directly to Firebase Storage (`firebasestorage.app`) rather than embedded as Base64 strings in Firestore documents.
- The project root currently lacks an initialized Expo project structure; scaffolding must be executed in Milestone 1 using Expo SDK 51/52.

## 4. Conclusion
The comprehensive technical architecture is fully detailed in `.agents/teamwork_preview_explorer_survey_3/survey_architecture.md`. It provides complete DDL specifications for 9 SQLite tables, performance indices, PRAGMA `user_version` migration scripts, consolidated Firestore document schemas, a dirty flag state machine, design system tokens, SVG component designs, an A4 clinical report template, and a modular directory structure under `src/`. All technical constraints from `ORIGINAL_REQUEST.md` have been met.

## 5. Verification Method
- **Document Verification:** Verify that `.agents/teamwork_preview_explorer_survey_3/survey_architecture.md` exists and contains:
  1. DDL for tables: `patients`, `anamnesis`, `postural_evaluations`, `bioimpedances`, `exercise_catalog`, `routines`, `routine_items`, `workout_sessions`, `sync_status`.
  2. Migration pattern using `PRAGMA user_version`.
  3. Consolidated Firestore bundle interface `ConsolidatedPatientBundle`.
  4. Token specifications for colors `#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235`.
  5. HTML/CSS template containing Dra. Rogéria Collares, CREFITO 23093-F, Costa Azul, Rio das Ostras, (22) 99947-4304.
  6. Modular directory layout separating `src/design-system/`, `src/database/`, `src/services/`, `src/features/`, and `src/types/`.
- **Invalidation Condition:** Any schema design relying on real-time collection listeners (`onSnapshot`) or normalized subcollections that exceed the Spark Plan quota, or omitting the required clinical credentials.
