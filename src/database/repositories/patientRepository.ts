/**
 * Patient Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Strict clinical requirements:
 * - NO CPF, NO Estado Civil, NO CEP.
 * - city_state defaults to 'Rio das Ostras - RJ'.
 * - Instant search by name and phone.
 * - Cascading deletion to all child evaluations and routines.
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
   */
  async create(data: CreatePatientInput, explicitDb?: SQLiteDatabase): Promise<Patient> {
    const db = explicitDb ?? (await getDatabase());
    const id = data.id || generateId();
    const now = new Date().toISOString();
    const city_state = (data.city_state && data.city_state.trim().length > 0)
      ? data.city_state.trim()
      : 'Rio das Ostras - RJ';
    const status: PatientStatus = data.status || 'active';

    await db.runAsync(
      `INSERT INTO patients (
        id, name, birthdate, age, phone, address, neighborhood,
        city_state, email, insurance, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
   */
  async update(
    id: string,
    data: UpdatePatientInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Patient | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

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
      status: data.status !== undefined ? data.status : existing.status,
      updated_at: now,
    };

    await db.runAsync(
      `UPDATE patients SET
        name = ?, birthdate = ?, age = ?, phone = ?, address = ?,
        neighborhood = ?, city_state = ?, email = ?, insurance = ?,
        status = ?, updated_at = ?
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
        updated.status,
        updated.updated_at,
        id,
      ]
    );

    return updated;
  },

  /**
   * Deletes a patient.
   * With PRAGMA foreign_keys = ON, this cascades to:
   * anamnesis, postural_evaluations, bioimpedance, and routines.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
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
