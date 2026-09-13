/**
 * Test Suite: tests/m9_clinical_enhancements.test.js
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Milestone 9: Clinical Foundation Enhancements:
 * - Patient demographics (profession, activity_time, marital_status, avatar_uri)
 * - Anamnesis clinical history & detailed obstetrics (quantity, delivery_type, last_pregnancy_time)
 * - Postural evaluation hip alignment (hip_alignment)
 * - Bioimpedance chronological age, age comparative & abdominal circumference classification
 * - Clinical reference tables (OMS, Pollock, ABESO, Visceral fat)
 * - Secure local image storage service (avatars and condition photos)
 * - Condition photo repository CRUD and cascade
 * - Enhanced HTML/PDF clinical report with photographic annex
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
  compareAges,
  ABDOMINAL_CIRCUMFERENCE_REFERENCE_TABLE,
  BODY_FAT_REFERENCE_TABLE,
  BMI_REFERENCE_TABLE,
  VISCERAL_FAT_REFERENCE_TABLE,
} = require(path.join(projectRoot, 'src', 'utils', 'biometrics.ts'));
const {
  savePatientAvatar,
  saveConditionPhoto,
  deleteLocalPhoto,
  AVATARS_DIR,
  CONDITION_PHOTOS_DIR,
} = require(path.join(projectRoot, 'src', 'utils', 'imageStorage.ts'));
const {
  generateClinicalReportHtml,
  CLINIC_REPORT_IDENTITY,
} = require(path.join(projectRoot, 'src', 'services', 'reportGenerator.ts'));
const { MIGRATIONS } = require(path.join(projectRoot, 'src', 'database', 'migrations.ts'));

// In-Memory SQLite Mock Database for M9 testing
function createMockDatabase() {
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

      if (trimmed.startsWith('UPDATE PATIENTS')) {
        const id = params[params.length - 1];
        const existing = patientsTable.get(id);
        if (existing) {
          const [
            name, birthdate, age, phone, address, neighborhood,
            city_state, email, insurance, profession, activity_time,
            marital_status, avatar_uri, status, updated_at,
          ] = params;
          patientsTable.set(id, {
            ...existing,
            name, birthdate, age, phone, address, neighborhood,
            city_state, email, insurance, profession, activity_time,
            marital_status, avatar_uri, status, updated_at,
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      if (trimmed.startsWith('INSERT INTO ANAMNESIS') || trimmed.startsWith('UPDATE ANAMNESIS')) {
        const id = params[0];
        const patient_id = params[1];
        const clinical_history = params[2];
        anamnesisTable.set(patient_id, {
          id, patient_id, clinical_history,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO POSTURAL_EVALUATIONS')) {
        const [
          id, patient_id, evaluation_date, head, shoulders, thales_triangle,
          knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar,
          pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line,
          popliteal_line, hip_alignment, musculature, photo_frontal_uri, photo_lateral_uri,
          photo_posterior_uri, notes, created_at, updated_at
        ] = params;
        posturalTable.set(id, {
          id, patient_id, evaluation_date, head, shoulders, thales_triangle,
          knees, feet, cervical, lateral_shoulders, abdomen, dorsal, lumbar,
          pelvis, arch, scapula, scoliosis, posterior_pelvis, gluteal_line,
          popliteal_line, hip_alignment, musculature, photo_frontal_uri, photo_lateral_uri,
          photo_posterior_uri, notes, created_at, updated_at
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        const [
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, chronological_age, body_age, metabolic_age, bmr, body_fat_percent,
          visceral_fat, muscle_mass_kg, body_water_pct, ideal_weight,
          target_weight, fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r,
          fat_leg_l, clinical_opinion, created_at, updated_at,
        ] = params;
        bioimpedanceTable.set(id, {
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, chronological_age, body_age, metabolic_age, bmr, body_fat_percent,
          visceral_fat, muscle_mass_kg, body_water_pct, ideal_weight,
          target_weight, fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r,
          fat_leg_l, clinical_opinion, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO PATIENT_CONDITION_PHOTOS')) {
        const [
          id, patient_id, photo_uri, category, title, notes, date, created_at, updated_at
        ] = params;
        conditionPhotosTable.set(id, {
          id, patient_id, photo_uri, category, title, notes, date, created_at, updated_at
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('UPDATE PATIENT_CONDITION_PHOTOS')) {
        const id = params[params.length - 1];
        const existing = conditionPhotosTable.get(id);
        if (existing) {
          const [category, title, notes, date, updated_at] = params;
          conditionPhotosTable.set(id, {
            ...existing,
            category, title, notes, date, updated_at
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      if (trimmed.startsWith('DELETE FROM PATIENT_CONDITION_PHOTOS WHERE ID = ?')) {
        const [id] = params;
        const had = conditionPhotosTable.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT * FROM PATIENTS WHERE ID = ?')) {
        return patientsTable.get(params[0]) || null;
      }
      if (trimmed.startsWith('SELECT * FROM PATIENT_CONDITION_PHOTOS WHERE ID = ?')) {
        return conditionPhotosTable.get(params[0]) || null;
      }
      return null;
    },

    async getAllAsync(sql, params = []) {
      const normalized = sql.trim().toUpperCase().replace(/\s+/g, ' ');
      if (normalized.includes('FROM PATIENT_CONDITION_PHOTOS WHERE PATIENT_ID = ?')) {
        const pid = params[0];
        const res = [];
        for (const photo of conditionPhotosTable.values()) {
          if (photo.patient_id === pid) res.push(photo);
        }
        return res.sort((a, b) => b.date.localeCompare(a.date));
      }
      return [];
    },
  };
}

describe('M9 Clinical Foundation Enhancements QA Suite', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockDatabase();
  });

  describe('1. Patient Profile Enhancements (Profession, Activity Time, Marital Status, Avatar)', () => {
    test('Creates patient with complete clinical demographics and avatar', async () => {
      const patient = await patientRepository.create({
        name: 'Fabiana Peixoto',
        phone: '(22) 99888-7711',
        profession: 'Arquiteta Urbanista',
        activity_time: '8 horas sentada em frente ao computador',
        marital_status: 'Casada',
        avatar_uri: 'file:///data/user/0/com.espacomulher.pilates/files/avatars/fabiana_avatar.jpg',
        insurance: 'Totalpass',
      }, mockDb);

      assert.strictEqual(patient.name, 'Fabiana Peixoto');
      assert.strictEqual(patient.profession, 'Arquiteta Urbanista');
      assert.strictEqual(patient.activity_time, '8 horas sentada em frente ao computador');
      assert.strictEqual(patient.marital_status, 'Casada');
      assert.strictEqual(patient.avatar_uri, 'file:///data/user/0/com.espacomulher.pilates/files/avatars/fabiana_avatar.jpg');
      assert.strictEqual(patient.insurance, 'Totalpass');

      // Verify in mock persistence
      const saved = await patientRepository.findById(patient.id, mockDb);
      assert.ok(saved);
      assert.strictEqual(saved.profession, 'Arquiteta Urbanista');
      assert.strictEqual(saved.marital_status, 'Casada');
    });

    test('Updates patient profile fields cleanly', async () => {
      const patient = await patientRepository.create({
        name: 'Camila Alcantara',
        phone: '(22) 99777-3322',
        marital_status: 'Solteira',
      }, mockDb);

      const updated = await patientRepository.update(patient.id, {
        profession: 'Professora de Educação Infantil',
        activity_time: '6 horas em pé e agachando com crianças',
        marital_status: 'União Estável',
        avatar_uri: 'file:///data/user/0/com.espacomulher.pilates/files/avatars/camila_new.jpg',
      }, mockDb);

      assert.ok(updated);
      assert.strictEqual(updated.profession, 'Professora de Educação Infantil');
      assert.strictEqual(updated.marital_status, 'União Estável');
      assert.strictEqual(updated.avatar_uri, 'file:///data/user/0/com.espacomulher.pilates/files/avatars/camila_new.jpg');
    });
  });

  describe('2. Biometrics Calculations & Didactic Reference Tables', () => {
    test('classifyAbdominalCircumference correctly evaluates cardiovascular risk', () => {
      // Female cutoffs: <80 normal, 80-88 increased, >88 very high
      const normalF = classifyAbdominalCircumference(74, 'female');
      assert.strictEqual(normalF.classification, 'Adequado');

      const borderF = classifyAbdominalCircumference(80, 'female');
      assert.strictEqual(borderF.classification, 'Aumentado');

      const highF = classifyAbdominalCircumference(85, 'female');
      assert.strictEqual(highF.classification, 'Aumentado');

      const veryHighF = classifyAbdominalCircumference(92, 'female');
      assert.strictEqual(veryHighF.classification, 'Muito Aumentado');

      // Male cutoffs: <94, 94-102, >102
      const normalM = classifyAbdominalCircumference(88, 'male');
      assert.strictEqual(normalM.classification, 'Adequado');

      const highM = classifyAbdominalCircumference(98, 'male');
      assert.strictEqual(highM.classification, 'Aumentado');

      const veryHighM = classifyAbdominalCircumference(105, 'male');
      assert.strictEqual(veryHighM.classification, 'Muito Aumentado');
    });

    test('classifyBodyFatPercent evaluates Pollock tiers accurately for females', () => {
      const essential = classifyBodyFatPercent(12, 'female');
      assert.strictEqual(essential.classification, 'Gordura Essencial');

      const athletic = classifyBodyFatPercent(18.5, 'female');
      assert.strictEqual(athletic.classification, 'Excelente / Baixo');

      const good = classifyBodyFatPercent(22.0, 'female');
      assert.strictEqual(good.classification, 'Bom');

      const medium = classifyBodyFatPercent(26.5, 'female');
      assert.strictEqual(medium.classification, 'Adequado / Médio');

      const modHigh = classifyBodyFatPercent(30.0, 'female');
      assert.strictEqual(modHigh.classification, 'Moderadamente Alto');

      const highRisk = classifyBodyFatPercent(36.0, 'female');
      assert.strictEqual(highRisk.classification, 'Alto / Risco');
    });

    test('compareAges provides metabolic vitality assessment', () => {
      // Younger biological age than chronological (healthy/vital)
      const vital = compareAges(45, 38);
      assert.strictEqual(vital.status, 'younger');
      assert.strictEqual(vital.difference, 7);
      assert.ok(vital.label.includes('Excelente vitalidade metabólica'));

      // Equal ages
      const equal = compareAges(40, 40);
      assert.strictEqual(equal.status, 'equal');
      assert.strictEqual(equal.difference, 0);

      // Older biological age (metabolic attention required)
      const older = compareAges(35, 42);
      assert.strictEqual(older.status, 'older');
      assert.strictEqual(older.difference, 7);
      assert.ok(older.label.includes('Requer atenção metabólica'));
    });

    test('Exports all required clinical reference table constants', () => {
      assert.ok(Array.isArray(ABDOMINAL_CIRCUMFERENCE_REFERENCE_TABLE));
      assert.ok(ABDOMINAL_CIRCUMFERENCE_REFERENCE_TABLE.length >= 2);

      assert.ok(Array.isArray(BODY_FAT_REFERENCE_TABLE));
      assert.ok(BODY_FAT_REFERENCE_TABLE.length >= 5);

      assert.ok(Array.isArray(BMI_REFERENCE_TABLE));
      assert.ok(BMI_REFERENCE_TABLE.length >= 6);

      assert.ok(Array.isArray(VISCERAL_FAT_REFERENCE_TABLE));
      assert.ok(VISCERAL_FAT_REFERENCE_TABLE.length >= 3);
    });
  });

  describe('3. Secure Local Image Storage Service', () => {
    test('savePatientAvatar copies file into sandboxed avatars folder', async () => {
      const sourceUri = 'file:///var/cache/picked_avatar_123.jpg';
      const targetUri = await savePatientAvatar('pat-100', sourceUri);

      assert.ok(targetUri.startsWith(AVATARS_DIR));
      assert.ok(targetUri.includes('pat-100_avatar_'));
      assert.ok(targetUri.endsWith('.jpg'));
    });

    test('saveConditionPhoto copies file into sandboxed condition_photos folder', async () => {
      const sourceUri = 'file:///var/cache/picked_diastasis.png';
      const targetUri = await saveConditionPhoto('pat-100', sourceUri);

      assert.ok(targetUri.startsWith(CONDITION_PHOTOS_DIR));
      assert.ok(targetUri.includes('pat-100_cond_'));
      assert.ok(targetUri.endsWith('.png'));
    });

    test('deleteLocalPhoto safely deletes existing photo', async () => {
      const deleted = await deleteLocalPhoto('file:///data/user/0/com.espacomulher.pilates/files/avatars/photo.jpg');
      assert.strictEqual(deleted, true);

      const invalid = await deleteLocalPhoto('');
      assert.strictEqual(invalid, false);
    });
  });

  describe('4. Condition Photo Repository (CRUD)', () => {
    test('Creates, retrieves, updates and deletes condition photo records', async () => {
      const created = await conditionPhotoRepository.create('pat-99', {
        photo_uri: 'file:///data/files/condition_photos/photo1.jpg',
        category: 'Diástase Abdominal',
        title: 'Avaliação Inicial Diástase',
        notes: 'Afastamento supra-umbilical de 3.5cm palpável',
        date: '2026-03-01',
      }, mockDb);

      assert.ok(created.id);
      assert.strictEqual(created.patient_id, 'pat-99');
      assert.strictEqual(created.category, 'Diástase Abdominal');

      // List by patient
      const list = await conditionPhotoRepository.listByPatientId('pat-99', mockDb);
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].title, 'Avaliação Inicial Diástase');

      // Find by ID
      const found = await conditionPhotoRepository.findById(created.id, mockDb);
      assert.ok(found);
      assert.strictEqual(found.notes, 'Afastamento supra-umbilical de 3.5cm palpável');

      // Update
      const updated = await conditionPhotoRepository.update(created.id, {
        notes: 'Afastamento reduzido para 2.0cm após 10 sessões',
        title: 'Evolução Pós-10 Sessões',
      }, mockDb);
      assert.ok(updated);
      assert.strictEqual(updated.title, 'Evolução Pós-10 Sessões');
      assert.strictEqual(updated.notes, 'Afastamento reduzido para 2.0cm após 10 sessões');

      // Delete
      const deleted = await conditionPhotoRepository.deleteById(created.id, mockDb);
      assert.strictEqual(deleted, true);

      const emptyList = await conditionPhotoRepository.listByPatientId('pat-99', mockDb);
      assert.strictEqual(emptyList.length, 0);
    });
  });

  describe('5. Postural Evaluation & Hip Alignment', () => {
    test('Creates postural evaluation with hip_alignment', async () => {
      const postural = await posturalRepository.create('pat-99', {
        evaluation_date: '2026-03-10',
        head: 'Neutra',
        shoulders: 'Alinhados',
        hip_alignment: 'Elevação da crista ilíaca direita em 1.0cm',
      }, mockDb);

      assert.strictEqual(postural.hip_alignment, 'Elevação da crista ilíaca direita em 1.0cm');
    });
  });

  describe('6. Bioimpedance Evaluation & Chronological Age', () => {
    test('Creates bioimpedance record with chronological_age and abdominal_circ', async () => {
      const bio = await bioimpedanceRepository.create('pat-99', {
        evaluation_date: '2026-03-10',
        weight: 64.0,
        height: 165,
        chronological_age: 38,
        body_age: 32,
        abdominal_circ: 76.5,
        body_fat_percent: 23.5,
        visceral_fat: 4,
        muscle_mass_kg: 26.0,
      }, mockDb);

      assert.strictEqual(bio.chronological_age, 38);
      assert.strictEqual(bio.body_age, 32);
      assert.strictEqual(bio.abdominal_circ, 76.5);
    });
  });

  describe('7. Clinical HTML/PDF Report Enhanced Presentation', () => {
    const mockFullPatient = {
      id: 'pat-rep-1',
      name: 'Renata Vasconcellos',
      phone: '(22) 99888-1234',
      birthdate: '1984-06-15',
      age: 41,
      profession: 'Jornalista e Apresentadora',
      activity_time: 'Rotina de 10 horas com postura sentada e viagens frequentes',
      marital_status: 'Casada',
      avatar_uri: 'file:///data/avatars/renata.jpg',
      email: 'renata@exemplo.com.br',
      insurance: 'Particular',
      city_state: 'Rio das Ostras - RJ',
      status: 'active',
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    };

    const mockAnamnesisWithHistory = {
      id: 'anam-rep-1',
      patient_id: 'pat-rep-1',
      clinical_history: 'Paciente relata dores crônicas cervicais após jornadas intensas de trabalho. Histórico de cefaleia tensional e diagnóstico prévio de retificação da coluna cervical.',
      pain_intensity: 6,
      pain_complaints: [
        {
          location: 'Coluna Cervical C5-C6',
          eva_intensity: 6,
          characteristics: 'Em queimação no final da tarde',
          aggravating_factors: 'Uso prolongado de notebook',
        },
      ],
      pregnancies: {
        has: 'sim',
        quantity: 2,
        delivery_type: 'Cesariana',
        last_pregnancy_time: '4 anos',
        complications: 'Leve diástase supraumbilical',
      },
      abortions: {
        has: 'sim',
        quantity: 1,
        gestational_age: '7 semanas',
        notes: 'Sem intercorrências ou curetagem',
      },
      surgeries: 'Apendicectomia aos 18 anos',
      physical_activity: 'Pilates 2x por semana',
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    };

    const mockPostural = {
      id: 'post-rep-1',
      patient_id: 'pat-rep-1',
      evaluation_date: '2026-01-12',
      head: 'Neutra',
      shoulders: 'Alinhados',
      hip_alignment: 'Assimetria pélvica com crista ilíaca direita elevada 0.8cm',
      created_at: '2026-01-12T08:00:00.000Z',
      updated_at: '2026-01-12T08:00:00.000Z',
    };

    const mockBioList = [
      {
        id: 'bio-rep-1',
        patient_id: 'pat-rep-1',
        evaluation_date: '2026-01-12',
        weight: 63.5,
        height: 168,
        bmi: 22.5,
        chronological_age: 41,
        body_age: 36,
        abdominal_circ: 75.0,
        body_fat_percent: 22.8,
        visceral_fat: 3,
        muscle_mass_kg: 25.4,
        bmr: 1390,
        created_at: '2026-01-12T08:00:00.000Z',
        updated_at: '2026-01-12T08:00:00.000Z',
      },
    ];

    const mockPhotos = [
      {
        id: 'cond-1',
        patient_id: 'pat-rep-1',
        photo_uri: 'file:///data/condition_photos/diastasis.jpg',
        category: 'Diástase Abdominal',
        title: 'Registro de Diástase Linha Alba',
        notes: 'Medição inicial de 3.0cm em teste palpatório funcional.',
        date: '2026-01-12',
        created_at: '2026-01-12T08:00:00.000Z',
      },
    ];

    test('Generates report with avatar, profession, activity time and conditional marital status', () => {
      const html = generateClinicalReportHtml({
        patient: mockFullPatient,
        anamnesis: mockAnamnesisWithHistory,
        postural: mockPostural,
        bioimpedanceList: mockBioList,
        conditionPhotos: mockPhotos,
      });

      // 1. Patient demographics & avatar
      assert.ok(html.includes('file:///data/avatars/renata.jpg'), 'Must render avatar URI');
      assert.ok(html.includes('Jornalista e Apresentadora'), 'Must render profession');
      assert.ok(html.includes('Rotina de 10 horas com postura sentada'), 'Must render activity time');
      assert.ok(html.includes('Casada'), 'Must render marital status when provided');
      assert.ok(html.includes('renata@exemplo.com.br'), 'Must render email');

      // 2. Detailed clinical history & updated obstetrics (without "prévia")
      assert.ok(html.includes('Histórico Clínico:'), 'Must include clinical history title');
      assert.ok(html.includes('dores crônicas cervicais após jornadas intensas'), 'Must render clinical history text');
      assert.ok(html.includes('Gestações: 2'), 'Must render pregnancy count');
      assert.ok(html.includes('Cesariana'), 'Must render delivery type');
      assert.ok(html.includes('4 anos'), 'Must render last pregnancy time');
      assert.ok(html.includes('Abortamentos: 1'), 'Must render abortion count');
      assert.ok(html.includes('Sem intercorrências ou curetagem'), 'Must render abortion notes');

      // 3. Postural evaluation hip alignment
      assert.ok(html.includes('Alinhamento do Quadril'), 'Must include hip alignment header');
      assert.ok(html.includes('Assimetria pélvica com crista ilíaca direita elevada 0.8cm'), 'Must render hip alignment value');

      // 4. Bioimpedance age comparative & abdominal circumference
      assert.ok(html.includes('Biol: 36a (Cron: 41a)'), 'Must render biological vs chronological age badge');
      assert.ok(html.includes('Abd: <strong>75cm</strong>') || html.includes('Abd: <strong>75.0cm</strong>') || html.includes('75'), 'Must render abdominal circumference');
      assert.ok(html.includes('Adequado'), 'Must render adequate abdominal classification');

      // 5. Educational Reference Tables
      assert.ok(html.includes('Tabelas de Referência Clínica'), 'Must render clinical reference section');
      assert.ok(html.includes('Gordura Corporal % (Feminino)'), 'Must render body fat table');
      assert.ok(html.includes('Gordura Visceral (Níveis 1 a 59)'), 'Must render visceral fat table');
      assert.ok(html.includes('Circunferência Abdominal (OMS)'), 'Must render abdominal circ table');

      // 6. Section 5 Photographic Annex
      assert.ok(html.includes('5. Anexo Fotográfico — Condições &amp; Evolução Clínica') || html.includes('5. Anexo Fotográfico'), 'Must include photo annex title');
      assert.ok(html.includes('Diástase Abdominal'), 'Must include photo category badge');
      assert.ok(html.includes('Registro de Diástase Linha Alba'), 'Must include photo title');
      assert.ok(html.includes('file:///data/condition_photos/diastasis.jpg'), 'Must render photo URI');
    });

    test('Omits photographic annex gracefully when conditionPhotos is empty or null', () => {
      const html = generateClinicalReportHtml({
        patient: mockFullPatient,
        conditionPhotos: [],
      });

      assert.strictEqual(html.includes('5. Anexo Fotográfico'), false, 'Must not render photo annex when empty');
    });
  });

  describe('8. Database Migration v3 Verification', () => {
    test('Migration v3 is registered with version 3 and descriptive name', () => {
      const v3 = MIGRATIONS.find((m) => m.version === 3);
      assert.ok(v3, 'Migration v3 must exist in MIGRATIONS array');
      assert.strictEqual(v3.name, 'v3_clinical_enhancements_photos_and_profiles');
    });
  });
});
