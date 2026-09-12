require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

const {
  validateBackupPayload,
  validateBackupDataSchema,
  sanitizeText,
  sanitizeNumber,
  sanitizeOptionalNumber,
  sanitizePatientStatus,
  sanitizeJsonField,
  importDatabaseBackup,
} = require('../src/services/backupService.ts');

const { generateClinicalReportHtml } = require('../src/services/reportGenerator.ts');

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

  const db = {
    get tables() {
      return tables;
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
        const [id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, status, created_at, updated_at] = params;
        tables.patients.set(id, { id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, status, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (trimmed.startsWith('INSERT INTO EXERCISES')) {
        const [id, name, apparatus, description, default_springs, default_reps, default_sets, level, postural_focus, contraindications, is_custom, created_at, updated_at] = params;
        tables.exercises.set(id, { id, name, apparatus, description, default_springs, default_reps, default_sets, level, postural_focus, contraindications, is_custom, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (trimmed.startsWith('INSERT INTO ANAMNESIS')) {
        const [id, patient_id] = params;
        tables.anamnesis.set(id, { id, patient_id, params });
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (trimmed.startsWith('INSERT INTO POSTURAL_EVALUATIONS')) {
        const [id, patient_id] = params;
        tables.postural_evaluations.set(id, { id, patient_id, params });
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        const [id, patient_id] = params;
        tables.bioimpedance.set(id, { id, patient_id, params });
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (trimmed.startsWith('INSERT INTO ROUTINES')) {
        const [id, patient_id, name] = params;
        tables.routines.set(id, { id, patient_id, name, params });
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (trimmed.startsWith('INSERT INTO ROUTINE_ITEMS')) {
        const [id, routine_id, exercise_id] = params;
        tables.routine_items.set(id, { id, routine_id, exercise_id, params });
        return { lastInsertRowId: 1, changes: 1 };
      }
      return { lastInsertRowId: 0, changes: 0 };
    },

    async getAllAsync(sql) {
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

describe('M5 Security & Data Privacy Suite', () => {

  describe('1. Zero Cloud Leakage & Offline-First Codebase Audit', () => {
    function scanDirectory(dir, fileList = []) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          scanDirectory(filePath, fileList);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          fileList.push(filePath);
        }
      }
      return fileList;
    }

    test('Zero Firebase imports or references in src/', () => {
      const srcFiles = scanDirectory(srcDir);
      for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf8');
        assert.equal(
          /from\s+['"].*firebase.*['"]/i.test(content),
          false,
          `File ${file} must NOT import Firebase`
        );
        assert.equal(
          /require\(['"].*firebase.*['"]\)/i.test(content),
          false,
          `File ${file} must NOT require Firebase`
        );
      }
    });

    test('Zero external network endpoints in src/ except authorized GitHub Releases GET', () => {
      const srcFiles = scanDirectory(srcDir);
      const networkRegex = /https?:\/\/[^\s'")`]+/g;

      for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(networkRegex) || [];
        for (const url of matches) {
          const isWhatsAppDeepLink = url.startsWith('https://wa.me/');
          const isGitHubReleases = url.startsWith('https://api.github.com/repos/');
          assert.ok(
            isWhatsAppDeepLink || isGitHubReleases,
            `Unauthorized external network URL detected in ${file}: ${url}`
          );
        }
      }
    });
  });

  describe('2. Strict Absence of Restricted Fields (CPF, CEP, Estado Civil)', () => {
    test('TypeScript domain models exclude CPF, CEP, and Estado Civil', () => {
      const patientTypeFile = path.join(srcDir, 'types', 'patient.ts');
      const content = fs.readFileSync(patientTypeFile, 'utf8');
      const nonCommentLines = content
        .split('\n')
        .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
        .join('\n');

      assert.equal(/\bcpf\b/i.test(nonCommentLines), false, 'CPF must not exist in patient model');
      assert.equal(/\bcep\b/i.test(nonCommentLines), false, 'CEP must not exist in patient model');
      assert.equal(/estado\s*civil/i.test(nonCommentLines), false, 'Estado Civil must not exist in patient model');
      assert.equal(/marital/i.test(nonCommentLines), false, 'marital must not exist in patient model');
    });

    test('Database schema DDL excludes CPF, CEP, and Estado Civil', () => {
      const schemaFile = path.join(srcDir, 'database', 'schema.ts');
      const content = fs.readFileSync(schemaFile, 'utf8');
      const nonCommentLines = content
        .split('\n')
        .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
        .join('\n');

      assert.equal(/\bcpf\b/i.test(nonCommentLines), false, 'CPF must not exist in DDL');
      assert.equal(/\bcep\b/i.test(nonCommentLines), false, 'CEP must not exist in DDL');
      assert.equal(/estado\s*civil/i.test(nonCommentLines), false, 'Estado Civil must not exist in DDL');
    });

    test('Clinical report HTML generator strictly excludes CPF, CEP, and Estado Civil', () => {
      const mockPatient = {
        id: 'pat-sec-1',
        name: 'Juliana Paes',
        phone: '(22) 99888-1122',
        city_state: 'Rio das Ostras - RJ',
        status: 'active',
        created_at: '2026-09-12T00:00:00.000Z',
        updated_at: '2026-09-12T00:00:00.000Z',
      };

      const html = generateClinicalReportHtml(mockPatient);
      assert.equal(/\bCPF\b/i.test(html), false, 'CPF label must be completely absent from report');
      assert.equal(/\bCEP\b/i.test(html), false, 'CEP label must be completely absent from report');
      assert.equal(/Estado\s+Civil/i.test(html), false, 'Estado Civil must be completely absent from report');
    });
  });

  describe('3. Backup & Restore Deep Schema Validation & Sanitization', () => {
    test('validateBackupDataSchema rejects non-object table rows', () => {
      const payload = createBasePayload();
      payload.data.patients = ['not-an-object'];

      assert.throws(
        () => validateBackupDataSchema(payload.data),
        /Registro inválido na tabela patients: formato de objeto esperado\./
      );
    });

    test('validateBackupDataSchema rejects rows with missing or empty ID', () => {
      const payload = createBasePayload();
      payload.data.exercises = [{ name: 'Sem ID', apparatus: 'Mat' }];

      assert.throws(
        () => validateBackupDataSchema(payload.data),
        /Registro inválido na tabela exercises: identificador id obrigatório ausente\./
      );
    });

    test('sanitizeText neutralizes null-bytes (\0) and unprintable control characters', () => {
      const malicious = "Maria\0da Silva\x00'; DROP TABLE patients; --";
      const sanitized = sanitizeText(malicious);
      assert.equal(sanitized.includes('\0'), false, 'Null bytes must be stripped');
      assert.equal(sanitized, "Mariada Silva'; DROP TABLE patients; --");

      const validText = 'Atenção: flexão de quadril com 90º, dor lombar L4-L5, sem queixas crônicas.';
      assert.equal(sanitizeText(validText), validText);
    });

    test('sanitizeNumber and sanitizeOptionalNumber safely handle NaN, Infinity, and empty inputs', () => {
      assert.equal(sanitizeNumber(NaN, 10), 10);
      assert.equal(sanitizeNumber(Infinity, 0), 0);
      assert.equal(sanitizeNumber(25.5, 0), 25.5);
      assert.equal(sanitizeNumber('42', 0), 42);

      assert.equal(sanitizeOptionalNumber(null), null);
      assert.equal(sanitizeOptionalNumber(''), null);
      assert.equal(sanitizeOptionalNumber(NaN), null);
      assert.equal(sanitizeOptionalNumber(55.2), 55.2);
    });

    test('sanitizePatientStatus restricts status to active, archived, or discharged', () => {
      assert.equal(sanitizePatientStatus('active'), 'active');
      assert.equal(sanitizePatientStatus('archived'), 'archived');
      assert.equal(sanitizePatientStatus('discharged'), 'discharged');
      assert.equal(sanitizePatientStatus('unknown-status'), 'active');
      assert.equal(sanitizePatientStatus(null), 'active');
    });

    test('Atomic restore strips unauthorized demographic fields during database insertion', async () => {
      const mockDb = createTransactionalMockDatabase();
      const payload = createBasePayload();
      payload.data.patients[0].cpf = '000.111.222-33';
      payload.data.patients[0].cep = '28890-000';
      payload.data.patients[0].estado_civil = 'Casada';

      const result = await importDatabaseBackup(mockDb, JSON.stringify(payload));
      assert.equal(result.success, true);

      const inserted = mockDb.tables.patients.get('pat-1');
      assert.ok(inserted);
      assert.equal(inserted.cpf, undefined, 'CPF must NOT be inserted into database');
      assert.equal(inserted.cep, undefined, 'CEP must NOT be inserted into database');
      assert.equal(inserted.estado_civil, undefined, 'estado_civil must NOT be inserted into database');
    });
  });

  describe('4. .gitignore Security & Secret Exposure Hardening', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

    test('Properly ignores environment files (.env*)', () => {
      assert.ok(gitignoreContent.includes('.env'));
      assert.ok(gitignoreContent.includes('.env*'));
    });

    test('Properly ignores mobile signing keys (.keystore, .jks, .p12, .key)', () => {
      assert.ok(gitignoreContent.includes('*.keystore'));
      assert.ok(gitignoreContent.includes('*.jks'));
      assert.ok(gitignoreContent.includes('*.p12'));
      assert.ok(gitignoreContent.includes('*.key'));
    });

    test('Properly ignores native build outputs (.apk, .aab, .ipa, build/)', () => {
      assert.ok(gitignoreContent.includes('*.apk'));
      assert.ok(gitignoreContent.includes('*.aab'));
      assert.ok(gitignoreContent.includes('*.ipa'));
      assert.ok(gitignoreContent.includes('build/'));
    });

    test('Properly ignores local SQLite databases and backup json files', () => {
      assert.ok(gitignoreContent.includes('*.db'));
      assert.ok(gitignoreContent.includes('*.sqlite'));
      assert.ok(gitignoreContent.includes('backup*.json'));
    });
  });

});
