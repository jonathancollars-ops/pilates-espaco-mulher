/**
 * tests/m10_bioimpedance_persistence.test.js
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 *
 * Dedicated QA Test Suite for Bioimpedance Persistence, Hydration & Integrity:
 * 1. Complete persistence and reading with all biometric domain fields.
 * 2. Update of existing bioimpedance maintaining referential integrity & partial updates.
 * 3. Chronological ordering, progression history, and latest evaluation retrieval (getLatestByPatientId).
 * 4. Full backup and restore round-trip with chronological_age, body_age and referential integrity.
 * 5. Input resilience: Brazilian comma-to-dot conversion ('70,5' -> 70.5) and NaN/non-finite protection.
 */

require('./mock-rn.cjs');
require('tsx/cjs');

const path = require('node:path');
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const projectRoot = path.resolve(__dirname, '..');

const {
  bioimpedanceRepository,
  sanitizeOptionalNumber,
  sanitizeRequiredNumber,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'bioimpedanceRepository.ts'));
const {
  patientRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'patientRepository.ts'));
const {
  exportDatabaseBackup,
  restoreDatabaseBackup,
  validateBackupPayload,
} = require(path.join(projectRoot, 'src', 'services', 'backupService.ts'));
const {
  calculateBMI,
  calculateBMR,
  classifyAbdominalCircumference,
  compareAges,
} = require(path.join(projectRoot, 'src', 'utils', 'biometrics.ts'));
const {
  parseDecimalBR,
  formatDecimalBR,
  formatWeight,
  formatPercent,
} = require(path.join(projectRoot, 'src', 'utils', 'formatters.ts'));

/**
 * Creates an in-memory transactional mock SQLite database supporting all relational tables,
 * query types, and atomic transactions needed for Bioimpedance and Backup/Restore.
 */
function createMockDb() {
  const tables = {
    patients: new Map(),
    bioimpedance: new Map(),
    anamnesis: new Map(),
    postural_evaluations: new Map(),
    exercises: new Map(),
    routines: new Map(),
    routine_items: new Map(),
    appointments: new Map(),
    package_plans: new Map(),
    patient_condition_photos: new Map(),
  };

  let userVersion = 3;

  return {
    tables,

    async withTransactionAsync(task) {
      // Snapshot state for atomic rollback simulation
      const snapshot = {
        patients: new Map(tables.patients),
        bioimpedance: new Map(tables.bioimpedance),
        anamnesis: new Map(tables.anamnesis),
        postural_evaluations: new Map(tables.postural_evaluations),
        exercises: new Map(tables.exercises),
        routines: new Map(tables.routines),
        routine_items: new Map(tables.routine_items),
        appointments: new Map(tables.appointments),
        package_plans: new Map(tables.package_plans),
        patient_condition_photos: new Map(tables.patient_condition_photos),
        userVersion,
      };

      try {
        await task();
      } catch (err) {
        // Rollback state
        tables.patients = snapshot.patients;
        tables.bioimpedance = snapshot.bioimpedance;
        tables.anamnesis = snapshot.anamnesis;
        tables.postural_evaluations = snapshot.postural_evaluations;
        tables.exercises = snapshot.exercises;
        tables.routines = snapshot.routines;
        tables.routine_items = snapshot.routine_items;
        tables.appointments = snapshot.appointments;
        tables.package_plans = snapshot.package_plans;
        tables.patient_condition_photos = snapshot.patient_condition_photos;
        userVersion = snapshot.userVersion;
        throw err;
      }
    },

    async execAsync(sql) {
      const commands = sql.split(';').map((c) => c.trim()).filter(Boolean);
      for (const cmd of commands) {
        const upper = cmd.toUpperCase();
        if (upper.startsWith('DELETE FROM APPOINTMENTS')) tables.appointments.clear();
        else if (upper.startsWith('DELETE FROM PACKAGE_PLANS')) tables.package_plans.clear();
        else if (upper.startsWith('DELETE FROM PATIENT_CONDITION_PHOTOS')) tables.patient_condition_photos.clear();
        else if (upper.startsWith('DELETE FROM ROUTINE_ITEMS')) tables.routine_items.clear();
        else if (upper.startsWith('DELETE FROM ROUTINES')) tables.routines.clear();
        else if (upper.startsWith('DELETE FROM BIOIMPEDANCE')) tables.bioimpedance.clear();
        else if (upper.startsWith('DELETE FROM POSTURAL_EVALUATIONS')) tables.postural_evaluations.clear();
        else if (upper.startsWith('DELETE FROM ANAMNESIS')) tables.anamnesis.clear();
        else if (upper.startsWith('DELETE FROM EXERCISES')) tables.exercises.clear();
        else if (upper.startsWith('DELETE FROM PATIENTS')) tables.patients.clear();
        else if (upper.startsWith('PRAGMA USER_VERSION =')) {
          const match = cmd.match(/user_version\s*=\s*(\d+)/i);
          if (match) userVersion = parseInt(match[1], 10);
        }
      }
    },

    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      // INSERT PATIENTS
      if (trimmed.startsWith('INSERT INTO PATIENTS')) {
        const [
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, profession, activity_time,
          marital_status, avatar_uri, status, created_at, updated_at,
        ] = params;
        tables.patients.set(id, {
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, profession, activity_time,
          marital_status, avatar_uri, status, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // INSERT BIOIMPEDANCE
      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        const [
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, chronological_age, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat,
          muscle_mass_kg, body_water_pct, ideal_weight, target_weight,
          fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r, fat_leg_l,
          clinical_opinion, created_at, updated_at,
        ] = params;

        tables.bioimpedance.set(id, {
          id,
          patient_id,
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
          created_at,
          updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE BIOIMPEDANCE
      if (trimmed.startsWith('UPDATE BIOIMPEDANCE SET')) {
        const id = params[params.length - 1];
        const existing = tables.bioimpedance.get(id);
        if (existing) {
          const [
            evaluation_date, weight, height, abdominal_circ,
            bmi, chronological_age, body_age, metabolic_age, bmr, body_fat_percent,
            visceral_fat, muscle_mass_kg, body_water_pct, ideal_weight,
            target_weight, fat_arm_r, fat_arm_l, fat_trunk,
            fat_leg_r, fat_leg_l, clinical_opinion, updated_at,
          ] = params;

          const updated = {
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
            body_water_pct,
            ideal_weight,
            target_weight,
            fat_arm_r,
            fat_arm_l,
            fat_trunk,
            fat_leg_r,
            fat_leg_l,
            clinical_opinion,
            updated_at,
          };
          tables.bioimpedance.set(id, updated);
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // DELETE BIOIMPEDANCE WHERE ID = ?
      if (trimmed.startsWith('DELETE FROM BIOIMPEDANCE WHERE ID = ?')) {
        const deleted = tables.bioimpedance.delete(params[0]);
        return { lastInsertRowId: 0, changes: deleted ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('PRAGMA USER_VERSION')) {
        return { user_version: userVersion };
      }

      if (trimmed.startsWith('SELECT * FROM PATIENTS WHERE ID = ?')) {
        return tables.patients.get(params[0]) || null;
      }

      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE ID = ?')) {
        return tables.bioimpedance.get(params[0]) || null;
      }

      if (trimmed.includes('WHERE PATIENT_ID = ?') && trimmed.includes('ORDER BY EVALUATION_DATE DESC, CREATED_AT DESC LIMIT 1')) {
        const patientId = params[0];
        const matching = Array.from(tables.bioimpedance.values()).filter((r) => r.patient_id === patientId);
        if (matching.length === 0) return null;
        matching.sort((a, b) => {
          const dateDiff = String(b.evaluation_date).localeCompare(String(a.evaluation_date));
          if (dateDiff !== 0) return dateDiff;
          return String(b.created_at).localeCompare(String(a.created_at));
        });
        return matching[0];
      }

      return null;
    },

    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM PATIENTS')) {
        return Array.from(tables.patients.values());
      }

      if (trimmed.startsWith('SELECT * FROM ANAMNESIS')) {
        return Array.from(tables.anamnesis.values());
      }

      if (trimmed.startsWith('SELECT * FROM POSTURAL_EVALUATIONS')) {
        return Array.from(tables.postural_evaluations.values());
      }

      if (trimmed.startsWith('SELECT * FROM EXERCISES')) {
        return Array.from(tables.exercises.values());
      }

      if (trimmed.startsWith('SELECT * FROM ROUTINES')) {
        return Array.from(tables.routines.values());
      }

      if (trimmed.startsWith('SELECT * FROM ROUTINE_ITEMS')) {
        return Array.from(tables.routine_items.values());
      }

      if (trimmed.startsWith('SELECT * FROM APPOINTMENTS')) {
        return Array.from(tables.appointments.values());
      }

      if (trimmed.startsWith('SELECT * FROM PACKAGE_PLANS')) {
        return Array.from(tables.package_plans.values());
      }

      if (trimmed.startsWith('SELECT * FROM PATIENT_CONDITION_PHOTOS')) {
        return Array.from(tables.patient_condition_photos.values());
      }

      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE')) {
        let matching = Array.from(tables.bioimpedance.values());
        if (trimmed.includes('WHERE PATIENT_ID = ?')) {
          matching = matching.filter((r) => r.patient_id === params[0]);
        }

        if (trimmed.includes('ORDER BY EVALUATION_DATE ASC')) {
          matching.sort((a, b) => {
            const d = String(a.evaluation_date).localeCompare(String(b.evaluation_date));
            if (d !== 0) return d;
            return String(a.created_at).localeCompare(String(b.created_at));
          });
        } else {
          // Default DESC
          matching.sort((a, b) => {
            const d = String(b.evaluation_date).localeCompare(String(a.evaluation_date));
            if (d !== 0) return d;
            return String(b.created_at).localeCompare(String(a.created_at));
          });
        }

        if (trimmed.includes('LIMIT ?')) {
          const limitVal = params[params.length - 1];
          return matching.slice(0, limitVal);
        }

        return matching;
      }

      return [];
    },
  };
}

describe('M10 Bioimpedance Persistence, Hydration & Data Integrity Suite', () => {
  let mockDb;
  let testPatient;

  beforeEach(async () => {
    mockDb = createMockDb();
    testPatient = await patientRepository.create(
      {
        name: 'Dra. Mariana Vasconcellos',
        phone: '(22) 99876-1234',
        email: 'mariana@exemplo.com.br',
        profession: 'Arquiteta',
        activity_time: 'Trabalho em bancada 8h/dia',
        insurance: 'Particular',
      },
      mockDb
    );
  });

  // ============================================================================
  // 1. Persistência e Leitura Completa de Bioimpedância com Todos os Campos
  // ============================================================================
  describe('1. Full Bioimpedance Persistence & Entity Hydration', () => {
    test('Persists and hydrates a comprehensive bioimpedance record with every clinical field', async () => {
      const fullInput = {
        evaluation_date: '2026-03-15',
        weight: 63.5,
        height: 168.0,
        abdominal_circ: 74.0,
        chronological_age: 42,
        body_age: 37,
        metabolic_age: 35,
        bmr: 1385,
        body_fat_percent: 22.4,
        visceral_fat: 3,
        muscle_mass_kg: 26.2,
        muscle_mass_percent: 41.2,
        body_water_pct: 55.8,
        ideal_weight: 61.0,
        target_weight: 62.0,
        fat_arm_r: 1.8,
        fat_arm_l: 1.7,
        fat_trunk: 9.8,
        fat_leg_r: 3.9,
        fat_leg_l: 3.9,
        clinical_opinion: 'Evolução clínica notável. Redução expressiva de gordura no tronco e tônus muscular preservado.',
      };

      const created = await bioimpedanceRepository.create(testPatient.id, fullInput, mockDb);

      assert.ok(created.id, 'Record must receive a generated UUID');
      assert.strictEqual(created.patient_id, testPatient.id);
      assert.strictEqual(created.evaluation_date, '2026-03-15');
      assert.strictEqual(created.weight, 63.5);
      assert.strictEqual(created.height, 168.0);
      assert.strictEqual(created.abdominal_circ, 74.0);
      assert.strictEqual(created.chronological_age, 42);
      assert.strictEqual(created.body_age, 37);
      assert.strictEqual(created.metabolic_age, 35);
      assert.strictEqual(created.bmr, 1385);
      assert.strictEqual(created.body_fat_percent, 22.4);
      assert.strictEqual(created.visceral_fat, 3);
      assert.strictEqual(created.muscle_mass_kg, 26.2);
      assert.strictEqual(created.body_water_pct, 55.8);
      assert.strictEqual(created.ideal_weight, 61.0);
      assert.strictEqual(created.target_weight, 62.0);
      assert.strictEqual(created.fat_arm_r, 1.8);
      assert.strictEqual(created.fat_arm_l, 1.7);
      assert.strictEqual(created.fat_trunk, 9.8);
      assert.strictEqual(created.fat_leg_r, 3.9);
      assert.strictEqual(created.fat_leg_l, 3.9);
      assert.strictEqual(created.clinical_opinion, 'Evolução clínica notável. Redução expressiva de gordura no tronco e tônus muscular preservado.');
      assert.ok(created.created_at);
      assert.ok(created.updated_at);

      // Verify automatic BMI calculation: 63.5 / (1.68^2) = 22.5
      assert.strictEqual(created.bmi, 22.5, 'BMI must be computed automatically from weight and height');

      // Verify reading via findById
      const retrieved = await bioimpedanceRepository.findById(created.id, mockDb);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, created.id);
      assert.strictEqual(retrieved.abdominal_circ, 74.0);
      assert.strictEqual(retrieved.chronological_age, 42);
      assert.strictEqual(retrieved.body_age, 37);
      assert.strictEqual(retrieved.fat_trunk, 9.8);
      assert.strictEqual(retrieved.clinical_opinion, created.clinical_opinion);

      // Verify listing via listByPatientId
      const list = await bioimpedanceRepository.listByPatientId(testPatient.id, mockDb);
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].id, created.id);
      assert.strictEqual(list[0].weight, 63.5);
    });

    test('Defaults evaluation_date to current date when omitted or empty', async () => {
      const todayISO = new Date().toISOString().split('T')[0];
      const record = await bioimpedanceRepository.create(
        testPatient.id,
        {
          weight: 58.0,
          height: 162.0,
          body_fat_percent: 21.0,
          visceral_fat: 2,
          muscle_mass_kg: 24.0,
        },
        mockDb
      );

      assert.strictEqual(record.evaluation_date, todayISO);
    });
  });

  // ============================================================================
  // 2. Teste de update() Mantendo Integridade e Preservando Campos Não Alterados
  // ============================================================================
  describe('2. Update Integrity & Preservation of Unmodified Columns', () => {
    test('update() modifies specified columns and preserves unmodified biometric data', async () => {
      const initial = await bioimpedanceRepository.create(
        testPatient.id,
        {
          evaluation_date: '2026-02-01',
          weight: 70.0,
          height: 165.0,
          abdominal_circ: 82.0,
          chronological_age: 40,
          body_age: 43,
          metabolic_age: 42,
          bmr: 1320,
          body_fat_percent: 29.5,
          visceral_fat: 5,
          muscle_mass_kg: 23.5,
          body_water_pct: 51.0,
          ideal_weight: 59.0,
          target_weight: 64.0,
          fat_trunk: 13.5,
          clinical_opinion: 'Início do protocolo de fortalecimento postural e core.',
        },
        mockDb
      );

      // Patient improved: lost weight, reduced waist, improved body age & bmr
      const updated = await bioimpedanceRepository.update(
        initial.id,
        {
          evaluation_date: '2026-03-20',
          weight: 66.5,
          abdominal_circ: 77.0,
          body_age: 38,
          bmr: 1360,
          visceral_fat: 4,
          fat_trunk: 11.0,
          clinical_opinion: 'Redução de 3.5kg e 5cm de circunferência abdominal. Ótima resposta.',
        },
        mockDb
      );

      assert.ok(updated);
      assert.strictEqual(updated.id, initial.id);
      // Updated fields
      assert.strictEqual(updated.evaluation_date, '2026-03-20');
      assert.strictEqual(updated.weight, 66.5);
      assert.strictEqual(updated.abdominal_circ, 77.0);
      assert.strictEqual(updated.body_age, 38);
      assert.strictEqual(updated.bmr, 1360);
      assert.strictEqual(updated.visceral_fat, 4);
      assert.strictEqual(updated.fat_trunk, 11.0);
      assert.strictEqual(updated.clinical_opinion, 'Redução de 3.5kg e 5cm de circunferência abdominal. Ótima resposta.');

      // Unmodified fields must stay identical
      assert.strictEqual(updated.height, 165.0);
      assert.strictEqual(updated.chronological_age, 40);
      assert.strictEqual(updated.metabolic_age, 42);
      assert.strictEqual(updated.body_fat_percent, 29.5);
      assert.strictEqual(updated.muscle_mass_kg, 23.5);
      assert.strictEqual(updated.body_water_pct, 51.0);
      assert.strictEqual(updated.ideal_weight, 59.0);
      assert.strictEqual(updated.target_weight, 64.0);

      // BMI recomputed automatically on weight update: 66.5 / (1.65^2) = 24.4
      assert.strictEqual(updated.bmi, 24.4);

      // Persisted record in database matches
      const fromDb = await bioimpedanceRepository.findById(initial.id, mockDb);
      assert.ok(fromDb);
      assert.strictEqual(fromDb.weight, 66.5);
      assert.strictEqual(fromDb.abdominal_circ, 77.0);
      assert.strictEqual(fromDb.body_age, 38);
    });

    test('update() returns null if the bioimpedance record does not exist', async () => {
      const result = await bioimpedanceRepository.update('non-existent-uuid', { weight: 65.0 }, mockDb);
      assert.strictEqual(result, null);
    });

    test('delete() safely removes record with boolean confirmation', async () => {
      const record = await bioimpedanceRepository.create(
        testPatient.id,
        { weight: 60.0, height: 160.0, body_fat_percent: 22.0, visceral_fat: 3, muscle_mass_kg: 24.0 },
        mockDb
      );

      const deleted = await bioimpedanceRepository.delete(record.id, mockDb);
      assert.strictEqual(deleted, true);

      const afterDelete = await bioimpedanceRepository.findById(record.id, mockDb);
      assert.strictEqual(afterDelete, null);
    });
  });

  // ============================================================================
  // 3. Ordenação Cronológica e Recuperação da Última Aferição
  // ============================================================================
  describe('3. Chronological Ordering and getLatestByPatientId', () => {
    test('getLatestByPatientId retrieves the most recent evaluation regardless of insertion order', async () => {
      // Insert in deliberate non-chronological order
      await bioimpedanceRepository.create(
        testPatient.id,
        { evaluation_date: '2026-02-10', weight: 68.0, height: 165.0, body_fat_percent: 26.0, visceral_fat: 4, muscle_mass_kg: 25.0 },
        mockDb
      );

      await bioimpedanceRepository.create(
        testPatient.id,
        { evaluation_date: '2026-04-05', weight: 64.2, height: 165.0, body_fat_percent: 22.5, visceral_fat: 3, muscle_mass_kg: 26.0 },
        mockDb
      );

      await bioimpedanceRepository.create(
        testPatient.id,
        { evaluation_date: '2026-01-15', weight: 70.5, height: 165.0, body_fat_percent: 28.0, visceral_fat: 5, muscle_mass_kg: 24.5 },
        mockDb
      );

      await bioimpedanceRepository.create(
        testPatient.id,
        { evaluation_date: '2026-03-12', weight: 66.0, height: 165.0, body_fat_percent: 24.0, visceral_fat: 4, muscle_mass_kg: 25.5 },
        mockDb
      );

      // Latest must be 2026-04-05
      const latest = await bioimpedanceRepository.getLatestByPatientId(testPatient.id, mockDb);
      assert.ok(latest);
      assert.strictEqual(latest.evaluation_date, '2026-04-05');
      assert.strictEqual(latest.weight, 64.2);
      assert.strictEqual(latest.body_fat_percent, 22.5);

      // listByPatientId must be ordered DESC
      const listDesc = await bioimpedanceRepository.listByPatientId(testPatient.id, mockDb);
      assert.strictEqual(listDesc.length, 4);
      assert.strictEqual(listDesc[0].evaluation_date, '2026-04-05');
      assert.strictEqual(listDesc[1].evaluation_date, '2026-03-12');
      assert.strictEqual(listDesc[2].evaluation_date, '2026-02-10');
      assert.strictEqual(listDesc[3].evaluation_date, '2026-01-15');

      // getHistory must be ordered ASC for progress charts
      const historyAsc = await bioimpedanceRepository.getHistory(testPatient.id, undefined, mockDb);
      assert.strictEqual(historyAsc.length, 4);
      assert.strictEqual(historyAsc[0].evaluation_date, '2026-01-15');
      assert.strictEqual(historyAsc[1].evaluation_date, '2026-02-10');
      assert.strictEqual(historyAsc[2].evaluation_date, '2026-03-12');
      assert.strictEqual(historyAsc[3].evaluation_date, '2026-04-05');

      // getHistory with limit
      const limitedHistory = await bioimpedanceRepository.getHistory(testPatient.id, 2, mockDb);
      assert.strictEqual(limitedHistory.length, 2);
      assert.strictEqual(limitedHistory[0].evaluation_date, '2026-01-15');
      assert.strictEqual(limitedHistory[1].evaluation_date, '2026-02-10');
    });

    test('getLatestByPatientId returns null when patient has no bioimpedance evaluations', async () => {
      const patientWithoutBio = await patientRepository.create(
        { name: 'Fernanda Lima', phone: '(22) 99777-6655' },
        mockDb
      );

      const latest = await bioimpedanceRepository.getLatestByPatientId(patientWithoutBio.id, mockDb);
      assert.strictEqual(latest, null);

      const list = await bioimpedanceRepository.listByPatientId(patientWithoutBio.id, mockDb);
      assert.deepStrictEqual(list, []);
    });
  });

  // ============================================================================
  // 4. Validação de Backup & Restore com chronological_age e Integridade Referencial
  // ============================================================================
  describe('4. Full Backup/Restore with chronological_age and Referential Integrity', () => {
    test('Exports and restores bioimpedance preserving chronological_age and all biometric columns', async () => {
      // Create second patient
      const patient2 = await patientRepository.create(
        { name: 'Beatriz Ramos', phone: '(22) 99111-2233' },
        mockDb
      );

      // Create evaluations with chronological_age and body_age
      const bio1 = await bioimpedanceRepository.create(
        testPatient.id,
        {
          evaluation_date: '2026-03-01',
          weight: 65.0,
          height: 167.0,
          abdominal_circ: 76.0,
          chronological_age: 44,
          body_age: 39,
          bmr: 1410,
          body_fat_percent: 23.5,
          visceral_fat: 3,
          muscle_mass_kg: 25.5,
          fat_trunk: 10.2,
          clinical_opinion: 'Avaliação inicial pré-pilates',
        },
        mockDb
      );

      const bio2 = await bioimpedanceRepository.create(
        patient2.id,
        {
          evaluation_date: '2026-03-10',
          weight: 72.0,
          height: 172.0,
          abdominal_circ: 84.0,
          chronological_age: 50,
          body_age: 52,
          bmr: 1520,
          body_fat_percent: 30.0,
          visceral_fat: 6,
          muscle_mass_kg: 27.0,
          fat_trunk: 14.0,
          clinical_opinion: 'Foco em fortalecimento lombar',
        },
        mockDb
      );

      // Export backup
      const exportResult = await exportDatabaseBackup(mockDb);
      assert.ok(exportResult.backup);
      assert.strictEqual(exportResult.counts.patients, 2);
      assert.strictEqual(exportResult.counts.bioimpedance, 2);

      // Validate payload schema structure
      const backupJson = JSON.stringify(exportResult.backup);
      const parsed = JSON.parse(backupJson);
      validateBackupPayload(parsed);

      assert.strictEqual(parsed.data.bioimpedance.length, 2);
      const exportedBio1 = parsed.data.bioimpedance.find((b) => b.id === bio1.id);
      assert.ok(exportedBio1);
      assert.strictEqual(exportedBio1.chronological_age, 44);
      assert.strictEqual(exportedBio1.body_age, 39);
      assert.strictEqual(exportedBio1.abdominal_circ, 76.0);
      assert.strictEqual(exportedBio1.bmr, 1410);

      // Restore into fresh mock DB
      const freshDb = createMockDb();
      const importResult = await restoreDatabaseBackup(freshDb, backupJson);
      assert.strictEqual(importResult.success, true);
      assert.strictEqual(importResult.restoredCounts.patients, 2);
      assert.strictEqual(importResult.restoredCounts.bioimpedance, 2);

      // Verify restored records in fresh DB
      const restoredBio1 = await bioimpedanceRepository.findById(bio1.id, freshDb);
      assert.ok(restoredBio1);
      assert.strictEqual(restoredBio1.patient_id, testPatient.id);
      assert.strictEqual(restoredBio1.chronological_age, 44);
      assert.strictEqual(restoredBio1.body_age, 39);
      assert.strictEqual(restoredBio1.abdominal_circ, 76.0);
      assert.strictEqual(restoredBio1.bmr, 1410);
      assert.strictEqual(restoredBio1.clinical_opinion, 'Avaliação inicial pré-pilates');

      const restoredBio2 = await bioimpedanceRepository.findById(bio2.id, freshDb);
      assert.ok(restoredBio2);
      assert.strictEqual(restoredBio2.patient_id, patient2.id);
      assert.strictEqual(restoredBio2.chronological_age, 50);
      assert.strictEqual(restoredBio2.body_age, 52);
    });

    test('Rejects backup payload if bioimpedance references a missing patient (referential integrity)', async () => {
      const invalidPayload = {
        metadata: {
          app: 'pilates-espaco-mulher',
          schemaVersion: 1,
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          databaseVersion: 3,
          counts: {
            patients: 1,
            anamnesis: 0,
            postural_evaluations: 0,
            bioimpedance: 1,
            exercises: 0,
            routines: 0,
            routine_items: 0,
          },
        },
        data: {
          patients: [{ id: 'valid-pat-1', name: 'Carla', phone: '2299999999' }],
          anamnesis: [],
          postural_evaluations: [],
          bioimpedance: [
            {
              id: 'bio-orphan',
              patient_id: 'non-existent-pat', // Orphan FK
              evaluation_date: '2026-03-01',
              weight: 60,
              height: 160,
              body_fat_percent: 22,
              visceral_fat: 3,
              muscle_mass_kg: 24,
            },
          ],
          exercises: [],
          routines: [],
          routine_items: [],
          appointments: [],
          package_plans: [],
          patient_condition_photos: [],
        },
      };

      await assert.rejects(
        async () => {
          await restoreDatabaseBackup(mockDb, JSON.stringify(invalidPayload));
        },
        /Integridade referencial violada/
      );
    });

    test('Rolls back atomically on restore error, leaving database untouched', async () => {
      // Initial state with 1 bioimpedance
      const existingBio = await bioimpedanceRepository.create(
        testPatient.id,
        { weight: 62.0, height: 165.0, body_fat_percent: 24.0, visceral_fat: 3, muscle_mass_kg: 25.0 },
        mockDb
      );

      // Corrupted JSON payload (invalid structure)
      const corruptedJson = '{"data": { "patients": [ INVALID JSON';

      await assert.rejects(async () => {
        await restoreDatabaseBackup(mockDb, corruptedJson);
      });

      // Existing record must still be intact after rollback
      const preserved = await bioimpedanceRepository.findById(existingBio.id, mockDb);
      assert.ok(preserved);
      assert.strictEqual(preserved.id, existingBio.id);
    });
  });

  // ============================================================================
  // 5. Teste de Resiliência: Vírgula para Ponto e Proteção contra NaN
  // ============================================================================
  describe('5. Input Resilience: Comma-to-Dot Normalization and NaN Protection', () => {
    test('create() converts Brazilian decimal commas to valid finite floats seamlessly', async () => {
      const record = await bioimpedanceRepository.create(
        testPatient.id,
        {
          evaluation_date: '2026-03-12',
          weight: '64,8',
          height: '168,5',
          abdominal_circ: '77,4',
          body_fat_percent: '23,5',
          visceral_fat: '3,0',
          muscle_mass_kg: '49,2',
          fat_arm_r: '2,1',
          fat_arm_l: '2,0',
          fat_trunk: '11,5',
          fat_leg_r: '4,2',
          fat_leg_l: '4,1',
          ideal_weight: '62,0',
          target_weight: '63,5',
          body_water_pct: '56,2',
        },
        mockDb
      );

      assert.strictEqual(record.weight, 64.8);
      assert.strictEqual(record.height, 168.5);
      assert.strictEqual(record.abdominal_circ, 77.4);
      assert.strictEqual(record.body_fat_percent, 23.5);
      assert.strictEqual(record.visceral_fat, 3);
      assert.strictEqual(record.muscle_mass_kg, 49.2);
      assert.strictEqual(record.fat_arm_r, 2.1);
      assert.strictEqual(record.fat_arm_l, 2.0);
      assert.strictEqual(record.fat_trunk, 11.5);
      assert.strictEqual(record.fat_leg_r, 4.2);
      assert.strictEqual(record.fat_leg_l, 4.1);
      assert.strictEqual(record.ideal_weight, 62.0);
      assert.strictEqual(record.target_weight, 63.5);
      assert.strictEqual(record.body_water_pct, 56.2);
    });

    test('update() converts Brazilian decimal commas to valid finite floats seamlessly', async () => {
      const record = await bioimpedanceRepository.create(
        testPatient.id,
        { weight: 68.0, height: 165.0, body_fat_percent: 26.0, visceral_fat: 4, muscle_mass_kg: 25.0 },
        mockDb
      );

      const updated = await bioimpedanceRepository.update(
        record.id,
        {
          weight: '65,2',
          abdominal_circ: '75,8',
          muscle_mass_kg: '26,4',
          fat_trunk: '10,5',
        },
        mockDb
      );

      assert.ok(updated);
      assert.strictEqual(updated.weight, 65.2);
      assert.strictEqual(updated.abdominal_circ, 75.8);
      assert.strictEqual(updated.muscle_mass_kg, 26.4);
      assert.strictEqual(updated.fat_trunk, 10.5);
    });

    test('Protects against NaN, empty strings, and non-numeric garbage in create()', async () => {
      const record = await bioimpedanceRepository.create(
        testPatient.id,
        {
          weight: NaN, // required fallback 0
          height: 'not-a-number', // required fallback 0
          abdominal_circ: NaN, // optional -> null
          chronological_age: 'NaN', // optional -> null
          body_age: '  ', // empty string -> null
          metabolic_age: undefined, // undefined -> null
          bmr: null, // null -> null
          body_fat_percent: NaN, // required fallback 0
          visceral_fat: 'garbage', // required fallback 0
          muscle_mass_kg: NaN, // required fallback 0
          fat_trunk: 'invalid_float', // optional -> null
          clinical_opinion: '   ', // whitespace string -> null
        },
        mockDb
      );

      assert.strictEqual(record.weight, 0);
      assert.strictEqual(record.height, 0);
      assert.strictEqual(record.abdominal_circ, null);
      assert.strictEqual(record.chronological_age, null);
      assert.strictEqual(record.body_age, null);
      assert.strictEqual(record.metabolic_age, null);
      assert.strictEqual(record.bmr, null);
      assert.strictEqual(record.body_fat_percent, 0);
      assert.strictEqual(record.visceral_fat, 0);
      assert.strictEqual(record.muscle_mass_kg, 0);
      assert.strictEqual(record.fat_trunk, null);
      assert.strictEqual(record.clinical_opinion, null);
    });

    test('Unit tests for sanitizeOptionalNumber and sanitizeRequiredNumber helpers', () => {
      // sanitizeOptionalNumber
      assert.strictEqual(sanitizeOptionalNumber('70,5'), 70.5);
      assert.strictEqual(sanitizeOptionalNumber('70.5'), 70.5);
      assert.strictEqual(sanitizeOptionalNumber(70.5), 70.5);
      assert.strictEqual(sanitizeOptionalNumber(0), 0);
      assert.strictEqual(sanitizeOptionalNumber('0'), 0);
      assert.strictEqual(sanitizeOptionalNumber(NaN), null);
      assert.strictEqual(sanitizeOptionalNumber('NaN'), null);
      assert.strictEqual(sanitizeOptionalNumber(''), null);
      assert.strictEqual(sanitizeOptionalNumber('   '), null);
      assert.strictEqual(sanitizeOptionalNumber(null), null);
      assert.strictEqual(sanitizeOptionalNumber(undefined), null);
      assert.strictEqual(sanitizeOptionalNumber('invalid'), null);
      assert.strictEqual(sanitizeOptionalNumber(Infinity), null);
      assert.strictEqual(sanitizeOptionalNumber(-Infinity), null);

      // sanitizeRequiredNumber
      assert.strictEqual(sanitizeRequiredNumber('65,4', 0), 65.4);
      assert.strictEqual(sanitizeRequiredNumber('65.4', 0), 65.4);
      assert.strictEqual(sanitizeRequiredNumber(65.4, 0), 65.4);
      assert.strictEqual(sanitizeRequiredNumber(NaN, 50), 50);
      assert.strictEqual(sanitizeRequiredNumber('NaN', 50), 50);
      assert.strictEqual(sanitizeRequiredNumber('', 10), 10);
      assert.strictEqual(sanitizeRequiredNumber(null, 25), 25);
      assert.strictEqual(sanitizeRequiredNumber(undefined, 30), 30);
    });

    test('Unit tests for parseDecimalBR formatter', () => {
      assert.strictEqual(parseDecimalBR('64,5'), 64.5);
      assert.strictEqual(parseDecimalBR('64.5'), 64.5);
      assert.strictEqual(parseDecimalBR('1.250,50'), 1250.5);
      assert.strictEqual(parseDecimalBR('0,75'), 0.75);
      assert.strictEqual(parseDecimalBR(''), null);
      assert.strictEqual(parseDecimalBR('   '), null);
      assert.strictEqual(parseDecimalBR('abc'), null);
      assert.strictEqual(parseDecimalBR('NaN'), null);
    });
  });
});
