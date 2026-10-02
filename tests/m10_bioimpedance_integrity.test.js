/**
 * tests/m10_bioimpedance_integrity.test.js
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 *
 * Dedicated QA suite for Bioimpedance persistence, update, and migration integrity:
 * 1. Defensive input sanitization (NaN, empty strings, undefined, numeric strings).
 * 2. Full column update (chronological_age, body_age, metabolic_age, abdominal_circ, bmr, clinical_opinion).
 * 3. getLatestByPatientId ordering (evaluation_date DESC, created_at DESC LIMIT 1).
 * 4. Idempotent migrations for bioimpedance columns.
 */

require('./mock-rn.cjs');
require('tsx/cjs');

const path = require('node:path');
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const projectRoot = path.resolve(__dirname, '..');

const {
  bioimpedanceRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'bioimpedanceRepository.ts'));
const {
  MIGRATIONS,
  ensureBioimpedanceColumns,
  addColumnIfNotExists,
} = require(path.join(projectRoot, 'src', 'database', 'migrations.ts'));

function createMockBioimpedanceDb() {
  const store = new Map();

  return {
    store,
    async execAsync() {},
    async withTransactionAsync(task) {
      await task();
    },
    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        const [
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, chronological_age, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat,
          muscle_mass_kg, body_water_pct, ideal_weight, target_weight,
          fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r, fat_leg_l,
          clinical_opinion, created_at, updated_at
        ] = params;

        store.set(id, {
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

      if (trimmed.startsWith('UPDATE BIOIMPEDANCE SET')) {
        const id = params[params.length - 1];
        const existing = store.get(id);
        if (existing) {
          const [
            evaluation_date, weight, height, abdominal_circ,
            bmi, chronological_age, body_age, metabolic_age, bmr, body_fat_percent,
            visceral_fat, muscle_mass_kg, body_water_pct, ideal_weight,
            target_weight, fat_arm_r, fat_arm_l, fat_trunk,
            fat_leg_r, fat_leg_l, clinical_opinion, updated_at
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
          store.set(id, updated);
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      if (trimmed.startsWith('DELETE FROM BIOIMPEDANCE WHERE ID = ?')) {
        const deleted = store.delete(params[0]);
        return { lastInsertRowId: 0, changes: deleted ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE ID = ?')) {
        return store.get(params[0]) || null;
      }

      if (trimmed.includes('WHERE PATIENT_ID = ?') && trimmed.includes('ORDER BY EVALUATION_DATE DESC, CREATED_AT DESC LIMIT 1')) {
        const patientId = params[0];
        const matching = Array.from(store.values()).filter((r) => r.patient_id === patientId);
        if (matching.length === 0) return null;
        matching.sort((a, b) => {
          const dateDiff = b.evaluation_date.localeCompare(a.evaluation_date);
          if (dateDiff !== 0) return dateDiff;
          return b.created_at.localeCompare(a.created_at);
        });
        return matching[0];
      }

      return null;
    },

    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.includes('WHERE PATIENT_ID = ?')) {
        const patientId = params[0];
        const matching = Array.from(store.values()).filter((r) => r.patient_id === patientId);
        if (trimmed.includes('ORDER BY EVALUATION_DATE ASC')) {
          matching.sort((a, b) => a.evaluation_date.localeCompare(b.evaluation_date));
        } else {
          matching.sort((a, b) => b.evaluation_date.localeCompare(a.evaluation_date));
        }
        return matching;
      }
      return [];
    },
  };
}

describe('Bioimpedance Database & Repository Integrity Suite', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockBioimpedanceDb();
  });

  describe('1. Defensive input normalization in create() and update()', () => {
    test('create() converts NaN, empty strings, and non-finite inputs to safe fallbacks or null', async () => {
      const record = await bioimpedanceRepository.create(
        'patient-123',
        {
          evaluation_date: '2026-03-12',
          weight: ('70.5'), // numeric string parsed
          height: 165,
          chronological_age: NaN, // invalid numeric -> null
          body_age: '', // empty string -> null
          metabolic_age: undefined, // undefined -> null
          abdominal_circ: '   ', // whitespace -> null
          bmr: NaN, // NaN -> null
          body_fat_percent: 24.5,
          visceral_fat: 4,
          muscle_mass_kg: 48.2,
          clinical_opinion: '  Paciente com excelente evolução de massa magra  ',
        },
        mockDb
      );

      assert.ok(record.id);
      assert.strictEqual(record.weight, 70.5);
      assert.strictEqual(record.chronological_age, null);
      assert.strictEqual(record.body_age, null);
      assert.strictEqual(record.metabolic_age, null);
      assert.strictEqual(record.abdominal_circ, null);
      assert.strictEqual(record.bmr, null);
      assert.strictEqual(record.clinical_opinion, 'Paciente com excelente evolução de massa magra');
    });

    test('update() converts NaN, empty strings, and non-finite inputs defensively', async () => {
      const created = await bioimpedanceRepository.create(
        'patient-123',
        {
          evaluation_date: '2026-01-10',
          weight: 68,
          height: 160,
          chronological_age: 40,
          body_age: 38,
          metabolic_age: 36,
          abdominal_circ: 78,
          bmr: 1350,
          body_fat_percent: 25,
          visceral_fat: 3,
          muscle_mass_kg: 45,
          clinical_opinion: 'Avaliação inicial',
        },
        mockDb
      );

      // Update with some invalid values and some valid new values
      const updated = await bioimpedanceRepository.update(
        created.id,
        {
          chronological_age: NaN, // should become null
          body_age: 35, // valid updated number
          metabolic_age: '  ', // empty string -> null
          abdominal_circ: 75.5, // valid updated number
          bmr: 1400, // valid updated number
          clinical_opinion: '   ', // empty string -> null
        },
        mockDb
      );

      assert.ok(updated);
      assert.strictEqual(updated.chronological_age, null);
      assert.strictEqual(updated.body_age, 35);
      assert.strictEqual(updated.metabolic_age, null);
      assert.strictEqual(updated.abdominal_circ, 75.5);
      assert.strictEqual(updated.bmr, 1400);
      assert.strictEqual(updated.clinical_opinion, null);
    });
  });

  describe('2. Comprehensive column updates in update()', () => {
    test('update() updates all biometric columns correctly', async () => {
      const created = await bioimpedanceRepository.create(
        'patient-456',
        {
          evaluation_date: '2026-01-01',
          weight: 80,
          height: 170,
          body_fat_percent: 32,
          visceral_fat: 7,
          muscle_mass_kg: 50,
        },
        mockDb
      );

      const updated = await bioimpedanceRepository.update(
        created.id,
        {
          evaluation_date: '2026-03-15',
          weight: 76,
          height: 170,
          abdominal_circ: 82.5,
          chronological_age: 45,
          body_age: 42,
          metabolic_age: 40,
          bmr: 1480,
          body_fat_percent: 28,
          visceral_fat: 5,
          muscle_mass_kg: 52,
          body_water_pct: 54,
          ideal_weight: 65,
          target_weight: 68,
          fat_arm_r: 2.1,
          fat_arm_l: 2.0,
          fat_trunk: 12.5,
          fat_leg_r: 4.8,
          fat_leg_l: 4.7,
          clinical_opinion: 'Progresso consistente em redução de gordura visceral.',
        },
        mockDb
      );

      assert.ok(updated);
      assert.strictEqual(updated.evaluation_date, '2026-03-15');
      assert.strictEqual(updated.weight, 76);
      assert.strictEqual(updated.abdominal_circ, 82.5);
      assert.strictEqual(updated.chronological_age, 45);
      assert.strictEqual(updated.body_age, 42);
      assert.strictEqual(updated.metabolic_age, 40);
      assert.strictEqual(updated.bmr, 1480);
      assert.strictEqual(updated.body_fat_percent, 28);
      assert.strictEqual(updated.visceral_fat, 5);
      assert.strictEqual(updated.muscle_mass_kg, 52);
      assert.strictEqual(updated.body_water_pct, 54);
      assert.strictEqual(updated.ideal_weight, 65);
      assert.strictEqual(updated.target_weight, 68);
      assert.strictEqual(updated.fat_arm_r, 2.1);
      assert.strictEqual(updated.fat_arm_l, 2.0);
      assert.strictEqual(updated.fat_trunk, 12.5);
      assert.strictEqual(updated.fat_leg_r, 4.8);
      assert.strictEqual(updated.fat_leg_l, 4.7);
      assert.strictEqual(updated.clinical_opinion, 'Progresso consistente em redução de gordura visceral.');

      // Check persisted state in mock db
      const persisted = mockDb.store.get(created.id);
      assert.strictEqual(persisted.abdominal_circ, 82.5);
      assert.strictEqual(persisted.chronological_age, 45);
      assert.strictEqual(persisted.body_age, 42);
      assert.strictEqual(persisted.metabolic_age, 40);
      assert.strictEqual(persisted.bmr, 1480);
      assert.strictEqual(persisted.clinical_opinion, 'Progresso consistente em redução de gordura visceral.');
    });
  });

  describe('3. getLatestByPatientId query behavior', () => {
    test('retrieves the most recent bioimpedance evaluation ordered by evaluation_date DESC, created_at DESC', async () => {
      const pid = 'patient-recent-test';

      await bioimpedanceRepository.create(
        pid,
        {
          evaluation_date: '2026-01-10',
          weight: 70,
          height: 165,
          body_fat_percent: 30,
          visceral_fat: 6,
          muscle_mass_kg: 44,
        },
        mockDb
      );

      await bioimpedanceRepository.create(
        pid,
        {
          evaluation_date: '2026-03-20',
          weight: 66,
          height: 165,
          body_fat_percent: 26,
          visceral_fat: 4,
          muscle_mass_kg: 46,
        },
        mockDb
      );

      await bioimpedanceRepository.create(
        pid,
        {
          evaluation_date: '2026-02-15',
          weight: 68,
          height: 165,
          body_fat_percent: 28,
          visceral_fat: 5,
          muscle_mass_kg: 45,
        },
        mockDb
      );

      const latest = await bioimpedanceRepository.getLatestByPatientId(pid, mockDb);
      assert.ok(latest);
      assert.strictEqual(latest.evaluation_date, '2026-03-20');
      assert.strictEqual(latest.weight, 66);
    });

    test('returns null if patient has no bioimpedance evaluations', async () => {
      const latest = await bioimpedanceRepository.getLatestByPatientId('non-existent', mockDb);
      assert.strictEqual(latest, null);
    });
  });

  describe('4. Idempotent Migrations for Bioimpedance Columns', () => {
    test('ensureBioimpedanceColumns idempotently checks all 4 biometric columns', async () => {
      const executedCommands = [];
      const mockMigrationDb = {
        async getAllAsync(sql, params = []) {
          // Simulate that chronological_age and body_age already exist, but metabolic_age and abdominal_circ do not
          return [{ name: 'chronological_age' }, { name: 'body_age' }];
        },
        async execAsync(sql) {
          executedCommands.push(sql);
        },
      };

      await ensureBioimpedanceColumns(mockMigrationDb);

      assert.strictEqual(executedCommands.length, 2);
      assert.ok(executedCommands[0].includes('ALTER TABLE bioimpedance ADD COLUMN metabolic_age INTEGER'));
      assert.ok(executedCommands[1].includes('ALTER TABLE bioimpedance ADD COLUMN abdominal_circ REAL'));
    });

    test('Migration v3 includes all 4 bioimpedance column checks', async () => {
      const executedCommands = [];
      const mockMigrationDb = {
        async getAllAsync(sql, params = []) {
          return [];
        },
        async execAsync(sql) {
          executedCommands.push(sql);
        },
      };

      const migrationV3 = MIGRATIONS.find((m) => m.version === 3);
      await migrationV3.up(mockMigrationDb);

      const joined = executedCommands.join('\n').toUpperCase();
      assert.ok(joined.includes('CHRONOLOGICAL_AGE'));
      assert.ok(joined.includes('BODY_AGE'));
      assert.ok(joined.includes('METABOLIC_AGE'));
      assert.ok(joined.includes('ABDOMINAL_CIRC'));
    });
  });
});
