/**
 * Database Migration Engine using PRAGMA user_version
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import {
  SCHEMA_V1_DDL,
  SCHEMA_V1_INDICES,
  SCHEMA_V2_DDL,
  SCHEMA_V2_INDICES,
  SCHEMA_V3_DDL,
  SCHEMA_V3_INDICES,
} from './schema';
import { seedInitialExercises } from './seeds';

export async function addColumnIfNotExists(
  db: SQLiteDatabase,
  table: string,
  column: string,
  type: string
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
}

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'v1_initial_clinical_schema_and_seeds',
    up: async (db: SQLiteDatabase) => {
      // 1. Create all 7 relational tables
      await db.execAsync(SCHEMA_V1_DDL);
      // 2. Create performance indices
      await db.execAsync(SCHEMA_V1_INDICES);
      // 3. Seed classical Pilates catalog (49 exercises)
      await seedInitialExercises(db);
    },
  },
  {
    version: 2,
    name: 'v2_clinical_appointments_and_packages',
    up: async (db: SQLiteDatabase) => {
      // 1. Create appointments and package_plans tables
      await db.execAsync(SCHEMA_V2_DDL);
      // 2. Create performance indices
      await db.execAsync(SCHEMA_V2_INDICES);
    },
  },
  {
    version: 3,
    name: 'v3_clinical_enhancements_photos_and_profiles',
    up: async (db: SQLiteDatabase) => {
      // 1. Extend patients table
      await addColumnIfNotExists(db, 'patients', 'profession', 'TEXT');
      await addColumnIfNotExists(db, 'patients', 'activity_time', 'TEXT');
      await addColumnIfNotExists(db, 'patients', 'marital_status', 'TEXT');
      await addColumnIfNotExists(db, 'patients', 'avatar_uri', 'TEXT');

      // 2. Extend anamnesis table
      await addColumnIfNotExists(db, 'anamnesis', 'clinical_history', 'TEXT');

      // 3. Extend postural_evaluations table
      await addColumnIfNotExists(db, 'postural_evaluations', 'hip_alignment', 'TEXT');

      // 4. Extend bioimpedance table
      await addColumnIfNotExists(db, 'bioimpedance', 'chronological_age', 'INTEGER');

      // 5. Create patient_condition_photos table and indices
      await db.execAsync(SCHEMA_V3_DDL);
      await db.execAsync(SCHEMA_V3_INDICES);
    },
  },
];

/**
 * Runs all pending migrations in sequential order.
 * Wraps each migration in an atomic transaction.
 * PRAGMA user_version is updated directly after each migration.
 */
export async function runMigrations(
  db: SQLiteDatabase
): Promise<{ initialVersion: number; finalVersion: number }> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const initialVersion = versionRow?.user_version ?? 0;
  let runningVersion = initialVersion;

  for (const migration of MIGRATIONS) {
    if (migration.version > runningVersion) {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        // Note: SQLite PRAGMA user_version does not support parameter binding.
        // Validated integer interpolation is safe and required.
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
      runningVersion = migration.version;
    }
  }

  return { initialVersion, finalVersion: runningVersion };
}
