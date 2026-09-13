/**
 * tests/m8_clinical_expansion.test.js
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Comprehensive QA Test Suite for Clinical Expansion:
 * 1. Database Migration v3 & Schema Extensions (Atomicity, new columns, CASCADE keys, indices)
 * 2. Extended Patient Demographics & Insurances (E-mail, Profession, Activity Time, Marital Status, Avatar URI, Insurances)
 * 3. Reformulated Clinical Anamnesis (Expanded clinical history, pregnancy structure, delivery types, miscarriages)
 * 4. Postural Examination & Hip Alignment (hip_alignment tracking)
 * 5. Biometrics & Didactic Reference Tables (Female abdominal circ, chronological vs body age, body fat %, visceral fat)
 * 6. Patient Condition Photos Repository (CRUD, ordering, cascade integrity)
 * 7. Clinical PDF Report HTML Generation (All new blocks rendered & sanitized via escapeHtml)
 */

require('./mock-rn.cjs');
require('tsx/cjs');

const path = require('node:path');
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const projectRoot = path.resolve(__dirname, '..');

const {
  patientRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'patientRepository.ts'));
const {
  anamnesisRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'anamnesisRepository.ts'));
const {
  posturalRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'posturalRepository.ts'));
const {
  bioimpedanceRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'bioimpedanceRepository.ts'));
const {
  conditionPhotoRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'conditionPhotoRepository.ts'));
const {
  classifyAbdominalCircumference,
  classifyBodyFatPercent,
  classifyVisceralFat,
  compareAges,
  ABDOMINAL_CIRCUMFERENCE_REFERENCE_TABLE,
  BODY_FAT_REFERENCE_TABLE,
  BMI_REFERENCE_TABLE,
  VISCERAL_FAT_REFERENCE_TABLE,
} = require(path.join(projectRoot, 'src', 'utils', 'biometrics.ts'));
const {
  generateClinicalReportHtml,
  CLINIC_REPORT_IDENTITY,
} = require(path.join(projectRoot, 'src', 'services', 'reportGenerator.ts'));
const {
  MIGRATIONS,
  addColumnIfNotExists,
} = require(path.join(projectRoot, 'src', 'database', 'migrations.ts'));
const {
  SCHEMA_V3_TABLES,
  SCHEMA_V3_INDICES,
  SCHEMA_V3_DDL,
} = require(path.join(projectRoot, 'src', 'database', 'schema.ts'));

/**
 * Creates an in-memory transactional mock database supporting all Clinical Expansion entities.
 */
function createMockClinicalExpansionDb() {
  const patientsTable = new Map();
  const anamnesisTable = new Map();
  const posturalTable = new Map();
  const bioimpedanceTable = new Map();
  const conditionPhotosTable = new Map();

  return {
    patientsTable,
    anamnesisTable,
    posturalTable,
    bioimpedanceTable,
    conditionPhotosTable,

    async execAsync() {},
    async withTransactionAsync(task) {
      await task();
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
        patientsTable.set(id, {
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, profession, activity_time,
          marital_status, avatar_uri, status, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE PATIENTS
      if (trimmed.startsWith('UPDATE PATIENTS')) {
        const id = params[params.length - 1];
        const existing = patientsTable.get(id);
        if (existing) {
          const updated = { ...existing };
          let idx = 0;
          if (trimmed.includes('NAME = ?')) updated.name = params[idx++];
          if (trimmed.includes('BIRTHDATE = ?')) updated.birthdate = params[idx++];
          if (trimmed.includes('AGE = ?')) updated.age = params[idx++];
          if (trimmed.includes('PHONE = ?')) updated.phone = params[idx++];
          if (trimmed.includes('ADDRESS = ?')) updated.address = params[idx++];
          if (trimmed.includes('NEIGHBORHOOD = ?')) updated.neighborhood = params[idx++];
          if (trimmed.includes('CITY_STATE = ?')) updated.city_state = params[idx++];
          if (trimmed.includes('EMAIL = ?')) updated.email = params[idx++];
          if (trimmed.includes('INSURANCE = ?')) updated.insurance = params[idx++];
          if (trimmed.includes('PROFESSION = ?')) updated.profession = params[idx++];
          if (trimmed.includes('ACTIVITY_TIME = ?')) updated.activity_time = params[idx++];
          if (trimmed.includes('MARITAL_STATUS = ?')) updated.marital_status = params[idx++];
          if (trimmed.includes('AVATAR_URI = ?')) updated.avatar_uri = params[idx++];
          if (trimmed.includes('STATUS = ?')) updated.status = params[idx++];
          if (trimmed.includes('UPDATED_AT = ?')) updated.updated_at = params[idx++];
          patientsTable.set(id, updated);
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // INSERT ANAMNESIS
      if (trimmed.startsWith('INSERT INTO ANAMNESIS')) {
        const colMatch = sql.match(/INSERT\s+INTO\s+anamnesis\s*\(([^)]+)\)/i);
        if (colMatch) {
          const cols = colMatch[1].split(',').map((c) => c.trim().toLowerCase());
          const record = {};
          cols.forEach((col, idx) => {
            record[col] = params[idx];
          });
          anamnesisTable.set(record.id, record);
          return { lastInsertRowId: 1, changes: 1 };
        }
        const [
          id, patient_id, main_complaint, clinical_history, lifestyle,
          medications, surgeries, fractures_luxations,
          pregnancies, abortions, pain_complaints, date,
          created_at, updated_at,
        ] = params;
        anamnesisTable.set(id, {
          id, patient_id, main_complaint, clinical_history, lifestyle,
          medications, surgeries, fractures_luxations,
          pregnancies, abortions, pain_complaints, date,
          created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE ANAMNESIS
      if (trimmed.startsWith('UPDATE ANAMNESIS')) {
        const patientId = params[params.length - 1];
        let existing = null;
        for (const record of anamnesisTable.values()) {
          if (record.patient_id === patientId || record.id === patientId) {
            existing = record;
            break;
          }
        }
        if (existing) {
          const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
          if (setMatch) {
            const assignments = setMatch[1].split(',').map((a) => a.trim().split('=')[0].trim().toLowerCase());
            assignments.forEach((col, idx) => {
              existing[col] = params[idx];
            });
          }
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // INSERT POSTURAL_EVALUATIONS
      if (trimmed.startsWith('INSERT INTO POSTURAL_EVALUATIONS')) {
        const [
          id, patient_id, evaluation_date, head, shoulders, thales_triangle,
          knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar,
          pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line,
          popliteal_line, hip_alignment, musculature, photo_frontal_uri, photo_lateral_uri,
          photo_posterior_uri, notes, created_at, updated_at,
        ] = params;
        posturalTable.set(id, {
          id, patient_id, evaluation_date, head, shoulders, thales_triangle,
          knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar,
          pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line,
          popliteal_line, hip_alignment, musculature, photo_frontal_uri, photo_lateral_uri,
          photo_posterior_uri, notes, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE POSTURAL_EVALUATIONS
      if (trimmed.startsWith('UPDATE POSTURAL_EVALUATIONS')) {
        const id = params[params.length - 1];
        const existing = posturalTable.get(id);
        if (existing) {
          const updated = { ...existing };
          let idx = 0;
          if (trimmed.includes('EVALUATION_DATE = ?')) updated.evaluation_date = params[idx++];
          if (trimmed.includes('HEAD = ?')) updated.head = params[idx++];
          if (trimmed.includes('SHOULDERS = ?')) updated.shoulders = params[idx++];
          if (trimmed.includes('THALES_TRIANGLE = ?')) updated.thales_triangle = params[idx++];
          if (trimmed.includes('KNEES = ?')) updated.knees = params[idx++];
          if (trimmed.includes('FEET = ?')) updated.feet = params[idx++];
          if (trimmed.includes('CERVICAL = ?')) updated.cervical = params[idx++];
          if (trimmed.includes('LATERAL_SHOULDERS = ?')) updated.lateral_shoulders = params[idx++];
          if (trimmed.includes('ABDOMEN = ?')) updated.abdomen = params[idx++];
          if (trimmed.includes('DORSAL = ?')) updated.dorsal = params[idx++];
          if (trimmed.includes('LUMBAR = ?')) updated.lumbar = params[idx++];
          if (trimmed.includes('PELVIS = ?')) updated.pelvis = params[idx++];
          if (trimmed.includes('ARCH = ?')) updated.arch = params[idx++];
          if (trimmed.includes('SCAPULA = ?')) updated.scapula = params[idx++];
          if (trimmed.includes('SCOLIOSIS = ?')) updated.scoliosis = params[idx++];
          if (trimmed.includes('POSTERIOR_PELVIS = ?')) updated.posterior_pelvis = params[idx++];
          if (trimmed.includes('GLUTEAL_LINE = ?')) updated.gluteal_line = params[idx++];
          if (trimmed.includes('POPLITEAL_LINE = ?')) updated.popliteal_line = params[idx++];
          if (trimmed.includes('HIP_ALIGNMENT = ?')) updated.hip_alignment = params[idx++];
          if (trimmed.includes('MUSCULATURE = ?')) updated.musculature = params[idx++];
          if (trimmed.includes('PHOTO_FRONTAL_URI = ?')) updated.photo_frontal_uri = params[idx++];
          if (trimmed.includes('PHOTO_LATERAL_URI = ?')) updated.photo_lateral_uri = params[idx++];
          if (trimmed.includes('PHOTO_POSTERIOR_URI = ?')) updated.photo_posterior_uri = params[idx++];
          if (trimmed.includes('NOTES = ?')) updated.notes = params[idx++];
          if (trimmed.includes('UPDATED_AT = ?')) updated.updated_at = params[idx++];
          posturalTable.set(id, updated);
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // INSERT BIOIMPEDANCE
      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        const [
          id, patient_id, weight, height, body_fat_percent,
          muscle_mass_percent, visceral_fat, basal_metabolic_rate,
          body_age, chronological_age, water_percent, bone_mass,
          abdominal_circ, date, notes, created_at, updated_at,
        ] = params;
        bioimpedanceTable.set(id, {
          id, patient_id, weight, height, body_fat_percent,
          muscle_mass_percent, visceral_fat, basal_metabolic_rate,
          body_age, chronological_age, water_percent, bone_mass,
          abdominal_circ, date, notes, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // INSERT PATIENT_CONDITION_PHOTOS
      if (trimmed.startsWith('INSERT INTO PATIENT_CONDITION_PHOTOS')) {
        const [id, patient_id, photo_uri, category, title, notes, date, created_at, updated_at] = params;
        conditionPhotosTable.set(id, {
          id, patient_id, photo_uri, category, title, notes, date, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE PATIENT_CONDITION_PHOTOS
      if (trimmed.startsWith('UPDATE PATIENT_CONDITION_PHOTOS')) {
        const id = params[params.length - 1];
        const existing = conditionPhotosTable.get(id);
        if (existing) {
          const updated = { ...existing };
          let idx = 0;
          if (trimmed.includes('CATEGORY = ?')) updated.category = params[idx++];
          if (trimmed.includes('TITLE = ?')) updated.title = params[idx++];
          if (trimmed.includes('NOTES = ?')) updated.notes = params[idx++];
          if (trimmed.includes('DATE = ?')) updated.date = params[idx++];
          if (trimmed.includes('UPDATED_AT = ?')) updated.updated_at = params[idx++];
          conditionPhotosTable.set(id, updated);
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // DELETE PATIENT_CONDITION_PHOTOS
      if (trimmed.startsWith('DELETE FROM PATIENT_CONDITION_PHOTOS WHERE ID = ?')) {
        const had = conditionPhotosTable.delete(params[0]);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      // DELETE PATIENTS (with simulated CASCADE)
      if (trimmed.startsWith('DELETE FROM PATIENTS WHERE ID = ?')) {
        const pid = params[0];
        const had = patientsTable.delete(pid);
        for (const [photoId, photo] of conditionPhotosTable.entries()) {
          if (photo.patient_id === pid) {
            conditionPhotosTable.delete(photoId);
          }
        }
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM PATIENTS WHERE ID = ?')) {
        return patientsTable.get(params[0]) || null;
      }
      if (trimmed.startsWith('SELECT * FROM ANAMNESIS WHERE ID = ?')) {
        return anamnesisTable.get(params[0]) || null;
      }
      if (trimmed.startsWith('SELECT * FROM ANAMNESIS WHERE PATIENT_ID = ?')) {
        for (const a of anamnesisTable.values()) {
          if (a.patient_id === params[0]) return a;
        }
        return null;
      }
      if (trimmed.startsWith('SELECT * FROM POSTURAL_EVALUATIONS WHERE ID = ?')) {
        return posturalTable.get(params[0]) || null;
      }
      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE ID = ?')) {
        return bioimpedanceTable.get(params[0]) || null;
      }
      if (trimmed.startsWith('SELECT * FROM PATIENT_CONDITION_PHOTOS WHERE ID = ?')) {
        return conditionPhotosTable.get(params[0]) || null;
      }
      if (trimmed.includes('COUNT(*)') && trimmed.includes('FROM PATIENT_CONDITION_PHOTOS WHERE PATIENT_ID = ?')) {
        let count = 0;
        for (const photo of conditionPhotosTable.values()) {
          if (photo.patient_id === params[0]) count++;
        }
        return { count };
      }
      return null;
    },

    async getAllAsync(sql, params = []) {
      const normalized = sql.trim().toUpperCase().replace(/\s+/g, ' ');

      if (normalized.includes('FROM PATIENTS')) {
        return Array.from(patientsTable.values());
      }
      if (normalized.includes('FROM PATIENT_CONDITION_PHOTOS WHERE PATIENT_ID = ?')) {
        const pid = params[0];
        const res = [];
        for (const photo of conditionPhotosTable.values()) {
          if (photo.patient_id === pid) res.push(photo);
        }
        return res.sort((a, b) => b.date.localeCompare(a.date));
      }
      if (normalized.includes('FROM POSTURAL_EVALUATIONS WHERE PATIENT_ID = ?')) {
        const pid = params[0];
        const res = [];
        for (const post of posturalTable.values()) {
          if (post.patient_id === pid) res.push(post);
        }
        return res.sort((a, b) => b.evaluation_date.localeCompare(a.evaluation_date));
      }
      return [];
    },
  };
}

describe('M8 Clinical Expansion QA Test Suite', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockClinicalExpansionDb();
  });

  // ============================================================================
  // 1. Teste de Banco de Dados e Migração v3
  // ============================================================================
  describe('1. Database Migration v3 & Schema Extensions', () => {
    test('Migration v3 exists in MIGRATIONS registry with version 3 and descriptive name', () => {
      const migrationV3 = MIGRATIONS.find((m) => m.version === 3);
      assert.ok(migrationV3, 'Migration v3 must be registered in MIGRATIONS array');
      assert.strictEqual(migrationV3.version, 3);
      assert.strictEqual(migrationV3.name, 'v3_clinical_enhancements_photos_and_profiles');
      assert.strictEqual(typeof migrationV3.up, 'function', 'migration v3.up must be a function');
    });

    test('Migration v3 declares all required columns across clinical tables', async () => {
      const executedCommands = [];
      const mockMigrationDb = {
        async execAsync(sql) {
          executedCommands.push(sql);
        },
        async getAllAsync(sql, params = []) {
          return [];
        },
      };

      const migrationV3 = MIGRATIONS.find((m) => m.version === 3);
      await migrationV3.up(mockMigrationDb);

      const combinedSql = executedCommands.join('\n').toUpperCase();

      // Check added columns in patients
      assert.ok(combinedSql.includes('PROFESSION'), 'Must add profession to patients');
      assert.ok(combinedSql.includes('ACTIVITY_TIME'), 'Must add activity_time to patients');
      assert.ok(combinedSql.includes('MARITAL_STATUS'), 'Must add marital_status to patients');
      assert.ok(combinedSql.includes('AVATAR_URI'), 'Must add avatar_uri to patients');

      // Check added column in anamnesis
      assert.ok(combinedSql.includes('CLINICAL_HISTORY'), 'Must add clinical_history to anamnesis');

      // Check added column in postural_evaluations
      assert.ok(combinedSql.includes('HIP_ALIGNMENT'), 'Must add hip_alignment to postural_evaluations');

      // Check added column in bioimpedance
      assert.ok(combinedSql.includes('CHRONOLOGICAL_AGE'), 'Must add chronological_age to bioimpedance');

      // Check patient_condition_photos table creation
      assert.ok(combinedSql.includes('CREATE TABLE IF NOT EXISTS PATIENT_CONDITION_PHOTOS'), 'Must create patient_condition_photos');
      assert.ok(combinedSql.includes('FOREIGN KEY (PATIENT_ID) REFERENCES PATIENTS(ID) ON DELETE CASCADE'), 'Must enforce CASCADE foreign key');
      assert.ok(combinedSql.includes('IDX_CONDITION_PHOTOS_PATIENT_DATE'), 'Must create descending date index');
    });

    test('addColumnIfNotExists helper is idempotent when column already exists', async () => {
      let runCount = 0;
      const mockDbWithExistingColumn = {
        async getAllAsync(sql, params) {
          return [{ name: 'profession' }, { name: 'name' }];
        },
        async execAsync() {
          runCount++;
        },
      };

      await addColumnIfNotExists(mockDbWithExistingColumn, 'patients', 'profession', 'TEXT');
      assert.strictEqual(runCount, 0, 'Should not attempt ALTER TABLE if column already exists');
    });

    test('SCHEMA_V3 DDL and indices are structurally valid', () => {
      assert.ok(SCHEMA_V3_TABLES.patient_condition_photos, 'SCHEMA_V3_TABLES must define patient_condition_photos');
      assert.ok(SCHEMA_V3_DDL.includes('patient_condition_photos'), 'SCHEMA_V3_DDL must include table definition');
      assert.ok(SCHEMA_V3_INDICES.includes('idx_condition_photos_patient_date'), 'SCHEMA_V3_INDICES must define index');
    });
  });

  // ============================================================================
  // 2. Teste dos Novos Campos de Paciente
  // ============================================================================
  describe('2. Extended Patient Demographics & Insurances', () => {
    test('Creates patient with full demographic fields: email, profession, activity time, marital status, avatar', async () => {
      const patient = await patientRepository.create({
        name: 'Dra. Vanessa Meireles',
        phone: '(22) 99876-5432',
        email: 'vanessa.meireles@clinica.com.br',
        profession: 'Cirurgiã Dentista',
        activity_time: '6 a 8 horas em pé em procedimentos clínicos',
        marital_status: 'Casada',
        avatar_uri: 'file:///data/user/0/com.espacomulher.pilates/files/avatars/vanessa_photo.jpg',
        insurance: 'Particular',
      }, mockDb);

      assert.ok(patient.id);
      assert.strictEqual(patient.name, 'Dra. Vanessa Meireles');
      assert.strictEqual(patient.email, 'vanessa.meireles@clinica.com.br');
      assert.strictEqual(patient.profession, 'Cirurgiã Dentista');
      assert.strictEqual(patient.activity_time, '6 a 8 horas em pé em procedimentos clínicos');
      assert.strictEqual(patient.marital_status, 'Casada');
      assert.strictEqual(patient.avatar_uri, 'file:///data/user/0/com.espacomulher.pilates/files/avatars/vanessa_photo.jpg');
      assert.strictEqual(patient.insurance, 'Particular');

      // Read back from database
      const found = await patientRepository.findById(patient.id, mockDb);
      assert.ok(found);
      assert.strictEqual(found.profession, 'Cirurgiã Dentista');
      assert.strictEqual(found.marital_status, 'Casada');
      assert.strictEqual(found.email, 'vanessa.meireles@clinica.com.br');
    });

    test('Validates all clinical insurance options: Particular, Totalpass, Gympass, IBNJ, and Outros', async () => {
      const insurances = [
        'Particular',
        'Totalpass',
        'Gympass',
        'IBNJ',
        'Outros: Unimed Costa do Sol',
      ];

      for (const ins of insurances) {
        const p = await patientRepository.create({
          name: `Paciente ${ins}`,
          phone: '(22) 99999-0000',
          insurance: ins,
        }, mockDb);

        assert.strictEqual(p.insurance, ins);
        const retrieved = await patientRepository.findById(p.id, mockDb);
        assert.strictEqual(retrieved.insurance, ins);
      }
    });

    test('Updates patient demographics and avatar cleanly', async () => {
      const patient = await patientRepository.create({
        name: 'Roberta Guimarães',
        phone: '(22) 99888-1122',
        marital_status: 'Solteira',
        insurance: 'Particular',
      }, mockDb);

      const updated = await patientRepository.update(patient.id, {
        profession: 'Fisioterapeuta Pélvica',
        activity_time: 'Atendimentos ambulatoriais dinâmicos',
        marital_status: 'União Estável',
        avatar_uri: 'file:///data/user/0/com.espacomulher.pilates/files/avatars/roberta_avatar.jpg',
        insurance: 'Totalpass',
      }, mockDb);

      assert.ok(updated);
      assert.strictEqual(updated.profession, 'Fisioterapeuta Pélvica');
      assert.strictEqual(updated.activity_time, 'Atendimentos ambulatoriais dinâmicos');
      assert.strictEqual(updated.marital_status, 'União Estável');
      assert.strictEqual(updated.insurance, 'Totalpass');
      assert.strictEqual(updated.avatar_uri, 'file:///data/user/0/com.espacomulher.pilates/files/avatars/roberta_avatar.jpg');
    });
  });

  // ============================================================================
  // 3. Teste da Anamnese Reformulada
  // ============================================================================
  describe('3. Reformulated Clinical Anamnesis (History & Detailed Obstetrics)', () => {
    test('Creates anamnesis with expanded clinical history narrative', async () => {
      const patient = await patientRepository.create({
        name: 'Juliana Paes',
        phone: '(22) 99888-4455',
      }, mockDb);

      const anamnesis = await anamnesisRepository.create({
        patient_id: patient.id,
        main_complaint: 'Lombalgia crônica com irradiação para glúteo direito',
        clinical_history: 'Histórico iniciado há 4 anos após gestação gemelar. Praticava musculação esporádica. Piora ao permanecer sentada por mais de 2 horas. Nega cirurgias prévias.',
        date: '2026-03-12',
      }, mockDb);

      assert.ok(anamnesis.id);
      assert.strictEqual(anamnesis.patient_id, patient.id);
      assert.ok(anamnesis.clinical_history.includes('Histórico iniciado há 4 anos'));

      const retrieved = await anamnesisRepository.findByPatientId(patient.id, mockDb);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.clinical_history, anamnesis.clinical_history);
    });

    test('Persists complete pregnancy structure: count, delivery type (Normal/Cesárea), last pregnancy time, and miscarriages', async () => {
      const patient = await patientRepository.create({
        name: 'Priscila Nogueira',
        phone: '(22) 99777-8899',
      }, mockDb);

      const pregnancyData = {
        has_pregnancies: true,
        count: 2,
        delivery_type: 'both',
        last_pregnancy_time: '2 anos atrás',
        notes: 'Parto normal em 2021, cesárea de emergência em 2024 sem intercorrências pós-parto',
      };

      const abortionData = {
        has_abortions: true,
        count: 1,
        time: '4 anos atrás',
        notes: 'Aborto espontâneo no 1º trimestre, curetagem realizada com boa recuperação',
      };

      const anamnesis = await anamnesisRepository.create({
        patient_id: patient.id,
        main_complaint: 'Diástase abdominal pós-parto e fraqueza de assoalho pélvico',
        clinical_history: 'Acompanhamento pós-gestacional recomendado por ginecologista.',
        pregnancies: pregnancyData,
        abortions: abortionData,
        date: '2026-03-12',
      }, mockDb);

      assert.ok(anamnesis.id);
      assert.strictEqual(anamnesis.pregnancies.count, 2);
      assert.strictEqual(anamnesis.pregnancies.delivery_type, 'both');
      assert.strictEqual(anamnesis.pregnancies.last_pregnancy_time, '2 anos atrás');
      assert.strictEqual(anamnesis.abortions.count, 1);
      assert.strictEqual(anamnesis.abortions.time, '4 anos atrás');

      const found = await anamnesisRepository.findByPatientId(patient.id, mockDb);
      assert.ok(found);
      assert.strictEqual(found.pregnancies.delivery_type, 'both');
      assert.strictEqual(found.abortions.notes, 'Aborto espontâneo no 1º trimestre, curetagem realizada com boa recuperação');
    });
  });

  // ============================================================================
  // 4. Teste do Exame Postural
  // ============================================================================
  describe('4. Postural Examination & Hip Alignment', () => {
    test('Records and reads hip alignment in postural evaluation', async () => {
      const patient = await patientRepository.create({
        name: 'Luciana Castro',
        phone: '(22) 99666-5544',
      }, mockDb);

      const postural = await posturalRepository.create(
        patient.id,
        {
          evaluation_date: '2026-03-12',
          head: 'anterior_tilt',
          shoulders: 'elevated_right',
          pelvis: 'anterior_tilt',
          hip_alignment: 'elevated_right',
          notes: 'Elevação de crista ilíaca direita com assimetria de triângulo de Tales',
        },
        mockDb
      );

      assert.ok(postural.id);
      assert.strictEqual(postural.hip_alignment, 'elevated_right');
      assert.strictEqual(postural.pelvis, 'anterior_tilt');

      const found = await posturalRepository.findById(postural.id, mockDb);
      assert.ok(found);
      assert.strictEqual(found.hip_alignment, 'elevated_right');
    });

    test('Updates hip alignment accurately across multiple evaluations', async () => {
      const patient = await patientRepository.create({
        name: 'Helena Ramos',
        phone: '(22) 99555-1133',
      }, mockDb);

      const eval1 = await posturalRepository.create(
        patient.id,
        {
          evaluation_date: '2026-01-10',
          hip_alignment: 'elevated_left',
        },
        mockDb
      );

      assert.strictEqual(eval1.hip_alignment, 'elevated_left');

      const eval2 = await posturalRepository.create(
        patient.id,
        {
          evaluation_date: '2026-03-12',
          hip_alignment: 'aligned',
          notes: 'Evolução postural positiva após 20 sessões de Pilates',
        },
        mockDb
      );

      assert.strictEqual(eval2.hip_alignment, 'aligned');

      const patientEvals = await posturalRepository.listByPatientId(patient.id, mockDb);
      assert.strictEqual(patientEvals.length, 2);
      assert.strictEqual(patientEvals[0].hip_alignment, 'aligned'); // Most recent first
    });
  });

  // ============================================================================
  // 5. Teste de Biometria e Tabelas de Referência
  // ============================================================================
  describe('5. Biometrics & Didactic Reference Tables', () => {
    test('Classifies female abdominal circumference according to OMS cardiovascular risk cutoffs', () => {
      // Normal / Adequado: < 80 cm
      const c74 = classifyAbdominalCircumference(74.5, 'female');
      assert.strictEqual(c74.classification, 'Adequado');

      // Alerta / Risco Aumentado: 80 - 88 cm
      const c80 = classifyAbdominalCircumference(80.0, 'female');
      assert.strictEqual(c80.classification, 'Aumentado');

      const c85 = classifyAbdominalCircumference(85.0, 'female');
      assert.strictEqual(c85.classification, 'Aumentado');

      const c88 = classifyAbdominalCircumference(88.0, 'female');
      assert.strictEqual(c88.classification, 'Aumentado');

      // Risco Elevado / Muito Aumentado: > 88 cm
      const c94 = classifyAbdominalCircumference(94.2, 'female');
      assert.strictEqual(c94.classification, 'Muito Aumentado');
    });

    test('Compares chronological age vs. body age for metabolic vitality assessment', () => {
      // Younger biological age (metabolic vitality)
      const vital = compareAges(48, 40);
      assert.strictEqual(vital.status, 'younger');
      assert.strictEqual(vital.difference, 8);
      assert.ok(vital.label.includes('vitalidade metabólica'));

      // Equal ages (neutral)
      const neutral = compareAges(35, 35);
      assert.strictEqual(neutral.status, 'equal');
      assert.strictEqual(neutral.difference, 0);

      // Older biological age (metabolic attention needed)
      const alert = compareAges(32, 40);
      assert.strictEqual(alert.status, 'older');
      assert.strictEqual(alert.difference, 8);
      assert.ok(alert.label.includes('atenção metabólica'));
    });

    test('Classifies female body fat percentage accurately across Pollock standard tiers', () => {
      assert.strictEqual(classifyBodyFatPercent(12.5, 'female').classification, 'Gordura Essencial');
      assert.strictEqual(classifyBodyFatPercent(18.0, 'female').classification, 'Excelente / Baixo');
      assert.strictEqual(classifyBodyFatPercent(22.5, 'female').classification, 'Bom');
      assert.strictEqual(classifyBodyFatPercent(26.0, 'female').classification, 'Adequado / Médio');
      assert.strictEqual(classifyBodyFatPercent(30.5, 'female').classification, 'Moderadamente Alto');
      assert.strictEqual(classifyBodyFatPercent(35.0, 'female').classification, 'Alto / Risco');
    });

    test('Classifies visceral fat levels correctly according to clinical reference scale', () => {
      // 1 - 9: Normal / Saudável
      const normal = classifyVisceralFat(5);
      assert.strictEqual(normal.classification, 'Normal');

      // 10 - 14: Elevado
      const high = classifyVisceralFat(11);
      assert.strictEqual(high.classification, 'Elevado');

      // 15+: Muito Elevado
      const veryHigh = classifyVisceralFat(16);
      assert.strictEqual(veryHigh.classification, 'Muito Elevado');
    });

    test('Exports all required clinical reference table constants', () => {
      assert.ok(Array.isArray(ABDOMINAL_CIRCUMFERENCE_REFERENCE_TABLE));
      assert.ok(Array.isArray(BODY_FAT_REFERENCE_TABLE));
      assert.ok(Array.isArray(BMI_REFERENCE_TABLE));
      assert.ok(Array.isArray(VISCERAL_FAT_REFERENCE_TABLE));
    });
  });

  // ============================================================================
  // 6. Teste do Repositório de Fotos Clínicas
  // ============================================================================
  describe('6. Patient Condition Photos Repository (CRUD & Cascade Integrity)', () => {
    let testPatient;

    beforeEach(async () => {
      testPatient = await patientRepository.create({
        name: 'Clarice Lispector',
        phone: '(22) 99888-0011',
      }, mockDb);
    });

    test('Creates condition photo linked to patient with category, title, notes, and date', async () => {
      const photo = await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///data/user/0/com.espacomulher.pilates/files/condition_photos/clarice_scoliosis_1.jpg',
          category: 'Escoliose',
          title: 'Assimetria Lombar Posterior',
          notes: 'Teste de Adams positivo com gibosidade lombar à direita de 8 graus',
          date: '2026-03-12',
        },
        mockDb
      );

      assert.ok(photo.id);
      assert.strictEqual(photo.patient_id, testPatient.id);
      assert.strictEqual(photo.category, 'Escoliose');
      assert.strictEqual(photo.title, 'Assimetria Lombar Posterior');

      const retrieved = await conditionPhotoRepository.findById(photo.id, mockDb);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, photo.id);
      assert.strictEqual(retrieved.title, 'Assimetria Lombar Posterior');
    });

    test('Lists condition photos ordered by date DESC', async () => {
      await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///photo_jan.jpg',
          date: '2026-01-15',
          category: 'Lombar',
        },
        mockDb
      );

      await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///photo_mar.jpg',
          date: '2026-03-10',
          category: 'Lombar',
        },
        mockDb
      );

      await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///photo_feb.jpg',
          date: '2026-02-20',
          category: 'Lombar',
        },
        mockDb
      );

      const photos = await conditionPhotoRepository.listByPatientId(testPatient.id, mockDb);
      assert.strictEqual(photos.length, 3);
      assert.strictEqual(photos[0].date, '2026-03-10');
      assert.strictEqual(photos[1].date, '2026-02-20');
      assert.strictEqual(photos[2].date, '2026-01-15');
    });

    test('Updates condition photo attributes cleanly', async () => {
      const photo = await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///photo_raw.jpg',
          category: 'Geral',
          date: '2026-03-01',
        },
        mockDb
      );

      const updated = await conditionPhotoRepository.update(
        photo.id,
        {
          category: 'Cérvico-Braquialgia',
          title: 'Retificação Cervical',
          notes: 'Sinal de Spurling negativo após tração manual',
        },
        mockDb
      );

      assert.ok(updated);
      assert.strictEqual(updated.category, 'Cérvico-Braquialgia');
      assert.strictEqual(updated.title, 'Retificação Cervical');
      assert.strictEqual(updated.notes, 'Sinal de Spurling negativo após tração manual');
    });

    test('Deletes condition photo with referential integrity', async () => {
      const photo = await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///photo_delete.jpg',
          date: '2026-03-01',
        },
        mockDb
      );

      const success = await conditionPhotoRepository.delete(photo.id, mockDb);
      assert.strictEqual(success, true);

      const found = await conditionPhotoRepository.findById(photo.id, mockDb);
      assert.strictEqual(found, null);
    });

    test('Cascade integrity: deleting patient removes associated condition photos', async () => {
      await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///photo_cascade_1.jpg',
          date: '2026-03-01',
        },
        mockDb
      );

      await conditionPhotoRepository.create(
        testPatient.id,
        {
          photo_uri: 'file:///photo_cascade_2.jpg',
          date: '2026-03-02',
        },
        mockDb
      );

      const countBefore = await conditionPhotoRepository.countByPatientId(testPatient.id, mockDb);
      assert.strictEqual(countBefore, 2);

      // Delete patient triggers cascade
      await patientRepository.delete(testPatient.id, mockDb);

      const countAfter = await conditionPhotoRepository.countByPatientId(testPatient.id, mockDb);
      assert.strictEqual(countAfter, 0);
    });
  });

  // ============================================================================
  // 7. Teste do Laudo PDF
  // ============================================================================
  describe('7. Clinical HTML/PDF Report Enhanced Presentation & XSS Protection', () => {
    test('generateClinicalReportHtml renders all new clinical blocks without errors', () => {
      const patient = {
        id: 'pat-report-1',
        name: 'Maria Eduarda Silveira',
        birthdate: '1985-06-20',
        age: 40,
        phone: '(22) 99888-7766',
        email: 'maria.eduarda@email.com',
        profession: 'Advogada Trabalhista',
        activity_time: 'Audiências e peticionamento contínuo (8h sentada)',
        marital_status: 'Casada',
        avatar_uri: 'file:///avatars/maria.jpg',
        insurance: 'Totalpass',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-03-12',
      };

      const anamnesis = {
        id: 'anam-1',
        patient_id: patient.id,
        main_complaint: 'Cervicalgia com irradiação interescapular e fadiga postural',
        clinical_history: 'Quadro álgico crônico há 2 anos com piora no encerramento de prazos processuais. Nega traumas ou cirurgias.',
        lifestyle: 'Sedentária há 1 ano',
        medications: 'Relaxante muscular esporádico',
        surgeries: null,
        fractures_luxations: null,
        pregnancies: {
          has_pregnancies: true,
          count: 1,
          delivery_type: 'cesarean',
          last_pregnancy_time: '6 anos atrás',
          notes: 'Cesárea sem intercorrências',
        },
        abortions: {
          has_abortions: false,
          count: 0,
        },
        pain_complaints: [
          { location: 'Região cervical posterior e trapézio superior D', eva: 7, type: 'Queimação e tensão' },
        ],
        date: '2026-03-12',
        created_at: '2026-03-12',
        updated_at: '2026-03-12',
      };

      const postural = {
        id: 'post-1',
        patient_id: patient.id,
        evaluation_date: '2026-03-12',
        head: 'anterior_tilt',
        shoulders: 'elevated_right',
        pelvis: 'anterior_tilt',
        hip_alignment: 'Assimetria pélvica com crista ilíaca direita elevada 0.8cm',
        notes: 'Assimetria escapuloumeral evidente na vista posterior',
        created_at: '2026-03-12',
        updated_at: '2026-03-12',
      };

      const bioimpedanceList = [
        {
          id: 'bio-1',
          patient_id: patient.id,
          evaluation_date: '2026-03-12',
          weight: 64.0,
          height: 165,
          bmi: 23.5,
          body_fat_percent: 26.5,
          muscle_mass_percent: 31.0,
          muscle_mass_kg: 25.4,
          visceral_fat: 4,
          basal_metabolic_rate: 1350,
          body_age: 36,
          chronological_age: 40,
          water_percent: 54.0,
          bone_mass: 2.3,
          abdominal_circ: 77.0,
          notes: 'Excelente vitalidade metabólica.',
          created_at: '2026-03-12',
          updated_at: '2026-03-12',
        },
      ];

      const conditionPhotos = [
        {
          id: 'photo-1',
          patient_id: patient.id,
          photo_uri: 'file:///condition_photos/cervical_posture.jpg',
          category: 'Cervical',
          title: 'Análise de Linha de Gravidade',
          notes: 'Anteriorização de cabeça de 3,5 cm em relação à linha do acrômio',
          date: '2026-03-12',
          created_at: '2026-03-12',
          updated_at: '2026-03-12',
        },
      ];

      const html = generateClinicalReportHtml({
        patient,
        anamnesis,
        postural,
        bioimpedanceList,
        conditionPhotos,
        generatedAt: '2026-03-12T14:30:00.000Z',
      });

      assert.ok(typeof html === 'string');
      assert.ok(html.length > 500);

      // Verify clinician identity
      assert.ok(html.includes(CLINIC_REPORT_IDENTITY.professionalName));
      assert.ok(html.includes(CLINIC_REPORT_IDENTITY.crefito));
      assert.ok(html.includes(CLINIC_REPORT_IDENTITY.clinicName));

      // Verify Patient Demographics Block
      assert.ok(html.includes('Advogada Trabalhista'));
      assert.ok(html.includes('Audiências e peticionamento contínuo'));
      assert.ok(html.includes('Casada'));
      assert.ok(html.includes('Totalpass'));

      // Verify Anamnesis & Obstetrics Block
      assert.ok(html.includes('Quadro álgico crônico há 2 anos'));
      assert.ok(html.includes('Cesárea') || html.includes('Cesariana') || html.includes('cesarean'));

      // Verify Postural Block & Hip Alignment
      assert.ok(html.includes('Alinhamento do Quadril') || html.includes('Alinhamento de Quadril'));
      assert.ok(html.includes('Assimetria pélvica'));

      // Verify Biometrics & Age Comparison
      assert.ok(html.includes('Biol: 36a') || html.includes('Idade'));
      assert.ok(html.includes('77'));

      // Verify Photographic Annex
      assert.ok(html.includes('Anexo Fotográfico'));
      assert.ok(html.includes('Análise de Linha de Gravidade'));
    });

    test('Omits photographic annex cleanly when conditionPhotos is empty or null', () => {
      const patient = {
        id: 'pat-report-2',
        name: 'Camila Bastos',
        phone: '(22) 99888-2211',
      };

      const htmlNoPhotos = generateClinicalReportHtml({
        patient,
        conditionPhotos: [],
      });

      assert.ok(!htmlNoPhotos.includes('Anexo Fotográfico'));

      const htmlNullPhotos = generateClinicalReportHtml({
        patient,
        conditionPhotos: null,
      });

      assert.ok(!htmlNullPhotos.includes('Anexo Fotográfico'));
    });

    test('Sanitizes input variables with escapeHtml to prevent XSS / script injection in reports', () => {
      const maliciousPatient = {
        id: 'pat-xss',
        name: 'Ana Paula',
        profession: '<script>alert("prof")</script>',
        activity_time: '<img src=x onerror=alert(1)>',
        marital_status: '<b>Casada</b>',
        phone: '22999999999',
      };

      const maliciousAnamnesis = {
        id: 'anam-xss',
        patient_id: maliciousPatient.id,
        main_complaint: '<iframe src="evil.com"></iframe>',
        clinical_history: '<script>document.cookie</script>',
        date: '2026-03-12',
      };

      const html = generateClinicalReportHtml({
        patient: maliciousPatient,
        anamnesis: maliciousAnamnesis,
      });

      // Assert unescaped tags are NOT present in output
      assert.ok(!html.includes('<script>alert("prof")</script>'), 'Unescaped script tag must not exist');
      assert.ok(!html.includes('<img src=x onerror=alert(1)>'), 'Unescaped img tag must not exist');
      assert.ok(!html.includes('<iframe src="evil.com"></iframe>'), 'Unescaped iframe tag must not exist');
      assert.ok(!html.includes('<script>document.cookie</script>'), 'Unescaped cookie script must not exist');

      // Assert escaped representations ARE present
      assert.ok(html.includes('&lt;script&gt;alert(&quot;prof&quot;)&lt;/script&gt;'), 'Must properly escape profession script');
      assert.ok(html.includes('&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;'), 'Must properly escape iframe');
    });
  });
});
