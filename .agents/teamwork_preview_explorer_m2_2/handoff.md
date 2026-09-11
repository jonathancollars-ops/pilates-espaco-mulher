# M2 Handoff Report: Local Backup & Restore Engine & Clinical Biometrics

**Author**: M2 Backup & Biometrics Explorer (`teamwork_preview_explorer_m2_2`)  
**Target Milestone**: M2 (SQLite SSOT, Backup Engine & Biometrics Utilities)  
**Parent Agent**: `parent` (Conversation ID: `3d5d14b3-384c-40e4-b02f-37417c3acd6c`)  
**Date**: 2026-09-11  

---

## 1. Observation

1. **System & Architectural Requirements**:
   - `ORIGINAL_REQUEST.md` (Follow-up 2026-09-11T22:01:09Z, §R2, §R4, §R5) specifies:
     - 100% Local-First architecture, offline-first, zero backend, zero login screen.
     - SQLite via `expo-sqlite` as Single Source of Truth across 7 relational tables: `patients`, `anamnesis`, `postural_evaluations`, `bioimpedance`, `exercises`, `routines`, `routine_items`.
     - Backup & Restore: Settings screen with full export and import of relational data via JSON using `expo-sharing` and `expo-file-system`.
     - Ficha de Avaliação & Bioimpedance: automatic calculations for BMI/IMC, TMB (kcal/day), ideal weight, target weight, segmental fat distribution.
     - Patient Form: Phone/WhatsApp input mask `(XX) XXXXX-XXXX`, Brazilian dates `DD/MM/YYYY`, default city/state "Rio das Ostras - RJ".
     - Exclusion of CPF, Estado Civil, and CEP from patient intake.
2. **Library Versions & API Capabilities**:
   - `package.json` specifies:
     - `"expo-sqlite": "~57.0.3"`
     - `"expo-sharing": "~57.0.19"`
     - `"expo": "~57.0.22"`
     - `"react-native": "0.86.3"`
   - `node_modules/expo-file-system/package.json` line 3 confirms `"version": "57.0.7"` is installed on disk.
   - `node_modules/expo-sqlite/build/SQLiteDatabase.d.ts` lines 94 and 274 confirm:
     - `withTransactionAsync(task: () => Promise<void>): Promise<void>`
     - `withExclusiveTransactionAsync(task: (txn: Transaction) => Promise<void>): Promise<void>`
     - `getAllAsync<T>(source: string, params?: SQLiteBindParams): Promise<T[]>`
     - `runAsync(source: string, params?: SQLiteBindParams): Promise<SQLiteRunResult>`
     - `execAsync(source: string): Promise<void>`
   - `node_modules/expo-sharing/build/Sharing.types.d.ts` lines 1-29 confirm `SharingOptions`:
     - `{ mimeType?: string; UTI?: string; dialogTitle?: string; anchor?: ... }`
     - iOS UTI for JSON is `'public.json'`, Android MIME is `'application/json'`.
   - `node_modules/expo-file-system/build/legacy/FileSystem.d.ts` lines 7-58 confirm:
     - `documentDirectory: string | null`
     - `cacheDirectory: string | null`
     - `writeAsStringAsync(fileUri: string, contents: string, options?: WritingOptions): Promise<void>`
     - `readAsStringAsync(fileUri: string, options?: ReadingOptions): Promise<string>`
3. **Database Constraints & SQLite Characteristics**:
   - In SQLite, `PRAGMA foreign_keys = ON;` is enforced per connection.
   - Importantly, SQLite does **not** permit toggling `PRAGMA foreign_keys` inside an active transaction (`withTransactionAsync`). Attempting to do so is either a no-op or ignored by the engine.
   - Therefore, foreign key integrity during deletion and restoration must be maintained strictly through **topological ordering**.
4. **Current Test & Typecheck Baseline**:
   - `npm test` executed 21 tests across 11 suites with 0 failures (`tests/**/*.test.js`).
   - `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.

---

## 2. Logic Chain

1. **Foreign Key Integrity Logic**:
   - Tables form a Directed Acyclic Graph (DAG) with dependency edges:
     - `patients` (root parent)
     - `exercises` (root parent)
     - `anamnesis` $\to$ `patients`
     - `postural_evaluations` $\to$ `patients`
     - `bioimpedance` $\to$ `patients`
     - `routines` $\to$ `patients`
     - `routine_items` $\to$ `routines` and `routine_items` $\to$ `exercises`
   - **Deletion Order** (leaf to root / reverse topological):
     `routine_items` $\to$ `routines` $\to$ `bioimpedance` $\to$ `postural_evaluations` $\to$ `anamnesis` $\to$ `exercises` $\to$ `patients`.
   - **Insertion Order** (root to leaf / topological):
     `patients` $\to$ `exercises` $\to$ `anamnesis` $\to$ `postural_evaluations` $\to$ `bioimpedance` $\to$ `routines` $\to$ `routine_items`.
   - Following this exact sequence guarantees that `PRAGMA foreign_keys = ON;` will never throw a foreign key violation during either wipe or bulk insert.
   - Furthermore, executing `PRAGMA foreign_key_check;` before finalizing the transaction provides a fail-safe verification barrier.
2. **Pre-Import In-Memory Dry Run Validation**:
   - If an imported JSON file is corrupt, truncated, or contains dangling foreign keys, inserting partial data into SQLite before failing is risky.
   - By running an in-memory referential integrity check on the parsed JSON before opening `withTransactionAsync`, any invalid backup is rejected immediately without touching the active database.
3. **Biometric Formulas Logic**:
   - **BMI/IMC**: Follows standard WHO and Brazilian ABESO/Ministério da Saúde thresholds ($<18.5$, $18.5-24.9$, $25.0-29.9$, $30.0-34.9$, $35.0-39.9$, $\ge 40.0$).
   - **BMR/TMB**: "Pilates Espaço Mulher" specializes in female clientele. Mifflin-St Jeor is the current gold standard recognized by clinical nutrition and physiotherapy:
     $$\text{TMB}_{\text{woman}} = 10 \cdot \text{weight (kg)} + 6.25 \cdot \text{height (cm)} - 5 \cdot \text{age} - 161$$
     Harris-Benedict (Roza-Shizgal 1984 revision) is provided as an alternative clinical option.
   - **Ideal Body Weight**: In physical therapy and Pilates posture rehabilitation, the BMI midpoint ($22.0\text{ kg/m}^2$) gives the most actionable clinical reference:
     $$\text{IBW} = 22.0 \cdot \left(\frac{\text{height in cm}}{100}\right)^2$$
     Devine formula is also supported for comparative assessment.
   - **Target Weight**: Derived clinically from target body fat percentage and fat-free mass (FFM), ensuring patients lose fat rather than lean muscle mass.
4. **Brazilian Formatting & Timezone Logic**:
   - Phone mask must dynamically format 10-digit landlines `(XX) XXXX-XXXX` and 11-digit mobile phones `(XX) XXXXX-XXXX`.
   - Parsing dates like `"2026-09-11"` using `new Date("2026-09-11")` in Brazil (UTC-3) results in `2026-09-10T21:00:00.000-03:00`, which erroneously decrements the day to `10/09/2026`. Date formatters must either split the string by `"-"` or use UTC get methods to prevent timezone off-by-one errors.

---

## 3. Caveats

1. **No External Network Dependencies**: The backup is purely local. It does not transmit to cloud storage or any remote servers. The user controls the file destination via the native system share sheet (AirDrop, WhatsApp, Google Drive, iCloud Files).
2. **Exercise Catalog Seeding on Restore**: When restoring a backup, pre-seeded exercises may collide with custom exercises if IDs conflict. The backup schema explicitly preserves `is_custom` flags and unique IDs.
3. **Large Database Scaling**: Because SQLite database in a single-clinician practice is typically under 10,000 records, `getAllAsync` in memory is fast (<50ms) and avoids memory pressure.
4. **No caveats** that prevent immediate implementation.

---

## 4. Conclusion & Technical Design Specifications

### 4.1 Schema Specification: `EspacoMulherBackupV1`

#### JSON Schema Structure
```typescript
/**
 * Clean, portable, versioned JSON backup format for Pilates Espaço Mulher
 */
export interface EspacoMulherBackupV1 {
  metadata: {
    version: '1.0.0';
    schemaVersion: 1;
    app: 'pilates-espaco-mulher';
    appName: 'Pilates Espaço Mulher';
    professional: {
      name: 'Dra. Rogéria Collares';
      crefito: 'CREFITO 23093-F';
      clinic: 'Pilates Espaço Mulher — Costa Azul, Rio das Ostras';
      phone: '(22) 99947-4304';
    };
    exportedAt: string; // ISO 8601 UTC timestamp
    databaseVersion: number; // PRAGMA user_version
    counts: {
      patients: number;
      anamnesis: number;
      postural_evaluations: number;
      bioimpedance: number;
      exercises: number;
      routines: number;
      routine_items: number;
    };
  };
  data: {
    patients: BackupPatient[];
    anamnesis: BackupAnamnesis[];
    postural_evaluations: BackupPosturalEvaluation[];
    bioimpedance: BackupBioimpedance[];
    exercises: BackupExercise[];
    routines: BackupRoutine[];
    routine_items: BackupRoutineItem[];
  };
}

export interface BackupPatient {
  id: string;
  name: string;
  birthdate: string | null;
  age: number | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  city_state: string;
  email: string | null;
  insurance: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupAnamnesis {
  id: string;
  patient_id: string;
  lab_tests: string | null;
  medications: string | null;
  allergies: string | null;
  surgeries: string | null;
  fractures: string | null;
  luxations: string | null;
  pregnancies: string | null;
  abortions: string | null;
  physical_activity: string | null;
  pain_complaints: string | null;
  imaging_exams: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupPosturalEvaluation {
  id: string;
  patient_id: string;
  evaluation_date: string;
  head: string | null;
  shoulders: string | null;
  thales_triangle: string | null;
  knees: string | null;
  feet: string | null;
  cervical: string | null;
  lateral_shoulders: string | null;
  abdomen: string | null;
  dorsal: string | null;
  lumbar: string | null;
  pelvis: string | null;
  arch: string | null;
  scapula: string | null;
  scoliosis: string | null;
  posterior_pelvis: string | null;
  gluteal_line: string | null;
  popliteal_line: string | null;
  musculature: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupBioimpedance {
  id: string;
  patient_id: string;
  evaluation_date: string;
  weight: number;
  height: number;
  abdominal_circ: number | null;
  bmi: number;
  body_age: number | null;
  metabolic_age: number | null;
  bmr: number;
  body_fat_percent: number | null;
  visceral_fat: number | null;
  muscle_mass_kg: number | null;
  ideal_weight: number | null;
  target_weight: number | null;
  fat_arms: string | null;
  fat_trunk: string | null;
  fat_legs: string | null;
  clinical_opinion: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupExercise {
  id: string;
  name: string;
  apparatus: string;
  description: string | null;
  default_springs: string | null;
  is_custom: number;
  created_at: string;
  updated_at: string;
}

export interface BackupRoutine {
  id: string;
  patient_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupRoutineItem {
  id: string;
  routine_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  springs_resistance: string | null;
  postural_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

---

### 4.2 Local Backup & Restore Engine: `src/services/backupService.ts`

```typescript
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SQLiteDatabase } from 'expo-sqlite';
import { CLINIC_IDENTITY } from '../design-system/ClinicIdentity';
import { EspacoMulherBackupV1 } from '../types/backup';

export interface BackupExportResult {
  success: boolean;
  fileUri: string;
  filename: string;
  counts: EspacoMulherBackupV1['metadata']['counts'];
}

export interface BackupImportResult {
  success: boolean;
  restoredCounts: EspacoMulherBackupV1['metadata']['counts'];
  restoredAt: string;
}

/**
 * 1. Export entire SQLite database into structured EspacoMulherBackupV1 JSON file
 */
export async function exportDatabaseBackup(db: SQLiteDatabase): Promise<BackupExportResult> {
  const [patients, anamnesis, postural, bioimpedance, exercises, routines, routine_items] =
    await Promise.all([
      db.getAllAsync<any>('SELECT * FROM patients ORDER BY created_at ASC'),
      db.getAllAsync<any>('SELECT * FROM anamnesis ORDER BY created_at ASC'),
      db.getAllAsync<any>('SELECT * FROM postural_evaluations ORDER BY evaluation_date ASC'),
      db.getAllAsync<any>('SELECT * FROM bioimpedance ORDER BY evaluation_date ASC'),
      db.getAllAsync<any>('SELECT * FROM exercises ORDER BY apparatus, name ASC'),
      db.getAllAsync<any>('SELECT * FROM routines ORDER BY created_at ASC'),
      db.getAllAsync<any>('SELECT * FROM routine_items ORDER BY routine_id, sort_order ASC'),
    ]);

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const databaseVersion = versionRow?.user_version ?? 1;

  const counts = {
    patients: patients.length,
    anamnesis: anamnesis.length,
    postural_evaluations: postural.length,
    bioimpedance: bioimpedance.length,
    exercises: exercises.length,
    routines: routines.length,
    routine_items: routine_items.length,
  };

  const backup: EspacoMulherBackupV1 = {
    metadata: {
      version: '1.0.0',
      schemaVersion: 1,
      app: 'pilates-espaco-mulher',
      appName: 'Pilates Espaço Mulher',
      professional: {
        name: 'Dra. Rogéria Collares',
        crefito: CLINIC_IDENTITY.crefito,
        clinic: CLINIC_IDENTITY.clinicName + ' — ' + CLINIC_IDENTITY.location,
        phone: CLINIC_IDENTITY.phone,
      },
      exportedAt: new Date().toISOString(),
      databaseVersion,
      counts,
    },
    data: {
      patients,
      anamnesis,
      postural_evaluations: postural,
      bioimpedance,
      exercises,
      routines,
      routine_items,
    },
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_espaco_mulher_${timestamp}.json`;
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  const fileUri = `${baseDir}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar Backup - Pilates Espaço Mulher',
      UTI: 'public.json',
    });
  }

  return {
    success: true,
    fileUri,
    filename,
    counts,
  };
}

/**
 * 2. Validate backup structure and referential integrity (In-memory Dry Run)
 */
export function validateBackupPayload(payload: any): asserts payload is EspacoMulherBackupV1 {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Arquivo de backup corrompido ou formato inválido.');
  }

  if (payload?.metadata?.app !== 'pilates-espaco-mulher') {
    throw new Error('Arquivo incompatível: este backup não pertence ao Pilates Espaço Mulher.');
  }

  if (payload?.metadata?.schemaVersion !== 1) {
    throw new Error(`Versão de schema ${payload?.metadata?.schemaVersion} não suportada.`);
  }

  const { data } = payload;
  if (!data || typeof data !== 'object') {
    throw new Error('Conteúdo do backup inexistente ou corrompido.');
  }

  const requiredTables = [
    'patients',
    'anamnesis',
    'postural_evaluations',
    'bioimpedance',
    'exercises',
    'routines',
    'routine_items',
  ] as const;

  for (const table of requiredTables) {
    if (!Array.isArray(data[table])) {
      throw new Error(`Tabela ausente ou inválida no backup: ${table}`);
    }
  }

  // Referential integrity check: patient foreign keys
  const patientIds = new Set<string>(data.patients.map((p: any) => p.id));
  for (const a of data.anamnesis) {
    if (!patientIds.has(a.patient_id)) {
      throw new Error(`Integridade violada: Anamnese ${a.id} referencia paciente inexistente ${a.patient_id}.`);
    }
  }
  for (const p of data.postural_evaluations) {
    if (!patientIds.has(p.patient_id)) {
      throw new Error(`Integridade violada: Avaliação postural ${p.id} referencia paciente inexistente.`);
    }
  }
  for (const b of data.bioimpedance) {
    if (!patientIds.has(b.patient_id)) {
      throw new Error(`Integridade violada: Bioimpedância ${b.id} referencia paciente inexistente.`);
    }
  }
  for (const r of data.routines) {
    if (!patientIds.has(r.patient_id)) {
      throw new Error(`Integridade violada: Treino ${r.id} referencia paciente inexistente.`);
    }
  }

  // Referential integrity check: routine items foreign keys
  const routineIds = new Set<string>(data.routines.map((r: any) => r.id));
  const exerciseIds = new Set<string>(data.exercises.map((e: any) => e.id));

  for (const item of data.routine_items) {
    if (!routineIds.has(item.routine_id)) {
      throw new Error(`Integridade violada: Item de rotina referencia rotina inexistente ${item.routine_id}.`);
    }
    if (!exerciseIds.has(item.exercise_id)) {
      throw new Error(`Integridade violada: Item de rotina referencia exercício inexistente ${item.exercise_id}.`);
    }
  }
}

/**
 * 3. Import and restore database inside an isolated transaction
 */
export async function importDatabaseBackup(
  db: SQLiteDatabase,
  jsonStringOrFileUri: string
): Promise<BackupImportResult> {
  let content = jsonStringOrFileUri.trim();
  if (content.startsWith('file://') || content.startsWith('/')) {
    content = await FileSystem.readAsStringAsync(content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Falha ao decodificar arquivo JSON. O arquivo pode estar corrompido.');
  }

  validateBackupPayload(parsed);

  const { data, metadata } = parsed;

  await db.withTransactionAsync(async () => {
    // Reverse topological deletion to respect foreign keys
    await db.execAsync(`
      DELETE FROM routine_items;
      DELETE FROM routines;
      DELETE FROM bioimpedance;
      DELETE FROM postural_evaluations;
      DELETE FROM anamnesis;
      DELETE FROM exercises;
      DELETE FROM patients;
    `);

    // 1. Restore patients
    for (const p of data.patients) {
      await db.runAsync(
        `INSERT INTO patients (id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.birthdate, p.age, p.phone, p.address, p.neighborhood, p.city_state, p.email, p.insurance, p.created_at, p.updated_at]
      );
    }

    // 2. Restore exercises
    for (const e of data.exercises) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, apparatus, description, default_springs, is_custom, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.name, e.apparatus, e.description, e.default_springs, e.is_custom, e.created_at, e.updated_at]
      );
    }

    // 3. Restore anamnesis
    for (const a of data.anamnesis) {
      await db.runAsync(
        `INSERT INTO anamnesis (id, patient_id, lab_tests, medications, allergies, surgeries, fractures, luxations, pregnancies, abortions, physical_activity, pain_complaints, imaging_exams, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.patient_id, a.lab_tests, a.medications, a.allergies, a.surgeries, a.fractures, a.luxations, a.pregnancies, a.abortions, a.physical_activity, a.pain_complaints, a.imaging_exams, a.created_at, a.updated_at]
      );
    }

    // 4. Restore postural evaluations
    for (const pos of data.postural_evaluations) {
      await db.runAsync(
        `INSERT INTO postural_evaluations (id, patient_id, evaluation_date, head, shoulders, thales_triangle, knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar, pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line, popliteal_line, musculature, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pos.id, pos.patient_id, pos.evaluation_date, pos.head, pos.shoulders, pos.thales_triangle, pos.knees, pos.feet, pos.cervical, pos.lateral_shoulders, pos.abdomen, pos.dorsal, pos.lumbar, pos.pelvis, pos.arch, pos.scapula, pos.scoliosis, pos.posterior_pelvis, pos.gluteal_line, pos.popliteal_line, pos.musculature, pos.notes, pos.created_at, pos.updated_at]
      );
    }

    // 5. Restore bioimpedance
    for (const b of data.bioimpedance) {
      await db.runAsync(
        `INSERT INTO bioimpedance (id, patient_id, evaluation_date, weight, height, abdominal_circ, bmi, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat, muscle_mass_kg, ideal_weight, target_weight, fat_arms, fat_trunk, fat_legs, clinical_opinion, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.patient_id, b.evaluation_date, b.weight, b.height, b.abdominal_circ, b.bmi, b.body_age, b.metabolic_age, b.bmr, b.body_fat_percent, b.visceral_fat, b.muscle_mass_kg, b.ideal_weight, b.target_weight, b.fat_arms, b.fat_trunk, b.fat_legs, b.clinical_opinion, b.created_at, b.updated_at]
      );
    }

    // 6. Restore routines
    for (const r of data.routines) {
      await db.runAsync(
        `INSERT INTO routines (id, patient_id, name, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.patient_id, r.name, r.notes, r.created_at, r.updated_at]
      );
    }

    // 7. Restore routine items
    for (const item of data.routine_items) {
      await db.runAsync(
        `INSERT INTO routine_items (id, routine_id, exercise_id, sets, reps, springs_resistance, postural_notes, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.routine_id, item.exercise_id, item.sets, item.reps, item.springs_resistance, item.postural_notes, item.sort_order, item.created_at, item.updated_at]
      );
    }

    // Fail-safe foreign key check
    const violations = await db.getAllAsync<{ table: string; rowid: number; parent: string; fkid: number }>('PRAGMA foreign_key_check;');
    if (violations && violations.length > 0) {
      throw new Error(`Falha de integridade referencial: ${violations.length} chaves estrangeiras inválidas.`);
    }
  });

  return {
    success: true,
    restoredCounts: metadata.counts,
    restoredAt: new Date().toISOString(),
  };
}
```

---

### 4.3 Biometric Calculation Utility: `src/utils/biometrics.ts`

```typescript
import { Colors } from '../design-system/tokens';

export type BMIClassification =
  | 'Abaixo do peso'
  | 'Normal'
  | 'Sobrepeso'
  | 'Obesidade I'
  | 'Obesidade II'
  | 'Obesidade III';

export interface BMIResult {
  value: number;
  classification: BMIClassification;
  color: string;
  minNormalWeight: number;
  maxNormalWeight: number;
}

/**
 * 1. BMI / IMC Calculation: weight (kg) / ((height (cm) / 100) ** 2)
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) {
    return {
      value: 0,
      classification: 'Normal',
      color: Colors.success,
      minNormalWeight: 0,
      maxNormalWeight: 0,
    };
  }

  const heightM = heightCm / 100;
  const bmiRaw = weightKg / (heightM * heightM);
  const value = Math.round(bmiRaw * 10) / 10;

  const minNormalWeight = Math.round(18.5 * heightM * heightM * 10) / 10;
  const maxNormalWeight = Math.round(24.9 * heightM * heightM * 10) / 10;

  let classification: BMIClassification = 'Normal';
  let color = Colors.success;

  if (value < 18.5) {
    classification = 'Abaixo do peso';
    color = Colors.warning;
  } else if (value < 25.0) {
    classification = 'Normal';
    color = Colors.success;
  } else if (value < 30.0) {
    classification = 'Sobrepeso';
    color = '#D97706'; // Amber 600
  } else if (value < 35.0) {
    classification = 'Obesidade I';
    color = Colors.error;
  } else if (value < 40.0) {
    classification = 'Obesidade II';
    color = Colors.accent;
  } else {
    classification = 'Obesidade III';
    color = Colors.accent;
  }

  return {
    value,
    classification,
    color,
    minNormalWeight,
    maxNormalWeight,
  };
}

export interface BMRParams {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex?: 'female' | 'male';
  formula?: 'mifflin-st-jeor' | 'harris-benedict';
}

/**
 * 2. Basal Metabolic Rate (BMR / TMB) in kcal/day
 * Defaults to Mifflin-St Jeor and Female (Pilates Espaço Mulher demographic)
 */
export function calculateBMR({
  weightKg,
  heightCm,
  ageYears,
  sex = 'female',
  formula = 'mifflin-st-jeor',
}: BMRParams): number {
  if (!weightKg || !heightCm || !ageYears || weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    return 0;
  }

  if (formula === 'harris-benedict') {
    if (sex === 'female') {
      // Roza & Shizgal (1984) female revision
      return Math.round(
        447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears
      );
    }
    // Male revision
    return Math.round(
      88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
    );
  }

  // Mifflin-St Jeor (Default gold standard)
  if (sex === 'female') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5);
}

/**
 * 3. Ideal Body Weight (Peso Ideal)
 * Clinical BMI midpoint (22.0 kg/m2) and Devine reference
 */
export function calculateIdealWeight(heightCm: number): {
  ideal: number;
  devine: number;
  range: { min: number; max: number };
} {
  if (!heightCm || heightCm <= 0) {
    return { ideal: 0, devine: 0, range: { min: 0, max: 0 } };
  }

  const heightM = heightCm / 100;
  const ideal = Math.round(22.0 * heightM * heightM * 10) / 10;
  const min = Math.round(18.5 * heightM * heightM * 10) / 10;
  const max = Math.round(24.9 * heightM * heightM * 10) / 10;

  // Devine formula for adult female
  const devine = Math.round((45.5 + 0.9 * (heightCm - 152.4)) * 10) / 10;

  return {
    ideal,
    devine: Math.max(devine, min),
    range: { min, max },
  };
}

export interface TargetWeightParams {
  weightKg: number;
  currentFatPercent?: number | null;
  targetFatPercent?: number | null;
  heightCm?: number;
}

/**
 * 4. Target Weight (Peso Alvo)
 * Based on Fat-Free Mass preservation or Target BMI
 */
export function calculateTargetWeight({
  weightKg,
  currentFatPercent,
  targetFatPercent,
  heightCm,
}: TargetWeightParams): number {
  if (
    weightKg > 0 &&
    currentFatPercent != null &&
    currentFatPercent > 0 &&
    targetFatPercent != null &&
    targetFatPercent > 0 &&
    targetFatPercent < 100
  ) {
    const fatFreeMass = weightKg * (1 - currentFatPercent / 100);
    const target = fatFreeMass / (1 - targetFatPercent / 100);
    return Math.round(target * 10) / 10;
  }

  if (heightCm && heightCm > 0) {
    const heightM = heightCm / 100;
    return Math.round(22.0 * heightM * heightM * 10) / 10;
  }

  return weightKg;
}

export interface VisceralFatEvaluation {
  level: number;
  classification: 'Normal' | 'Elevado' | 'Muito Elevado';
  color: string;
  description: string;
}

/**
 * 5. Visceral Fat Classification (Nível de Gordura Visceral)
 */
export function classifyVisceralFat(level: number): VisceralFatEvaluation {
  if (level <= 9) {
    return {
      level,
      classification: 'Normal',
      color: Colors.success,
      description: 'Nível adequado (baixo risco cardiovascular e metabólico)',
    };
  }
  if (level <= 14) {
    return {
      level,
      classification: 'Elevado',
      color: Colors.warning,
      description: 'Atenção: gordura intra-abdominal aumentada',
    };
  }
  return {
    level,
    classification: 'Muito Elevado',
    color: Colors.accent,
    description: 'Risco cardiovascular e metabólico substancialmente aumentado',
  };
}

export interface SegmentalSymmetry {
  differenceKg: number;
  percentageDiff: number;
  status: 'Equilibrado' | 'Assimetria Leve' | 'Assimetria Significativa';
  dominantSide: 'Direito' | 'Esquerdo' | 'Simétrico';
}

/**
 * 6. Segmental Fat Asymmetry Analysis (Braço D/E e Perna D/E)
 */
export function analyzeSegmentalSymmetry(right: number, left: number): SegmentalSymmetry {
  const diff = Math.abs(right - left);
  const max = Math.max(right, left);
  const percentageDiff = max > 0 ? Math.round((diff / max) * 1000) / 10 : 0;

  let status: SegmentalSymmetry['status'] = 'Equilibrado';
  if (percentageDiff > 10) {
    status = 'Assimetria Significativa';
  } else if (percentageDiff > 5) {
    status = 'Assimetria Leve';
  }

  let dominantSide: SegmentalSymmetry['dominantSide'] = 'Simétrico';
  if (right > left) dominantSide = 'Direito';
  else if (left > right) dominantSide = 'Esquerdo';

  return {
    differenceKg: Math.round(diff * 10) / 10,
    percentageDiff,
    status,
    dominantSide,
  };
}
```

---

### 4.4 Formatting Utility: `src/utils/formatters.ts`

```typescript
/**
 * Brazilian Locale Formatters for Pilates Espaço Mulher
 */

/**
 * 1. Phone / WhatsApp Mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : '';
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    // Landline: (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Mobile: (XX) XXXXX-XXXX (capped at 11 digits)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Clean phone to pure digits
 */
export function cleanDigits(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

/**
 * Generate direct WhatsApp URL (with optional message)
 */
export function formatWhatsAppUrl(phone: string, message?: string): string {
  const digits = cleanDigits(phone);
  const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
  const baseUrl = `https://wa.me/${fullNumber}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
}

/**
 * 2. Date Formatting: DD/MM/YYYY
 * Avoids the UTC-3 midnight decrement bug when handling ISO date strings.
 */
export function formatDateBR(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    // If format is YYYY-MM-DD or starts with YYYY-MM-DD
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse DD/MM/YYYY input into ISO YYYY-MM-DD
 */
export function parseBRDateToISO(brDate: string): string | null {
  if (!brDate) return null;
  const match = brDate.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) {
    return null;
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Interactive typing mask for date inputs: DD/MM/YYYY
 */
export function maskDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Calculate age in completed years from birthdate
 */
export function calculateAge(birthdateInput: string | Date | null | undefined): number | null {
  if (!birthdateInput) return null;
  let birthDate: Date;

  if (typeof birthdateInput === 'string') {
    const isoMatch = birthdateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      birthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    } else {
      birthDate = new Date(birthdateInput);
    }
  } else {
    birthDate = birthdateInput;
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * 3. Number & Unit Formatters
 */
export function formatWeight(kg: number | null | undefined, decimals = 1): string {
  if (kg == null || isNaN(kg)) return '—';
  return `${formatDecimalBR(kg, decimals)} kg`;
}

export function formatHeight(cm: number | null | undefined): string {
  if (cm == null || isNaN(cm)) return '—';
  return `${Math.round(cm)} cm`;
}

export function formatEnergy(kcal: number | null | undefined): string {
  if (kcal == null || isNaN(kcal)) return '—';
  const rounded = Math.round(kcal);
  return `${rounded.toLocaleString('pt-BR')} kcal`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '—';
  return `${formatDecimalBR(value, decimals)}%`;
}

export function formatDecimalBR(num: number | null | undefined, decimals = 1): string {
  if (num == null || isNaN(num)) return '—';
  return num.toFixed(decimals).replace('.', ',');
}

export function parseDecimalBR(str: string): number | null {
  if (!str) return null;
  const sanitized = str.trim().replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? null : parsed;
}
```

---

## 5. Verification Method

To independently verify these designs and ensure seamless execution during implementation:

1. **Strict TypeScript Checking**:
   Run `npm run typecheck` or `npx tsc --noEmit`.
   - Invalidation Condition: Any type mismatches between table column definitions, repository signatures, or backup interfaces.
2. **Automated Unit Testing (`tests/biometrics.test.ts` & `tests/backup.test.ts`)**:
   Verify the following boundary values with automated assertions:
   - **BMI Calculation**:
     - 55 kg, 165 cm $\to$ IMC 20.2 ("Normal", `#1B5235`)
     - 75 kg, 165 cm $\to$ IMC 27.5 ("Sobrepeso", Amber)
     - 90 kg, 165 cm $\to$ IMC 33.1 ("Obesidade I", `#6A1B15`)
   - **BMR Mifflin-St Jeor**:
     - Woman: 60 kg, 165 cm, 35 years:
       $10(60) + 6.25(165) - 5(35) - 161 = 600 + 1031.25 - 175 - 161 = 1295\text{ kcal/dia}$.
     - Man: 75 kg, 175 cm, 30 years:
       $10(75) + 6.25(175) - 5(30) + 5 = 750 + 1093.75 - 150 + 5 = 1699\text{ kcal/dia}$.
   - **Formatters**:
     - Phone: `"22999474304"` $\to$ `"(22) 99947-4304"`
     - Landline: `"2227601234"` $\to$ `"(22) 2760-1234"`
     - Date: `"2026-09-11"` $\to$ `"11/09/2026"` (zero UTC shift)
     - Decimal: `65.5` $\to$ `"65,5 kg"`
   - **Backup Validation & Transaction Integrity**:
     - Empty or missing `app: "pilates-espaco-mulher"` raises validation error.
     - Orphan `routine_items` without valid `exercise_id` raises validation error before database write.
     - Successful export $\to$ import cycle restores exact record counts without foreign key violations.
