require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { SCHEMA_V1_TABLES, SCHEMA_V1_DDL, SCHEMA_V1_INDICES } = require('../src/database/schema.ts');
const { CLASSICAL_EXERCISES_CATALOG } = require('../src/database/seeds.ts');

describe('M2 Database Schema & Seed Catalog Integrity Tests', () => {
  describe('1. Relational Clinical Schema (7 Tables)', () => {
    test('All 7 tables defined in SCHEMA_V1_TABLES', () => {
      const requiredTables = [
        'patients',
        'anamnesis',
        'postural_evaluations',
        'bioimpedance',
        'exercises',
        'routines',
        'routine_items',
      ];
      for (const table of requiredTables) {
        assert.ok(SCHEMA_V1_TABLES[table], `Table definition for ${table} must exist`);
        assert.ok(
          SCHEMA_V1_DDL.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
          `SCHEMA_V1_DDL must contain CREATE TABLE for ${table}`
        );
      }
    });

    test('Patients table strictly EXCLUDES CPF, Estado Civil, and CEP', () => {
      const patientsSql = SCHEMA_V1_TABLES.patients.toLowerCase();
      assert.ok(!patientsSql.includes('cpf'), 'Patients table must NOT contain CPF');
      assert.ok(!patientsSql.includes('estado_civil'), 'Patients table must NOT contain estado_civil');
      assert.ok(!patientsSql.includes('estado civil'), 'Patients table must NOT contain estado civil');
      assert.ok(!patientsSql.includes('cep'), 'Patients table must NOT contain CEP');
    });

    test('Patients table defaults city_state to Rio das Ostras - RJ', () => {
      const patientsSql = SCHEMA_V1_TABLES.patients;
      assert.ok(
        patientsSql.includes("DEFAULT 'Rio das Ostras - RJ'"),
        'city_state column must default to "Rio das Ostras - RJ"'
      );
    });

    test('Cascading foreign keys on patient child tables', () => {
      assert.ok(
        SCHEMA_V1_TABLES.anamnesis.includes('REFERENCES patients(id) ON DELETE CASCADE'),
        'anamnesis must cascade on patient deletion'
      );
      assert.ok(
        SCHEMA_V1_TABLES.postural_evaluations.includes('REFERENCES patients(id) ON DELETE CASCADE'),
        'postural_evaluations must cascade on patient deletion'
      );
      assert.ok(
        SCHEMA_V1_TABLES.bioimpedance.includes('REFERENCES patients(id) ON DELETE CASCADE'),
        'bioimpedance must cascade on patient deletion'
      );
      assert.ok(
        SCHEMA_V1_TABLES.routines.includes('REFERENCES patients(id) ON DELETE CASCADE'),
        'routines must cascade on patient deletion'
      );
      assert.ok(
        SCHEMA_V1_TABLES.routine_items.includes('REFERENCES routines(id) ON DELETE CASCADE'),
        'routine_items must cascade on routine deletion'
      );
      assert.ok(
        SCHEMA_V1_TABLES.routine_items.includes('REFERENCES exercises(id) ON DELETE RESTRICT'),
        'routine_items must restrict on exercise deletion'
      );
    });

    test('Performance indices defined for fast search and relations', () => {
      assert.ok(SCHEMA_V1_INDICES.includes('idx_patients_name'), 'Index on patients name required');
      assert.ok(SCHEMA_V1_INDICES.includes('idx_patients_phone'), 'Index on patients phone required');
      assert.ok(SCHEMA_V1_INDICES.includes('idx_anamnesis_patient_id'), 'Index on anamnesis patient_id required');
      assert.ok(SCHEMA_V1_INDICES.includes('idx_postural_patient_id'), 'Index on postural patient_id required');
      assert.ok(SCHEMA_V1_INDICES.includes('idx_bioimpedance_patient_id'), 'Index on bioimpedance patient_id required');
      assert.ok(SCHEMA_V1_INDICES.includes('idx_exercises_apparatus'), 'Index on exercises apparatus required');
      assert.ok(SCHEMA_V1_INDICES.includes('idx_routines_patient_id'), 'Index on routines patient_id required');
      assert.ok(SCHEMA_V1_INDICES.includes('idx_routine_items_routine'), 'Index on routine_items routine required');
    });
  });

  describe('2. Classical Exercise Seed Catalog (49 Classical Exercises)', () => {
    test('Catalog contains 49 classical exercises (exceeds requirement of >30)', () => {
      assert.ok(Array.isArray(CLASSICAL_EXERCISES_CATALOG), 'Catalog must be an array');
      assert.equal(CLASSICAL_EXERCISES_CATALOG.length, 49, 'Catalog must contain exactly 49 exercises');
    });

    test('All 6 classical apparatuses are represented', () => {
      const apparatuses = new Set(CLASSICAL_EXERCISES_CATALOG.map((e) => e.apparatus));
      const expected = ['Mat', 'Reformer', 'Cadillac', 'Wunda Chair', 'Ladder Barrel', 'Cinesioterapia'];
      for (const app of expected) {
        assert.ok(apparatuses.has(app), `Apparatus ${app} must be present in seeds`);
      }
    });

    test('Apparatus breakdown matches clinical specification', () => {
      const counts = {};
      for (const ex of CLASSICAL_EXERCISES_CATALOG) {
        counts[ex.apparatus] = (counts[ex.apparatus] || 0) + 1;
      }
      assert.equal(counts['Mat'], 13, 'Mat must have 13 exercises');
      assert.equal(counts['Reformer'], 8, 'Reformer must have 8 exercises');
      assert.equal(counts['Cadillac'], 8, 'Cadillac must have 8 exercises');
      assert.equal(counts['Wunda Chair'], 7, 'Wunda Chair must have 7 exercises');
      assert.equal(counts['Ladder Barrel'], 6, 'Ladder Barrel must have 6 exercises');
      assert.equal(counts['Cinesioterapia'], 7, 'Cinesioterapia must have 7 exercises');
    });

    test('Every seeded exercise has is_custom = 0 and complete clinical cues', () => {
      for (const ex of CLASSICAL_EXERCISES_CATALOG) {
        assert.equal(ex.is_custom, 0, `Exercise ${ex.id} must have is_custom = 0`);
        assert.ok(ex.name && ex.name.length > 2, `Exercise ${ex.id} must have a valid name`);
        assert.ok(ex.description && ex.description.length > 10, `Exercise ${ex.id} must have detailed description`);
        assert.ok(ex.postural_focus && ex.postural_focus.length > 5, `Exercise ${ex.id} must have postural focus`);
        assert.ok(ex.default_springs, `Exercise ${ex.id} must specify default springs or resistance`);
      }
    });

    test('Key classical exercises are physically present in catalog', () => {
      const names = CLASSICAL_EXERCISES_CATALOG.map((e) => e.name);
      assert.ok(names.some((n) => n.includes('The Hundred')), 'The Hundred must be present');
      assert.ok(names.some((n) => n.includes('The Roll Up')), 'The Roll Up must be present');
      assert.ok(names.some((n) => n.includes('Footwork')), 'Footwork must be present');
      assert.ok(names.some((n) => n.includes('The Tower')), 'The Tower must be present');
      assert.ok(names.some((n) => n.includes('Going Up Front')), 'Going Up Front must be present');
      assert.ok(names.some((n) => n.includes('Ballet Stretches')), 'Ballet Stretches must be present');
      assert.ok(names.some((n) => n.includes('Ponte Pélvica com Bola Suíça')), 'Ponte com bola must be present');
    });
  });
});
