require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validateBackupPayload } = require('../src/services/backupService.ts');

describe('M2 Backup & Restore Service Validation Tests', () => {
  function createValidBackupPayload() {
    return {
      metadata: {
        version: '1.0.0',
        schemaVersion: 1,
        app: 'pilates-espaco-mulher',
        appName: 'Pilates Espaço Mulher',
        professional: {
          name: 'Dra. Rogéria Collares',
          crefito: 'CREFITO 23093-F',
          clinic: 'Pilates Espaço Mulher — Costa Azul, Rio das Ostras',
          phone: '(22) 99947-4304',
        },
        exportedAt: '2026-09-11T20:00:00.000Z',
        databaseVersion: 1,
        counts: {
          patients: 1,
          anamnesis: 1,
          postural_evaluations: 1,
          bioimpedance: 1,
          exercises: 1,
          routines: 1,
          routine_items: 1,
        },
      },
      data: {
        patients: [
          {
            id: 'pat-1',
            name: 'Maria da Silva',
            phone: '(22) 99999-1111',
            city_state: 'Rio das Ostras - RJ',
            status: 'active',
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          },
        ],
        anamnesis: [
          {
            id: 'ana-1',
            patient_id: 'pat-1',
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          },
        ],
        postural_evaluations: [
          {
            id: 'pos-1',
            patient_id: 'pat-1',
            evaluation_date: '2026-09-11',
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          },
        ],
        bioimpedance: [
          {
            id: 'bio-1',
            patient_id: 'pat-1',
            evaluation_date: '2026-09-11',
            weight: 60,
            height: 165,
            bmi: 22.0,
            body_fat_percent: 25.0,
            visceral_fat: 5,
            muscle_mass_kg: 24.0,
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          },
        ],
        exercises: [
          {
            id: 'ex-1',
            name: 'The Hundred',
            apparatus: 'Mat',
            is_custom: 0,
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          },
        ],
        routines: [
          {
            id: 'rou-1',
            patient_id: 'pat-1',
            name: 'Treino A',
            status: 'active',
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          },
        ],
        routine_items: [
          {
            id: 'item-1',
            routine_id: 'rou-1',
            exercise_id: 'ex-1',
            sets: 1,
            reps: '10',
            sort_order: 0,
          },
        ],
      },
    };
  }

  describe('1. validateBackupPayload Success & Rejection Cases', () => {
    test('Valid backup payload passes validation without throwing', () => {
      const valid = createValidBackupPayload();
      assert.doesNotThrow(() => {
        validateBackupPayload(valid);
      });
    });

    test('Rejects non-object or null payload', () => {
      assert.throws(() => {
        validateBackupPayload(null);
      }, /corrompido ou formato JSON inválido/);

      assert.throws(() => {
        validateBackupPayload('string');
      }, /corrompido ou formato JSON inválido/);
    });

    test('Rejects payload with mismatched app identifier', () => {
      const invalid = createValidBackupPayload();
      invalid.metadata.app = 'other-app';
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /não pertence ao aplicativo Pilates Espaço Mulher/);
    });

    test('Rejects payload with unsupported schema version', () => {
      const invalid = createValidBackupPayload();
      invalid.metadata.schemaVersion = 2;
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Versão de schema 2 não suportada/);
    });

    test('Rejects payload missing required table in data', () => {
      const invalid = createValidBackupPayload();
      delete invalid.data.routine_items;
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Tabela ausente ou formato inválido/);
    });
  });

  describe('2. Referential Integrity Dry Run Validations', () => {
    test('Rejects anamnesis referencing non-existent patient ID', () => {
      const invalid = createValidBackupPayload();
      invalid.data.anamnesis[0].patient_id = 'non-existent-pat';
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Anamnese ana-1 referencia paciente inexistente/);
    });

    test('Rejects postural evaluation referencing non-existent patient ID', () => {
      const invalid = createValidBackupPayload();
      invalid.data.postural_evaluations[0].patient_id = 'non-existent-pat';
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Avaliação postural pos-1 referencia paciente inexistente/);
    });

    test('Rejects bioimpedance referencing non-existent patient ID', () => {
      const invalid = createValidBackupPayload();
      invalid.data.bioimpedance[0].patient_id = 'non-existent-pat';
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Bioimpedância bio-1 referencia paciente inexistente/);
    });

    test('Rejects routine referencing non-existent patient ID', () => {
      const invalid = createValidBackupPayload();
      invalid.data.routines[0].patient_id = 'non-existent-pat';
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Rotina de treino rou-1 referencia paciente inexistente/);
    });

    test('Rejects routine item referencing non-existent routine ID', () => {
      const invalid = createValidBackupPayload();
      invalid.data.routine_items[0].routine_id = 'non-existent-routine';
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Item de treino item-1 referencia rotina inexistente/);
    });

    test('Rejects routine item referencing non-existent exercise ID', () => {
      const invalid = createValidBackupPayload();
      invalid.data.routine_items[0].exercise_id = 'non-existent-exercise';
      assert.throws(() => {
        validateBackupPayload(invalid);
      }, /Item de treino item-1 referencia exercício inexistente/);
    });
  });
});
