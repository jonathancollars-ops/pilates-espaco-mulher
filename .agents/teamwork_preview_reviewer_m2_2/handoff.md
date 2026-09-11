# Milestone 2 Review & Adversarial Challenge Report: Backup & Restore Service, Schema & Engine

**Author**: M2 Code & Schema Reviewer 2 (`teamwork_preview_reviewer_m2_2`)  
**Roles**: reviewer, critic  
**Target**: Milestone 2 Implementation (`teamwork_preview_worker_m2_1`)  
**Parent**: Orchestrator (`3d5d14b3-384c-40e4-b02f-37417c3acd6c`)  
**Date**: 2026-09-11T22:30:00Z  
**Verdict**: **APPROVE**

---

## Executive Summary

Milestone 2 (Local-First SQLite Engine, Relational Clinical Schema, Classical Seed Catalog, CRUD Repositories, and Data Export & Backup Service) has been independently reviewed, compiled, test-verified, and adversarially stress-tested.

The implementation strictly satisfies all authoritative requirements from `ORIGINAL_REQUEST.md` (Follow-up 2026-09-11T22:01:09Z) and `SCOPE.md`.
- No integrity violations or bypasses were detected. All logic is authentic, robust, and dynamically evaluated.
- `npx tsc --noEmit` compiles cleanly with zero errors.
- `npm test` passes 100% across all 37 test suites and 103 test cases (0 failures, 0 skipped).
- The Backup & Restore engine implements strict topological ordering, atomic rollback via SQLite transactions, in-memory graph referential integrity checks, and native file sharing integration.

---

## 1. Observation

### 1.1 Automated Build and Test Execution

1. **TypeScript Typecheck Command**:
   ```bash
   npx tsc --noEmit
   ```
   - **Exit Code**: `0`
   - **Output**: Clean, 0 errors, 0 warnings.

2. **Automated Test Suite Execution**:
   ```bash
   npm test
   ```
   - **Exit Code**: `0`
   - **Summary Output**:
     ```text
     ℹ tests 103
     ℹ suites 37
     ℹ pass 103
     ℹ fail 0
     ℹ cancelled 0
     ℹ skipped 0
     ℹ todo 0
     ℹ duration_ms 1894.828
     ```

### 1.2 Inspection of Implementation Files

1. **`src/types/backup.ts` (Domain Contracts)**:
   - `BackupMetadata` (lines 13–35): Fully typed metadata contract including `version: '1.0.0'`, `schemaVersion: 1`, `app: 'pilates-espaco-mulher'`, `appName: 'Pilates Espaço Mulher'`, clinic professional identity (`name`, `crefito`, `clinic`, `phone`), `exportedAt`, `databaseVersion`, and record `counts`.
   - `EspacoMulherBackupV1` (lines 37–49): Strongly typed compound payload encompassing typed entity arrays: `patients: Patient[]`, `anamnesis: Anamnesis[]`, `postural_evaluations: PosturalEvaluation[]`, `bioimpedance: Bioimpedance[]`, `exercises: Exercise[]`, `routines: Routine[]`, `routine_items: RoutineItem[]`.

2. **`src/services/backupService.ts` (Core Engine)**:
   - **In-Memory Dry-Run Validation (`validateBackupPayload`, lines 51–120)**:
     - Asserts type signature `asserts payload is EspacoMulherBackupV1`.
     - Validates payload presence and object type.
     - Validates `payload?.metadata?.app === 'pilates-espaco-mulher'` and `payload?.metadata?.schemaVersion === 1`.
     - Validates all 7 required tables exist as arrays (`Array.isArray(data[table])`).
     - Constructs `Set<string>` of `patientIds` and validates referential integrity for `anamnesis.patient_id`, `postural_evaluations.patient_id`, `bioimpedance.patient_id`, and `routines.patient_id`.
     - Constructs `Set<string>` of `routineIds` and `exerciseIds`, validating `routine_items.routine_id` and `routine_items.exercise_id`.
     - Generates explicit, localized Portuguese diagnostic error messages if any constraint is broken.
   - **Database Export (`exportDatabaseBackup`, lines 126–214)**:
     - Concurrently queries all 7 relational tables via `Promise.all` with deterministic `ORDER BY` clauses.
     - Retrieves `PRAGMA user_version`.
     - Assembles metadata with Dra. Rogéria Collares CREFITO 23093-F institutional identity and ISO UTC timestamps.
     - Writes formatted JSON to `FileSystem.cacheDirectory` or `FileSystem.documentDirectory` using `FileSystem.writeAsStringAsync` with `UTF8` encoding.
     - Invokes native share modal via `Sharing.shareAsync` with `mimeType: 'application/json'`, `UTI: 'public.json'`, and dialog title when `Sharing.isAvailableAsync()` is true.
     - Returns `BackupExportResult` containing `fileUri`, `filename`, `jsonString`, and `counts`.
   - **Database Restoration (`importDatabaseBackup`, lines 220–482)**:
     - Accepts either raw JSON string or `file://` URI, dynamically loading the file via `FileSystem.readAsStringAsync` if a URI is provided.
     - Parses JSON and executes `validateBackupPayload` before any SQL operation is executed.
     - Wraps entire database wipe and insertion inside `await db.withTransactionAsync`.
     - **Reverse Topological Deletion (leaf-to-root)** (lines 251–258):
       ```sql
       DELETE FROM routine_items;
       DELETE FROM routines;
       DELETE FROM bioimpedance;
       DELETE FROM postural_evaluations;
       DELETE FROM anamnesis;
       DELETE FROM exercises;
       DELETE FROM patients;
       ```
     - **Topological Insertion (root-to-leaf)** (lines 260–467):
       1. `patients` (root demographic entity)
       2. `exercises` (root catalog entity)
       3. `anamnesis` (references `patients(id)`)
       4. `postural_evaluations` (references `patients(id)`)
       5. `bioimpedance` (references `patients(id)`)
       6. `routines` (references `patients(id)`)
       7. `routine_items` (references `routines(id)` and `exercises(id)`)
     - Defensively handles compound JSON sub-structures in `anamnesis` (fractures, luxations, pregnancies, abortions, pain_complaints) by checking `typeof a.field === 'object'` and serializing with `JSON.stringify` to avoid double-encoding or null pointer exceptions.
     - Executes post-restoration engine verification via `PRAGMA foreign_key_check;` before transaction commit, throwing an error if any foreign key mismatch is reported.

3. **`src/database/schema.ts` (Relational Schema)**:
   - 7 tables defined with strict constraints:
     - `patients`: strictly excludes `cpf`, `estado_civil`, and `cep`. Sets `city_state NOT NULL DEFAULT 'Rio das Ostras - RJ'`.
     - `anamnesis`, `postural_evaluations`, `bioimpedance`, `routines`: enforce `FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE`.
     - `routine_items`: enforces `FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE` and `FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT`.
   - 10 secondary indices supporting performant name/phone search, chronological sorting, and relational joins.

4. **`src/database/seeds.ts` (Classical Catalog)**:
   - 49 classical Pilates & kinesitherapy exercises covering Mat (13), Reformer (8), Cadillac (8), Wunda Chair (7), Ladder Barrel (6), and Cinesioterapia & Acessórios (7).
   - Every seeded exercise specifies `is_custom: 0`, Portuguese names, apparatus, default springs, reps/sets, postural focus, and contraindications.

---

## 2. Logic Chain

1. **Integrity & Authenticity Verification**:
   - Inspected source code in `src/services/backupService.ts`, `src/types/backup.ts`, and `src/database/` for any evidence of hardcoded test results, facade patterns, or mocked outputs.
   - Confirmed that `validateBackupPayload` uses genuine set-membership algorithms on dynamic arrays.
   - Confirmed that `exportDatabaseBackup` and `importDatabaseBackup` dynamically query and execute SQL queries parameter-by-parameter against the SQLite database.
   - Confirmed that no integrity violations exist.

2. **Topological Order Correctness**:
   - The dependency graph of the SQLite schema has two root nodes (`patients`, `exercises`), intermediate child nodes (`anamnesis`, `postural_evaluations`, `bioimpedance`, `routines`), and one leaf node (`routine_items` which depends on both `routines` and `exercises`).
   - Because `routine_items` has `ON DELETE RESTRICT` on `exercises`, attempting to delete `exercises` before `routine_items` would throw a SQLite constraint error.
   - In `backupService.ts` line 250, deleting `routine_items` first frees `exercises` and `routines`. Deleting `routines`, `bioimpedance`, `postural_evaluations`, and `anamnesis` next frees `patients`. Deleting `exercises` and `patients` last cleanly wipes the database without foreign key conflicts.
   - During insertion (lines 260–467), `patients` and `exercises` are inserted first, providing parent IDs for all subsequent dependent tables. `routine_items` is inserted last, ensuring both its parent `routines` and referenced `exercises` exist.
   - Hence, the topological deletion and insertion orders are mathematically and structurally sound.

3. **In-Memory Dry-Run Validation Rigor**:
   - Validating foreign key references in memory *before* issuing any `DELETE` or `INSERT` SQL statements protects database integrity from malformed payloads.
   - Challenger test suite 8 validated 10,580 records in <19ms, demonstrating that building `Set` collections and running `.has()` checks scales with $O(N)$ time complexity and negligible memory overhead.
   - Corrupted foreign key references (such as orphaned routine items or invalid patient references) are caught immediately with informative Portuguese errors.

4. **Transaction Atomicity & Rollback Verification**:
   - Wrapping operations inside `db.withTransactionAsync` ensures that if validation fails, if a SQLite disk I/O error occurs, or if `PRAGMA foreign_key_check` detects an inconsistency, SQLite issues a `ROLLBACK`.
   - Verified via Challenger stress tests: pre-existing database contents remained 100% untouched when restore operations were intentionally triggered to fail mid-process.

5. **Expo Native Module Integration**:
   - File export utilizes `FileSystem.cacheDirectory ?? FileSystem.documentDirectory` with fallback guards, UTF-8 encoding, and `Sharing.shareAsync` with `UTI: 'public.json'` and `mimeType: 'application/json'`.
   - File import transparently accepts either direct JSON text or native `file://` path URIs, reading via `FileSystem.readAsStringAsync`.

---

## 3. Findings & Adversarial Critique

### Finding 1 (Minor / Dependency Management)
- **What**: `expo-file-system` is imported directly in `src/services/backupService.ts` (`import * as FileSystem from 'expo-file-system/legacy';`), but is not explicitly declared in `package.json` under `dependencies`.
- **Where**: `package.json` vs `src/services/backupService.ts:13`.
- **Why**: Currently, `expo-file-system@57.0.7` is hoisted transitively by `expo@57.0.22`, so builds and tests succeed. However, relying on transitive hoisting can cause missing dependency errors in strict package managers (pnpm, yarn modern) or during cloud builds with EAS Build if autolinking expects direct declaration.
- **Suggestion**: Add `"expo-file-system": "~57.0.7"` to `package.json` `dependencies` during Milestone M6/M7 dependency polish.

### Finding 2 (Minor / Path Concatenation Resilience)
- **What**: `fileUri` generation uses `${baseDir}${filename}`.
- **Where**: `src/services/backupService.ts:186`.
- **Why**: Expo's `FileSystem.cacheDirectory` and `FileSystem.documentDirectory` always terminate with a trailing slash (`/`). However, if an external directory path or custom mock is provided without a trailing slash, the filename would be concatenated directly onto the folder name.
- **Suggestion**: Ensure trailing slash normalization: `const dir = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;`.

### Finding 3 (Informational / Photogrammetry URI Portability)
- **What**: Postural evaluation photo URIs (`photo_frontal_uri`, `photo_lateral_uri`, `photo_posterior_uri`) are stored as local device file paths in JSON.
- **Where**: `src/services/backupService.ts:355` and `src/types/postural.ts`.
- **Why**: When a JSON backup is exported and restored on a different physical device, the database records will restore successfully, but the physical photo files located in the originating device's local app sandbox will not be present on the new device unless migrated.
- **Suggestion**: For future milestones (M4/M6), ensure the UI gracefully displays a placeholder when local photo file paths do not exist on disk, or consider bundling images in a future `.zip` backup variant if requested.

---

## 4. Caveats

- **Native Native Modules in Node**: Unit tests run via Node's native test runner (`node --test`) using mock modules for `expo-sqlite`, `expo-file-system`, and `expo-sharing`. Full binary compilation and native share sheet rendering will be further exercised during physical device testing.
- **No blocking caveats**: None of the findings affect the correctness, stability, or architectural soundness of Milestone 2.

---

## 5. Conclusion

Milestone 2 implementation is **APPROVED**.
- Relational schema, indices, migrations, seeds, biometrics, formatters, and CRUD repositories are complete.
- Backup & restore service (`backupService.ts`) is fully implemented with strict TypeScript typing, topological ordering, in-memory referential integrity checks, transaction rollback atomicity, and native Expo sharing/file-system integration.
- Code quality is exceptional, zero integrity violations, zero compiler errors, and 103/103 tests passing.

---

## 6. Verification Method

To independently verify this implementation:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Zero errors, exit code 0.

2. **Automated Test Execution**:
   ```bash
   npm test
   ```
   *Expected*: 103 tests pass across 37 test suites with 0 failures.

3. **Inspect Schema & Service**:
   - Confirm `patients` excludes `cpf`, `estado_civil`, and `cep`.
   - Confirm `validateBackupPayload` in `src/services/backupService.ts` checks all 7 tables and foreign keys.
   - Confirm `importDatabaseBackup` executes reverse-topological delete and topological insert inside `withTransactionAsync`.
