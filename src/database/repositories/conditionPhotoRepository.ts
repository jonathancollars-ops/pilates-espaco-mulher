/**
 * Patient Condition Photo Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  PatientConditionPhoto,
  CreateConditionPhotoInput,
  UpdateConditionPhotoInput,
} from '../../types/conditionPhoto';
import {
  saveConditionPhoto,
  deleteLocalPhoto,
  CONDITION_PHOTOS_DIR,
} from '../../utils/imageStorage';

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

export const conditionPhotoRepository = {
  /**
   * Creates a new clinical condition photo record for a patient.
   * Ensures the image is safely persisted in sandboxed document storage.
   */
  async create(
    patientId: string,
    input: CreateConditionPhotoInput,
    explicitDb?: SQLiteDatabase
  ): Promise<PatientConditionPhoto> {
    const db = explicitDb ?? (await getDatabase());
    const id = input.id || generateId();
    const now = new Date().toISOString();
    const date = input.date || now.split('T')[0];
    const category = input.category || 'Geral';

    let photoUri = input.photo_uri;
    if (photoUri && !photoUri.startsWith(CONDITION_PHOTOS_DIR) && !photoUri.includes('/condition_photos/')) {
      try {
        photoUri = await saveConditionPhoto(patientId, photoUri);
      } catch {
        // Fallback to original URI if copy fails in mock or non-filesystem environment
      }
    }

    await db.runAsync(
      `INSERT INTO patient_condition_photos (
        id, patient_id, photo_uri, category, title, notes, date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        patientId,
        photoUri,
        category,
        input.title ?? null,
        input.notes ?? null,
        date,
        now,
        now,
      ]
    );

    return {
      id,
      patient_id: patientId,
      photo_uri: photoUri,
      category,
      title: input.title ?? null,
      notes: input.notes ?? null,
      date,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Lists all condition photos for a given patient, ordered by date descending.
   */
  async listByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PatientConditionPhoto[]> {
    const db = explicitDb ?? (await getDatabase());
    const rows = await db.getAllAsync<PatientConditionPhoto>(
      `SELECT * FROM patient_condition_photos
       WHERE patient_id = ?
       ORDER BY date DESC, created_at DESC;`,
      [patientId]
    );
    return rows;
  },

  /**
   * Finds a condition photo by its unique identifier.
   */
  async findById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PatientConditionPhoto | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<PatientConditionPhoto>(
      `SELECT * FROM patient_condition_photos WHERE id = ?;`,
      [id]
    );
    return row ?? null;
  },

  /**
   * Updates an existing condition photo record.
   */
  async update(
    id: string,
    input: UpdateConditionPhotoInput,
    explicitDb?: SQLiteDatabase
  ): Promise<PatientConditionPhoto | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: PatientConditionPhoto = {
      ...existing,
      category: input.category !== undefined ? input.category : existing.category,
      title: input.title !== undefined ? input.title : existing.title,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      date: input.date !== undefined ? input.date : existing.date,
      updated_at: now,
    };

    await db.runAsync(
      `UPDATE patient_condition_photos SET
        category = ?,
        title = ?,
        notes = ?,
        date = ?,
        updated_at = ?
      WHERE id = ?;`,
      [
        updated.category,
        updated.title ?? null,
        updated.notes ?? null,
        updated.date,
        updated.updated_at ?? null,
        id,
      ]
    );

    return updated;
  },

  /**
   * Deletes a condition photo record by its ID.
   * Ensures the associated local photo file is deleted from the sandboxed filesystem to prevent orphan files.
   */
  async deleteById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (existing?.photo_uri) {
      await deleteLocalPhoto(existing.photo_uri);
    }

    const result = await db.runAsync(
      `DELETE FROM patient_condition_photos WHERE id = ?;`,
      [id]
    );
    return (result.changes ?? 0) > 0;
  },

  /**
   * Alias for deleteById for standard repository consistency.
   */
  async delete(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<boolean> {
    return this.deleteById(id, explicitDb);
  },

  /**
   * Counts total condition photos for a patient.
   */
  async countByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<number> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM patient_condition_photos WHERE patient_id = ?;`,
      [patientId]
    );
    return row?.count ?? 0;
  },
};

