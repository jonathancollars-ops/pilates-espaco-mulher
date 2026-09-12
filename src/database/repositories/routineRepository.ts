/**
 * Workout Routine Prescription Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  Routine,
  RoutineItem,
  RoutineWithItems,
  CreateRoutineInput,
  UpdateRoutineInput,
  CreateRoutineItemInput,
  UpdateRoutineItemInput,
  RoutineStatus,
} from '../../types/routine';
import { Exercise } from '../../types/exercise';

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

export const routineRepository = {
  /**
   * Creates a routine along with its exercise prescription items inside an atomic transaction.
   */
  async create(
    patientId: string,
    data: CreateRoutineInput,
    explicitDb?: SQLiteDatabase
  ): Promise<RoutineWithItems> {
    const db = explicitDb ?? (await getDatabase());
    const routineId = data.id || generateId();
    const now = new Date().toISOString();
    const status: RoutineStatus = data.status || 'active';

    await db.withTransactionAsync(async () => {
      // 1. Insert routine header
      await db.runAsync(
        `INSERT INTO routines (id, patient_id, name, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [routineId, patientId, data.name.trim(), data.notes ?? null, status, now, now]
      );

      // 2. Insert items if provided
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = item.id || generateId();
          const sortOrder = item.sort_order !== undefined ? item.sort_order : i;

          await db.runAsync(
            `INSERT INTO routine_items (
              id, routine_id, exercise_id, sets, reps, springs_resistance,
              postural_notes, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              itemId,
              routineId,
              item.exercise_id,
              item.sets ?? 1,
              item.reps ?? '10',
              item.springs_resistance ?? null,
              item.postural_notes ?? null,
              sortOrder,
              now,
              now,
            ]
          );
        }
      }
    });

    const created = await this.findById(routineId, db);
    return created!;
  },

  /**
   * Finds a routine by ID and eagerly loads all its prescribed exercise items with exercise metadata.
   */
  async findById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<RoutineWithItems | null> {
    const db = explicitDb ?? (await getDatabase());
    const routine = await db.getFirstAsync<Routine>(
      'SELECT * FROM routines WHERE id = ?;',
      [id]
    );

    if (!routine) return null;

    const rawItems = await db.getAllAsync<any>(
      `SELECT 
        ri.id, ri.routine_id, ri.exercise_id, ri.sets, ri.reps,
        ri.springs_resistance, ri.postural_notes, ri.sort_order,
        ri.created_at, ri.updated_at,
        e.name AS ex_name,
        e.apparatus AS ex_apparatus,
        e.description AS ex_description,
        e.default_springs AS ex_default_springs,
        e.default_reps AS ex_default_reps,
        e.default_sets AS ex_default_sets,
        e.level AS ex_level,
        e.postural_focus AS ex_postural_focus,
        e.contraindications AS ex_contraindications,
        e.is_custom AS ex_is_custom,
        e.created_at AS ex_created_at,
        e.updated_at AS ex_updated_at
      FROM routine_items ri
      LEFT JOIN exercises e ON ri.exercise_id = e.id
      WHERE ri.routine_id = ?
      ORDER BY ri.sort_order ASC, ri.created_at ASC;`,
      [id]
    );

    const items: RoutineItem[] = rawItems.map((r) => {
      const exercise: Exercise | undefined = r.ex_name
        ? {
            id: r.exercise_id,
            name: r.ex_name,
            apparatus: r.ex_apparatus,
            description: r.ex_description,
            default_springs: r.ex_default_springs,
            default_reps: r.ex_default_reps,
            default_sets: r.ex_default_sets,
            level: r.ex_level,
            postural_focus: r.ex_postural_focus,
            contraindications: r.ex_contraindications,
            is_custom: r.ex_is_custom,
            created_at: r.ex_created_at,
            updated_at: r.ex_updated_at,
          }
        : undefined;

      return {
        id: r.id,
        routine_id: r.routine_id,
        exercise_id: r.exercise_id,
        sets: r.sets,
        reps: r.reps,
        springs_resistance: r.springs_resistance,
        postural_notes: r.postural_notes,
        sort_order: r.sort_order,
        created_at: r.created_at,
        updated_at: r.updated_at,
        exercise,
      };
    });

    return {
      ...routine,
      items,
    };
  },

  /**
   * Lists all routines for a patient with eager loaded items.
   */
  async listByPatientId(
    patientId: string,
    status?: RoutineStatus,
    explicitDb?: SQLiteDatabase
  ): Promise<RoutineWithItems[]> {
    const db = explicitDb ?? (await getDatabase());
    let sql = 'SELECT * FROM routines WHERE patient_id = ?';
    const params: any[] = [patientId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC;';

    const routines = await db.getAllAsync<Routine>(sql, params);
    const result: RoutineWithItems[] = [];

    for (const r of routines) {
      const hydrated = await this.findById(r.id, db);
      if (hydrated) {
        result.push(hydrated);
      }
    }

    return result;
  },

  /**
   * Updates routine header and optionally its prescribed items inside an atomic transaction.
   */
  async update(
    id: string,
    data: UpdateRoutineInput,
    explicitDb?: SQLiteDatabase
  ): Promise<RoutineWithItems | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const updatedName = data.name !== undefined ? data.name.trim() : existing.name;
      const updatedNotes = data.notes !== undefined ? data.notes : existing.notes;
      const updatedStatus = data.status !== undefined ? data.status : existing.status;

      await db.runAsync(
        'UPDATE routines SET name = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?;',
        [updatedName, updatedNotes ?? null, updatedStatus, now, id]
      );

      // If items replacement is passed in the update payload, replace atomically
      if (data.items !== undefined) {
        await db.runAsync('DELETE FROM routine_items WHERE routine_id = ?;', [id]);
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = item.id || generateId();
          const sortOrder = item.sort_order !== undefined ? item.sort_order : i;

          await db.runAsync(
            `INSERT INTO routine_items (
              id, routine_id, exercise_id, sets, reps, springs_resistance,
              postural_notes, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              itemId,
              id,
              item.exercise_id,
              item.sets ?? 1,
              item.reps ?? '10',
              item.springs_resistance ?? null,
              item.postural_notes ?? null,
              sortOrder,
              now,
              now,
            ]
          );
        }
      }
    });

    return await this.findById(id, db);
  },

  /**
   * Deletes a routine and its exercise items inside an atomic transaction.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    let deleted = false;
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM routine_items WHERE routine_id = ?;', [id]);
      const result = await db.runAsync('DELETE FROM routines WHERE id = ?;', [id]);
      deleted = result.changes > 0;
    });
    return deleted;
  },

  /**
   * Adds an item to an existing routine.
   */
  async addItem(
    routineId: string,
    item: CreateRoutineItemInput,
    explicitDb?: SQLiteDatabase
  ): Promise<RoutineItem> {
    const db = explicitDb ?? (await getDatabase());
    const itemId = item.id || generateId();
    const now = new Date().toISOString();

    let sortOrder = item.sort_order;
    await db.withTransactionAsync(async () => {
      if (sortOrder === undefined) {
        const maxOrderRow = await db.getFirstAsync<{ maxOrder: number }>(
          'SELECT COALESCE(MAX(sort_order), -1) as maxOrder FROM routine_items WHERE routine_id = ?;',
          [routineId]
        );
        sortOrder = (maxOrderRow?.maxOrder ?? -1) + 1;
      }

      await db.runAsync(
        `INSERT INTO routine_items (
          id, routine_id, exercise_id, sets, reps, springs_resistance,
          postural_notes, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          itemId,
          routineId,
          item.exercise_id,
          item.sets ?? 1,
          item.reps ?? '10',
          item.springs_resistance ?? null,
          item.postural_notes ?? null,
          sortOrder,
          now,
          now,
        ]
      );
    });

    return {
      id: itemId,
      routine_id: routineId,
      exercise_id: item.exercise_id,
      sets: item.sets ?? 1,
      reps: item.reps ?? '10',
      springs_resistance: item.springs_resistance ?? null,
      postural_notes: item.postural_notes ?? null,
      sort_order: sortOrder ?? 0,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Updates an existing routine item.
   */
  async updateItem(
    itemId: string,
    data: UpdateRoutineItemInput,
    explicitDb?: SQLiteDatabase
  ): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: any[] = [];

    if (data.sets !== undefined) {
      fields.push('sets = ?');
      params.push(data.sets);
    }
    if (data.reps !== undefined) {
      fields.push('reps = ?');
      params.push(data.reps);
    }
    if (data.springs_resistance !== undefined) {
      fields.push('springs_resistance = ?');
      params.push(data.springs_resistance);
    }
    if (data.postural_notes !== undefined) {
      fields.push('postural_notes = ?');
      params.push(data.postural_notes);
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?');
      params.push(data.sort_order);
    }

    if (fields.length === 0) return true;

    fields.push('updated_at = ?');
    params.push(now);
    params.push(itemId);

    const sql = `UPDATE routine_items SET ${fields.join(', ')} WHERE id = ?;`;
    let updated = false;
    await db.withTransactionAsync(async () => {
      const res = await db.runAsync(sql, params);
      updated = res.changes > 0;
    });
    return updated;
  },

  /**
   * Removes an individual item from a routine inside an atomic transaction.
   */
  async removeItem(itemId: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    let removed = false;
    await db.withTransactionAsync(async () => {
      const res = await db.runAsync('DELETE FROM routine_items WHERE id = ?;', [itemId]);
      removed = res.changes > 0;
    });
    return removed;
  },

  /**
   * Reorders items according to array of item IDs.
   */
  async reorderItems(
    routineId: string,
    itemIdsInOrder: string[],
    explicitDb?: SQLiteDatabase
  ): Promise<void> {
    const db = explicitDb ?? (await getDatabase());
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < itemIdsInOrder.length; i++) {
        await db.runAsync(
          'UPDATE routine_items SET sort_order = ? WHERE id = ? AND routine_id = ?;',
          [i, itemIdsInOrder[i], routineId]
        );
      }
    });
  },

  /**
   * Replaces all items in a routine atomically.
   */
  async replaceItems(
    routineId: string,
    items: CreateRoutineItemInput[],
    explicitDb?: SQLiteDatabase
  ): Promise<RoutineWithItems> {
    const db = explicitDb ?? (await getDatabase());
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM routine_items WHERE routine_id = ?;', [routineId]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = item.id || generateId();
        await db.runAsync(
          `INSERT INTO routine_items (
            id, routine_id, exercise_id, sets, reps, springs_resistance,
            postural_notes, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            itemId,
            routineId,
            item.exercise_id,
            item.sets ?? 1,
            item.reps ?? '10',
            item.springs_resistance ?? null,
            item.postural_notes ?? null,
            item.sort_order !== undefined ? item.sort_order : i,
            now,
            now,
          ]
        );
      }
    });

    return (await this.findById(routineId, db))!;
  },
};
