/**
 * Patient Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Strict clinical requirements:
 * - NO CPF, NO CEP (strictly forbidden for LGPD compliance).
 * - marital_status (Estado Civil) included with medical confidentiality.
 * - city_state defaults to 'Rio das Ostras - RJ'.
 * - Instant search by name and phone.
 * - Cascading deletion to all child evaluations, routines, and physical photos on disk.
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
  PatientFilterOptions,
  PatientStatus,
} from '../../types/patient';
import {
  savePatientAvatar,
  deleteLocalPhoto,
  AVATARS_DIR,
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

export const patientRepository = {
  /**
   * Creates a new patient record.
   * Ensures default city_state is 'Rio das Ostras - RJ' if omitted.
   * Persists temporary avatar URI into sandboxed document storage.
   */
  async create(data: CreatePatientInput, explicitDb?: SQLiteDatabase): Promise<Patient> {
    const db = explicitDb ?? (await getDatabase());
    const id = data.id || generateId();
    const now = new Date().toISOString();
    const city_state = (data.city_state && data.city_state.trim().length > 0)
      ? data.city_state.trim()
      : 'Rio das Ostras - RJ';
    const status: PatientStatus = data.status || 'active';

    let avatar_uri = data.avatar_uri ?? null;
    if (avatar_uri && !avatar_uri.startsWith(AVATARS_DIR) && !avatar_uri.includes('/avatars/')) {
      try {
        avatar_uri = await savePatientAvatar(id, avatar_uri);
      } catch {
        // Fallback to original URI if copy fails in mock or non-filesystem environment
      }
    }

    await db.runAsync(
      `INSERT INTO patients (
        id, name, birthdate, age, phone, address, neighborhood,
        city_state, email, insurance, profession, activity_time,
        marital_status, avatar_uri, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.name.trim(),
        data.birthdate ?? null,
        data.age ?? null,
        data.phone.trim(),
        data.address ?? null,
        data.neighborhood ?? null,
        city_state,
        data.email ?? null,
        data.insurance ?? null,
        data.profession ?? null,
        data.activity_time ?? null,
        data.marital_status ?? null,
        avatar_uri,
        status,
        now,
        now,
      ]
    );

    return {
      id,
      name: data.name.trim(),
      birthdate: data.birthdate ?? null,
      age: data.age ?? null,
      phone: data.phone.trim(),
      address: data.address ?? null,
      neighborhood: data.neighborhood ?? null,
      city_state,
      email: data.email ?? null,
      insurance: data.insurance ?? null,
      profession: data.profession ?? null,
      activity_time: data.activity_time ?? null,
      marital_status: data.marital_status ?? null,
      avatar_uri,
      status,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Finds a patient by unique ID.
   */
  async findById(id: string, explicitDb?: SQLiteDatabase): Promise<Patient | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<Patient>(
      'SELECT * FROM patients WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  /**
   * Updates an existing patient record.
   * Cleans up old avatar file if replaced/removed, and copies temporary avatar to documents.
   */
  async update(
    id: string,
    data: UpdatePatientInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Patient | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

    let newAvatarUri = data.avatar_uri !== undefined ? data.avatar_uri : existing.avatar_uri;
    if (data.avatar_uri !== undefined && data.avatar_uri !== existing.avatar_uri) {
      if (existing.avatar_uri) {
        await deleteLocalPhoto(existing.avatar_uri);
      }
      if (data.avatar_uri && !data.avatar_uri.startsWith(AVATARS_DIR) && !data.avatar_uri.includes('/avatars/')) {
        try {
          newAvatarUri = await savePatientAvatar(id, data.avatar_uri);
        } catch {
          // Fallback to provided URI if copy fails
        }
      }
    }

    const now = new Date().toISOString();
    const updated: Patient = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      birthdate: data.birthdate !== undefined ? data.birthdate : existing.birthdate,
      age: data.age !== undefined ? data.age : existing.age,
      phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
      address: data.address !== undefined ? data.address : existing.address,
      neighborhood: data.neighborhood !== undefined ? data.neighborhood : existing.neighborhood,
      city_state: data.city_state !== undefined ? data.city_state : existing.city_state,
      email: data.email !== undefined ? data.email : existing.email,
      insurance: data.insurance !== undefined ? data.insurance : existing.insurance,
      profession: data.profession !== undefined ? data.profession : existing.profession,
      activity_time: data.activity_time !== undefined ? data.activity_time : existing.activity_time,
      marital_status: data.marital_status !== undefined ? data.marital_status : existing.marital_status,
      avatar_uri: newAvatarUri,
      status: data.status !== undefined ? data.status : existing.status,
      updated_at: now,
    };

    await db.runAsync(
      `UPDATE patients SET
        name = ?, birthdate = ?, age = ?, phone = ?, address = ?,
        neighborhood = ?, city_state = ?, email = ?, insurance = ?,
        profession = ?, activity_time = ?, marital_status = ?,
        avatar_uri = ?, status = ?, updated_at = ?
      WHERE id = ?;`,
      [
        updated.name,
        updated.birthdate ?? null,
        updated.age ?? null,
        updated.phone,
        updated.address ?? null,
        updated.neighborhood ?? null,
        updated.city_state,
        updated.email ?? null,
        updated.insurance ?? null,
        updated.profession ?? null,
        updated.activity_time ?? null,
        updated.marital_status ?? null,
        updated.avatar_uri ?? null,
        updated.status,
        updated.updated_at,
        id,
      ]
    );

    return updated;
  },

  /**
   * Deletes a patient.
   * Cleans up local avatar and condition photo files to avoid orphan files.
   * With PRAGMA foreign_keys = ON, this cascades to:
   * anamnesis, postural_evaluations, bioimpedance, routines, appointments, package_plans, and patient_condition_photos.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (existing?.avatar_uri) {
      await deleteLocalPhoto(existing.avatar_uri);
    }

    // Clean up condition photos associated with this patient from local storage
    try {
      const photos = await db.getAllAsync<{ photo_uri: string }>(
        'SELECT photo_uri FROM patient_condition_photos WHERE patient_id = ?;',
        [id]
      );
      if (Array.isArray(photos)) {
        for (const photo of photos) {
          if (photo?.photo_uri) {
            await deleteLocalPhoto(photo.photo_uri);
          }
        }
      }
    } catch {
      // Table may not exist or query fail in mock environments
    }

    const result = await db.runAsync('DELETE FROM patients WHERE id = ?;', [id]);
    return result.changes > 0;
  },

  /**
   * Lists patients with optional filtering, sorting, and pagination.
   */
  async listAll(
    options: PatientFilterOptions = {},
    explicitDb?: SQLiteDatabase
  ): Promise<Patient[]> {
    const db = explicitDb ?? (await getDatabase());
    let sql = 'SELECT * FROM patients WHERE 1=1';
    const params: any[] = [];

    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(term, term);
    }

    sql += ' ORDER BY name COLLATE NOCASE ASC';

    if (options.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      if (options.offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    return await db.getAllAsync<Patient>(sql, params);
  },

  /**
   * Instant search by name or phone number.
   */
  async search(
    query: string,
    options: { status?: PatientStatus; limit?: number } = {},
    explicitDb?: SQLiteDatabase
  ): Promise<Patient[]> {
    return this.listAll(
      {
        search: query,
        status: options.status,
        limit: options.limit ?? 50,
      },
      explicitDb
    );
  },

  /**
   * Returns total count of registered patients.
   */
  async count(status?: PatientStatus, explicitDb?: SQLiteDatabase): Promise<number> {
    const db = explicitDb ?? (await getDatabase());
    let sql = 'SELECT COUNT(*) as count FROM patients';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    const row = await db.getFirstAsync<{ count: number }>(sql, params);
    return row?.count ?? 0;
  },
};
