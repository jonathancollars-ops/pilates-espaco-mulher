/**
 * Postural Evaluation Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  PosturalEvaluation,
  CreatePosturalInput,
  UpdatePosturalInput,
} from '../../types/postural';

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

export const posturalRepository = {
  /**
   * Creates a new postural evaluation record.
   */
  async create(
    patientId: string,
    data: CreatePosturalInput,
    explicitDb?: SQLiteDatabase
  ): Promise<PosturalEvaluation> {
    const db = explicitDb ?? (await getDatabase());
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO postural_evaluations (
        id, patient_id, evaluation_date, head, shoulders, thales_triangle,
        knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar,
        pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line,
        popliteal_line, hip_alignment, musculature, photo_frontal_uri, photo_lateral_uri,
        photo_posterior_uri, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        patientId,
        data.evaluation_date,
        data.head ?? null,
        data.shoulders ?? null,
        data.thales_triangle ?? null,
        data.knees ?? null,
        data.feet ?? null,
        data.cervical ?? null,
        data.lateral_shoulders ?? null,
        data.abdomen ?? null,
        data.dorsal ?? null,
        data.lumbar ?? null,
        data.pelvis ?? null,
        data.arch ?? null,
        data.scapula ?? null,
        data.scoliosis ?? null,
        data.posterior_pelvis ?? null,
        data.gluteal_line ?? null,
        data.popliteal_line ?? null,
        data.hip_alignment ?? null,
        data.musculature ?? null,
        data.photo_frontal_uri ?? null,
        data.photo_lateral_uri ?? null,
        data.photo_posterior_uri ?? null,
        data.notes ?? null,
        now,
        now,
      ]
    );

    return {
      id,
      patient_id: patientId,
      evaluation_date: data.evaluation_date,
      head: data.head ?? null,
      shoulders: data.shoulders ?? null,
      thales_triangle: data.thales_triangle ?? null,
      knees: data.knees ?? null,
      feet: data.feet ?? null,
      cervical: data.cervical ?? null,
      lateral_shoulders: data.lateral_shoulders ?? null,
      abdomen: data.abdomen ?? null,
      dorsal: data.dorsal ?? null,
      lumbar: data.lumbar ?? null,
      pelvis: data.pelvis ?? null,
      arch: data.arch ?? null,
      scapula: data.scapula ?? null,
      scoliosis: data.scoliosis ?? null,
      posterior_pelvis: data.posterior_pelvis ?? null,
      gluteal_line: data.gluteal_line ?? null,
      popliteal_line: data.popliteal_line ?? null,
      hip_alignment: data.hip_alignment ?? null,
      musculature: data.musculature ?? null,
      photo_frontal_uri: data.photo_frontal_uri ?? null,
      photo_lateral_uri: data.photo_lateral_uri ?? null,
      photo_posterior_uri: data.photo_posterior_uri ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Finds a postural evaluation by ID.
   */
  async findById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PosturalEvaluation | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<PosturalEvaluation>(
      'SELECT * FROM postural_evaluations WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  /**
   * Lists all postural evaluations for a patient in reverse chronological order.
   */
  async listByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PosturalEvaluation[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<PosturalEvaluation>(
      'SELECT * FROM postural_evaluations WHERE patient_id = ? ORDER BY evaluation_date DESC, created_at DESC;',
      [patientId]
    );
  },

  /**
   * Retrieves the most recent postural evaluation for a patient.
   */
  async getLatestByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PosturalEvaluation | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<PosturalEvaluation>(
      'SELECT * FROM postural_evaluations WHERE patient_id = ? ORDER BY evaluation_date DESC, created_at DESC LIMIT 1;',
      [patientId]
    );
    return row ?? null;
  },

  /**
   * Updates an existing postural evaluation.
   */
  async update(
    id: string,
    data: UpdatePosturalInput,
    explicitDb?: SQLiteDatabase
  ): Promise<PosturalEvaluation | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: PosturalEvaluation = {
      ...existing,
      ...data,
      updated_at: now,
    };

    await db.runAsync(
      `UPDATE postural_evaluations SET
        evaluation_date = ?, head = ?, shoulders = ?, thales_triangle = ?,
        knees = ?, feet = ?, cervical = ?, lateral_shoulders = ?, abdomen = ?,
        dorsal = ?, lumbar = ?, pelvis = ?, arch = ?, scapula = ?, scoliosis = ?,
        posterior_pelvis = ?, gluteal_line = ?, popliteal_line = ?, hip_alignment = ?,
        musculature = ?, photo_frontal_uri = ?, photo_lateral_uri = ?, photo_posterior_uri = ?,
        notes = ?, updated_at = ?
      WHERE id = ?;`,
      [
        updated.evaluation_date,
        updated.head ?? null,
        updated.shoulders ?? null,
        updated.thales_triangle ?? null,
        updated.knees ?? null,
        updated.feet ?? null,
        updated.cervical ?? null,
        updated.lateral_shoulders ?? null,
        updated.abdomen ?? null,
        updated.dorsal ?? null,
        updated.lumbar ?? null,
        updated.pelvis ?? null,
        updated.arch ?? null,
        updated.scapula ?? null,
        updated.scoliosis ?? null,
        updated.posterior_pelvis ?? null,
        updated.gluteal_line ?? null,
        updated.popliteal_line ?? null,
        updated.hip_alignment ?? null,
        updated.musculature ?? null,
        updated.photo_frontal_uri ?? null,
        updated.photo_lateral_uri ?? null,
        updated.photo_posterior_uri ?? null,
        updated.notes ?? null,
        updated.updated_at,
        id,
      ]
    );

    return updated;
  },

  /**
   * Deletes a postural evaluation.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const result = await db.runAsync(
      'DELETE FROM postural_evaluations WHERE id = ?;',
      [id]
    );
    return result.changes > 0;
  },
};
