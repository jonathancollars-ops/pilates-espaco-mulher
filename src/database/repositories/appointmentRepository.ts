/**
 * Clinical Appointment Repository (Agenda Clínica)
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../../types/appointment';
import { packageRepository } from './packageRepository';

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

export const appointmentRepository = {
  /**
   * Creates a new clinical appointment.
   * If patient_name is omitted, attempts to auto-resolve from the patients table.
   */
  async create(
    data: CreateAppointmentInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment> {
    const db = explicitDb ?? (await getDatabase());
    const id = data.id || generateId();
    const now = new Date().toISOString();
    let patientName = data.patient_name?.trim();

    if (!patientName) {
      const patientRow = await db.getFirstAsync<{ name: string }>(
        'SELECT name FROM patients WHERE id = ?;',
        [data.patient_id]
      );
      patientName = patientRow?.name || 'Paciente';
    }

    const status: AppointmentStatus = data.status || 'scheduled';
    const type = data.type || 'pilates_individual';

    await db.runAsync(
      `INSERT INTO appointments (
        id, patient_id, patient_name, date, start_time, end_time,
        status, type, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.patient_id,
        patientName,
        data.date,
        data.start_time,
        data.end_time,
        status,
        type,
        data.notes ?? null,
        now,
        now,
      ]
    );

    return {
      id,
      patient_id: data.patient_id,
      patient_name: patientName,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      status,
      type,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Finds an appointment by ID.
   */
  async findById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<Appointment>(
      'SELECT * FROM appointments WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  /**
   * Lists all appointments for a specific day ordered by start_time ASC.
   */
  async listByDate(
    date: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<Appointment>(
      `SELECT * FROM appointments 
       WHERE date = ? 
       ORDER BY start_time ASC;`,
      [date]
    );
  },

  /**
   * Finds any conflicting appointments for a given date and time range.
   * Two appointments overlap if: existing.start_time < newEndTime AND existing.end_time > newStartTime.
   * Excludes cancelled appointments and optionally an appointment by ID (useful when updating).
   */
  async findConflicts(
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment[]> {
    const db = explicitDb ?? (await getDatabase());
    if (excludeAppointmentId) {
      return await db.getAllAsync<Appointment>(
        `SELECT * FROM appointments 
         WHERE date = ? 
           AND status != 'cancelled'
           AND id != ?
           AND start_time < ? 
           AND end_time > ? 
         ORDER BY start_time ASC;`,
        [date, excludeAppointmentId, endTime, startTime]
      );
    }
    return await db.getAllAsync<Appointment>(
      `SELECT * FROM appointments 
       WHERE date = ? 
         AND status != 'cancelled'
         AND start_time < ? 
         AND end_time > ? 
       ORDER BY start_time ASC;`,
      [date, endTime, startTime]
    );
  },

  /**
   * Returns true if there is a scheduling conflict for the given time slot.
   */
  async hasConflict(
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
    explicitDb?: SQLiteDatabase
  ): Promise<boolean> {
    const conflicts = await this.findConflicts(
      date,
      startTime,
      endTime,
      excludeAppointmentId,
      explicitDb
    );
    return conflicts.length > 0;
  },

  /**
   * Lists all appointments for a given month (yearMonth format: 'YYYY-MM').
   * Ordered chronologically by date ASC, start_time ASC.
   */
  async listByMonth(
    yearMonth: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment[]> {
    const db = explicitDb ?? (await getDatabase());
    const prefix = `${yearMonth.trim()}%`;
    return await db.getAllAsync<Appointment>(
      `SELECT * FROM appointments 
       WHERE date LIKE ? 
       ORDER BY date ASC, start_time ASC;`,
      [prefix]
    );
  },

  /**
   * Aggregates appointments for each day in a month, returning counts for calendar badges.
   */
  async getMonthSummary(
    yearMonth: string,
    explicitDb?: SQLiteDatabase
  ): Promise<{ date: string; count: number; attendedCount: number }[]> {
    const db = explicitDb ?? (await getDatabase());
    const prefix = `${yearMonth.trim()}%`;
    const rows = await db.getAllAsync<{ date: string; count: number; attendedCount: number }>(
      `SELECT 
        date, 
        COUNT(*) as count,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attendedCount
       FROM appointments 
       WHERE date LIKE ? AND status != 'cancelled'
       GROUP BY date 
       ORDER BY date ASC;`,
      [prefix]
    );
    return rows;
  },

  /**
   * Retrieves the current in-progress appointment and the immediate next appointment for a date.
   * Excludes cancelled and rescheduled appointments.
   */
  async getCurrentAndNext(
    currentTime: string,
    currentDate: string,
    explicitDb?: SQLiteDatabase
  ): Promise<{ current: Appointment | null; next: Appointment | null }> {
    const db = explicitDb ?? (await getDatabase());

    // 1. Current appointment: start_time <= currentTime AND end_time > currentTime
    const current = await db.getFirstAsync<Appointment>(
      `SELECT * FROM appointments 
       WHERE date = ? 
         AND start_time <= ? 
         AND end_time > ? 
         AND status NOT IN ('cancelled', 'rescheduled')
       ORDER BY start_time ASC
       LIMIT 1;`,
      [currentDate, currentTime, currentTime]
    );

    // 2. Next appointment: start_time > currentTime
    const next = await db.getFirstAsync<Appointment>(
      `SELECT * FROM appointments 
       WHERE date = ? 
         AND start_time > ? 
         AND status NOT IN ('cancelled', 'rescheduled')
       ORDER BY start_time ASC
       LIMIT 1;`,
      [currentDate, currentTime]
    );

    return {
      current: current ?? null,
      next: next ?? null,
    };
  },

  /**
   * Updates appointment status (e.g. 'attended', 'absent', 'cancelled', 'rescheduled').
   * If status changes to 'attended' and the patient has an active package,
   * automatically increments the package completed sessions inside an atomic transaction.
   */
  async updateStatus(
    id: string,
    status: AppointmentStatus,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment | null> {
    const db = explicitDb ?? (await getDatabase());
    let result: Appointment | null = null;

    await db.withTransactionAsync(async () => {
      const existing = await this.findById(id, db);
      if (!existing) return;

      const now = new Date().toISOString();

      // If transition to 'attended' is occurring, consume from active package
      if (status === 'attended' && existing.status !== 'attended') {
        const activePackage = await packageRepository.getActiveByPatientId(existing.patient_id, db);
        if (activePackage) {
          await packageRepository.incrementSession(activePackage.id, db, true);
        }
      }

      await db.runAsync(
        'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?;',
        [status, now, id]
      );

      result = {
        ...existing,
        status,
        updated_at: now,
      };
    });

    return result;
  },

  /**
   * Lists all appointments for a patient.
   */
  async listByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<Appointment>(
      'SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC, start_time DESC;',
      [patientId]
    );
  },

  /**
   * Updates an existing appointment in an atomic transaction.
   * If status transitions to 'attended', consumes from the active package plan.
   */
  async update(
    id: string,
    data: UpdateAppointmentInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Appointment | null> {
    const db = explicitDb ?? (await getDatabase());
    let result: Appointment | null = null;

    await db.withTransactionAsync(async () => {
      const existing = await this.findById(id, db);
      if (!existing) return;

      const now = new Date().toISOString();
      const patientId = data.patient_id !== undefined ? data.patient_id : existing.patient_id;
      const patientName = data.patient_name !== undefined ? data.patient_name.trim() : existing.patient_name;
      const date = data.date !== undefined ? data.date : existing.date;
      const startTime = data.start_time !== undefined ? data.start_time : existing.start_time;
      const endTime = data.end_time !== undefined ? data.end_time : existing.end_time;
      const status = data.status !== undefined ? data.status : existing.status;
      const type = data.type !== undefined ? data.type : existing.type;
      const notes = data.notes !== undefined ? data.notes : existing.notes;

      // If transition to 'attended' is occurring, consume from active package
      if (status === 'attended' && existing.status !== 'attended') {
        const activePackage = await packageRepository.getActiveByPatientId(patientId, db);
        if (activePackage) {
          await packageRepository.incrementSession(activePackage.id, db, true);
        }
      }

      await db.runAsync(
        `UPDATE appointments SET
          patient_id = ?, patient_name = ?, date = ?, start_time = ?,
          end_time = ?, status = ?, type = ?, notes = ?, updated_at = ?
         WHERE id = ?;`,
        [
          patientId,
          patientName,
          date,
          startTime,
          endTime,
          status,
          type,
          notes ?? null,
          now,
          id,
        ]
      );

      result = {
        id,
        patient_id: patientId,
        patient_name: patientName,
        date,
        start_time: startTime,
        end_time: endTime,
        status,
        type,
        notes: notes ?? null,
        created_at: existing.created_at,
        updated_at: now,
      };
    });

    return result;
  },

  /**
   * Deletes an appointment.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const result = await db.runAsync('DELETE FROM appointments WHERE id = ?;', [id]);
    return result.changes > 0;
  },

  /**
   * Retrieves attendance statistics for a patient.
   */
  async getAttendanceStats(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<{
    total: number;
    attended: number;
    absent: number;
    cancelled: number;
    attendanceRate: number;
  }> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<{
      total: number;
      attended: number;
      absent: number;
      cancelled: number;
    }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM appointments 
       WHERE patient_id = ?;`,
      [patientId]
    );

    const total = row?.total ?? 0;
    const attended = row?.attended ?? 0;
    const absent = row?.absent ?? 0;
    const cancelled = row?.cancelled ?? 0;
    const effectiveTotal = attended + absent;
    const attendanceRate = effectiveTotal > 0 ? Math.round((attended / effectiveTotal) * 100) : 100;

    return {
      total,
      attended,
      absent,
      cancelled,
      attendanceRate,
    };
  },
};
