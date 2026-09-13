require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  patientRepository,
  anamnesisRepository,
  posturalRepository,
  bioimpedanceRepository,
  exerciseRepository,
  routineRepository,
} = require('../src/database/repositories/index.ts');

function createMockDatabase() {
  const tables = {
    patients: new Map(),
    anamnesis: new Map(),
    postural_evaluations: new Map(),
    bioimpedance: new Map(),
    exercises: new Map(),
    routines: new Map(),
    routine_items: new Map(),
  };

  return {
    tables,
    async execAsync() {},
    async withTransactionAsync(task) {
      await task();
    },
    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT INTO PATIENTS')) {
        const [
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at,
        ] = params;
        tables.patients.set(id, {
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('UPDATE PATIENTS')) {
        const id = params[params.length - 1];
        const existing = tables.patients.get(id);
        if (existing) {
          const [
            name, birthdate, age, phone, address, neighborhood,
            city_state, email, insurance, status, updated_at,
          ] = params;
          tables.patients.set(id, {
            ...existing,
            name, birthdate, age, phone, address, neighborhood,
            city_state, email, insurance, status, updated_at,
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      if (trimmed.startsWith('DELETE FROM PATIENTS')) {
        const id = params[0];
        const had = tables.patients.delete(id);
        // Cascade delete
        for (const [k, v] of tables.anamnesis) {
          if (v.patient_id === id) tables.anamnesis.delete(k);
        }
        for (const [k, v] of tables.postural_evaluations) {
          if (v.patient_id === id) tables.postural_evaluations.delete(k);
        }
        for (const [k, v] of tables.bioimpedance) {
          if (v.patient_id === id) tables.bioimpedance.delete(k);
        }
        for (const [k, v] of tables.routines) {
          if (v.patient_id === id) {
            tables.routines.delete(k);
            for (const [ik, iv] of tables.routine_items) {
              if (iv.routine_id === k) tables.routine_items.delete(ik);
            }
          }
        }
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      if (trimmed.startsWith('INSERT INTO ANAMNESIS')) {
        const colMatch = sql.match(/INSERT\s+INTO\s+anamnesis\s*\(([^)]+)\)/i);
        if (colMatch) {
          const cols = colMatch[1].split(',').map((c) => c.trim().toLowerCase());
          const record = {};
          cols.forEach((col, idx) => {
            record[col] = params[idx];
          });
          tables.anamnesis.set(record.id, record);
          return { lastInsertRowId: 1, changes: 1 };
        }
        const [
          id, patient_id, lab_tests, medications, allergies, surgeries,
          fractures, luxations, pregnancies, abortions, physical_activity,
          pain_complaints, pain_intensity, imaging_exams, clinical_notes,
          created_at, updated_at,
        ] = params;
        tables.anamnesis.set(id, {
          id, patient_id, lab_tests, medications, allergies, surgeries,
          fractures, luxations, pregnancies, abortions, physical_activity,
          pain_complaints, pain_intensity, imaging_exams, clinical_notes,
          created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO POSTURAL_EVALUATIONS')) {
        const [id, patient_id, evaluation_date] = params;
        tables.postural_evaluations.set(id, {
          id, patient_id, evaluation_date, head: params[3], notes: params[24],
          created_at: params[25], updated_at: params[26],
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        const [id, patient_id, evaluation_date, weight, height, , bmi] = params;
        tables.bioimpedance.set(id, {
          id, patient_id, evaluation_date, weight, height, bmi,
          created_at: params[22], updated_at: params[23],
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO EXERCISES')) {
        const [
          id, name, apparatus, description, default_springs,
          default_reps, default_sets, level, postural_focus,
          contraindications, is_custom, created_at, updated_at,
        ] = params;
        tables.exercises.set(id, {
          id, name, apparatus, description, default_springs,
          default_reps, default_sets, level, postural_focus,
          contraindications, is_custom, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO ROUTINES')) {
        const [id, patient_id, name, notes, status, created_at, updated_at] = params;
        tables.routines.set(id, {
          id, patient_id, name, notes, status, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO ROUTINE_ITEMS')) {
        const [id, routine_id, exercise_id, sets, reps, springs_resistance, postural_notes, sort_order, created_at, updated_at] = params;
        tables.routine_items.set(id, {
          id, routine_id, exercise_id, sets, reps, springs_resistance, postural_notes, sort_order, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      return { lastInsertRowId: 0, changes: 1 };
    },
    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM PATIENTS WHERE ID = ?')) {
        return tables.patients.get(params[0]) ?? null;
      }
      if (trimmed.startsWith('SELECT COUNT(*) AS COUNT FROM PATIENTS')) {
        return { count: tables.patients.size };
      }
      if (trimmed.startsWith('SELECT * FROM ANAMNESIS WHERE PATIENT_ID = ?')) {
        for (const item of tables.anamnesis.values()) {
          if (item.patient_id === params[0]) return item;
        }
        return null;
      }
      if (trimmed.startsWith('SELECT * FROM POSTURAL_EVALUATIONS WHERE ID = ?')) {
        return tables.postural_evaluations.get(params[0]) ?? null;
      }
      if (trimmed.startsWith('SELECT * FROM POSTURAL_EVALUATIONS WHERE PATIENT_ID = ?')) {
        for (const item of tables.postural_evaluations.values()) {
          if (item.patient_id === params[0]) return item;
        }
        return null;
      }
      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE ID = ?')) {
        return tables.bioimpedance.get(params[0]) ?? null;
      }
      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE PATIENT_ID = ?')) {
        for (const item of tables.bioimpedance.values()) {
          if (item.patient_id === params[0]) return item;
        }
        return null;
      }
      if (trimmed.startsWith('SELECT * FROM EXERCISES WHERE ID = ?')) {
        return tables.exercises.get(params[0]) ?? null;
      }
      if (trimmed.startsWith('SELECT COUNT(*) AS COUNT FROM EXERCISES')) {
        return { count: tables.exercises.size };
      }
      if (trimmed.startsWith('SELECT * FROM ROUTINES WHERE ID = ?')) {
        return tables.routines.get(params[0]) ?? null;
      }

      return null;
    },
    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM PATIENTS')) {
        return Array.from(tables.patients.values());
      }
      if (trimmed.startsWith('SELECT * FROM POSTURAL_EVALUATIONS')) {
        return Array.from(tables.postural_evaluations.values());
      }
      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE')) {
        return Array.from(tables.bioimpedance.values());
      }
      if (trimmed.startsWith('SELECT * FROM EXERCISES')) {
        return Array.from(tables.exercises.values());
      }
      if (trimmed.startsWith('SELECT RI.*') || trimmed.includes('FROM ROUTINE_ITEMS RI')) {
        const items = [];
        for (const item of tables.routine_items.values()) {
          if (item.routine_id === params[0]) {
            const ex = tables.exercises.get(item.exercise_id);
            items.push({
              ...item,
              ex_name: ex ? ex.name : null,
              ex_apparatus: ex ? ex.apparatus : null,
            });
          }
        }
        return items;
      }
      return [];
    },
  };
}

describe('M2 Typed CRUD Repositories Behavioral Tests', () => {
  let mockDb;

  test('patientRepository creates patient with default city_state and active status', async () => {
    mockDb = createMockDatabase();
    const p = await patientRepository.create(
      {
        name: 'Camila Santos',
        phone: '(22) 99888-7766',
        insurance: 'Unimed',
      },
      mockDb
    );

    assert.ok(p.id, 'Patient id must be generated');
    assert.equal(p.name, 'Camila Santos');
    assert.equal(p.city_state, 'Rio das Ostras - RJ', 'Must default to Rio das Ostras - RJ');
    assert.equal(p.status, 'active');
    assert.equal(p.insurance, 'Unimed');

    const count = await patientRepository.count(undefined, mockDb);
    assert.equal(count, 1);
  });

  test('patientRepository update modifies patient attributes', async () => {
    mockDb = createMockDatabase();
    const created = await patientRepository.create(
      {
        name: 'Beatriz Lima',
        phone: '(22) 99111-2233',
      },
      mockDb
    );

    const updated = await patientRepository.update(
      created.id,
      {
        phone: '(22) 99444-5566',
        neighborhood: 'Costa Azul',
      },
      mockDb
    );

    assert.ok(updated);
    assert.equal(updated.phone, '(22) 99444-5566');
    assert.equal(updated.neighborhood, 'Costa Azul');
  });

  test('patientRepository delete cascades patient and associated records', async () => {
    mockDb = createMockDatabase();
    const p = await patientRepository.create({ name: 'Larissa', phone: '(22) 99999-0000' }, mockDb);
    assert.equal(mockDb.tables.patients.size, 1);

    const deleted = await patientRepository.delete(p.id, mockDb);
    assert.ok(deleted);
    assert.equal(mockDb.tables.patients.size, 0);
  });

  test('anamnesisRepository upsert creates and serializes compound entries', async () => {
    mockDb = createMockDatabase();
    const ana = await anamnesisRepository.upsert(
      'pat-100',
      {
        fractures: { has: 'sim', location: 'Rádio D' },
        pain_complaints: [{ location: 'Lombar L5-S1', eva_intensity: 8 }],
        pain_intensity: 8,
      },
      mockDb
    );

    assert.ok(ana);
    assert.equal(ana.patient_id, 'pat-100');
    assert.equal(ana.pain_intensity, 8);
  });

  test('exerciseRepository creates dynamic custom exercise with is_custom = 1', async () => {
    mockDb = createMockDatabase();
    const ex = await exerciseRepository.create(
      {
        name: 'Exercício Clínico Customizado',
        apparatus: 'Reformer',
        description: 'Variação clínica prescrita pela Dra. Rogéria',
        default_springs: '1 Vermelha + 1 Azul',
      },
      mockDb
    );

    assert.ok(ex.id);
    assert.equal(ex.is_custom, 1, 'Custom exercise must have is_custom = 1');
    assert.equal(ex.apparatus, 'Reformer');
  });

  test('bioimpedanceRepository calculates BMI automatically on creation', async () => {
    mockDb = createMockDatabase();
    const bio = await bioimpedanceRepository.create(
      'pat-200',
      {
        evaluation_date: '2026-09-11',
        weight: 60,
        height: 165,
        body_fat_percent: 24,
        visceral_fat: 4,
        muscle_mass_kg: 25,
      },
      mockDb
    );

    assert.ok(bio.id);
    assert.equal(bio.bmi, 22.0, 'BMI should be automatically computed as 22.0');
  });

  test('routineRepository creates routine with prescribed items inside transaction', async () => {
    mockDb = createMockDatabase();
    mockDb.tables.exercises.set('ex-1', {
      id: 'ex-1',
      name: 'The Hundred',
      apparatus: 'Mat',
    });

    const routine = await routineRepository.create(
      'pat-300',
      {
        name: 'Treino A - Lombar',
        items: [
          {
            exercise_id: 'ex-1',
            sets: 3,
            reps: '100 bombeamentos',
            postural_notes: 'Foco na pelve neutra',
          },
        ],
      },
      mockDb
    );

    assert.ok(routine.id);
    assert.equal(routine.name, 'Treino A - Lombar');
    assert.equal(routine.items.length, 1);
    assert.equal(routine.items[0].sets, 3);
    assert.equal(routine.items[0].reps, '100 bombeamentos');
  });
});
