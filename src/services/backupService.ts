/**
 * Local JSON Backup and Restore Service
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Features:
 * - 100% Offline-first local backup export and restore via JSON
 * - In-memory referential integrity dry-run validation prior to any write
 * - Topological restore inside an atomic SQLite transaction
 * - Reverse-topological wipe preventing foreign key violations
 * - Native iOS/Android sharing via expo-sharing and expo-file-system
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { EspacoMulherBackupV1 } from '../types/backup';

const CLINIC_BACKUP_IDENTITY = {
  professionalName: 'Dra. Rogéria Collares',
  crefito: 'CREFITO 23093-F',
  clinicName: 'Pilates Espaço Mulher',
  location: 'Costa Azul, Rio das Ostras - RJ',
  phone: '(22) 99947-4304',
} as const;
import { Patient } from '../types/patient';
import { Anamnesis } from '../types/anamnesis';
import { PosturalEvaluation } from '../types/postural';
import { Bioimpedance } from '../types/bioimpedance';
import { Exercise } from '../types/exercise';
import { Routine, RoutineItem } from '../types/routine';

export interface BackupExportResult {
  success: boolean;
  fileUri: string;
  filename: string;
  jsonString: string;
  counts: EspacoMulherBackupV1['metadata']['counts'];
}

export interface BackupImportResult {
  success: boolean;
  restoredCounts: EspacoMulherBackupV1['metadata']['counts'];
  restoredAt: string;
}

/**
 * Validates the backup payload structure and referential integrity (In-memory Dry Run).
 * Throws an explicit, localized error if the payload is invalid or referential constraints are violated.
 */
export function validateBackupPayload(payload: any): asserts payload is EspacoMulherBackupV1 {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Arquivo de backup corrompido ou formato JSON inválido.');
  }

  if (payload?.metadata?.app !== 'pilates-espaco-mulher') {
    throw new Error('Arquivo incompatível: este backup não pertence ao aplicativo Pilates Espaço Mulher.');
  }

  if (payload?.metadata?.schemaVersion !== 1) {
    throw new Error(`Versão de schema ${payload?.metadata?.schemaVersion} não suportada.`);
  }

  const { data } = payload;
  if (!data || typeof data !== 'object') {
    throw new Error('Conteúdo dos dados do backup inexistente ou corrompido.');
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
      throw new Error(`Tabela ausente ou formato inválido no backup: ${table}`);
    }
  }

  // 1. Referential integrity check: Patient foreign keys
  const patientIds = new Set<string>(data.patients.map((p: any) => p.id));
  for (const a of data.anamnesis) {
    if (!patientIds.has(a.patient_id)) {
      throw new Error(`Integridade referencial violada: Anamnese ${a.id} referencia paciente inexistente ${a.patient_id}.`);
    }
  }
  for (const p of data.postural_evaluations) {
    if (!patientIds.has(p.patient_id)) {
      throw new Error(`Integridade referencial violada: Avaliação postural ${p.id} referencia paciente inexistente ${p.patient_id}.`);
    }
  }
  for (const b of data.bioimpedance) {
    if (!patientIds.has(b.patient_id)) {
      throw new Error(`Integridade referencial violada: Bioimpedância ${b.id} referencia paciente inexistente ${b.patient_id}.`);
    }
  }
  for (const r of data.routines) {
    if (!patientIds.has(r.patient_id)) {
      throw new Error(`Integridade referencial violada: Rotina de treino ${r.id} referencia paciente inexistente ${r.patient_id}.`);
    }
  }

  // 2. Referential integrity check: Routine Items foreign keys
  const routineIds = new Set<string>(data.routines.map((r: any) => r.id));
  const exerciseIds = new Set<string>(data.exercises.map((e: any) => e.id));

  for (const item of data.routine_items) {
    if (!routineIds.has(item.routine_id)) {
      throw new Error(`Integridade referencial violada: Item de treino ${item.id} referencia rotina inexistente ${item.routine_id}.`);
    }
    if (!exerciseIds.has(item.exercise_id)) {
      throw new Error(`Integridade referencial violada: Item de treino ${item.id} referencia exercício inexistente ${item.exercise_id}.`);
    }
  }
}

/**
 * Exports the entire SQLite database into a portable, versioned EspacoMulherBackupV1 JSON file.
 * Automatically prompts the native OS share sheet via expo-sharing if available.
 */
export async function exportDatabaseBackup(
  explicitDb?: SQLiteDatabase
): Promise<BackupExportResult> {
  const db = explicitDb ?? (await getDatabase());

  const [patients, anamnesis, postural, bioimpedance, exercises, routines, routine_items] =
    await Promise.all([
      db.getAllAsync<Patient>('SELECT * FROM patients ORDER BY created_at ASC;'),
      db.getAllAsync<Anamnesis>('SELECT * FROM anamnesis ORDER BY created_at ASC;'),
      db.getAllAsync<PosturalEvaluation>('SELECT * FROM postural_evaluations ORDER BY evaluation_date ASC, created_at ASC;'),
      db.getAllAsync<Bioimpedance>('SELECT * FROM bioimpedance ORDER BY evaluation_date ASC, created_at ASC;'),
      db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY apparatus ASC, name ASC;'),
      db.getAllAsync<Routine>('SELECT * FROM routines ORDER BY created_at ASC;'),
      db.getAllAsync<RoutineItem>('SELECT * FROM routine_items ORDER BY routine_id ASC, sort_order ASC;'),
    ]);

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
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
        name: CLINIC_BACKUP_IDENTITY.professionalName,
        crefito: CLINIC_BACKUP_IDENTITY.crefito,
        clinic: `${CLINIC_BACKUP_IDENTITY.clinicName} — ${CLINIC_BACKUP_IDENTITY.location}`,
        phone: CLINIC_BACKUP_IDENTITY.phone,
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
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  const fileUri = `${baseDir}${filename}`;

  if (baseDir && typeof FileSystem.writeAsStringAsync === 'function') {
    try {
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
    } catch {
      // Graceful fallback in environments without file writing capabilities
    }
  }

  return {
    success: true,
    fileUri,
    filename,
    jsonString,
    counts,
  };
}

/**
 * Imports and restores an EspacoMulherBackupV1 JSON backup into the SQLite database.
 * Executes topological deletion and restoration within an atomic transaction.
 */
export async function importDatabaseBackup(
  db: SQLiteDatabase,
  jsonStringOrFileUri: string
): Promise<BackupImportResult> {
  let content = jsonStringOrFileUri.trim();

  // Read file if URI is provided and FileSystem is available
  if (
    (content.startsWith('file://') || content.startsWith('/')) &&
    typeof FileSystem.readAsStringAsync === 'function'
  ) {
    content = await FileSystem.readAsStringAsync(content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Falha ao decodificar arquivo JSON. O arquivo está corrompido ou mal formatado.');
  }

  // Pre-import dry run validation
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
        `INSERT INTO patients (
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          p.id,
          p.name,
          p.birthdate ?? null,
          p.age ?? null,
          p.phone,
          p.address ?? null,
          p.neighborhood ?? null,
          p.city_state || 'Rio das Ostras - RJ',
          p.email ?? null,
          p.insurance ?? null,
          p.status || 'active',
          p.created_at,
          p.updated_at,
        ]
      );
    }

    // 2. Restore exercises
    for (const e of data.exercises) {
      await db.runAsync(
        `INSERT INTO exercises (
          id, name, apparatus, description, default_springs,
          default_reps, default_sets, level, postural_focus,
          contraindications, is_custom, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          e.id,
          e.name,
          e.apparatus,
          e.description ?? null,
          e.default_springs ?? null,
          e.default_reps ?? '10',
          e.default_sets ?? 1,
          e.level ?? 'iniciante',
          e.postural_focus ?? null,
          e.contraindications ?? null,
          e.is_custom ?? 0,
          e.created_at,
          e.updated_at ?? e.created_at,
        ]
      );
    }

    // 3. Restore anamnesis
    for (const a of data.anamnesis) {
      const fractures = typeof a.fractures === 'object' && a.fractures !== null ? JSON.stringify(a.fractures) : (a.fractures ?? null);
      const luxations = typeof a.luxations === 'object' && a.luxations !== null ? JSON.stringify(a.luxations) : (a.luxations ?? null);
      const pregnancies = typeof a.pregnancies === 'object' && a.pregnancies !== null ? JSON.stringify(a.pregnancies) : (a.pregnancies ?? null);
      const abortions = typeof a.abortions === 'object' && a.abortions !== null ? JSON.stringify(a.abortions) : (a.abortions ?? null);
      const painComplaints = typeof a.pain_complaints === 'object' && a.pain_complaints !== null ? JSON.stringify(a.pain_complaints) : (a.pain_complaints ?? null);

      await db.runAsync(
        `INSERT INTO anamnesis (
          id, patient_id, lab_tests, medications, allergies, surgeries,
          fractures, luxations, pregnancies, abortions, physical_activity,
          pain_complaints, pain_intensity, imaging_exams, clinical_notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          a.id,
          a.patient_id,
          a.lab_tests ?? null,
          a.medications ?? null,
          a.allergies ?? null,
          a.surgeries ?? null,
          fractures,
          luxations,
          pregnancies,
          abortions,
          a.physical_activity ?? null,
          painComplaints,
          a.pain_intensity ?? 0,
          a.imaging_exams ?? null,
          a.clinical_notes ?? null,
          a.created_at,
          a.updated_at,
        ]
      );
    }

    // 4. Restore postural evaluations
    for (const pos of data.postural_evaluations) {
      await db.runAsync(
        `INSERT INTO postural_evaluations (
          id, patient_id, evaluation_date, head, shoulders, thales_triangle,
          knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar,
          pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line,
          popliteal_line, musculature, photo_frontal_uri, photo_lateral_uri,
          photo_posterior_uri, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          pos.id,
          pos.patient_id,
          pos.evaluation_date,
          pos.head ?? null,
          pos.shoulders ?? null,
          pos.thales_triangle ?? null,
          pos.knees ?? null,
          pos.feet ?? null,
          pos.cervical ?? null,
          pos.lateral_shoulders ?? null,
          pos.abdomen ?? null,
          pos.dorsal ?? null,
          pos.lumbar ?? null,
          pos.pelvis ?? null,
          pos.arch ?? null,
          pos.scapula ?? null,
          pos.scoliosis ?? null,
          pos.posterior_pelvis ?? null,
          pos.gluteal_line ?? null,
          pos.popliteal_line ?? null,
          pos.musculature ?? null,
          pos.photo_frontal_uri ?? null,
          pos.photo_lateral_uri ?? null,
          pos.photo_posterior_uri ?? null,
          pos.notes ?? null,
          pos.created_at,
          pos.updated_at,
        ]
      );
    }

    // 5. Restore bioimpedance
    for (const b of data.bioimpedance) {
      await db.runAsync(
        `INSERT INTO bioimpedance (
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat,
          muscle_mass_kg, body_water_pct, ideal_weight, target_weight,
          fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r, fat_leg_l,
          clinical_opinion, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          b.id,
          b.patient_id,
          b.evaluation_date,
          b.weight,
          b.height,
          b.abdominal_circ ?? null,
          b.bmi,
          b.body_age ?? null,
          b.metabolic_age ?? null,
          b.bmr ?? null,
          b.body_fat_percent,
          b.visceral_fat,
          b.muscle_mass_kg,
          b.body_water_pct ?? null,
          b.ideal_weight ?? null,
          b.target_weight ?? null,
          b.fat_arm_r ?? null,
          b.fat_arm_l ?? null,
          b.fat_trunk ?? null,
          b.fat_leg_r ?? null,
          b.fat_leg_l ?? null,
          b.clinical_opinion ?? null,
          b.created_at,
          b.updated_at,
        ]
      );
    }

    // 6. Restore routines
    for (const r of data.routines) {
      await db.runAsync(
        `INSERT INTO routines (id, patient_id, name, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          r.id,
          r.patient_id,
          r.name,
          r.notes ?? null,
          r.status || 'active',
          r.created_at,
          r.updated_at,
        ]
      );
    }

    // 7. Restore routine items
    for (const item of data.routine_items) {
      await db.runAsync(
        `INSERT INTO routine_items (
          id, routine_id, exercise_id, sets, reps, springs_resistance,
          postural_notes, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          item.id,
          item.routine_id,
          item.exercise_id,
          item.sets ?? 1,
          item.reps ?? '10',
          item.springs_resistance ?? null,
          item.postural_notes ?? null,
          item.sort_order ?? 0,
          item.created_at ?? new Date().toISOString(),
          item.updated_at ?? new Date().toISOString(),
        ]
      );
    }

    // Fail-safe verification of foreign keys
    const violations = await db.getAllAsync<{ table: string; rowid: number; parent: string; fkid: number }>(
      'PRAGMA foreign_key_check;'
    );
    if (violations && violations.length > 0) {
      throw new Error(`Integridade referencial violada após restauração: ${violations.length} chaves inválidas.`);
    }
  });

  return {
    success: true,
    restoredCounts: metadata.counts,
    restoredAt: new Date().toISOString(),
  };
}
