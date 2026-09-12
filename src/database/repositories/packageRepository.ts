/**
 * Package Plan Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  PackagePlan,
  CreatePackageInput,
  UpdatePackageInput,
} from '../../types/package';

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

export const packageRepository = {
  /**
   * Creates a new session package plan.
   */
  async create(
    data: CreatePackageInput,
    explicitDb?: SQLiteDatabase
  ): Promise<PackagePlan> {
    const db = explicitDb ?? (await getDatabase());
    const id = data.id || generateId();
    const now = new Date().toISOString();
    const completedSessions = data.completed_sessions ?? 0;
    const status = data.status ?? (completedSessions >= data.total_sessions ? 'completed' : 'active');

    await db.runAsync(
      `INSERT INTO package_plans (
        id, patient_id, total_sessions, completed_sessions,
        start_date, expiration_date, status, price_cents, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.patient_id,
        data.total_sessions,
        completedSessions,
        data.start_date,
        data.expiration_date ?? null,
        status,
        data.price_cents ?? null,
        data.notes ?? null,
        now,
        now,
      ]
    );

    return {
      id,
      patient_id: data.patient_id,
      total_sessions: data.total_sessions,
      completed_sessions: completedSessions,
      start_date: data.start_date,
      expiration_date: data.expiration_date ?? null,
      status,
      price_cents: data.price_cents ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Finds a package by ID.
   */
  async findById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PackagePlan | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<PackagePlan>(
      'SELECT * FROM package_plans WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  /**
   * Retrieves the currently active package for a patient, if one exists.
   * If the package is expired or sessions are exhausted, returns null.
   */
  async getActiveByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PackagePlan | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<PackagePlan>(
      `SELECT * FROM package_plans 
       WHERE patient_id = ? AND status = 'active'
       ORDER BY start_date ASC, created_at ASC
       LIMIT 1;`,
      [patientId]
    );

    if (!row) return null;

    // Check if sessions are already completed
    if (row.completed_sessions >= row.total_sessions) {
      // Auto-update status to completed
      await this.update(row.id, { status: 'completed' }, db);
      return null;
    }

    return row;
  },

  /**
   * Atomically increments the completed sessions count of a package.
   * If completed sessions reach or exceed total sessions, marks status as 'completed'.
   * When inExistingTransaction is true, executes within the caller's active transaction.
   */
  async incrementSession(
    packageId: string,
    explicitDb?: SQLiteDatabase,
    inExistingTransaction: boolean = false
  ): Promise<PackagePlan | null> {
    const db = explicitDb ?? (await getDatabase());
    let updatedPlan: PackagePlan | null = null;

    const executeOperation = async () => {
      const existing = await this.findById(packageId, db);
      if (!existing) return;

      const newCompleted = existing.completed_sessions + 1;
      const newStatus = newCompleted >= existing.total_sessions ? 'completed' : existing.status;
      const now = new Date().toISOString();

      await db.runAsync(
        `UPDATE package_plans 
         SET completed_sessions = ?, status = ?, updated_at = ?
         WHERE id = ?;`,
        [newCompleted, newStatus, now, packageId]
      );

      updatedPlan = {
        ...existing,
        completed_sessions: newCompleted,
        status: newStatus,
        updated_at: now,
      };
    };

    if (inExistingTransaction) {
      await executeOperation();
    } else {
      await db.withTransactionAsync(executeOperation);
    }

    return updatedPlan;
  },

  /**
   * Lists all packages for a patient.
   */
  async listByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<PackagePlan[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<PackagePlan>(
      'SELECT * FROM package_plans WHERE patient_id = ? ORDER BY start_date DESC, created_at DESC;',
      [patientId]
    );
  },

  /**
   * Updates an existing package.
   */
  async update(
    id: string,
    data: UpdatePackageInput,
    explicitDb?: SQLiteDatabase
  ): Promise<PackagePlan | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

    const now = new Date().toISOString();
    const totalSessions = data.total_sessions !== undefined ? data.total_sessions : existing.total_sessions;
    const completedSessions = data.completed_sessions !== undefined ? data.completed_sessions : existing.completed_sessions;
    const startDate = data.start_date !== undefined ? data.start_date : existing.start_date;
    const expirationDate = data.expiration_date !== undefined ? data.expiration_date : existing.expiration_date;
    let status = data.status !== undefined ? data.status : existing.status;
    const priceCents = data.price_cents !== undefined ? data.price_cents : existing.price_cents;
    const notes = data.notes !== undefined ? data.notes : existing.notes;

    if (data.status === undefined && completedSessions >= totalSessions && status === 'active') {
      status = 'completed';
    }

    await db.runAsync(
      `UPDATE package_plans SET
        total_sessions = ?, completed_sessions = ?, start_date = ?,
        expiration_date = ?, status = ?, price_cents = ?, notes = ?, updated_at = ?
       WHERE id = ?;`,
      [
        totalSessions,
        completedSessions,
        startDate,
        expirationDate ?? null,
        status,
        priceCents ?? null,
        notes ?? null,
        now,
        id,
      ]
    );

    return {
      ...existing,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      start_date: startDate,
      expiration_date: expirationDate ?? null,
      status,
      price_cents: priceCents ?? null,
      notes: notes ?? null,
      updated_at: now,
    };
  },

  /**
   * Deletes a package.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const result = await db.runAsync('DELETE FROM package_plans WHERE id = ?;', [id]);
    return result.changes > 0;
  },

  /**
   * Lists all packages in the database.
   */
  async listAll(explicitDb?: SQLiteDatabase): Promise<PackagePlan[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<PackagePlan>(
      'SELECT * FROM package_plans ORDER BY updated_at DESC;'
    );
  },

  /**
   * Lists all active packages in the database.
   */
  async listAllActive(explicitDb?: SQLiteDatabase): Promise<PackagePlan[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<PackagePlan>(
      "SELECT * FROM package_plans WHERE status = 'active' ORDER BY updated_at DESC;"
    );
  },

  /**
   * Lists all packages joined with patient details.
   */
  async listAllWithPatient(
    explicitDb?: SQLiteDatabase
  ): Promise<(PackagePlan & { patient_name: string; patient_phone: string })[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<PackagePlan & { patient_name: string; patient_phone: string }>(
      `SELECT 
        pp.*,
        p.name AS patient_name,
        p.phone AS patient_phone
       FROM package_plans pp
       JOIN patients p ON pp.patient_id = p.id
       ORDER BY pp.status = 'active' DESC, pp.updated_at DESC;`
    );
  },
};
