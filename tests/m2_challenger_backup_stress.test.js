require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateBackupPayload,
  exportDatabaseBackup,
  importDatabaseBackup,
} = require('../src/services/backupService.ts');

/**
 * Creates an in-memory database simulation with transaction rollback support.
 */
function createTransactionalMockDatabase(initialData = {}) {
  let tables = {
    patients: new Map(initialData.patients ?? []),
    anamnesis: new Map(initialData.anamnesis ?? []),
    postural_evaluations: new Map(initialData.postural_evaluations ?? []),
    bioimpedance: new Map(initialData.bioimpedance ?? []),
    exercises: new Map(initialData.exercises ?? []),
    routines: new Map(initialData.routines ?? []),
    routine_items: new Map(initialData.routine_items ?? []),
  };

  let failOnTableInsert = null;
  let simulateFkViolationOnCommit = false;

  const db = {
    get tables() {
      return tables;
    },
    set tables(val) {
      tables = val;
    },
    setFailOnTableInsert(tableName) {
      failOnTableInsert = tableName;
    },
    setSimulateFkViolationOnCommit(val) {
      simulateFkViolationOnCommit = val;
    },

    async withTransactionAsync(task) {
      // Snapshot before transaction
      const snapshot = {
        patients: new Map(tables.patients),
        anamnesis: new Map(tables.anamnesis),
        postural_evaluations: new Map(tables.postural_evaluations),
        bioimpedance: new Map(tables.bioimpedance),
        exercises: new Map(tables.exercises),
        routines: new Map(tables.routines),
        routine_items: new Map(tables.routine_items),
      };

      try {
        await task();
      } catch (err) {
        // Rollback snapshot on failure
        tables.patients = snapshot.patients;
        tables.anamnesis = snapshot.anamnesis;
        tables.postural_evaluations = snapshot.postural_evaluations;
        tables.bioimpedance = snapshot.bioimpedance;
        tables.exercises = snapshot.exercises;
        tables.routines = snapshot.routines;
        tables.routine_items = snapshot.routine_items;
        throw err;
      }
    },

    async execAsync(sql) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.includes('DELETE FROM ROUTINE_ITEMS') && trimmed.includes('DELETE FROM PATIENTS')) {
        tables.routine_items.clear();
        tables.routines.clear();
        tables.bioimpedance.clear();
        tables.postural_evaluations.clear();
        tables.anamnesis.clear();
        tables.exercises.clear();
        tables.patients.clear();
      }
    },

    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT INTO PATIENTS')) {
        if (failOnTableInsert === 'patients') {
          throw new Error('Simulated SQLite Disk I/O Error inserting patient');
        }
        const [id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, status, created_at, updated_at] = params;
        tables.patients.set(id, { id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, status, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO EXERCISES')) {
        if (failOnTableInsert === 'exercises') {
          throw new Error('Simulated SQLite Disk I/O Error inserting exercise');
        }
        const [id, name, apparatus, description, default_springs, default_reps, default_sets, level, postural_focus, contraindications, is_custom, created_at, updated_at] = params;
        tables.exercises.set(id, { id, name, apparatus, description, default_springs, default_reps, default_sets, level, postural_focus, contraindications, is_custom, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO ANAMNESIS')) {
        if (failOnTableInsert === 'anamnesis') {
          throw new Error('Simulated SQLite Disk I/O Error inserting anamnesis');
        }
        const [id, patient_id, lab_tests, medications, allergies, surgeries, fractures, luxations, pregnancies, abortions, physical_activity, pain_complaints, pain_intensity, imaging_exams, clinical_notes, created_at, updated_at] = params;
        tables.anamnesis.set(id, { id, patient_id, lab_tests, medications, allergies, surgeries, fractures, luxations, pregnancies, abortions, physical_activity, pain_complaints, pain_intensity, imaging_exams, clinical_notes, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO POSTURAL_EVALUATIONS')) {
        if (failOnTableInsert === 'postural_evaluations') {
          throw new Error('Simulated SQLite Disk I/O Error inserting postural_evaluation');
        }
        const [id, patient_id, evaluation_date] = params;
        tables.postural_evaluations.set(id, { id, patient_id, evaluation_date, head: params[3], notes: params[24], created_at: params[25], updated_at: params[26] });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        if (failOnTableInsert === 'bioimpedance') {
          throw new Error('Simulated SQLite Disk I/O Error inserting bioimpedance');
        }
        const [id, patient_id, evaluation_date, weight, height, , bmi] = params;
        tables.bioimpedance.set(id, { id, patient_id, evaluation_date, weight, height, bmi, created_at: params[22], updated_at: params[23] });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO ROUTINES')) {
        if (failOnTableInsert === 'routines') {
          throw new Error('Simulated SQLite Disk I/O Error inserting routine');
        }
        const [id, patient_id, name, notes, status, created_at, updated_at] = params;
        tables.routines.set(id, { id, patient_id, name, notes, status, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO ROUTINE_ITEMS')) {
        if (failOnTableInsert === 'routine_items') {
          throw new Error('Simulated SQLite Disk I/O Error inserting routine_item');
        }
        const [id, routine_id, exercise_id, sets, reps, springs_resistance, postural_notes, sort_order, created_at, updated_at] = params;
        tables.routine_items.set(id, { id, routine_id, exercise_id, sets, reps, springs_resistance, postural_notes, sort_order, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('PRAGMA USER_VERSION')) {
        return { user_version: 1 };
      }
      return null;
    },

    async getAllAsync(sql) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('PRAGMA FOREIGN_KEY_CHECK')) {
        if (simulateFkViolationOnCommit) {
          return [{ table: 'routine_items', rowid: 1, parent: 'exercises', fkid: 0 }];
        }
        return [];
      }
      if (trimmed.startsWith('SELECT * FROM PATIENTS')) {
        return Array.from(tables.patients.values());
      }
      if (trimmed.startsWith('SELECT * FROM ANAMNESIS')) {
        return Array.from(tables.anamnesis.values());
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
      if (trimmed.startsWith('SELECT * FROM ROUTINES')) {
        return Array.from(tables.routines.values());
      }
      if (trimmed.startsWith('SELECT * FROM ROUTINE_ITEMS')) {
        return Array.from(tables.routine_items.values());
      }
      return [];
    },
  };

  return db;
}

function createBasePayload() {
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

describe('M2 Adversarial Challenger: Backup & Restore Engine Stress Tests', () => {

  describe('1. Malformed JSON String Stress Tests', () => {
    const mockDb = createTransactionalMockDatabase();

    test('Rejects syntactically broken JSON with Portuguese error', async () => {
      const brokenStrings = [
        '{not_valid_json}',
        '{"metadata": { "app": "pilates-espaco-mulher"',
        '{"data": [1, 2, 3]',
        'undefined',
        '<xml>not json</xml>',
        '<<<CORRUPTED>>>',
      ];

      for (const broken of brokenStrings) {
        await assert.rejects(
          async () => {
            await importDatabaseBackup(mockDb, broken);
          },
          /Falha ao decodificar arquivo JSON\. O arquivo está corrompido ou mal formatado\./,
          `Should reject: ${broken}`
        );
      }
    });

    test('Rejects empty or whitespace-only strings', async () => {
      await assert.rejects(
        async () => {
          await importDatabaseBackup(mockDb, '');
        },
        /Falha ao decodificar arquivo JSON/
      );

      await assert.rejects(
        async () => {
          await importDatabaseBackup(mockDb, '    \n\t   ');
        },
        /Falha ao decodificar arquivo JSON/
      );
    });

    test('Rejects valid JSON primitives that are not backup objects', async () => {
      const primitives = ['null', '12345', '"hello"', 'true', '[1, 2, 3]'];
      for (const prim of primitives) {
        await assert.rejects(
          async () => {
            await importDatabaseBackup(mockDb, prim);
          },
          /Arquivo de backup corrompido|Conteúdo dos dados|Arquivo incompatível/
        );
      }
    });
  });

  describe('2. JSON From Foreign App (App Metadata Origin)', () => {
    test('Rejects payloads originating from other applications', () => {
      const alienApps = [
        'fitness-pal',
        'gym-manager-pro',
        'pilates-studio-generic',
        'pilates-espaco-mulher-v2-incompatible',
        '',
        null,
        undefined,
      ];

      for (const app of alienApps) {
        const payload = createBasePayload();
        payload.metadata.app = app;
        assert.throws(
          () => validateBackupPayload(payload),
          /Arquivo incompatível: este backup não pertence ao aplicativo Pilates Espaço Mulher\./
        );
      }
    });

    test('Rejects payload with missing or empty metadata object', () => {
      const payload1 = createBasePayload();
      delete payload1.metadata;
      assert.throws(
        () => validateBackupPayload(payload1),
        /Arquivo incompatível: este backup não pertence ao aplicativo Pilates Espaço Mulher\./
      );

      const payload2 = createBasePayload();
      payload2.metadata = null;
      assert.throws(
        () => validateBackupPayload(payload2),
        /Arquivo incompatível: este backup não pertence ao aplicativo Pilates Espaço Mulher\./
      );
    });
  });

  describe('3. Missing, Null, or Malformed Tables in data', () => {
    test('Rejects missing or non-object data root', () => {
      const p1 = createBasePayload();
      delete p1.data;
      assert.throws(
        () => validateBackupPayload(p1),
        /Conteúdo dos dados do backup inexistente ou corrompido\./
      );

      const p2 = createBasePayload();
      p2.data = null;
      assert.throws(
        () => validateBackupPayload(p2),
        /Conteúdo dos dados do backup inexistente ou corrompido\./
      );

      const p3 = createBasePayload();
      p3.data = 'not-an-object';
      assert.throws(
        () => validateBackupPayload(p3),
        /Conteúdo dos dados do backup inexistente ou corrompido\./
      );
    });

    test('Rejects missing or null tables for every required relational entity', () => {
      const tables = [
        'patients',
        'anamnesis',
        'postural_evaluations',
        'bioimpedance',
        'exercises',
        'routines',
        'routine_items',
      ];

      for (const table of tables) {
        // Missing property
        const payloadMissing = createBasePayload();
        delete payloadMissing.data[table];
        assert.throws(
          () => validateBackupPayload(payloadMissing),
          new RegExp(`Tabela ausente ou formato inválido no backup: ${table}`),
          `Must throw for missing table: ${table}`
        );

        // Null table
        const payloadNull = createBasePayload();
        payloadNull.data[table] = null;
        assert.throws(
          () => validateBackupPayload(payloadNull),
          new RegExp(`Tabela ausente ou formato inválido no backup: ${table}`),
          `Must throw for null table: ${table}`
        );

        // Non-array table (object or string or number)
        const payloadNonArray = createBasePayload();
        payloadNonArray.data[table] = { 'row-1': {} };
        assert.throws(
          () => validateBackupPayload(payloadNonArray),
          new RegExp(`Tabela ausente ou formato inválido no backup: ${table}`),
          `Must throw for non-array table: ${table}`
        );
      }
    });
  });

  describe('4. Dangling Foreign Keys Adversarial Mining', () => {
    test('Catches dangling patient foreign keys across all child clinical tables', () => {
      // 1. Anamnesis dangling
      const p1 = createBasePayload();
      p1.data.anamnesis.push({ id: 'ana-dangle', patient_id: 'unknown-pat-id', created_at: '' });
      assert.throws(
        () => validateBackupPayload(p1),
        /Integridade referencial violada: Anamnese ana-dangle referencia paciente inexistente unknown-pat-id\./
      );

      // 2. Postural dangling
      const p2 = createBasePayload();
      p2.data.postural_evaluations.push({ id: 'pos-dangle', patient_id: 'unknown-pat-id', evaluation_date: '2026-09-11' });
      assert.throws(
        () => validateBackupPayload(p2),
        /Integridade referencial violada: Avaliação postural pos-dangle referencia paciente inexistente unknown-pat-id\./
      );

      // 3. Bioimpedance dangling
      const p3 = createBasePayload();
      p3.data.bioimpedance.push({ id: 'bio-dangle', patient_id: 'unknown-pat-id', evaluation_date: '2026-09-11' });
      assert.throws(
        () => validateBackupPayload(p3),
        /Integridade referencial violada: Bioimpedância bio-dangle referencia paciente inexistente unknown-pat-id\./
      );

      // 4. Routine dangling
      const p4 = createBasePayload();
      p4.data.routines.push({ id: 'rou-dangle', patient_id: 'unknown-pat-id', name: 'Treino Invalido' });
      assert.throws(
        () => validateBackupPayload(p4),
        /Integridade referencial violada: Rotina de treino rou-dangle referencia paciente inexistente unknown-pat-id\./
      );
    });

    test('Catches dangling routine items (nonexistent routine or nonexistent exercise)', () => {
      // 1. Nonexistent routine
      const p1 = createBasePayload();
      p1.data.routine_items.push({ id: 'item-dangle-1', routine_id: 'ghost-routine', exercise_id: 'ex-1' });
      assert.throws(
        () => validateBackupPayload(p1),
        /Integridade referencial violada: Item de treino item-dangle-1 referencia rotina inexistente ghost-routine\./
      );

      // 2. Nonexistent exercise
      const p2 = createBasePayload();
      p2.data.routine_items.push({ id: 'item-dangle-2', routine_id: 'rou-1', exercise_id: 'ghost-exercise' });
      assert.throws(
        () => validateBackupPayload(p2),
        /Integridade referencial violada: Item de treino item-dangle-2 referencia exercício inexistente ghost-exercise\./
      );

      // 3. Null or undefined FKs in routine item
      const p3 = createBasePayload();
      p3.data.routine_items.push({ id: 'item-dangle-null', routine_id: null, exercise_id: 'ex-1' });
      assert.throws(
        () => validateBackupPayload(p3),
        /Integridade referencial violada: Item de treino item-dangle-null referencia rotina inexistente null\./
      );
    });
  });

  describe('5. Corrupt Version Numbers & Circular Reference Survival', () => {
    test('Rejects unsupported or malformed schema versions', () => {
      const corruptVersions = [0, 2, -1, 999, '1', 1.5, NaN, null, undefined];
      for (const v of corruptVersions) {
        const payload = createBasePayload();
        payload.metadata.schemaVersion = v;
        assert.throws(
          () => validateBackupPayload(payload),
          new RegExp(`Versão de schema ${v} não suportada\\.`)
        );
      }
    });

    test('validateBackupPayload safely handles non-cyclic deep objects and does not enter infinite loops', () => {
      const payload = createBasePayload();
      // Add extra custom fields without breaking standard schema
      payload.data.patients[0].customField = { nested: { deep: true } };
      assert.doesNotThrow(() => {
        validateBackupPayload(payload);
      });
    });
  });

  describe('6. Restoration of Empty Backup', () => {
    test('Validates and restores empty backup cleanly into database', async () => {
      const emptyPayload = {
        metadata: {
          version: '1.0.0',
          schemaVersion: 1,
          app: 'pilates-espaco-mulher',
          appName: 'Pilates Espaço Mulher',
          professional: {
            name: 'Dra. Rogéria Collares',
            crefito: 'CREFITO 23093-F',
            clinic: 'Pilates Espaço Mulher',
            phone: '(22) 99947-4304',
          },
          exportedAt: new Date().toISOString(),
          databaseVersion: 1,
          counts: {
            patients: 0,
            anamnesis: 0,
            postural_evaluations: 0,
            bioimpedance: 0,
            exercises: 0,
            routines: 0,
            routine_items: 0,
          },
        },
        data: {
          patients: [],
          anamnesis: [],
          postural_evaluations: [],
          bioimpedance: [],
          exercises: [],
          routines: [],
          routine_items: [],
        },
      };

      // 1. Dry run validation passes
      assert.doesNotThrow(() => validateBackupPayload(emptyPayload));

      // 2. Pre-seed DB with existing records
      const mockDb = createTransactionalMockDatabase({
        patients: [['p-pre', { id: 'p-pre', name: 'Pre-existing' }]],
        exercises: [['ex-pre', { id: 'ex-pre', name: 'Pre Exercise' }]],
      });
      assert.equal(mockDb.tables.patients.size, 1);
      assert.equal(mockDb.tables.exercises.size, 1);

      // 3. Restore empty backup
      const result = await importDatabaseBackup(mockDb, JSON.stringify(emptyPayload));
      assert.equal(result.success, true);
      assert.equal(mockDb.tables.patients.size, 0, 'Patients must be wiped to 0');
      assert.equal(mockDb.tables.exercises.size, 0, 'Exercises must be wiped to 0');
      assert.equal(mockDb.tables.routines.size, 0);
      assert.equal(mockDb.tables.routine_items.size, 0);
    });
  });

  describe('7. Transaction Rollback Atomicity Tests', () => {
    test('Leaves database 100% intact when validation fails before transaction starts', async () => {
      const mockDb = createTransactionalMockDatabase({
        patients: [
          ['pat-saved-1', { id: 'pat-saved-1', name: 'Dra. Paciente Fiel', phone: '22999' }],
          ['pat-saved-2', { id: 'pat-saved-2', name: 'Outro Paciente', phone: '22888' }],
        ],
        exercises: [
          ['ex-saved-1', { id: 'ex-saved-1', name: 'Reformer Footwork', apparatus: 'Reformer' }],
        ],
      });

      // Attempt restoring corrupted payload (dangling FK)
      const corruptedPayload = createBasePayload();
      corruptedPayload.data.routines[0].patient_id = 'nonexistent-pat-999';

      await assert.rejects(
        async () => {
          await importDatabaseBackup(mockDb, JSON.stringify(corruptedPayload));
        },
        /Integridade referencial violada/
      );

      // Verify original records are untouched
      assert.equal(mockDb.tables.patients.size, 2, 'Pre-existing patients must not be deleted');
      assert.ok(mockDb.tables.patients.has('pat-saved-1'));
      assert.ok(mockDb.tables.patients.has('pat-saved-2'));
      assert.equal(mockDb.tables.exercises.size, 1);
      assert.ok(mockDb.tables.exercises.has('ex-saved-1'));
    });

    test('Rolls back transaction when SQLite error occurs mid-restore', async () => {
      const mockDb = createTransactionalMockDatabase({
        patients: [
          ['pat-pre-existing', { id: 'pat-pre-existing', name: 'Guardada com Sucesso' }],
        ],
        exercises: [
          ['ex-pre-existing', { id: 'ex-pre-existing', name: 'Mat Hundred' }],
        ],
      });

      // Configure mock to fail during routine_items insertion
      mockDb.setFailOnTableInsert('routine_items');

      const validPayload = createBasePayload();

      await assert.rejects(
        async () => {
          await importDatabaseBackup(mockDb, JSON.stringify(validPayload));
        },
        /Simulated SQLite Disk I\/O Error inserting routine_item/
      );

      // Verify database was rolled back to pre-existing state!
      assert.equal(mockDb.tables.patients.size, 1, 'Patients must roll back to original state');
      assert.ok(mockDb.tables.patients.has('pat-pre-existing'), 'Original patient must remain intact');
      assert.equal(mockDb.tables.exercises.size, 1);
      assert.ok(mockDb.tables.exercises.has('ex-pre-existing'), 'Original exercise must remain intact');
      assert.equal(mockDb.tables.routine_items.size, 0, 'Partial routine items must not remain');
    });

    test('Rolls back transaction when PRAGMA foreign_key_check detects violation on commit', async () => {
      const mockDb = createTransactionalMockDatabase({
        patients: [
          ['pat-pre-existing', { id: 'pat-pre-existing', name: 'Paciente Guardada' }],
        ],
      });

      // Configure mock to report a foreign key violation on commit
      mockDb.setSimulateFkViolationOnCommit(true);

      const validPayload = createBasePayload();

      await assert.rejects(
        async () => {
          await importDatabaseBackup(mockDb, JSON.stringify(validPayload));
        },
        /Integridade referencial violada após restauração/
      );

      // Database must have rolled back to pre-existing state
      assert.equal(mockDb.tables.patients.size, 1);
      assert.ok(mockDb.tables.patients.has('pat-pre-existing'));
    });
  });

  describe('8. High-Volume & Large Payload Stress Test (>10,000 Records)', () => {
    test('Validates large payload (10,580 records) within <500ms without memory exhaustion', () => {
      const NUM_PATIENTS = 500;
      const NUM_EXERCISES = 80;
      const NUM_ROUTINES_PER_PAT = 2; // 1,000 routines
      const NUM_ITEMS_PER_ROUTINE = 5; // 5,000 items
      const NUM_POSTURAL_PER_PAT = 3; // 1,500
      const NUM_BIO_PER_PAT = 5; // 2,500

      const largePayload = {
        metadata: {
          version: '1.0.0',
          schemaVersion: 1,
          app: 'pilates-espaco-mulher',
          appName: 'Pilates Espaço Mulher',
          professional: {
            name: 'Dra. Rogéria Collares',
            crefito: 'CREFITO 23093-F',
            clinic: 'Pilates Espaço Mulher',
            phone: '(22) 99947-4304',
          },
          exportedAt: new Date().toISOString(),
          databaseVersion: 1,
          counts: {
            patients: NUM_PATIENTS,
            anamnesis: NUM_PATIENTS,
            postural_evaluations: NUM_PATIENTS * NUM_POSTURAL_PER_PAT,
            bioimpedance: NUM_PATIENTS * NUM_BIO_PER_PAT,
            exercises: NUM_EXERCISES,
            routines: NUM_PATIENTS * NUM_ROUTINES_PER_PAT,
            routine_items: NUM_PATIENTS * NUM_ROUTINES_PER_PAT * NUM_ITEMS_PER_ROUTINE,
          },
        },
        data: {
          patients: [],
          anamnesis: [],
          postural_evaluations: [],
          bioimpedance: [],
          exercises: [],
          routines: [],
          routine_items: [],
        },
      };

      // 1. Generate patients & anamnesis
      for (let i = 1; i <= NUM_PATIENTS; i++) {
        const patId = `pat-${i}`;
        largePayload.data.patients.push({
          id: patId,
          name: `Paciente Teste ${i}`,
          phone: `(22) 99000-${String(i).padStart(4, '0')}`,
          city_state: 'Rio das Ostras - RJ',
          status: 'active',
          created_at: '2026-09-11T20:00:00.000Z',
          updated_at: '2026-09-11T20:00:00.000Z',
        });
        largePayload.data.anamnesis.push({
          id: `ana-${i}`,
          patient_id: patId,
          created_at: '2026-09-11T20:00:00.000Z',
          updated_at: '2026-09-11T20:00:00.000Z',
        });

        for (let j = 1; j <= NUM_POSTURAL_PER_PAT; j++) {
          largePayload.data.postural_evaluations.push({
            id: `pos-${i}-${j}`,
            patient_id: patId,
            evaluation_date: '2026-09-11',
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          });
        }

        for (let k = 1; k <= NUM_BIO_PER_PAT; k++) {
          largePayload.data.bioimpedance.push({
            id: `bio-${i}-${k}`,
            patient_id: patId,
            evaluation_date: '2026-09-11',
            weight: 60 + (k % 5),
            height: 165,
            bmi: 22.0,
            body_fat_percent: 25.0,
            visceral_fat: 5,
            muscle_mass_kg: 24.0,
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          });
        }
      }

      // 2. Generate exercises
      for (let e = 1; e <= NUM_EXERCISES; e++) {
        largePayload.data.exercises.push({
          id: `ex-${e}`,
          name: `Exercício Catálogo ${e}`,
          apparatus: 'Reformer',
          is_custom: 0,
          created_at: '2026-09-11T20:00:00.000Z',
          updated_at: '2026-09-11T20:00:00.000Z',
        });
      }

      // 3. Generate routines & routine items
      let itemId = 1;
      for (let p = 1; p <= NUM_PATIENTS; p++) {
        const patId = `pat-${p}`;
        for (let r = 1; r <= NUM_ROUTINES_PER_PAT; r++) {
          const routineId = `rou-${p}-${r}`;
          largePayload.data.routines.push({
            id: routineId,
            patient_id: patId,
            name: `Treino ${r} do Paciente ${p}`,
            status: 'active',
            created_at: '2026-09-11T20:00:00.000Z',
            updated_at: '2026-09-11T20:00:00.000Z',
          });

          for (let item = 1; item <= NUM_ITEMS_PER_ROUTINE; item++) {
            const exId = `ex-${((itemId - 1) % NUM_EXERCISES) + 1}`;
            largePayload.data.routine_items.push({
              id: `item-${itemId++}`,
              routine_id: routineId,
              exercise_id: exId,
              sets: 3,
              reps: '10',
              sort_order: item,
            });
          }
        }
      }

      const totalRecords =
        largePayload.data.patients.length +
        largePayload.data.anamnesis.length +
        largePayload.data.postural_evaluations.length +
        largePayload.data.bioimpedance.length +
        largePayload.data.exercises.length +
        largePayload.data.routines.length +
        largePayload.data.routine_items.length;

      assert.equal(totalRecords, 11080, 'Total record count must equal 11,080');

      // Benchmarked in-memory graph validation
      const start = performance.now();
      assert.doesNotThrow(() => {
        validateBackupPayload(largePayload);
      });
      const elapsedMs = performance.now() - start;

      // Validation of >11k records should complete in < 500ms
      assert.ok(
        elapsedMs < 500,
        `Validation of 11,080 records took ${elapsedMs.toFixed(2)}ms (expected < 500ms)`
      );

      // Now inject a single corrupted foreign key at the very end of routine_items (index 4999)
      largePayload.data.routine_items[4999].exercise_id = 'corrupted-exercise-needle';
      assert.throws(
        () => validateBackupPayload(largePayload),
        /referencia exercício inexistente corrupted-exercise-needle/,
        'Should catch single corrupted FK needle in 10,580-record haystack'
      );
    });
  });

});
