/**
 * Bioimpedance Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  Bioimpedance,
  CreateBioimpedanceInput,
  UpdateBioimpedanceInput,
} from '../../types/bioimpedance';

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

function computeBmi(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm || heightCm <= 0 || !Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Defensively sanitizes an optional number input.
 * Converts NaN, empty strings, null, undefined or non-finite values to null.
 * Automatically converts Brazilian decimal commas to dots (e.g., '70,5' -> 70.5).
 * If valid number or numeric string, returns the finite number.
 */
export function sanitizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const normalized = trimmed.includes(',') ? trimmed.replace(',', '.') : trimmed;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Defensively sanitizes a required number input.
 * Converts NaN, empty strings, null, undefined or non-finite values to the fallback number.
 * Automatically converts Brazilian decimal commas to dots.
 */
export function sanitizeRequiredNumber(value: unknown, fallback: number = 0): number {
  const sanitized = sanitizeOptionalNumber(value);
  return sanitized !== null ? sanitized : fallback;
}

export const bioimpedanceRepository = {
  /**
   * Creates a new bioimpedance record. Automatically computes BMI if omitted.
   * Defensively normalizes numeric fields to avoid NaN or invalid strings.
   */
  async create(
    patientId: string,
    data: CreateBioimpedanceInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Bioimpedance> {
    const db = explicitDb ?? (await getDatabase());
    const id = generateId();
    const now = new Date().toISOString();

    const evaluation_date = (data.evaluation_date && typeof data.evaluation_date === 'string' && data.evaluation_date.trim())
      ? data.evaluation_date.trim()
      : now.split('T')[0];

    const weight = sanitizeRequiredNumber(data.weight, 0);
    const height = sanitizeRequiredNumber(data.height, 0);
    const bmi = sanitizeOptionalNumber(data.bmi) ?? computeBmi(weight, height);
    const chronological_age = sanitizeOptionalNumber(data.chronological_age);
    const body_age = sanitizeOptionalNumber(data.body_age);
    const metabolic_age = sanitizeOptionalNumber(data.metabolic_age);
    const bmr = sanitizeOptionalNumber(data.bmr);
    const abdominal_circ = sanitizeOptionalNumber(data.abdominal_circ);
    const body_fat_percent = sanitizeRequiredNumber(data.body_fat_percent, 0);
    const visceral_fat = Math.round(sanitizeRequiredNumber(data.visceral_fat, 0));
    const muscle_mass_kg = sanitizeRequiredNumber(data.muscle_mass_kg, 0);
    const muscle_mass_percent = sanitizeOptionalNumber(data.muscle_mass_percent);
    const body_water_pct = sanitizeOptionalNumber(data.body_water_pct);
    const ideal_weight = sanitizeOptionalNumber(data.ideal_weight);
    const target_weight = sanitizeOptionalNumber(data.target_weight);
    const fat_arm_r = sanitizeOptionalNumber(data.fat_arm_r);
    const fat_arm_l = sanitizeOptionalNumber(data.fat_arm_l);
    const fat_trunk = sanitizeOptionalNumber(data.fat_trunk);
    const fat_leg_r = sanitizeOptionalNumber(data.fat_leg_r);
    const fat_leg_l = sanitizeOptionalNumber(data.fat_leg_l);
    const clinical_opinion = (data.clinical_opinion !== null && data.clinical_opinion !== undefined && typeof data.clinical_opinion === 'string' && data.clinical_opinion.trim())
      ? data.clinical_opinion.trim()
      : null;

    await db.runAsync(
      `INSERT INTO bioimpedance (
        id, patient_id, evaluation_date, weight, height, abdominal_circ,
        bmi, chronological_age, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat,
        muscle_mass_kg, body_water_pct, ideal_weight, target_weight,
        fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r, fat_leg_l,
        clinical_opinion, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        patientId,
        evaluation_date,
        weight,
        height,
        abdominal_circ,
        bmi,
        chronological_age,
        body_age,
        metabolic_age,
        bmr,
        body_fat_percent,
        visceral_fat,
        muscle_mass_kg,
        body_water_pct,
        ideal_weight,
        target_weight,
        fat_arm_r,
        fat_arm_l,
        fat_trunk,
        fat_leg_r,
        fat_leg_l,
        clinical_opinion,
        now,
        now,
      ]
    );

    return {
      id,
      patient_id: patientId,
      evaluation_date,
      weight,
      height,
      abdominal_circ,
      bmi,
      chronological_age,
      body_age,
      metabolic_age,
      bmr,
      body_fat_percent,
      visceral_fat,
      muscle_mass_kg,
      muscle_mass_percent,
      body_water_pct,
      ideal_weight,
      target_weight,
      fat_arm_r,
      fat_arm_l,
      fat_trunk,
      fat_leg_r,
      fat_leg_l,
      clinical_opinion,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Finds a bioimpedance record by ID.
   */
  async findById(
    id: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Bioimpedance | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<Bioimpedance>(
      'SELECT * FROM bioimpedance WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  /**
   * Lists all bioimpedance records for a patient in reverse chronological order.
   */
  async listByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Bioimpedance[]> {
    const db = explicitDb ?? (await getDatabase());
    return await db.getAllAsync<Bioimpedance>(
      'SELECT * FROM bioimpedance WHERE patient_id = ? ORDER BY evaluation_date DESC, created_at DESC;',
      [patientId]
    );
  },

  /**
   * Retrieves the latest bioimpedance record for a patient.
   */
  async getLatestByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Bioimpedance | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<Bioimpedance>(
      'SELECT * FROM bioimpedance WHERE patient_id = ? ORDER BY evaluation_date DESC, created_at DESC LIMIT 1;',
      [patientId]
    );
    return row ?? null;
  },

  /**
   * Retrieves chronological progression for chart generation (ordered ASC).
   */
  async getHistory(
    patientId: string,
    limit?: number,
    explicitDb?: SQLiteDatabase
  ): Promise<Bioimpedance[]> {
    const db = explicitDb ?? (await getDatabase());
    let sql = 'SELECT * FROM bioimpedance WHERE patient_id = ? ORDER BY evaluation_date ASC, created_at ASC';
    const params: (string | number)[] = [patientId];
    if (limit && Number.isFinite(limit) && limit > 0) {
      sql += ' LIMIT ?';
      params.push(Math.floor(limit));
    }
    return await db.getAllAsync<Bioimpedance>(sql, params);
  },

  /**
   * Updates an existing bioimpedance record.
   * Ensures all biometric columns (including chronological_age, body_age, abdominal_circ, bmr, clinical_opinion)
   * are properly updated and sanitized with defensive fallbacks.
   */
  async update(
    id: string,
    data: UpdateBioimpedanceInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Bioimpedance | null> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findById(id, db);
    if (!existing) return null;

    const now = new Date().toISOString();

    const evaluation_date = data.evaluation_date !== undefined
      ? ((data.evaluation_date && typeof data.evaluation_date === 'string' && data.evaluation_date.trim())
          ? data.evaluation_date.trim()
          : existing.evaluation_date)
      : existing.evaluation_date;

    const weight = data.weight !== undefined
      ? sanitizeRequiredNumber(data.weight, existing.weight)
      : existing.weight;

    const height = data.height !== undefined
      ? sanitizeRequiredNumber(data.height, existing.height)
      : existing.height;

    const bmi = data.bmi !== undefined
      ? (sanitizeOptionalNumber(data.bmi) ?? computeBmi(weight, height))
      : (data.weight !== undefined || data.height !== undefined
          ? computeBmi(weight, height)
          : existing.bmi);

    const chronological_age = data.chronological_age !== undefined
      ? sanitizeOptionalNumber(data.chronological_age)
      : (existing.chronological_age ?? null);

    const body_age = data.body_age !== undefined
      ? sanitizeOptionalNumber(data.body_age)
      : (existing.body_age ?? null);

    const metabolic_age = data.metabolic_age !== undefined
      ? sanitizeOptionalNumber(data.metabolic_age)
      : (existing.metabolic_age ?? null);

    const bmr = data.bmr !== undefined
      ? sanitizeOptionalNumber(data.bmr)
      : (existing.bmr ?? null);

    const abdominal_circ = data.abdominal_circ !== undefined
      ? sanitizeOptionalNumber(data.abdominal_circ)
      : (existing.abdominal_circ ?? null);

    const body_fat_percent = data.body_fat_percent !== undefined
      ? sanitizeRequiredNumber(data.body_fat_percent, existing.body_fat_percent)
      : existing.body_fat_percent;

    const visceral_fat = data.visceral_fat !== undefined
      ? Math.round(sanitizeRequiredNumber(data.visceral_fat, existing.visceral_fat))
      : existing.visceral_fat;

    const muscle_mass_kg = data.muscle_mass_kg !== undefined
      ? sanitizeRequiredNumber(data.muscle_mass_kg, existing.muscle_mass_kg)
      : existing.muscle_mass_kg;

    const muscle_mass_percent = data.muscle_mass_percent !== undefined
      ? sanitizeOptionalNumber(data.muscle_mass_percent)
      : (existing.muscle_mass_percent ?? null);

    const body_water_pct = data.body_water_pct !== undefined
      ? sanitizeOptionalNumber(data.body_water_pct)
      : (existing.body_water_pct ?? null);

    const ideal_weight = data.ideal_weight !== undefined
      ? sanitizeOptionalNumber(data.ideal_weight)
      : (existing.ideal_weight ?? null);

    const target_weight = data.target_weight !== undefined
      ? sanitizeOptionalNumber(data.target_weight)
      : (existing.target_weight ?? null);

    const fat_arm_r = data.fat_arm_r !== undefined
      ? sanitizeOptionalNumber(data.fat_arm_r)
      : (existing.fat_arm_r ?? null);

    const fat_arm_l = data.fat_arm_l !== undefined
      ? sanitizeOptionalNumber(data.fat_arm_l)
      : (existing.fat_arm_l ?? null);

    const fat_trunk = data.fat_trunk !== undefined
      ? sanitizeOptionalNumber(data.fat_trunk)
      : (existing.fat_trunk ?? null);

    const fat_leg_r = data.fat_leg_r !== undefined
      ? sanitizeOptionalNumber(data.fat_leg_r)
      : (existing.fat_leg_r ?? null);

    const fat_leg_l = data.fat_leg_l !== undefined
      ? sanitizeOptionalNumber(data.fat_leg_l)
      : (existing.fat_leg_l ?? null);

    const clinical_opinion = data.clinical_opinion !== undefined
      ? ((data.clinical_opinion !== null && typeof data.clinical_opinion === 'string' && data.clinical_opinion.trim())
          ? data.clinical_opinion.trim()
          : null)
      : (existing.clinical_opinion ?? null);

    const updated: Bioimpedance = {
      ...existing,
      evaluation_date,
      weight,
      height,
      abdominal_circ,
      bmi,
      chronological_age,
      body_age,
      metabolic_age,
      bmr,
      body_fat_percent,
      visceral_fat,
      muscle_mass_kg,
      muscle_mass_percent,
      body_water_pct,
      ideal_weight,
      target_weight,
      fat_arm_r,
      fat_arm_l,
      fat_trunk,
      fat_leg_r,
      fat_leg_l,
      clinical_opinion,
      updated_at: now,
    };

    await db.runAsync(
      `UPDATE bioimpedance SET
        evaluation_date = ?, weight = ?, height = ?, abdominal_circ = ?,
        bmi = ?, chronological_age = ?, body_age = ?, metabolic_age = ?, bmr = ?, body_fat_percent = ?,
        visceral_fat = ?, muscle_mass_kg = ?, body_water_pct = ?, ideal_weight = ?,
        target_weight = ?, fat_arm_r = ?, fat_arm_l = ?, fat_trunk = ?,
        fat_leg_r = ?, fat_leg_l = ?, clinical_opinion = ?, updated_at = ?
      WHERE id = ?;`,
      [
        evaluation_date,
        weight,
        height,
        abdominal_circ,
        bmi,
        chronological_age,
        body_age,
        metabolic_age,
        bmr,
        body_fat_percent,
        visceral_fat,
        muscle_mass_kg,
        body_water_pct,
        ideal_weight,
        target_weight,
        fat_arm_r,
        fat_arm_l,
        fat_trunk,
        fat_leg_r,
        fat_leg_l,
        clinical_opinion,
        now,
        id,
      ]
    );

    return updated;
  },

  /**
   * Deletes a bioimpedance record.
   */
  async delete(id: string, explicitDb?: SQLiteDatabase): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const result = await db.runAsync('DELETE FROM bioimpedance WHERE id = ?;', [id]);
    return result.changes > 0;
  },
};
