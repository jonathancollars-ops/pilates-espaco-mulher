# Orchestrator 2 Execution Plan

## Mission
Deliver a production-ready, 100% offline-first native mobile application (iOS & Android via Expo / React Native with strict TypeScript) for "Pilates Espaço Mulher" (Dra. Rogéria Collares - CREFITO 23093-F).

## Roadmap

### Milestone 1: HIG Polish & App Entry / Packaging Fixes
- Fix `package.json` entry point / create `index.ts`.
- Fix `app.json` plugins by removing invalid `"expo-print"`.
- Fix `InsetGroupedList.tsx` conditional children corner clipping.
- Polish touch ergonomics (`SegmentedControl.tsx` hitSlop, `Badge.tsx` accessibilityRole).
- Ensure `npx tsc --noEmit` and `npx expo config --type public` pass with zero errors.

### Milestone 2: 100% Local-First SQLite SSOT Engine & Preloaded Exercises
- Implement `expo-sqlite` database initialization with WAL mode and foreign key constraints.
- Implement versioned migrations (`PRAGMA user_version`).
- Database schema:
  - `patients`: id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, created_at, updated_at
  - `anamnesis`: patient_id, lab_tests, medications, allergies, surgeries, fractures, luxations, pregnancies, abortions, physical_activity, pain_complaints, imaging_exams, updated_at
  - `postural_evaluations`: patient_id, head, shoulders, thales_triangle, knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar, pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line, popliteal_line, musculature, evaluation_date
  - `bioimpedance`: patient_id, evaluation_date, weight, height, abdominal_circ, bmi, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat, muscle_mass_kg, ideal_weight, target_weight, fat_arms, fat_trunk, fat_legs, clinical_opinion
  - `exercises`: id, name, apparatus, description, default_springs, is_custom, created_at
  - `routines`: id, patient_id, name, notes, created_at, updated_at
  - `routine_items`: id, routine_id, exercise_id, sets, reps, springs_resistance, postural_notes, sort_order
- Preload >30 classic Pilates exercises (Mat/Solo, Reformer, Cadillac, Wunda Chair, Ladder Barrel, Accessories).
- Typed repositories for all entities.

### Milestone 3: Patient Management & Real-time Search Dashboard
- Apple HIG patient list cards with instant search by name or phone.
- Patient creation & editing modal/screens with validated fields:
  - Exclude CPF, Estado Civil, CEP.
  - Default City/State: "Rio das Ostras - RJ".
  - Phone/WhatsApp input mask.
- Quick actions: View Evaluation, Edit, Manage Workouts, Delete with native confirmation.
- Direct startup into Dashboard (zero login barrier).

### Milestone 4: Physiotherapeutic Evaluation Sheet Wizard & PDF Reports
- Segmented wizard tabs per patient:
  1. Personal Data summary
  2. Clinical Anamnesis (with all specific clinical fields from R5)
  3. Physical & Postural Evaluation (Frontal, Lateral, Posterior, Musculature)
  4. Evolutive Bioimpedance (temporal measurements, auto BMI and TMB calculations, segmental fat, clinical opinion)
  5. PDF Generation & Sharing: A4 format via `expo-print`, official palette, Dra. Rogéria Collares CREFITO 23093-F signature block, `expo-sharing`.

### Milestone 5: Pilates Workout Prescription & Dynamic Exercise Library
- Routines linked to each patient.
- Filter and browse >30 preloaded Pilates exercises across apparatuses.
- "+ Criar Novo" dynamic exercise modal persisting immediately to SQLite.
- Routine item configuration: sets, reps, springs/resistance, postural notes.

### Milestone 6: Local Backup/Restore & Startup Update Detection
- Settings screen:
  - Local Backup: export full SQLite database as structured JSON via `expo-sharing` & `expo-file-system`.
  - Local Restore: import backup JSON with validation and database transaction restore.
- Startup Update Detection in `App.tsx`:
  - `expo-updates` OTA check (`Updates.checkForUpdateAsync()`).
  - Fallback to GitHub Releases API with local version comparison.
  - Native iOS Alert with "Atualizar Agora" button.
  - Graceful, silent degradation if offline.

### Milestone 7: Final Verification, Testing & GitHub Readiness
- Strict TypeScript verification (`npm run typecheck` / `npx tsc --noEmit`).
- Automated unit and integration tests (`npm test`).
- Comprehensive `.gitignore` and `README.md`.
- Full project audit and signoff.
