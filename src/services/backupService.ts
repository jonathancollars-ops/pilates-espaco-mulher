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
import { EspacoMulherBackupV1, BackupData } from '../types/backup';

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
import { Appointment } from '../types/appointment';
import { PackagePlan } from '../types/package';

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
 * Sanitizes text inputs to prevent null-byte injection (\0) and strip non-printable control chars,
 * while preserving standard Portuguese text, valid whitespace, accents, and punctuation.
 */
export function sanitizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value);
  // Strip null bytes and non-printable control characters (except newline, tab, carriage return)
  return str.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitizes numbers ensuring they are finite and not NaN/Infinity.
 */
export function sanitizeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Sanitizes optional numbers ensuring they are finite or null.
 */
export function sanitizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Sanitizes patient status to allowed domain values.
 */
export function sanitizePatientStatus(status: unknown): 'active' | 'archived' | 'discharged' {
  if (status === 'archived' || status === 'discharged') return status;
  return 'active';
}

/**
 * Sanitizes package plan status to allowed domain values.
 */
export function sanitizePackageStatus(status: unknown): 'active' | 'completed' | 'expired' {
  if (status === 'completed' || status === 'expired') return status;
  return 'active';
}

/**
 * Sanitizes appointment status to allowed domain values.
 */
export function sanitizeAppointmentStatus(status: unknown): 'scheduled' | 'attended' | 'cancelled' | 'absent' | 'rescheduled' {
  if (status === 'attended' || status === 'cancelled' || status === 'absent' || status === 'rescheduled') return status;
  return 'scheduled';
}

/**
 * Sanitizes appointment type to allowed domain values.
 */
export function sanitizeAppointmentType(type: unknown): 'pilates_individual' | 'pilates_group' | 'clinical_evaluation' | 'rehabilitation' {
  if (type === 'pilates_group' || type === 'clinical_evaluation' || type === 'rehabilitation') return type;
  return 'pilates_individual';
}

/**
 * Safely sanitizes JSON-encoded anamnesis clinical fields.
 */
export function sanitizeJsonField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return sanitizeText(value);
}

/**
 * Validates the schema of the BackupData payload, ensuring each relational
 * table exists and every entity is a valid object with an identifier.
 */
export function validateBackupDataSchema(data: any): asserts data is BackupData {
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

  for (let i = 0; i < requiredTables.length; i++) {
    const table = requiredTables[i];
    const rows = data[table];
    if (!Array.isArray(rows)) {
      throw new Error(`Tabela ausente ou formato inválido no backup: ${table}`);
    }
    const len = rows.length;
    for (let j = 0; j < len; j++) {
      const row = rows[j];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Registro inválido na tabela ${table}: formato de objeto esperado.`);
      }
      if (typeof row.id !== 'string' || row.id.trim() === '') {
        throw new Error(`Registro inválido na tabela ${table}: identificador id obrigatório ausente.`);
      }
    }
  }

  const optionalTables = [
    'appointments',
    'package_plans',
  ] as const;

  for (let i = 0; i < optionalTables.length; i++) {
    const table = optionalTables[i];
    const rows = data[table];
    if (rows !== undefined && rows !== null) {
      if (!Array.isArray(rows)) {
        throw new Error(`Tabela com formato inválido no backup: ${table}`);
      }
      const len = rows.length;
      for (let j = 0; j < len; j++) {
        const row = rows[j];
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new Error(`Registro inválido na tabela ${table}: formato de objeto esperado.`);
        }
        if (typeof row.id !== 'string' || row.id.trim() === '') {
          throw new Error(`Registro inválido na tabela ${table}: identificador id obrigatório ausente.`);
        }

        if (table === 'appointments') {
          // Status validation
          if (row.status !== undefined && row.status !== null) {
            const validStatuses = ['scheduled', 'attended', 'cancelled', 'absent', 'rescheduled'];
            if (typeof row.status !== 'string' || !validStatuses.includes(row.status)) {
              throw new Error(`Registro inválido na tabela appointments: status '${row.status}' não é permitido.`);
            }
          }
          // Start time validation (HH:MM 24h)
          if (row.start_time !== undefined && row.start_time !== null) {
            if (typeof row.start_time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.start_time)) {
              throw new Error(`Registro inválido na tabela appointments: start_time '${row.start_time}' deve estar no formato HH:MM (24h).`);
            }
          }
          // End time validation (HH:MM 24h)
          if (row.end_time !== undefined && row.end_time !== null) {
            if (typeof row.end_time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.end_time)) {
              throw new Error(`Registro inválido na tabela appointments: end_time '${row.end_time}' deve estar no formato HH:MM (24h).`);
            }
          }
          // Date validation (YYYY-MM-DD)
          if (row.date !== undefined && row.date !== null) {
            if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
              throw new Error(`Registro inválido na tabela appointments: date '${row.date}' deve estar no formato YYYY-MM-DD.`);
            }
          }
          // Type validation
          if (row.type !== undefined && row.type !== null) {
            const validTypes = ['pilates_individual', 'pilates_group', 'clinical_evaluation', 'rehabilitation'];
            if (typeof row.type !== 'string' || !validTypes.includes(row.type)) {
              throw new Error(`Registro inválido na tabela appointments: type '${row.type}' não é permitido.`);
            }
          }
          // Notes validation: must be string or null, must not contain null-bytes
          if (row.notes !== undefined && row.notes !== null) {
            if (typeof row.notes !== 'string' || row.notes.includes('\0')) {
              throw new Error(`Registro inválido na tabela appointments: campo notes com formato inválido ou caracteres nulos proibidos.`);
            }
          }
        }

        if (table === 'package_plans') {
          // Status validation
          if (row.status !== undefined && row.status !== null) {
            const validStatuses = ['active', 'completed', 'expired'];
            if (typeof row.status !== 'string' || !validStatuses.includes(row.status)) {
              throw new Error(`Registro inválido na tabela package_plans: status '${row.status}' não é permitido.`);
            }
          }
          // Total sessions validation
          if (row.total_sessions !== undefined && row.total_sessions !== null) {
            if (typeof row.total_sessions !== 'number' || !Number.isFinite(row.total_sessions) || row.total_sessions < 1) {
              throw new Error(`Registro inválido na tabela package_plans: total_sessions deve ser um número maior ou igual a 1.`);
            }
          }
          // Completed sessions validation
          if (row.completed_sessions !== undefined && row.completed_sessions !== null) {
            if (typeof row.completed_sessions !== 'number' || !Number.isFinite(row.completed_sessions) || row.completed_sessions < 0) {
              throw new Error(`Registro inválido na tabela package_plans: completed_sessions deve ser um número não negativo.`);
            }
          }
          // Start date validation (YYYY-MM-DD)
          if (row.start_date !== undefined && row.start_date !== null) {
            if (typeof row.start_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)) {
              throw new Error(`Registro inválido na tabela package_plans: start_date '${row.start_date}' deve estar no formato YYYY-MM-DD.`);
            }
          }
          // Expiration date validation (YYYY-MM-DD)
          if (row.expiration_date !== undefined && row.expiration_date !== null) {
            if (typeof row.expiration_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.expiration_date)) {
              throw new Error(`Registro inválido na tabela package_plans: expiration_date '${row.expiration_date}' deve estar no formato YYYY-MM-DD.`);
            }
          }
          // Notes validation: must be string or null, must not contain null-bytes
          if (row.notes !== undefined && row.notes !== null) {
            if (typeof row.notes !== 'string' || row.notes.includes('\0')) {
              throw new Error(`Registro inválido na tabela package_plans: campo notes com formato inválido ou caracteres nulos proibidos.`);
            }
          }
        }
      }
    }
  }
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
  validateBackupDataSchema(data);

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

  // Check appointments foreign keys
  if (Array.isArray(data.appointments)) {
    for (const apt of data.appointments) {
      if (!patientIds.has(apt.patient_id)) {
        throw new Error(`Integridade referencial violada: Agendamento ${apt.id} referencia paciente inexistente ${apt.patient_id}.`);
      }
    }
  }

  // Check package_plans foreign keys
  if (Array.isArray(data.package_plans)) {
    for (const pkg of data.package_plans) {
      if (!patientIds.has(pkg.patient_id)) {
        throw new Error(`Integridade referencial violada: Pacote de sessões ${pkg.id} referencia paciente inexistente ${pkg.patient_id}.`);
      }
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

  let appointments: Appointment[] = [];
  let package_plans: PackagePlan[] = [];

  try {
    const res = await db.getAllAsync<Appointment>('SELECT * FROM appointments ORDER BY date ASC, start_time ASC;');
    if (Array.isArray(res)) appointments = res;
  } catch {
    appointments = [];
  }
  try {
    const res = await db.getAllAsync<PackagePlan>('SELECT * FROM package_plans ORDER BY created_at ASC;');
    if (Array.isArray(res)) package_plans = res;
  } catch {
    package_plans = [];
  }

  const counts: EspacoMulherBackupV1['metadata']['counts'] = {
    patients: patients.length,
    anamnesis: anamnesis.length,
    postural_evaluations: postural.length,
    bioimpedance: bioimpedance.length,
    exercises: exercises.length,
    routines: routines.length,
    routine_items: routine_items.length,
  };

  const hasV2Data = databaseVersion >= 2 || appointments.length > 0 || package_plans.length > 0;
  if (hasV2Data) {
    counts.appointments = appointments.length;
    counts.package_plans = package_plans.length;
  }

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
      ...(hasV2Data ? { appointments, package_plans } : {}),
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
      DELETE FROM appointments;
      DELETE FROM package_plans;
      DELETE FROM routine_items;
      DELETE FROM routines;
      DELETE FROM bioimpedance;
      DELETE FROM postural_evaluations;
      DELETE FROM anamnesis;
      DELETE FROM exercises;
      DELETE FROM patients;
    `);

    // 1. Restore patients with strict sanitization and parameter bindings
    for (const p of data.patients) {
      await db.runAsync(
        `INSERT INTO patients (
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          sanitizeText(p.id),
          sanitizeText(p.name),
          sanitizeText(p.birthdate),
          sanitizeOptionalNumber(p.age),
          sanitizeText(p.phone),
          sanitizeText(p.address),
          sanitizeText(p.neighborhood),
          sanitizeText(p.city_state) || 'Rio das Ostras - RJ',
          sanitizeText(p.email),
          sanitizeText(p.insurance),
          sanitizePatientStatus(p.status),
          sanitizeText(p.created_at) || new Date().toISOString(),
          sanitizeText(p.updated_at) || new Date().toISOString(),
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
          sanitizeText(e.id),
          sanitizeText(e.name),
          sanitizeText(e.apparatus),
          sanitizeText(e.description),
          sanitizeText(e.default_springs),
          sanitizeText(e.default_reps) || '10',
          sanitizeNumber(e.default_sets, 1),
          sanitizeText(e.level) || 'iniciante',
          sanitizeText(e.postural_focus),
          sanitizeText(e.contraindications),
          e.is_custom ? 1 : 0,
          sanitizeText(e.created_at) || new Date().toISOString(),
          sanitizeText(e.updated_at) || sanitizeText(e.created_at) || new Date().toISOString(),
        ]
      );
    }

    // 3. Restore anamnesis
    for (const a of data.anamnesis) {
      await db.runAsync(
        `INSERT INTO anamnesis (
          id, patient_id, lab_tests, medications, allergies, surgeries,
          fractures, luxations, pregnancies, abortions, physical_activity,
          pain_complaints, pain_intensity, imaging_exams, clinical_notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          sanitizeText(a.id),
          sanitizeText(a.patient_id),
          sanitizeText(a.lab_tests),
          sanitizeText(a.medications),
          sanitizeText(a.allergies),
          sanitizeText(a.surgeries),
          sanitizeJsonField(a.fractures),
          sanitizeJsonField(a.luxations),
          sanitizeJsonField(a.pregnancies),
          sanitizeJsonField(a.abortions),
          sanitizeText(a.physical_activity),
          sanitizeJsonField(a.pain_complaints),
          Math.max(0, Math.min(10, sanitizeNumber(a.pain_intensity, 0))),
          sanitizeText(a.imaging_exams),
          sanitizeText(a.clinical_notes),
          sanitizeText(a.created_at) || new Date().toISOString(),
          sanitizeText(a.updated_at) || new Date().toISOString(),
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
          sanitizeText(pos.id),
          sanitizeText(pos.patient_id),
          sanitizeText(pos.evaluation_date),
          sanitizeText(pos.head),
          sanitizeText(pos.shoulders),
          sanitizeText(pos.thales_triangle),
          sanitizeText(pos.knees),
          sanitizeText(pos.feet),
          sanitizeText(pos.cervical),
          sanitizeText(pos.lateral_shoulders),
          sanitizeText(pos.abdomen),
          sanitizeText(pos.dorsal),
          sanitizeText(pos.lumbar),
          sanitizeText(pos.pelvis),
          sanitizeText(pos.arch),
          sanitizeText(pos.scapula),
          sanitizeText(pos.scoliosis),
          sanitizeText(pos.posterior_pelvis),
          sanitizeText(pos.gluteal_line),
          sanitizeText(pos.popliteal_line),
          sanitizeText(pos.musculature),
          sanitizeText(pos.photo_frontal_uri),
          sanitizeText(pos.photo_lateral_uri),
          sanitizeText(pos.photo_posterior_uri),
          sanitizeText(pos.notes),
          sanitizeText(pos.created_at) || new Date().toISOString(),
          sanitizeText(pos.updated_at) || new Date().toISOString(),
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
          sanitizeText(b.id),
          sanitizeText(b.patient_id),
          sanitizeText(b.evaluation_date),
          sanitizeNumber(b.weight),
          sanitizeNumber(b.height),
          sanitizeOptionalNumber(b.abdominal_circ),
          sanitizeNumber(b.bmi),
          sanitizeOptionalNumber(b.body_age),
          sanitizeOptionalNumber(b.metabolic_age),
          sanitizeOptionalNumber(b.bmr),
          sanitizeNumber(b.body_fat_percent),
          sanitizeNumber(b.visceral_fat),
          sanitizeNumber(b.muscle_mass_kg),
          sanitizeOptionalNumber(b.body_water_pct),
          sanitizeOptionalNumber(b.ideal_weight),
          sanitizeOptionalNumber(b.target_weight),
          sanitizeOptionalNumber(b.fat_arm_r),
          sanitizeOptionalNumber(b.fat_arm_l),
          sanitizeOptionalNumber(b.fat_trunk),
          sanitizeOptionalNumber(b.fat_leg_r),
          sanitizeOptionalNumber(b.fat_leg_l),
          sanitizeText(b.clinical_opinion),
          sanitizeText(b.created_at) || new Date().toISOString(),
          sanitizeText(b.updated_at) || new Date().toISOString(),
        ]
      );
    }

    // 6. Restore routines
    for (const r of data.routines) {
      await db.runAsync(
        `INSERT INTO routines (id, patient_id, name, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          sanitizeText(r.id),
          sanitizeText(r.patient_id),
          sanitizeText(r.name),
          sanitizeText(r.notes),
          sanitizeText(r.status) || 'active',
          sanitizeText(r.created_at) || new Date().toISOString(),
          sanitizeText(r.updated_at) || new Date().toISOString(),
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
          sanitizeText(item.id),
          sanitizeText(item.routine_id),
          sanitizeText(item.exercise_id),
          sanitizeNumber(item.sets, 1),
          sanitizeText(item.reps) || '10',
          sanitizeText(item.springs_resistance),
          sanitizeText(item.postural_notes),
          sanitizeNumber(item.sort_order, 0),
          sanitizeText(item.created_at) || new Date().toISOString(),
          sanitizeText(item.updated_at) || new Date().toISOString(),
        ]
      );
    }

    // 8. Restore package plans (references patients)
    if (Array.isArray(data.package_plans)) {
      for (const pkg of data.package_plans) {
        await db.runAsync(
          `INSERT INTO package_plans (
            id, patient_id, total_sessions, completed_sessions,
            start_date, expiration_date, status, price_cents, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            sanitizeText(pkg.id),
            sanitizeText(pkg.patient_id),
            Math.max(1, sanitizeNumber(pkg.total_sessions, 1)),
            Math.max(0, sanitizeNumber(pkg.completed_sessions, 0)),
            sanitizeText(pkg.start_date),
            sanitizeText(pkg.expiration_date),
            sanitizePackageStatus(pkg.status),
            sanitizeOptionalNumber(pkg.price_cents),
            sanitizeText(pkg.notes),
            sanitizeText(pkg.created_at) || new Date().toISOString(),
            sanitizeText(pkg.updated_at) || new Date().toISOString(),
          ]
        );
      }
    }

    // 9. Restore appointments (references patients)
    if (Array.isArray(data.appointments)) {
      for (const apt of data.appointments) {
        await db.runAsync(
          `INSERT INTO appointments (
            id, patient_id, patient_name, date, start_time, end_time,
            type, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            sanitizeText(apt.id),
            sanitizeText(apt.patient_id),
            sanitizeText(apt.patient_name) || '',
            sanitizeText(apt.date),
            sanitizeText(apt.start_time),
            sanitizeText(apt.end_time),
            sanitizeAppointmentType(apt.type),
            sanitizeAppointmentStatus(apt.status),
            sanitizeText(apt.notes),
            sanitizeText(apt.created_at) || new Date().toISOString(),
            sanitizeText(apt.updated_at) || new Date().toISOString(),
          ]
        );
      }
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
