require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  exportDatabaseBackup,
  importDatabaseBackup,
  validateBackupPayload,
  validateBackupDataSchema,
  sanitizeText,
  sanitizeNumber,
  sanitizeOptionalNumber,
  sanitizePatientStatus,
} = require('../src/services/backupService.ts');

const {
  checkForUpdates,
  checkForUpdatesInBackground,
  compareSemVer,
  normalizeVersion,
  checkExpoUpdatesAsync,
  checkGitHubReleaseAsync,
} = require('../src/services/updateService.ts');

const mockExpoUpdates = require('./mocks/expo-updates.cjs');
const mockExpoConstants = require('./mocks/expo-constants.cjs');
const mockFileSystem = require('./mocks/expo-file-system.cjs');
const mockExpoSharing = require('./mocks/expo-sharing.cjs');

/**
 * Creates an in-memory transactional mock database for full backup and restore testing.
 * Supports ACID snapshot rollback upon any mid-transaction failure.
 */
function createTransactionalBackupMockDb(initialData = {}) {
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

  return {
    get tables() {
      return tables;
    },
    set tables(val) {
      tables = val;
    },
    setFailOnTableInsert(tableName) {
      failOnTableInsert = tableName;
    },

    async withTransactionAsync(task) {
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
          throw new Error('Simulated SQLite Disk I/O Error: failed inserting into patients');
        }
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

      if (trimmed.startsWith('INSERT INTO EXERCISES')) {
        if (failOnTableInsert === 'exercises') {
          throw new Error('Simulated SQLite Disk I/O Error: failed inserting into exercises');
        }
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

      if (trimmed.startsWith('INSERT INTO ANAMNESIS')) {
        if (failOnTableInsert === 'anamnesis') {
          throw new Error('Simulated SQLite Disk I/O Error: failed inserting into anamnesis');
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
        if (failOnTableInsert === 'postural_evaluations') {
          throw new Error('Simulated SQLite Disk I/O Error: failed inserting into postural_evaluations');
        }
        const [
          id, patient_id, evaluation_date, head, cervical_spine, shoulders,
          scapulae, thoracic_spine, lumbar_spine, pelvis, knees, feet,
          thales_triangle, frontal_photo_uri, lateral_photo_uri, posterior_photo_uri,
          asymmetry_detected, thoracic_kyphosis, lumbar_lordosis, gluteal_line,
          popliteal_line, scoliosis, musculature, notes, created_at, updated_at,
        ] = params;
        tables.postural_evaluations.set(id, {
          id, patient_id, evaluation_date, head, cervical_spine, shoulders,
          scapulae, thoracic_spine, lumbar_spine, pelvis, knees, feet,
          thales_triangle, frontal_photo_uri, lateral_photo_uri, posterior_photo_uri,
          asymmetry_detected, thoracic_kyphosis, lumbar_lordosis, gluteal_line,
          popliteal_line, scoliosis, musculature, notes, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        if (failOnTableInsert === 'bioimpedance') {
          throw new Error('Simulated SQLite Disk I/O Error: failed inserting into bioimpedance');
        }
        const [
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat,
          muscle_mass_kg, body_water_pct, ideal_weight, target_weight,
          fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r, fat_leg_l,
          clinical_opinion, created_at, updated_at,
        ] = params;
        tables.bioimpedance.set(id, {
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat,
          muscle_mass_kg, body_water_pct, ideal_weight, target_weight,
          fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r, fat_leg_l,
          clinical_opinion, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO ROUTINES')) {
        if (failOnTableInsert === 'routines') {
          throw new Error('Simulated SQLite Disk I/O Error: failed inserting into routines');
        }
        const [id, patient_id, name, notes, status, created_at, updated_at] = params;
        tables.routines.set(id, { id, patient_id, name, notes, status, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO ROUTINE_ITEMS')) {
        if (failOnTableInsert === 'routine_items') {
          throw new Error('Simulated SQLite Disk I/O Error: failed inserting into routine_items');
        }
        const [
          id, routine_id, exercise_id, sets, reps, springs_resistance,
          postural_notes, sort_order, created_at, updated_at,
        ] = params;
        tables.routine_items.set(id, {
          id, routine_id, exercise_id, sets, reps, springs_resistance,
          postural_notes, sort_order, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.includes('PRAGMA USER_VERSION')) {
        return { user_version: 1 };
      }
      return null;
    },

    async getAllAsync(sql) {
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
}

describe('M6 Backup Engine & Offline Update Detection Suite', () => {
  // ============================================================================
  // 1. Backup Exporting: Valid JSON & All 7 Relational Tables
  // ============================================================================
  describe('1. Backup Export: Valid JSON Generation Containing All 7 Tables', () => {
    let mockDb;

    beforeEach(() => {
      mockDb = createTransactionalBackupMockDb({
        patients: [
          ['pat-1', { id: 'pat-1', name: 'Maria Silva', phone: '(22) 99999-1111', city_state: 'Rio das Ostras - RJ', status: 'active', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
          ['pat-2', { id: 'pat-2', name: 'Carla Dias', phone: '(22) 98888-2222', city_state: 'Rio das Ostras - RJ', status: 'discharged', created_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z' }],
        ],
        anamnesis: [
          ['ana-1', { id: 'ana-1', patient_id: 'pat-1', pain_intensity: 7, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
        ],
        postural_evaluations: [
          ['pos-1', { id: 'pos-1', patient_id: 'pat-1', evaluation_date: '2026-01-01', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
        ],
        bioimpedance: [
          ['bio-1', { id: 'bio-1', patient_id: 'pat-1', evaluation_date: '2026-01-01', weight: 65, height: 165, bmi: 23.9, body_fat_percent: 28, visceral_fat: 5, muscle_mass_kg: 24, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
        ],
        exercises: [
          ['ex-1', { id: 'ex-1', name: 'Footwork', apparatus: 'Reformer', is_custom: 0, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
        ],
        routines: [
          ['rou-1', { id: 'rou-1', patient_id: 'pat-1', name: 'Treino A', status: 'active', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
        ],
        routine_items: [
          ['ri-1', { id: 'ri-1', routine_id: 'rou-1', exercise_id: 'ex-1', sets: 3, reps: '10', sort_order: 0, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
        ],
      });
    });

    test('Exports complete database into valid JSON containing all 7 tables and exact entity counts', async () => {
      const result = await exportDatabaseBackup(mockDb);

      assert.equal(result.success, true);
      assert.ok(result.jsonString);
      assert.ok(result.filename.startsWith('backup_espaco_mulher_'));
      assert.ok(result.filename.endsWith('.json'));

      // Validate JSON parse
      const parsed = JSON.parse(result.jsonString);

      // Metadata assertions
      assert.equal(parsed.metadata.app, 'pilates-espaco-mulher');
      assert.equal(parsed.metadata.appName, 'Pilates Espaço Mulher');
      assert.equal(parsed.metadata.schemaVersion, 1);
      assert.equal(parsed.metadata.version, '1.0.0');
      assert.equal(parsed.metadata.professional.name, 'Dra. Rogéria Collares');
      assert.equal(parsed.metadata.professional.crefito, 'CREFITO 23093-F');
      assert.equal(parsed.metadata.databaseVersion, 1);

      // Counts assertions
      assert.deepEqual(parsed.metadata.counts, {
        patients: 2,
        anamnesis: 1,
        postural_evaluations: 1,
        bioimpedance: 1,
        exercises: 1,
        routines: 1,
        routine_items: 1,
      });

      // Data table assertions
      assert.equal(parsed.data.patients.length, 2);
      assert.equal(parsed.data.anamnesis.length, 1);
      assert.equal(parsed.data.postural_evaluations.length, 1);
      assert.equal(parsed.data.bioimpedance.length, 1);
      assert.equal(parsed.data.exercises.length, 1);
      assert.equal(parsed.data.routines.length, 1);
      assert.equal(parsed.data.routine_items.length, 1);
    });

    test('STRICT PRIVACY CONSTRAINT: Exported JSON strictly omits CPF, CEP, and Estado Civil', async () => {
      const result = await exportDatabaseBackup(mockDb);
      assert.doesNotMatch(result.jsonString, /"cpf"/i, 'Backup JSON must not contain CPF key');
      assert.doesNotMatch(result.jsonString, /"cep"/i, 'Backup JSON must not contain CEP key');
      assert.doesNotMatch(result.jsonString, /"estado_civil"/i, 'Backup JSON must not contain estado_civil key');
    });
  });

  // ============================================================================
  // 2. Backup Importing: Corrupted Data, Referential Integrity & Rollback Protection
  // ============================================================================
  describe('2. Backup Import: Corrupted Data Rejection & Transaction Rollback Protection', () => {
    let mockDb;

    function buildValidBackupObject() {
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
          exportedAt: '2026-09-12T00:00:00.000Z',
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
            { id: 'pat-val', name: 'Beatriz Ramos', phone: '(22) 99888-7777', city_state: 'Rio das Ostras - RJ', status: 'active' },
          ],
          anamnesis: [
            { id: 'ana-val', patient_id: 'pat-val' },
          ],
          postural_evaluations: [
            { id: 'pos-val', patient_id: 'pat-val', evaluation_date: '2026-09-12' },
          ],
          bioimpedance: [
            { id: 'bio-val', patient_id: 'pat-val', evaluation_date: '2026-09-12', weight: 58, height: 162, bmi: 22.1, body_fat_percent: 24, visceral_fat: 4, muscle_mass_kg: 22 },
          ],
          exercises: [
            { id: 'ex-val', name: 'Chest Expansion', apparatus: 'Cadillac', is_custom: 0 },
          ],
          routines: [
            { id: 'rou-val', patient_id: 'pat-val', name: 'Prescrição Postural', status: 'active' },
          ],
          routine_items: [
            { id: 'ri-val', routine_id: 'rou-val', exercise_id: 'ex-val', sets: 2, reps: '10', sort_order: 0 },
          ],
        },
      };
    }

    beforeEach(() => {
      // Existing data in database before restore
      mockDb = createTransactionalBackupMockDb({
        patients: [
          ['pat-existing', { id: 'pat-existing', name: 'Paciente Anterior', phone: '(22) 91111-0000', status: 'active' }],
        ],
      });
    });

    test('Rejects malformed / truncated JSON string without altering database state', async () => {
      const malformedJson = '{"metadata": {"app": "pilates-espaco-mulher", ... CORRUPTED DATA';

      await assert.rejects(
        async () => {
          await importDatabaseBackup(mockDb, malformedJson);
        },
        /Falha ao decodificar arquivo JSON/
      );

      // Existing data must remain intact
      assert.equal(mockDb.tables.patients.size, 1);
      assert.equal(mockDb.tables.patients.has('pat-existing'), true);
    });

    test('Rejects backup from wrong app origin or incompatible schema version', () => {
      const wrongApp = buildValidBackupObject();
      wrongApp.metadata.app = 'another-unauthorized-app';
      assert.throws(() => validateBackupPayload(wrongApp), /Arquivo incompatível/);

      const wrongVersion = buildValidBackupObject();
      wrongVersion.metadata.schemaVersion = 99;
      assert.throws(() => validateBackupPayload(wrongVersion), /Versão de schema 99 não suportada/);
    });

    test('Rejects backup missing any required relational table', () => {
      const missingTable = buildValidBackupObject();
      delete missingTable.data.bioimpedance;
      assert.throws(() => validateBackupPayload(missingTable), /Tabela ausente ou formato inválido no backup: bioimpedance/);
    });

    test('Rejects records with missing or empty ID strings', () => {
      const missingId = buildValidBackupObject();
      missingId.data.patients[0].id = '   ';
      assert.throws(() => validateBackupPayload(missingId), /identificador id obrigatório ausente/);
    });

    test('DRY-RUN REFERENTIAL INTEGRITY: Detects orphan foreign keys before database execution', () => {
      // Orphan anamnesis referencing non-existent patient
      const orphanAna = buildValidBackupObject();
      orphanAna.data.anamnesis[0].patient_id = 'ghost-patient';
      assert.throws(() => validateBackupPayload(orphanAna), /Anamnese ana-val referencia paciente inexistente ghost-patient/);

      // Orphan bioimpedance referencing non-existent patient
      const orphanBio = buildValidBackupObject();
      orphanBio.data.bioimpedance[0].patient_id = 'ghost-patient';
      assert.throws(() => validateBackupPayload(orphanBio), /Bioimpedância bio-val referencia paciente inexistente ghost-patient/);

      // Orphan routine item referencing non-existent routine
      const orphanItemRoutine = buildValidBackupObject();
      orphanItemRoutine.data.routine_items[0].routine_id = 'ghost-routine';
      assert.throws(() => validateBackupPayload(orphanItemRoutine), /Item de treino ri-val referencia rotina inexistente ghost-routine/);

      // Orphan routine item referencing non-existent exercise
      const orphanItemExercise = buildValidBackupObject();
      orphanItemExercise.data.routine_items[0].exercise_id = 'ghost-exercise';
      assert.throws(() => validateBackupPayload(orphanItemExercise), /Item de treino ri-val referencia exercício inexistente ghost-exercise/);
    });

    test('TRANSACTION ROLLBACK ATOMICITY: Mid-restore SQLite error completely rolls back initial data', async () => {
      assert.equal(mockDb.tables.patients.size, 1);
      assert.equal(mockDb.tables.patients.has('pat-existing'), true);

      // Simulate a disk error when writing bioimpedance table
      mockDb.setFailOnTableInsert('bioimpedance');

      const validBackup = buildValidBackupObject();
      const validJson = JSON.stringify(validBackup);

      await assert.rejects(
        async () => {
          await importDatabaseBackup(mockDb, validJson);
        },
        /failed inserting into bioimpedance/
      );

      // CRITICAL ASSERTION: The rollback must have restored 'pat-existing', NOT leave the database empty!
      assert.equal(mockDb.tables.patients.size, 1, 'Database must retain exactly initial count');
      assert.equal(mockDb.tables.patients.has('pat-existing'), true, 'Initial patient must be restored by transaction rollback');
      assert.equal(mockDb.tables.bioimpedance.size, 0, 'No half-imported bioimpedance records should linger');
    });

    test('Sanitizes text inputs stripping null bytes and unprintable characters during restore', () => {
      const dirty = 'Nome\0com\x01caracteres\x1Filícitos';
      const clean = sanitizeText(dirty);
      assert.equal(clean, 'Nomecomcaracteresilícitos');

      // Preserves valid Portuguese text with accents and normal whitespace
      const validPt = 'Dra. Rogéria Collares — Avaliação Postural & Cinesiologia';
      assert.equal(sanitizeText(validPt), validPt);
    });

    test('Sanitizes numeric inputs handling NaN, Infinity, and empty values gracefully', () => {
      assert.equal(sanitizeNumber(42), 42);
      assert.equal(sanitizeNumber(NaN, 10), 10);
      assert.equal(sanitizeNumber(Infinity, 0), 0);
      assert.equal(sanitizeOptionalNumber(''), null);
      assert.equal(sanitizeOptionalNumber(null), null);
      assert.equal(sanitizeOptionalNumber(25.5), 25.5);
    });

    test('Restores full valid backup successfully with topological ordering and accurate counts', async () => {
      const validBackup = buildValidBackupObject();
      const validJson = JSON.stringify(validBackup);

      const importResult = await importDatabaseBackup(mockDb, validJson);

      assert.equal(importResult.success, true);
      assert.deepEqual(importResult.restoredCounts, validBackup.metadata.counts);

      // Verify all tables were populated with new data
      assert.equal(mockDb.tables.patients.has('pat-val'), true);
      assert.equal(mockDb.tables.anamnesis.has('ana-val'), true);
      assert.equal(mockDb.tables.postural_evaluations.has('pos-val'), true);
      assert.equal(mockDb.tables.bioimpedance.has('bio-val'), true);
      assert.equal(mockDb.tables.exercises.has('ex-val'), true);
      assert.equal(mockDb.tables.routines.has('rou-val'), true);
      assert.equal(mockDb.tables.routine_items.has('ri-val'), true);
    });
  });

  // ============================================================================
  // 3. Offline-First Update Detection & Graceful Degradation
  // ============================================================================
  describe('3. Update Detection Service: Offline Resiliency & Dual Fallback Strategy', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      mockExpoUpdates.__reset();
      mockExpoUpdates.__setMockState({
        isEnabled: false,
        isAvailable: false,
      });
      mockExpoConstants.expoConfig.version = '1.0.0';
      globalThis.fetch = originalFetch;
    });

    test('Semantic versioning comparator (compareSemVer & normalizeVersion)', () => {
      assert.equal(compareSemVer('1.0.1', '1.0.0'), 1);
      assert.equal(compareSemVer('1.0.0', '1.0.1'), -1);
      assert.equal(compareSemVer('1.0.0', '1.0.0'), 0);
      assert.equal(compareSemVer('v2.0.0', '1.9.9'), 1);
      assert.equal(compareSemVer('1.10.0', '1.9.0'), 1);
      assert.equal(normalizeVersion('  v1.0.5  '), '1.0.5');
      assert.equal(normalizeVersion(null), '0.0.0');
    });

    test('Primary check: detects OTA update via expo-updates when available', async () => {
      mockExpoUpdates.__setMockState({
        isEnabled: true,
        isAvailable: true,
        manifest: { id: 'update-ota-101' },
      });

      const res = await checkForUpdates({ silent: true });
      assert.equal(res.isAvailable, true);
      assert.equal(res.source, 'expo-updates');
      assert.equal(res.currentVersion, '1.0.0');
    });

    test('OFFLINE DEGRADATION: Airplane mode / network failure never throws and degrades gracefully', async () => {
      mockExpoUpdates.__setMockState({
        isEnabled: true,
        checkError: new Error('Network request failed: device is offline'),
      });

      // Simulate complete network failure on fetch
      globalThis.fetch = async () => {
        throw new TypeError('fetch failed: network unreachable (offline)');
      };

      // Both methods must resolve safely without throwing
      const otaRes = await checkExpoUpdatesAsync();
      assert.equal(otaRes, null);

      const ghRes = await checkGitHubReleaseAsync('pilates-espaco-mulher', 'pilates-espaco-mulher', '1.0.0', 500);
      assert.equal(ghRes, null);

      const fullCheckRes = await checkForUpdates({ silent: true });
      assert.equal(fullCheckRes.isAvailable, false);
      assert.equal(fullCheckRes.source, 'none');
      assert.equal(fullCheckRes.currentVersion, '1.0.0');
    });

    test('OFFLINE DEGRADATION: HTTP 404, 500 or GitHub rate-limits degrade silently', async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: 'API rate limit exceeded' }),
      });

      const ghRes = await checkGitHubReleaseAsync('pilates-espaco-mulher', 'pilates-espaco-mulher', '1.0.0', 500);
      assert.equal(ghRes, null);

      const fullCheck = await checkForUpdates({ silent: true });
      assert.equal(fullCheck.isAvailable, false);
    });

    test('Fallback check: detects update via GitHub Releases when expo-updates has no update', async () => {
      mockExpoUpdates.__setMockState({
        isEnabled: false,
        isAvailable: false,
      });

      globalThis.fetch = async (url) => ({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: 'v1.1.0',
          name: 'Release 1.1.0 — Melhorias de Bioimpedância',
          body: 'Atualização das equações de composição corporal e relatório PDF.',
          html_url: 'https://github.com/pilates-espaco-mulher/pilates-espaco-mulher/releases/tag/v1.1.0',
          published_at: '2026-09-12T12:00:00Z',
          assets: [
            {
              name: 'pilates-espaco-mulher-v1.1.0.apk',
              browser_download_url: 'https://github.com/pilates-espaco-mulher/pilates-espaco-mulher/releases/download/v1.1.0/app.apk',
              size: 45000000,
              content_type: 'application/vnd.android.package-archive',
            },
          ],
        }),
      });

      const res = await checkForUpdates({ silent: true });
      assert.equal(res.isAvailable, true);
      assert.equal(res.source, 'github-release');
      assert.equal(res.latestVersion, '1.1.0');
      assert.equal(res.downloadUrl, 'https://github.com/pilates-espaco-mulher/pilates-espaco-mulher/releases/download/v1.1.0/app.apk');
      assert.ok(res.releaseNotes?.includes('Atualização das equações'));
    });

    test('Non-blocking background update check (checkForUpdatesInBackground)', async () => {
      let callbackFired = false;
      let callbackResult = null;

      mockExpoUpdates.__setMockState({
        isEnabled: false,
        isAvailable: false,
      });

      // Mock GitHub 200 with no update (same version)
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: 'v1.0.0',
          html_url: 'https://github.com/pilates-espaco-mulher/pilates-espaco-mulher/releases/tag/v1.0.0',
        }),
      });

      checkForUpdatesInBackground((result) => {
        callbackFired = true;
        callbackResult = result;
      });

      // Wait a tick for non-blocking task to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.equal(callbackFired, true);
      assert.ok(callbackResult);
      assert.equal(callbackResult.isAvailable, false);
    });
  });
});
