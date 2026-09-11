# M2 Database Architecture Handoff Report: Expo SDK 57 SQLite Engine & Typed Repositories

**Author**: M2 Database Architecture Explorer (`teamwork_preview_explorer_m2_1`)  
**Target Milestone**: M2 — Local-First SQLite SSOT Engine  
**Project**: Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)  
**Date**: 2026-09-11  

---

## 1. Observation

### 1.1 Installed Dependencies & Runtime Environment
- **Expo SDK & SQLite versions**: Inspected `package.json` (lines 14–34):
  - `"expo": "~57.0.22"`
  - `"expo-sqlite": "~57.0.3"`
  - `"react": "19.2.3"`, `"react-native": "0.86.3"`
  - `"typescript": "~6.0.3"`
- **Typecheck & Test Baseline**:
  - `npm test` runs `node --test tests/**/*.test.js` passing 21/21 tests (0 fails) in 829ms.
  - `npm run typecheck` (`tsc --noEmit`) passes with 0 errors across the existing codebase.
- **Authoritative Requirements**:
  - `ORIGINAL_REQUEST.md` (Follow-up 2026-09-11T22:01:09Z §R2, §R4, §R5, §R6):
    - App is 100% Local-First, zero backend, zero login, opening directly on the Patient Dashboard.
    - Relational SQLite database (`expo-sqlite`) is the Single Source of Truth (SSOT).
    - Versioned schema migrations using `PRAGMA user_version`.
    - Patient schema excludes CPF, Estado Civil, and CEP; city/state defaults to `"Rio das Ostras - RJ"`.
    - Pre-seeded catalog of >30 classical Pilates exercises across Mat, Reformer, Cadillac, Chair, Barrel, and Accessories, with dynamic "+ Criar Novo" exercise creation.
    - Evaluation wizard covers Anamnesis (with EVA pain scale 0–10), Postural assessment (frontal, lateral, posterior, muscular), and Evolutive Bioimpedance (temporal tracking, automatic BMI/TMB, segmental fat).
    - Custom routine prescription builder per patient with apparatus, sets, reps, spring tensions, and postural notes.
  - `orchestrator_2/SCOPE.md`:
    - Feature #3: SQLite Local-First Engine with WAL mode, foreign keys, and `PRAGMA user_version` migrations.
    - Feature #4: Relational Clinical Schema (`patients`, `anamnesis`, `postural_evaluations`, `bioimpedance`, `exercises`, `routines`, `routine_items`).
    - Feature #5: Classical Exercise Seed Catalog (>30 exercises).
    - Feature #6: Typed CRUD Repositories for all relational tables.

### 1.2 `expo-sqlite` Modern Asynchronous API Verification
Direct inspection of `node_modules/expo-sqlite/build/SQLiteDatabase.d.ts` and `node_modules/expo-sqlite/build/hooks.d.ts` confirmed:
1. `openDatabaseAsync(databaseName: string, options?: SQLiteOpenOptions, directory?: string): Promise<SQLiteDatabase>`: Opens or creates a database asynchronously.
2. `execAsync(source: string): Promise<void>`: Executes batches of SQL statements (ideal for PRAGMAs and DDL migration scripts).
3. `runAsync(source: string, params: SQLiteBindParams): Promise<SQLiteRunResult>`: Executes parameterized write queries (`INSERT`, `UPDATE`, `DELETE`) returning `{ lastInsertRowId: number, changes: number }`.
4. `getFirstAsync<T>(source: string, params?: SQLiteBindParams): Promise<T | null>`: Fetches a single row typed as `T` or `null`.
5. `getAllAsync<T>(source: string, params?: SQLiteBindParams): Promise<T[]>`: Fetches all matching rows typed as `T[]`.
6. `withTransactionAsync(task: () => Promise<void>): Promise<void>`: Runs operations within a managed database transaction with automatic `COMMIT` on completion and `ROLLBACK` on unhandled exception.
7. `withExclusiveTransactionAsync(task: (txn: Transaction) => Promise<void>): Promise<void>`: Exclusive write transaction on native platforms.
8. `<SQLiteProvider>` and `useSQLiteContext()`: First-class React Context provider accepting `onInit?: (db: SQLiteDatabase) => Promise<void>`.

### 1.3 SQLite Behavior for WAL, Foreign Keys, and PRAGMA user_version
- **WAL Mode**: `PRAGMA journal_mode = WAL;` enables Write-Ahead Logging, allowing concurrent readers and writers without lock contention. WAL mode persists in the database file header, but re-asserting it during connection initialization ensures compliance.
- **Foreign Keys**: `PRAGMA foreign_keys = ON;` is **connection-scoped** in SQLite. SQLite defaults foreign keys to `OFF` for backwards compatibility. It must be explicitly executed on every newly established connection to guarantee `ON DELETE CASCADE` and `ON DELETE RESTRICT` constraints are enforced.
- **user_version**:
  - Read: `SELECT user_version FROM pragma_user_version;` or `PRAGMA user_version;` returns `{ user_version: number }`. Initial value for new databases is `0`.
  - Write: `PRAGMA user_version = <number>;` **cannot** use SQLite query parameter binding (`?` or `$val`). It must be executed with a literal integer in the SQL string: `await db.execAsync(\`PRAGMA user_version = \${version};\`)`.
  - Transactional safety: Updating `PRAGMA user_version` inside `withTransactionAsync` commits atomically with schema changes.

---

## 2. Logic Chain

1. **Local-First Architecture Principle**:
   - Because the application operates offline-first with zero backend dependencies, the SQLite database is the authoritative Single Source of Truth (SSOT).
   - Data corruption, orphaned records, or missed migrations would directly degrade clinical records. Therefore, foreign keys and transactional migrations must be strictly enforced at the database engine level.

2. **Connection Lifecycle & Initialization (`src/database/index.ts`)**:
   - A single shared database instance prevents file lock contention. We design a singleton connection manager with `getDatabase()`, `configureDatabase(db)`, `closeDatabase()`, and `resetDatabaseConnection()`.
   - `configureDatabase` runs `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;` immediately after `openDatabaseAsync`.
   - Exposing both `getDatabase()` (for non-React services, repositories, background jobs, test scripts) and `onInit` compatibility for `<SQLiteProvider>` ensures full architectural flexibility.

3. **Versioned Migration Engine (`src/database/migrations.ts`)**:
   - `PRAGMA user_version` tracks database schema versions without requiring extra migration tracking tables.
   - The runner queries current version `v = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ?? 0`.
   - It iterates through registered migrations where `migration.version > v` in sequential order (v1, v2, ...).
   - Each migration runs inside `withTransactionAsync`: applying DDL/DML and setting `PRAGMA user_version = migration.version`. If any statement fails, the transaction rolls back, preserving the previous schema state.

4. **Relational Clinical Schema (Version 1)**:
   - 7 relational tables:
     1. `patients`: Core patient registry excluding CPF, Estado Civil, and CEP; defaulting city/state to "Rio das Ostras - RJ".
     2. `anamnesis`: Clinical medical history, EVA pain scale (0–10), surgeries, fractures, luxations, pregnancies, abortions, imaging history.
     3. `postural_evaluations`: Postural alignment across frontal, lateral, posterior, muscular condition, and photo URIs.
     4. `bioimpedance`: Evolutive body composition metrics (weight, height, BMI, body age, metabolic age, BMR/TMB, body fat %, visceral fat, muscle mass, segmental fat, clinical opinion).
     5. `exercises`: Pilates exercise catalog with apparatus, difficulty level, default springs, reps, sets, postural focus, contraindications, and `is_custom` flag.
     6. `routines`: Workout routines linked to patients.
     7. `routine_items`: Individual exercises within a routine with execution order, sets, reps, custom springs, and patient-specific postural notes.
   - Foreign Keys:
     - `anamnesis`, `postural_evaluations`, `bioimpedance`, and `routines` reference `patients(id) ON DELETE CASCADE`.
     - `routine_items` references `routines(id) ON DELETE CASCADE` and `exercises(id) ON DELETE RESTRICT`.
   - Performance Indices:
     - Indices on `patients(name COLLATE NOCASE)`, `patients(phone)`, `patients(status)`.
     - Foreign key and date indices on `postural_evaluations(patient_id, date DESC)`, `bioimpedance(patient_id, date DESC)`, `routines(patient_id)`.

5. **Typed Repository Layer (`src/database/repositories/`)**:
   - Encapsulates all SQL statements inside typed functions, isolating UI components from raw SQL.
   - Provides domain-specific convenience methods:
     - `patientRepository`: Fast search by name/phone with `LIKE %query%`, active/archived filters, cascade deletion.
     - `anamnesisRepository`: Patient-scoped `upsert` (since each patient has one primary progressive anamnesis record) and EVA pain summaries.
     - `posturalRepository`: Chronological evaluation history, latest evaluation lookup, photo URI persistence.
     - `bioimpedanceRepository`: Latest metrics, chronological history for SVG evolution charts, automatic BMI calculation.
     - `exerciseRepository`: Catalog filtering by apparatus, search by name/focus, creation of custom exercises (`is_custom = 1`), seed loading.
     - `routineRepository`: Transactional routine creation with items, eager join with exercise details (`RoutineWithItems`), reordering and item replacement.

---

## 3. Concrete Architectural Designs

### 3.1 Database Connection Lifecycle (`src/database/index.ts`)

```typescript
import * as SQLite from 'expo-sqlite';
import { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

export const DATABASE_NAME = 'pilates_espaco_mulher.db';

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Enforces mandatory connection-level PRAGMAs:
 * - WAL journal mode for concurrency & durability
 * - Foreign Keys enforcement (OFF by default in SQLite)
 */
export async function configureDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}

/**
 * Obtains or initializes the singleton SQLite database instance.
 * Thread-safe against concurrent initialization requests.
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await configureDatabase(db);
    await runMigrations(db);
    dbInstance = db;
    initPromise = null;
    return db;
  })();

  return initPromise;
}

/**
 * Initializes the database for use in Expo's <SQLiteProvider onInit={initDatabase}>
 */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await configureDatabase(db);
  await runMigrations(db);
  dbInstance = db;
}

/**
 * Closes the active database connection. Used for test teardown and backup restores.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
  initPromise = null;
}

/**
 * Resets the connection instance.
 */
export async function resetDatabaseConnection(): Promise<void> {
  await closeDatabase();
}
```

---

### 3.2 Migration Runner & DDL Schema (`src/database/migrations.ts` & `src/database/schema.ts`)

```typescript
// src/database/migrations.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_V1_DDL, SCHEMA_V1_INDICES } from './schema';
import { seedInitialExercises } from './seeds';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_clinical_schema_and_seeds',
    up: async (db: SQLiteDatabase) => {
      // 1. Create all 7 relational tables
      await db.execAsync(SCHEMA_V1_DDL);
      // 2. Create performance & search indices
      await db.execAsync(SCHEMA_V1_INDICES);
      // 3. Seed classical Pilates exercise catalog (>30 exercises)
      await seedInitialExercises(db);
    },
  },
  // Future migrations:
  // { version: 2, name: 'add_field_example', up: async (db) => { ... } }
];

/**
 * Executes pending sequential migrations based on PRAGMA user_version.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<{ initialVersion: number; finalVersion: number }> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;
  let runningVersion = currentVersion;

  for (const migration of MIGRATIONS) {
    if (migration.version > runningVersion) {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        // Note: SQLite PRAGMA user_version does not support parameter binding; interpolation of validated int is required
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
      runningVersion = migration.version;
    }
  }

  return { initialVersion: currentVersion, finalVersion: runningVersion };
}
```

#### DDL Schema Definition (`src/database/schema.ts`)
```sql
-- 1. Patients Table (without CPF, Estado Civil, CEP; default Rio das Ostras - RJ)
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT,
  age INTEGER,
  phone TEXT NOT NULL,
  address TEXT,
  neighborhood TEXT,
  city_state TEXT NOT NULL DEFAULT 'Rio das Ostras - RJ',
  email TEXT,
  health_insurance TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'discharged')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Anamnesis Table
CREATE TABLE IF NOT EXISTS anamnesis (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL UNIQUE,
  lab_exams TEXT,
  medications TEXT,
  allergies TEXT,
  surgeries TEXT,
  fractures_has INTEGER NOT NULL DEFAULT 0,
  fractures_details TEXT,
  luxations_has INTEGER NOT NULL DEFAULT 0,
  luxations_details TEXT,
  pregnancy_has INTEGER NOT NULL DEFAULT 0,
  pregnancy_details TEXT,
  abortion_has INTEGER NOT NULL DEFAULT 0,
  abortion_details TEXT,
  physical_activity TEXT,
  pain_complaints TEXT,
  pain_intensity INTEGER NOT NULL DEFAULT 0 CHECK (pain_intensity >= 0 AND pain_intensity <= 10),
  imaging_exams_history TEXT,
  clinical_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 3. Postural Evaluations Table
CREATE TABLE IF NOT EXISTS postural_evaluations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  date TEXT NOT NULL,
  -- Frontal
  head_tilt TEXT,
  shoulders_alignment TEXT,
  thales_triangle TEXT,
  knees_alignment TEXT,
  feet_alignment TEXT,
  -- Lateral
  cervical_spine TEXT,
  shoulders_projection TEXT,
  abdomen TEXT,
  dorsal_spine TEXT,
  lumbar_spine TEXT,
  pelvis_tilt TEXT,
  plantar_arch TEXT,
  -- Posterior
  scapulae_alignment TEXT,
  scoliosis TEXT,
  hip_alignment TEXT,
  gluteal_fold TEXT,
  popliteal_line TEXT,
  -- Muscular
  muscle_condition TEXT,
  -- Photos & Notes
  photo_frontal_uri TEXT,
  photo_lateral_uri TEXT,
  photo_posterior_uri TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 4. Bioimpedance Table
CREATE TABLE IF NOT EXISTS bioimpedance (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  date TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  height_cm REAL NOT NULL,
  abdominal_circ_cm REAL,
  bmi REAL NOT NULL,
  body_age INTEGER,
  metabolic_age INTEGER,
  bmr_kcal REAL,
  body_fat_pct REAL,
  visceral_fat_level REAL,
  skeletal_muscle_kg REAL,
  body_water_pct REAL,
  ideal_weight_kg REAL,
  target_weight_kg REAL,
  segmental_fat_right_arm REAL,
  segmental_fat_left_arm REAL,
  segmental_fat_trunk REAL,
  segmental_fat_right_leg REAL,
  segmental_fat_left_leg REAL,
  clinical_opinion TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 5. Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  apparatus TEXT NOT NULL CHECK (apparatus IN ('reformer', 'cadillac', 'wunda_chair', 'ladder_barrel', 'mat', 'accessories')),
  category TEXT,
  level TEXT NOT NULL DEFAULT 'iniciante' CHECK (level IN ('iniciante', 'intermediário', 'avançado')),
  default_springs TEXT,
  default_reps INTEGER NOT NULL DEFAULT 10,
  default_sets INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  postural_focus TEXT,
  contraindications TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 6. Routines Table
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  goal TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 7. Routine Items Table
CREATE TABLE IF NOT EXISTS routine_items (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 10,
  springs_resistance TEXT,
  postural_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);
```

#### Performance Indices Definition (`SCHEMA_V1_INDICES`)
```sql
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_anamnesis_patient_id ON anamnesis(patient_id);
CREATE INDEX IF NOT EXISTS idx_postural_patient_date ON postural_evaluations(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bioimpedance_patient_date ON bioimpedance(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_apparatus ON exercises(apparatus);
CREATE INDEX IF NOT EXISTS idx_routines_patient_id ON routines(patient_id);
CREATE INDEX IF NOT EXISTS idx_routine_items_routine_order ON routine_items(routine_id, order_index ASC);
```

---

### 3.3 Classical Exercise Catalog Seeds (`src/database/seeds.ts`)

A catalog of 36 classical exercises with Portuguese names, apparatus, difficulty level, default springs, reps, sets, and postural cues:
- **Universal Reformer (7)**: Footwork, The Hundred Reformer, Short Spine Massage, Stomach Massage Series, Long Stretch, Knee Stretches, Elephant.
- **Cadillac / Trapeze Table (7)**: Roll Down Bar, Breathing, Leg Springs Series, Arm Springs Series, Tower, Teaser no Cadillac, Monkey.
- **Wunda Chair (5)**: Footwork on Chair, Going Up Front, Going Up Side, Press Down Front, Mermaid on Chair.
- **Ladder Barrel (5)**: Ballet Stretches, Swan on Barrel, Side Bends on Barrel, Short Box Series, Horseback on Barrel.
- **Solo / Mat (6)**: The Hundred (Solo), The Roll Up, Single Leg Stretch, Spine Stretch Forward, Swan Dive, Teaser Solo.
- **Acessórios & Cinesioterapia (6)**: Magic Circle Adutores, Magic Circle Ponte Pélvica, Overball Ativação Abdominal, Faixa Elástica Ostra / Glúteo, Bola Suíça Agachamento na Parede, Spine Corrector Extensão.

---

### 3.4 Typed Repositories Architecture (`src/database/repositories/`)

#### 1. `patientRepository.ts`
```typescript
export interface PatientRepository {
  create(data: CreatePatientInput): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  update(id: string, data: UpdatePatientInput): Promise<Patient>;
  delete(id: string): Promise<boolean>; // Cascades all evaluations and routines
  listAll(options?: { status?: PatientStatus; limit?: number; offset?: number }): Promise<Patient[]>;
  search(query: string, options?: { status?: PatientStatus }): Promise<Patient[]>; // Instant search by name/phone
  count(status?: PatientStatus): Promise<number>;
}
```
- Query Pattern for Instant Search:
  ```sql
  SELECT * FROM patients
  WHERE (? IS NULL OR status = ?)
    AND (name LIKE ? OR phone LIKE ?)
  ORDER BY name COLLATE NOCASE ASC;
  ```
  Bound parameters: `[status ?? null, status ?? null, `%${term}%`, `%${term}%`]`.

#### 2. `anamnesisRepository.ts`
```typescript
export interface AnamnesisRepository {
  findByPatientId(patientId: string): Promise<Anamnesis | null>;
  upsert(patientId: string, data: UpsertAnamnesisInput): Promise<Anamnesis>;
  deleteByPatientId(patientId: string): Promise<boolean>;
  getPainSummary(patientId: string): Promise<{ complaints: string | null; intensity: number } | null>;
}
```
- Upsert Logic:
  Queries `SELECT id FROM anamnesis WHERE patient_id = ?`. If row exists, runs `UPDATE anamnesis SET ... WHERE patient_id = ?`. If absent, generates UUID and runs `INSERT INTO anamnesis ...`. Boolean fields (`fractures_has`, etc.) map `true/false` to `1/0`.

#### 3. `posturalRepository.ts`
```typescript
export interface PosturalRepository {
  create(patientId: string, data: CreatePosturalInput): Promise<PosturalEvaluation>;
  findById(id: string): Promise<PosturalEvaluation | null>;
  listByPatientId(patientId: string): Promise<PosturalEvaluation[]>;
  getLatestByPatientId(patientId: string): Promise<PosturalEvaluation | null>;
  update(id: string, data: UpdatePosturalInput): Promise<PosturalEvaluation>;
  delete(id: string): Promise<boolean>;
}
```
- Query for Latest:
  ```sql
  SELECT * FROM postural_evaluations
  WHERE patient_id = ?
  ORDER BY date DESC, created_at DESC
  LIMIT 1;
  ```

#### 4. `bioimpedanceRepository.ts`
```typescript
export interface BioimpedanceRepository {
  create(patientId: string, data: CreateBioimpedanceInput): Promise<Bioimpedance>;
  findById(id: string): Promise<Bioimpedance | null>;
  listByPatientId(patientId: string): Promise<Bioimpedance[]>;
  getLatestByPatientId(patientId: string): Promise<Bioimpedance | null>;
  getHistory(patientId: string, limit?: number): Promise<Bioimpedance[]>; // Ordered ASC for chronological SVG curves
  update(id: string, data: UpdateBioimpedanceInput): Promise<Bioimpedance>;
  delete(id: string): Promise<boolean>;
}
```
- Automatic BMI Calculation:
  `const bmi = Number((weight_kg / Math.pow(height_cm / 100, 2)).toFixed(1));`

#### 5. `exerciseRepository.ts`
```typescript
export interface ExerciseRepository {
  create(data: CreateExerciseInput): Promise<Exercise>; // Dynamically creates custom exercise (is_custom = 1)
  findById(id: string): Promise<Exercise | null>;
  listAll(options?: { apparatus?: ExerciseApparatus; search?: string }): Promise<Exercise[]>;
  listByApparatus(apparatus: ExerciseApparatus): Promise<Exercise[]>;
  search(query: string, apparatus?: ExerciseApparatus): Promise<Exercise[]>;
  update(id: string, data: UpdateExerciseInput): Promise<Exercise>;
  delete(id: string): Promise<boolean>; // Prevents deletion if referenced in routine_items
  count(): Promise<number>;
  seedCatalogIfEmpty(): Promise<number>;
}
```

#### 6. `routineRepository.ts`
```typescript
export interface RoutineRepository {
  create(patientId: string, data: CreateRoutineInput): Promise<RoutineWithItems>;
  findById(id: string): Promise<RoutineWithItems | null>;
  listByPatientId(patientId: string, status?: RoutineStatus): Promise<RoutineWithItems[]>;
  update(id: string, data: UpdateRoutineInput): Promise<RoutineWithItems>;
  delete(id: string): Promise<boolean>; // Cascades routine_items
  // Item-level management
  addItem(routineId: string, item: CreateRoutineItemInput): Promise<RoutineItemWithExercise>;
  updateItem(itemId: string, item: UpdateRoutineItemInput): Promise<RoutineItem>;
  removeItem(itemId: string): Promise<boolean>;
  reorderItems(routineId: string, itemIdsInOrder: string[]): Promise<void>;
  replaceItems(routineId: string, items: CreateRoutineItemInput[]): Promise<RoutineWithItems>;
}
```
- Eager Join Pattern for Routine With Items:
  ```sql
  SELECT 
    ri.*,
    e.name AS exercise_name,
    e.apparatus AS exercise_apparatus,
    e.category AS exercise_category,
    e.level AS exercise_level,
    e.default_springs AS exercise_default_springs,
    e.postural_focus AS exercise_postural_focus
  FROM routine_items ri
  JOIN exercises e ON ri.exercise_id = e.id
  WHERE ri.routine_id = ?
  ORDER BY ri.order_index ASC;
  ```

---

## 4. Caveats

1. **SQLite PRAGMA user_version Parameter Limitation**:
   SQLite syntax does NOT allow `PRAGMA user_version = ?`. Parameterized binding fails. The value must be formatted directly as an integer literal: `PRAGMA user_version = ${version};`. Because `version` is an internal integer constant, SQL injection is completely prevented.
2. **Foreign Key Scope**:
   `PRAGMA foreign_keys = ON;` must be invoked on **every new connection**. If a secondary connection is opened without running this pragma, cascading deletions will silently fail to trigger. The centralized `configureDatabase` function mitigates this risk by guaranteeing execution on any created connection.
3. **Node.js Mock Environment for Unit Tests**:
   `expo-sqlite` relies on native binaries (Android C++ JNI / iOS Swift TurboModule). Running unit tests via standard `node --test` requires either mocking the SQLite methods or using a compatible in-memory wrapper (e.g., `better-sqlite3` or an in-memory SQL mock) in the test harness.
4. **App Startup Integration**:
   When integrating with `App.tsx`, initialization should be wrapped in an `AppLoading` or `useEffect` sequence, or integrated via Expo's `<SQLiteProvider databaseName="pilates_espaco_mulher.db" onInit={initDatabase}>`.

---

## 5. Conclusion

The modern asynchronous API of Expo SDK 57 (`expo-sqlite` ~57.0.3) provides all necessary primitives (`openDatabaseAsync`, `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`, `withTransactionAsync`) to implement a 100% offline-first, zero-backend Single Source of Truth architecture for Pilates Espaço Mulher.

The recommended design:
1. Enforces **WAL mode** and **Foreign Keys ON** via `configureDatabase`.
2. Implements atomic, sequential migrations via `PRAGMA user_version`.
3. Establishes a 7-table normalized clinical schema with cascade deletion guarantees.
4. Provides 6 fully typed CRUD repositories supporting real-time search, progressive clinical evaluation tracking, dynamic exercise creation, and routine assembly.

Downstream implementers can directly create `src/database/` files according to this blueprint.

---

## 6. Verification Method

### 6.1 Typecheck Verification
To independently verify that the TypeScript definitions compile cleanly without errors:
```bash
npm run typecheck
# Expected: Exits with code 0 (zero TypeScript errors)
```

### 6.2 Test Suite Verification
To verify existing test suites and confirm no regressions:
```bash
npm test
# Expected: 21+ tests passing, 0 failing
```

### 6.3 Database Integration Invalidation Conditions
The design is invalidated if:
- `PRAGMA foreign_keys = ON` is omitted, causing `DELETE FROM patients WHERE id = ?` to leave orphaned rows in `anamnesis` or `bioimpedance`.
- `PRAGMA user_version = ?` is called with query binding parameters, resulting in SQLite syntax exceptions.
- Patient fields include CPF, Estado Civil, or CEP (explicitly forbidden in R4).
- Exercise seeds fail to include all 6 classical apparatus categories.
