/**
 * SQLite Database Connection Singleton
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Enforces:
 * - Single Source of Truth (SSOT) 100% Local-First
 * - PRAGMA journal_mode = WAL (Write-Ahead Logging)
 * - PRAGMA foreign_keys = ON (Connection-level foreign keys constraint)
 * - Automated sequential versioned migrations
 */

import * as SQLite from 'expo-sqlite';
import { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

export const DATABASE_NAME = 'pilates_espaco_mulher.db';

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Enforces mandatory connection-level PRAGMAs:
 * - WAL journal mode for high concurrency and durability
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
 * Initializes the database for Expo's <SQLiteProvider onInit={initDatabase}>
 */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await configureDatabase(db);
  await runMigrations(db);
  dbInstance = db;
}

/**
 * Closes the active database connection.
 * Used during backup restoration or test teardown.
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

export * from './schema';
export * from './migrations';
export * from './seeds';
export * from './repositories';
