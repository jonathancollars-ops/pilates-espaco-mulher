/**
 * Anamnesis Repository
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../index';
import {
  Anamnesis,
  UpsertAnamnesisInput,
  FractureEntry,
  LuxationEntry,
  PregnancyEntry,
  AbortionEntry,
  PainComplaintEntry,
} from '../../types/anamnesis';

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

function serializeField(val: any): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

function parseJsonField<T>(val: string | null | undefined): T | null {
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export const anamnesisRepository = {
  /**
   * Retrieves anamnesis record for a given patient.
   */
  async findByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<Anamnesis | null> {
    const db = explicitDb ?? (await getDatabase());
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM anamnesis WHERE patient_id = ?;',
      [patientId]
    );

    if (!row) return null;

    return {
      id: row.id,
      patient_id: row.patient_id,
      lab_tests: row.lab_tests ?? null,
      medications: row.medications ?? null,
      allergies: row.allergies ?? null,
      surgeries: row.surgeries ?? null,
      fractures: parseJsonField<FractureEntry>(row.fractures) ?? row.fractures,
      luxations: parseJsonField<LuxationEntry>(row.luxations) ?? row.luxations,
      pregnancies: parseJsonField<PregnancyEntry>(row.pregnancies) ?? row.pregnancies,
      abortions: parseJsonField<AbortionEntry>(row.abortions) ?? row.abortions,
      physical_activity: row.physical_activity ?? null,
      pain_complaints: parseJsonField<PainComplaintEntry[]>(row.pain_complaints) ?? row.pain_complaints,
      pain_intensity: row.pain_intensity ?? 0,
      imaging_exams: row.imaging_exams ?? null,
      clinical_notes: row.clinical_notes ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * Upserts anamnesis for a patient.
   * Inserts if non-existent, updates if already registered.
   */
  async upsert(
    patientId: string,
    data: UpsertAnamnesisInput,
    explicitDb?: SQLiteDatabase
  ): Promise<Anamnesis> {
    const db = explicitDb ?? (await getDatabase());
    const existing = await this.findByPatientId(patientId, db);
    const now = new Date().toISOString();

    const fracturesStr = serializeField(data.fractures);
    const luxationsStr = serializeField(data.luxations);
    const pregnanciesStr = serializeField(data.pregnancies);
    const abortionsStr = serializeField(data.abortions);
    const painComplaintsStr = serializeField(data.pain_complaints);
    const painIntensity = Math.max(0, Math.min(10, data.pain_intensity ?? 0));

    if (existing) {
      await db.runAsync(
        `UPDATE anamnesis SET
          lab_tests = ?, medications = ?, allergies = ?, surgeries = ?,
          fractures = ?, luxations = ?, pregnancies = ?, abortions = ?,
          physical_activity = ?, pain_complaints = ?, pain_intensity = ?,
          imaging_exams = ?, clinical_notes = ?, updated_at = ?
        WHERE patient_id = ?;`,
        [
          (data.lab_tests !== undefined ? data.lab_tests : existing.lab_tests) ?? null,
          (data.medications !== undefined ? data.medications : existing.medications) ?? null,
          (data.allergies !== undefined ? data.allergies : existing.allergies) ?? null,
          (data.surgeries !== undefined ? data.surgeries : existing.surgeries) ?? null,
          (data.fractures !== undefined ? fracturesStr : serializeField(existing.fractures)) ?? null,
          (data.luxations !== undefined ? luxationsStr : serializeField(existing.luxations)) ?? null,
          (data.pregnancies !== undefined ? pregnanciesStr : serializeField(existing.pregnancies)) ?? null,
          (data.abortions !== undefined ? abortionsStr : serializeField(existing.abortions)) ?? null,
          (data.physical_activity !== undefined ? data.physical_activity : existing.physical_activity) ?? null,
          (data.pain_complaints !== undefined ? painComplaintsStr : serializeField(existing.pain_complaints)) ?? null,
          (data.pain_intensity !== undefined ? painIntensity : (existing.pain_intensity ?? 0)),
          (data.imaging_exams !== undefined ? data.imaging_exams : existing.imaging_exams) ?? null,
          (data.clinical_notes !== undefined ? data.clinical_notes : existing.clinical_notes) ?? null,
          now,
          patientId,
        ]
      );
      return (await this.findByPatientId(patientId, db))!;
    } else {
      const id = generateId();
      await db.runAsync(
        `INSERT INTO anamnesis (
          id, patient_id, lab_tests, medications, allergies, surgeries,
          fractures, luxations, pregnancies, abortions, physical_activity,
          pain_complaints, pain_intensity, imaging_exams, clinical_notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          patientId,
          data.lab_tests ?? null,
          data.medications ?? null,
          data.allergies ?? null,
          data.surgeries ?? null,
          fracturesStr,
          luxationsStr,
          pregnanciesStr,
          abortionsStr,
          data.physical_activity ?? null,
          painComplaintsStr,
          painIntensity,
          data.imaging_exams ?? null,
          data.clinical_notes ?? null,
          now,
          now,
        ]
      );
      return (await this.findByPatientId(patientId, db))!;
    }
  },

  /**
   * Deletes anamnesis for a patient.
   */
  async deleteByPatientId(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<boolean> {
    const db = explicitDb ?? (await getDatabase());
    const result = await db.runAsync(
      'DELETE FROM anamnesis WHERE patient_id = ?;',
      [patientId]
    );
    return result.changes > 0;
  },

  /**
   * Quick summary of pain complaints for dashboard cards.
   */
  async getPainSummary(
    patientId: string,
    explicitDb?: SQLiteDatabase
  ): Promise<{ complaints: PainComplaintEntry[]; intensity: number } | null> {
    const record = await this.findByPatientId(patientId, explicitDb);
    if (!record) return null;

    let complaints: PainComplaintEntry[] = [];
    if (Array.isArray(record.pain_complaints)) {
      complaints = record.pain_complaints;
    } else if (typeof record.pain_complaints === 'string') {
      try {
        const parsed = JSON.parse(record.pain_complaints);
        if (Array.isArray(parsed)) complaints = parsed;
      } catch {
        // Not JSON array
      }
    }

    return {
      complaints,
      intensity: record.pain_intensity ?? 0,
    };
  },
};
