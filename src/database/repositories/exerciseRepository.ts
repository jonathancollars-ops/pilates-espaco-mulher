/**
 * Exercise Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Supports:
 * - Pre-seeded classical catalog (>30 exercises) with is_custom = 0
 * - Dynamic "+ Criar Novo" exercise creation with is_custom = 1
 * - Filter by apparatus, difficulty level, and instant search
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  Exercise,
  CreateExerciseInput,
  UpdateExerciseInput,
  ExerciseFilterOptions,
  ApparatusType,
} from '../../types/exercise';
import { seedInitialExercises } from '../seeds';

function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const exerciseRepository = {
  /**
   * Dynamically creates a new exercise.
   * By default, marks is_custom = 1 (created at runtime by the clinician).
   */
  async create(
    data: CreateExerciseInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Exercise> {
    const db = explicitDb ?? (await getDatabase());
    const id = data.id || generateId();
    const now = new Date().toISOString();
    const isCustom = data.is_custom !== undefined ? data.is_custom : 1;

    await db.runAsync(
      `INSERT INTO exercises (
        id, name, apparatus, description, default_springs,
        default_reps, default_sets, level, postural_focus,
        contraindications, is_custom, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.name.trim(),
        data.apparatus,
        data.description ?? null,
        data.default_springs ?? null,
        data.default_reps ?? '10',
        data.default_sets ?? 1,
        data.level ?? 'iniciante',
        data.postural_focus ?? null,
        data.contraindications ?? null,
        isCustom,
        now,
        now,
      ]
    );

    return {
      id,
      name: data.name.trim(),
      apparatus: data.apparatus,
      description: data.description ?? null,
      default_springs: data.default_springs ?? null,
      default_reps: data.default_reps ?? '10',
      default_sets: data.default_sets ?? 1,
      level: data.level ?? 'iniciante',
      postural_focus: data.postural_focus ?? null,
      contraindications: data.contraindications ?? null,
      is_custom: isCustom,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Finds an exercise by ID.
   */
  async findById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Exercise | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<Exercise>(
      'SELECT * FROM exercises WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  /**
   * Lists exercises with optional filtering by apparatus, search query, level, and custom flag.
   */
  async listAll(
    options: ExerciseFilterOptions = {},
    explicitDb?: SQLiteDatabase
  ): Promise<Exercise[]> {
    const db = explicitDb ?? (await getDatabase());
    let sql = 'SELECT * FROM exercises WHERE 1=1';
    const params: any[] = [];

    if (options.apparatus) {
      sql += ' AND apparatus = ?';
      params.push(options.apparatus);
    }

    if (options.level) {
      sql += ' AND level = ?';
      params.push(options.level);
    }

    if (options.isCustomOnly) {
      sql += ' AND is_custom = 1';
    }

    if (options.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      sql += ' AND (name LIKE ? OR description LIKE ? OR postural_focus LIKE ?)';
      params.push(term, term, term);
    }

    sql += ' ORDER BY apparatus ASC, name COLLATE NOCASE ASC;';

    return await db.getAllAsync<Exercise>(sql, params);
  },

  /**
   * Convenience filter by apparatus.
   */
  async listByApparatus(
    apparatus: ApparatusType,
    explicitDb?: SQLiteDatabase
  ): Promise<Exercise[]> {
    return this.listAll({ apparatus }, explicitDb);
  },

  /**
   * Search exercises by keyword across name, description, and postural focus.
   */
  async search(
    query: string,
    apparatus?: ApparatusType,
    explicitDb?: SQLiteDatabase
  ): Promise<Exercise[]> {
    return this.listAll({ search: query, apparatus }, explicitDb);
  },

  /**
   * Updates an existing exercise.
   */
  async update(
    id: string,
    data: UpdateExerciseInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Exercise | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Exercise = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      apparatus: data.apparatus !== undefined ? data.apparatus : existing.apparatus,
      description: data.description !== undefined ? data.description : existing.description,
      default_springs: data.default_springs !== undefined ? data.default_springs : existing.default_springs,
      default_reps: data.default_reps !== undefined ? data.default_reps : existing.default_reps,
      default_sets: data.default_sets !== undefined ? data.default_sets : existing.default_sets,
      level: data.level !== undefined ? data.level : existing.level,
      postural_focus: data.postural_focus !== undefined ? data.postural_focus : existing.postural_focus,
      contraindications: data.contraindications !== undefined ? data.contraindications : existing.contraindications,
      updated_at: now,
    };

    await db.runAsync(
      `UPDATE exercises SET
        name = ?, apparatus = ?, description = ?, default_springs = ?,
        default_reps = ?, default_sets = ?, level = ?, postural_focus = ?,
        contraindications = ?, updated_at = ?
      WHERE id = ?;`,
      [
        updated.name,
        updated.apparatus,
        updated.description ?? null,
        updated.default_springs ?? null,
        updated.default_reps ?? '10',
        updated.default_sets ?? 1,
        updated.level ?? 'iniciante',
        updated.postural_focus ?? null,
        updated.contraindications ?? null,
        updated.updated_at,
        id,
      ]
    );

    return updated;
  },

  /**
   * Deletes an exercise.
   * Note: If referenced in routine_items, SQLite ON DELETE RESTRICT will raise an error.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const result = await db.runAsync('DELETE FROM exercises WHERE id = ?;', [id]);
    return result.changes > 0;
  },

  /**
   * Returns total count of exercises in library.
   */
  async count(explicitDb?: SQLiteDatabase): Promise<number> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM exercises;'
    );
    return row?.count ?? 0;
  },

  /**
   * Ensures the classical catalog is seeded if the table has no exercises.
   */
  async seedCatalogIfEmpty(explicitDb?: SQLiteDatabase): Promise<number> {
    const db = explicitDb ?? (await getDatabase());
    return seedInitialExercises(db);
  },
};
