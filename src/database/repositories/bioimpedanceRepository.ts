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
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export const bioimpedanceRepository = {
  /**
   * Creates a new bioimpedance record. Automatically computes BMI if omitted.
   */
  async create(
    patientId: string,
    data: CreateBioimpedanceInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Bioimpedance> {
    const db = explicitDb ?? (await getDatabase());
    const id = generateId();
    const now = new Date().toISOString();
    const bmi = data.bmi !== undefined ? data.bmi : computeBmi(data.weight, data.height);

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
        data.evaluation_date,
        data.weight,
        data.height,
        data.abdominal_circ ?? null,
        bmi,
        data.chronological_age ?? null,
        data.body_age ?? null,
        data.metabolic_age ?? null,
        data.bmr ?? null,
        data.body_fat_percent,
        data.visceral_fat,
        data.muscle_mass_kg,
        data.body_water_pct ?? null,
        data.ideal_weight ?? null,
        data.target_weight ?? null,
        data.fat_arm_r ?? null,
        data.fat_arm_l ?? null,
        data.fat_trunk ?? null,
        data.fat_leg_r ?? null,
        data.fat_leg_l ?? null,
        data.clinical_opinion ?? null,
        now,
        now,
      ]
    );

    return {
      id,
      patient_id: patientId,
      evaluation_date: data.evaluation_date,
      weight: data.weight,
      height: data.height,
      abdominal_circ: data.abdominal_circ ?? null,
      bmi,
      chronological_age: data.chronological_age ?? null,
      body_age: data.body_age ?? null,
      metabolic_age: data.metabolic_age ?? null,
      bmr: data.bmr ?? null,
      body_fat_percent: data.body_fat_percent,
      visceral_fat: data.visceral_fat,
      muscle_mass_kg: data.muscle_mass_kg,
      body_water_pct: data.body_water_pct ?? null,
      ideal_weight: data.ideal_weight ?? null,
      target_weight: data.target_weight ?? null,
      fat_arm_r: data.fat_arm_r ?? null,
      fat_arm_l: data.fat_arm_l ?? null,
      fat_trunk: data.fat_trunk ?? null,
      fat_leg_r: data.fat_leg_r ?? null,
      fat_leg_l: data.fat_leg_l ?? null,
      clinical_opinion: data.clinical_opinion ?? null,
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
    const params: any[] = [patientId];
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return await db.getAllAsync<Bioimpedance>(sql, params);
  },

  /**
   * Updates an existing bioimpedance record.
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
    const weight = data.weight !== undefined ? data.weight : existing.weight;
    const height = data.height !== undefined ? data.height : existing.height;
    const bmi = data.bmi !== undefined ? data.bmi : computeBmi(weight, height);

    const updated: Bioimpedance = {
      ...existing,
      ...data,
      weight,
      height,
      bmi,
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
        updated.evaluation_date,
        updated.weight,
        updated.height,
        updated.abdominal_circ ?? null,
        updated.bmi,
        updated.chronological_age ?? null,
        updated.body_age ?? null,
        updated.metabolic_age ?? null,
        updated.bmr ?? null,
        updated.body_fat_percent,
        updated.visceral_fat,
        updated.muscle_mass_kg,
        updated.body_water_pct ?? null,
        updated.ideal_weight ?? null,
        updated.target_weight ?? null,
        updated.fat_arm_r ?? null,
        updated.fat_arm_l ?? null,
        updated.fat_trunk ?? null,
        updated.fat_leg_r ?? null,
        updated.fat_leg_l ?? null,
        updated.clinical_opinion ?? null,
        updated.updated_at,
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
