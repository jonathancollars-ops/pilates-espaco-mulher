/**
 * Database Migration Engine using PRAGMA user_version
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

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
