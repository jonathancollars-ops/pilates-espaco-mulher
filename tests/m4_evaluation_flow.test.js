require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateBMI,
  calculateBMR,
  calculateIdealWeight,
  calculateTargetWeight,
  classifyVisceralFat,
  analyzeSegmentalSymmetry,
} = require('../src/utils/biometrics.ts');

const {
  generateClinicalReportHtml,
  calculateBmi: reportCalcBmi,
  calculateBmr: reportCalcBmr,
  getBmiClassification,
  formatDateBR,
  formatDateTimeBR,
  escapeHtml,
  CLINIC_REPORT_IDENTITY,
} = require('../src/services/reportGenerator.ts');

const {
  generateClinicalReportPdf,
  shareReportPdf,
} = require('../src/services/pdfService.ts');

const {
  bioimpedanceRepository,
} = require('../src/database/repositories/bioimpedanceRepository.ts');

const { Colors } = require('../src/design-system/tokens.ts');
const mockExpoPrint = require('./mocks/expo-print.cjs');
const mockExpoSharing = require('./mocks/expo-sharing.cjs');

/**
 * Creates an in-memory SQLite mock database dedicated to bioimpedance testing.
 */
function createBioimpedanceMockDb() {
  const bioimpedanceTable = new Map();

  return {
    tables: { bioimpedance: bioimpedanceTable },
    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT INTO BIOIMPEDANCE')) {
        const [
          id, patient_id, evaluation_date, weight, height, abdominal_circ,
          bmi, body_age, metabolic_age, bmr, body_fat_percent, visceral_fat,
          muscle_mass_kg, body_water_pct, ideal_weight, target_weight,
          fat_arm_r, fat_arm_l, fat_trunk, fat_leg_r, fat_leg_l,
          clinical_opinion, created_at, updated_at,
        ] = params;

        bioimpedanceTable.set(id, {
          id,
          patient_id,
          evaluation_date,
          weight,
          height,
          abdominal_circ,
          bmi,
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
        const existing = bioimpedanceTable.get(id);
        if (existing) {
          const [
            evaluation_date, weight, height, abdominal_circ,
            bmi, body_age, metabolic_age, bmr, body_fat_percent,
            visceral_fat, muscle_mass_kg, body_water_pct, ideal_weight,
            target_weight, fat_arm_r, fat_arm_l, fat_trunk,
            fat_leg_r, fat_leg_l, clinical_opinion, updated_at,
          ] = params;

          bioimpedanceTable.set(id, {
            ...existing,
            evaluation_date,
            weight,
            height,
            abdominal_circ,
            bmi,
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
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      if (trimmed.startsWith('DELETE FROM BIOIMPEDANCE WHERE ID = ?')) {
        const [id] = params;
        const had = bioimpedanceTable.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE ID = ?')) {
        const [id] = params;
        return bioimpedanceTable.get(id) || null;
      }

      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE PATIENT_ID = ?') && trimmed.includes('LIMIT 1')) {
        const [patientId] = params;
        const patientRows = Array.from(bioimpedanceTable.values())
          .filter((r) => r.patient_id === patientId)
          .sort((a, b) => {
            const dateCmp = (b.evaluation_date || '').localeCompare(a.evaluation_date || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.created_at || '').localeCompare(a.created_at || '');
          });
        return patientRows[0] || null;
      }

      return null;
    },

    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE WHERE PATIENT_ID = ?')) {
        const [patientId, limit] = params;
        const patientRows = Array.from(bioimpedanceTable.values()).filter((r) => r.patient_id === patientId);

        if (trimmed.includes('ORDER BY EVALUATION_DATE DESC')) {
          patientRows.sort((a, b) => {
            const dateCmp = (b.evaluation_date || '').localeCompare(a.evaluation_date || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.created_at || '').localeCompare(a.created_at || '');
          });
        } else if (trimmed.includes('ORDER BY EVALUATION_DATE ASC')) {
          patientRows.sort((a, b) => {
            const dateCmp = (a.evaluation_date || '').localeCompare(b.evaluation_date || '');
            if (dateCmp !== 0) return dateCmp;
            return (a.created_at || '').localeCompare(b.created_at || '');
          });
        }

        if (limit && typeof limit === 'number') {
          return patientRows.slice(0, limit);
        }
        return patientRows;
      }

      return [];
    },
  };
}

describe('M4 Clinical Evaluation & Bioimpedance Flow Suite', () => {
  // ============================================================================
  // 1. Biometric Calculations & Boundary Value Analysis (BVA)
  // ============================================================================
  describe('1. Biometric Calculations: BMI & BMR Boundary Value Analysis', () => {
    describe('1.1 BMI / IMC Thresholds & WHO / ABESO Partitions', () => {
      test('Underweight boundary: IMC 18.4 is Abaixo do peso, 18.5 transitions to Normal', () => {
        const bvaBelow = calculateBMI(18.4, 100);
        assert.equal(bvaBelow.value, 18.4);
        assert.equal(bvaBelow.classification, 'Abaixo do peso');
        assert.equal(bvaBelow.color, Colors.warning);

        const bvaNormalEdge = calculateBMI(18.5, 100);
        assert.equal(bvaNormalEdge.value, 18.5);
        assert.equal(bvaNormalEdge.classification, 'Normal');
        assert.equal(bvaNormalEdge.color, Colors.success);

        // Also test reportGenerator's classification helper
        const repBelow = getBmiClassification(18.4);
        assert.equal(repBelow.label, 'Abaixo do peso');
        assert.equal(repBelow.color, '#C27803');

        const repNormal = getBmiClassification(18.5);
        assert.equal(repNormal.label, 'Eutrófico (Normal)');
        assert.equal(repNormal.color, '#1B5235');
      });

      test('Normal / Eutrophic boundary: IMC 24.9 is Normal, 25.0 transitions to Sobrepeso', () => {
        const normalUpper = calculateBMI(24.9, 100);
        assert.equal(normalUpper.value, 24.9);
        assert.equal(normalUpper.classification, 'Normal');
        assert.equal(normalUpper.color, Colors.success);

        const overweightEdge = calculateBMI(25.0, 100);
        assert.equal(overweightEdge.value, 25.0);
        assert.equal(overweightEdge.classification, 'Sobrepeso');
        assert.equal(overweightEdge.color, Colors.warning);

        const repOverweight = getBmiClassification(25.0);
        assert.equal(repOverweight.label, 'Sobrepeso');
      });

      test('Overweight boundary: IMC 29.9 is Sobrepeso, 30.0 transitions to Obesidade I', () => {
        const overweightUpper = calculateBMI(29.9, 100);
        assert.equal(overweightUpper.value, 29.9);
        assert.equal(overweightUpper.classification, 'Sobrepeso');

        const ob1Edge = calculateBMI(30.0, 100);
        assert.equal(ob1Edge.value, 30.0);
        assert.equal(ob1Edge.classification, 'Obesidade I');
        assert.equal(ob1Edge.color, Colors.accent);

        const repOb1 = getBmiClassification(30.0);
        assert.equal(repOb1.label, 'Obesidade Grau I');
        assert.equal(repOb1.color, '#6A1B15');
      });

      test('Obesity Grade II boundary: IMC 34.9 is Obesidade I, 35.0 transitions to Obesidade II', () => {
        const ob1Upper = calculateBMI(34.9, 100);
        assert.equal(ob1Upper.value, 34.9);
        assert.equal(ob1Upper.classification, 'Obesidade I');

        const ob2Edge = calculateBMI(35.0, 100);
        assert.equal(ob2Edge.value, 35.0);
        assert.equal(ob2Edge.classification, 'Obesidade II');

        const repOb2 = getBmiClassification(35.0);
        assert.equal(repOb2.label, 'Obesidade Grau II');
      });

      test('Obesity Grade III (Severe / Morbid) boundary: IMC 39.9 is Obesidade II, 40.0+ is Obesidade III', () => {
        const ob2Upper = calculateBMI(39.9, 100);
        assert.equal(ob2Upper.value, 39.9);
        assert.equal(ob2Upper.classification, 'Obesidade II');

        const ob3Edge = calculateBMI(40.0, 100);
        assert.equal(ob3Edge.value, 40.0);
        assert.equal(ob3Edge.classification, 'Obesidade III');
        assert.equal(ob3Edge.color, Colors.accent);

        const ob3Extreme = calculateBMI(140.0, 160); // IMC ~ 54.7
        assert.ok(ob3Extreme.value >= 40.0);
        assert.equal(ob3Extreme.classification, 'Obesidade III');

        const repOb3 = getBmiClassification(40.0);
        assert.equal(repOb3.label, 'Obesidade Grau III');
        assert.equal(repOb3.color, '#6A1B15');

        const repOb3Extreme = getBmiClassification(58.5);
        assert.equal(repOb3Extreme.label, 'Obesidade Grau III');
      });

      test('Adversarial & invalid inputs: zero height, negative weight, NaN fallback safely', () => {
        assert.equal(calculateBMI(0, 165).value, 0);
        assert.equal(calculateBMI(-50, 165).value, 0);
        assert.equal(calculateBMI(60, 0).value, 0);
        assert.equal(calculateBMI(60, -165).value, 0);
        assert.equal(reportCalcBmi(0, 165), 0);
        assert.equal(reportCalcBmi(60, 0), 0);
        assert.equal(getBmiClassification(0).label, 'N/A');
        assert.equal(getBmiClassification(-5).label, 'N/A');
      });
    });

    describe('1.2 Basal Metabolic Rate (BMR / TMB) Calculations', () => {
      test('Female Mifflin-St Jeor equation: 60 kg, 165 cm, 35 years = 1295 kcal/day', () => {
        const bmr = calculateBMR({
          weightKg: 60,
          heightCm: 165,
          ageYears: 35,
          sex: 'female',
          formula: 'mifflin-st-jeor',
        });
        assert.equal(bmr, 1295);

        const repBmr = reportCalcBmr(60, 165, 35);
        assert.equal(repBmr, 1295);
      });

      test('Male Mifflin-St Jeor equation: 75 kg, 175 cm, 30 years = 1699 kcal/day', () => {
        const bmr = calculateBMR({
          weightKg: 75,
          heightCm: 175,
          ageYears: 30,
          sex: 'male',
          formula: 'mifflin-st-jeor',
        });
        assert.equal(bmr, 1699);
      });

      test('Harris-Benedict equation (Roza & Shizgal 1984 female revision)', () => {
        const bmr = calculateBMR({
          weightKg: 60,
          heightCm: 165,
          ageYears: 35,
          sex: 'female',
          formula: 'harris-benedict',
        });
        assert.equal(bmr, 1362);
      });

      test('Adversarial BMR inputs: zero, negative, or missing age defaults safely', () => {
        assert.equal(calculateBMR({ weightKg: 0, heightCm: 165, ageYears: 35 }), 0);
        assert.equal(calculateBMR({ weightKg: 60, heightCm: 0, ageYears: 35 }), 0);
        assert.equal(calculateBMR({ weightKg: 60, heightCm: 165, ageYears: 0 }), 0);
        assert.equal(calculateBMR({ weightKg: -60, heightCm: 165, ageYears: 35 }), 0);

        const fallbackAgeBmr = reportCalcBmr(60, 165, null);
        assert.equal(fallbackAgeBmr, 1295);
      });
    });

    describe('1.3 Ideal Weight, Visceral Fat & Segmental Symmetry', () => {
      test('Ideal weight calculation using WHO 22.0 BMI and Devine reference', () => {
        const res = calculateIdealWeight(165);
        assert.equal(res.ideal, 59.9);
        assert.equal(res.range.min, 50.4);
        assert.equal(res.range.max, 67.8);
      });

      test('Target weight calculation preserves fat-free mass', () => {
        const target = calculateTargetWeight({
          weightKg: 80,
          currentFatPercent: 35,
          targetFatPercent: 25,
        });
        assert.equal(target, 69.3);
      });

      test('Visceral fat classification tiers (1-9 Normal, 10-14 Elevado, 15+ Muito Elevado)', () => {
        assert.equal(classifyVisceralFat(5).classification, 'Normal');
        assert.equal(classifyVisceralFat(9).classification, 'Normal');
        assert.equal(classifyVisceralFat(10).classification, 'Elevado');
        assert.equal(classifyVisceralFat(14).classification, 'Elevado');
        assert.equal(classifyVisceralFat(15).classification, 'Muito Elevado');
        assert.equal(classifyVisceralFat(30).classification, 'Muito Elevado');
      });

      test('Segmental symmetry analysis detects arm/leg imbalance accurately', () => {
        const balanced = analyzeSegmentalSymmetry(3.0, 3.1);
        assert.equal(balanced.status, 'Equilibrado');

        const mildAsymmetry = analyzeSegmentalSymmetry(3.0, 3.25);
        assert.equal(mildAsymmetry.status, 'Assimetria Leve');
        assert.equal(mildAsymmetry.dominantSide, 'Esquerdo');

        const severeAsymmetry = analyzeSegmentalSymmetry(4.0, 3.0);
        assert.equal(severeAsymmetry.status, 'Assimetria Significativa');
        assert.equal(severeAsymmetry.dominantSide, 'Direito');
      });
    });
  });

  // ============================================================================
  // 2. Persistence & Temporal Bioimpedance History (bioimpedanceRepository)
  // ============================================================================
  describe('2. Persistence & Retrieval of Temporal Bioimpedance History', () => {
    let mockDb;
    const PATIENT_ID = 'patient-regina-silva-001';

    beforeEach(() => {
      mockDb = createBioimpedanceMockDb();
    });

    test('Persists bioimpedance record with all clinical fields and auto-calculates BMI if omitted', async () => {
      const created = await bioimpedanceRepository.create(
        PATIENT_ID,
        {
          evaluation_date: '2026-01-15',
          weight: 68.5,
          height: 165,
          abdominal_circ: 84.0,
          body_fat_percent: 31.5,
          visceral_fat: 6,
          muscle_mass_kg: 23.2,
          body_water_pct: 49.8,
          body_age: 44,
          metabolic_age: 46,
          bmr: 1370,
          ideal_weight: 59.9,
          target_weight: 62.0,
          fat_arm_r: 28.5,
          fat_arm_l: 29.0,
          fat_trunk: 32.0,
          fat_leg_r: 33.0,
          fat_leg_l: 33.5,
          clinical_opinion: 'Avaliação inicial para fortalecimento do core e reabilitação postural.',
        },
        mockDb
      );

      assert.ok(created.id);
      assert.equal(created.patient_id, PATIENT_ID);
      assert.equal(created.weight, 68.5);
      assert.equal(created.height, 165);
      assert.equal(created.bmi, 25.2);
      assert.equal(created.body_fat_percent, 31.5);
      assert.equal(created.visceral_fat, 6);
      assert.equal(created.muscle_mass_kg, 23.2);
      assert.equal(created.clinical_opinion, 'Avaliação inicial para fortalecimento do core e reabilitação postural.');

      const fromDb = await bioimpedanceRepository.findById(created.id, mockDb);
      assert.ok(fromDb);
      assert.equal(fromDb.id, created.id);
      assert.equal(fromDb.bmi, 25.2);
    });

    test('Preserves explicitly provided BMI value when provided in input', async () => {
      const created = await bioimpedanceRepository.create(
        PATIENT_ID,
        {
          evaluation_date: '2026-02-15',
          weight: 70.0,
          height: 165,
          bmi: 25.7,
          body_fat_percent: 32.0,
          visceral_fat: 6,
          muscle_mass_kg: 23.0,
        },
        mockDb
      );

      assert.equal(created.bmi, 25.7);
    });

    test('Persists and retrieves temporal progression across 6 months in reverse-chronological order (listByPatientId)', async () => {
      const evalDates = ['2026-01-10', '2026-03-15', '2026-05-20', '2026-07-25'];
      const weights = [72.0, 70.5, 68.0, 65.5];

      for (let i = 0; i < evalDates.length; i++) {
        await bioimpedanceRepository.create(
          PATIENT_ID,
          {
            evaluation_date: evalDates[i],
            weight: weights[i],
            height: 165,
            body_fat_percent: 33.0 - i * 2.0,
            visceral_fat: 7 - (i > 2 ? 1 : 0),
            muscle_mass_kg: 22.5 + i * 0.5,
          },
          mockDb
        );
      }

      const list = await bioimpedanceRepository.listByPatientId(PATIENT_ID, mockDb);
      assert.equal(list.length, 4);

      assert.equal(list[0].evaluation_date, '2026-07-25');
      assert.equal(list[0].weight, 65.5);
      assert.equal(list[1].evaluation_date, '2026-05-20');
      assert.equal(list[2].evaluation_date, '2026-03-15');
      assert.equal(list[3].evaluation_date, '2026-01-10');
      assert.equal(list[3].weight, 72.0);
    });

    test('getLatestByPatientId retrieves the single most recent bioimpedance evaluation', async () => {
      await bioimpedanceRepository.create(
        PATIENT_ID,
        {
          evaluation_date: '2026-01-10',
          weight: 75.0,
          height: 168,
          body_fat_percent: 34.0,
          visceral_fat: 8,
          muscle_mass_kg: 24.0,
        },
        mockDb
      );

      await bioimpedanceRepository.create(
        PATIENT_ID,
        {
          evaluation_date: '2026-08-30',
          weight: 68.0,
          height: 168,
          body_fat_percent: 28.0,
          visceral_fat: 6,
          muscle_mass_kg: 25.5,
        },
        mockDb
      );

      const latest = await bioimpedanceRepository.getLatestByPatientId(PATIENT_ID, mockDb);
      assert.ok(latest);
      assert.equal(latest.evaluation_date, '2026-08-30');
      assert.equal(latest.weight, 68.0);
      assert.equal(latest.visceral_fat, 6);
    });

    test('getHistory retrieves chronological progression (ASC) with optional limit for SVG charts', async () => {
      const dates = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'];
      for (const d of dates) {
        await bioimpedanceRepository.create(
          PATIENT_ID,
          {
            evaluation_date: d,
            weight: 70.0,
            height: 160,
            body_fat_percent: 30.0,
            visceral_fat: 5,
            muscle_mass_kg: 24.0,
          },
          mockDb
        );
      }

      const historyAll = await bioimpedanceRepository.getHistory(PATIENT_ID, undefined, mockDb);
      assert.equal(historyAll.length, 5);
      assert.equal(historyAll[0].evaluation_date, '2026-01-01');
      assert.equal(historyAll[4].evaluation_date, '2026-05-01');

      const historyLimit = await bioimpedanceRepository.getHistory(PATIENT_ID, 3, mockDb);
      assert.equal(historyLimit.length, 3);
      assert.equal(historyLimit[0].evaluation_date, '2026-01-01');
      assert.equal(historyLimit[2].evaluation_date, '2026-03-01');
    });

    test('update re-computes BMI when weight or height changes', async () => {
      const initial = await bioimpedanceRepository.create(
        PATIENT_ID,
        {
          evaluation_date: '2026-01-10',
          weight: 60.0,
          height: 160,
          body_fat_percent: 28.0,
          visceral_fat: 4,
          muscle_mass_kg: 22.0,
        },
        mockDb
      );
      assert.equal(initial.bmi, 23.4);

      const updated = await bioimpedanceRepository.update(
        initial.id,
        {
          weight: 64.0,
          clinical_opinion: 'Ganho ponderal verificado no período festivo.',
        },
        mockDb
      );

      assert.ok(updated);
      assert.equal(updated.weight, 64.0);
      assert.equal(updated.bmi, 25.0);
      assert.equal(updated.clinical_opinion, 'Ganho ponderal verificado no período festivo.');
    });

    test('delete removes bioimpedance record completely', async () => {
      const created = await bioimpedanceRepository.create(
        PATIENT_ID,
        {
          evaluation_date: '2026-01-10',
          weight: 60.0,
          height: 160,
          body_fat_percent: 28.0,
          visceral_fat: 4,
          muscle_mass_kg: 22.0,
        },
        mockDb
      );

      const deleted = await bioimpedanceRepository.delete(created.id, mockDb);
      assert.equal(deleted, true);

      const found = await bioimpedanceRepository.findById(created.id, mockDb);
      assert.equal(found, null);
    });
  });

  // ============================================================================
  // 3. Clinical Report Payload, HTML & PDF Generation with Signature
  // ============================================================================
  describe('3. Clinical Report & PDF Generation with Dra. Rogéria Collares Signature', () => {
    const samplePatient = {
      id: 'patient-luciana-costa',
      name: 'Luciana Costa Ferreira',
      birthdate: '1984-06-20',
      age: 42,
      phone: '(22) 99988-7766',
      address: 'Av. Costazul, 450, Apto 201',
      neighborhood: 'Costazul',
      city_state: 'Rio das Ostras - RJ',
      email: 'luciana.costa@email.com',
      insurance: 'Unimed',
      status: 'active',
      created_at: '2026-01-10T10:00:00.000Z',
      updated_at: '2026-01-10T10:00:00.000Z',
    };

    const sampleAnamnesis = {
      id: 'ana-luciana',
      patient_id: 'patient-luciana-costa',
      lab_tests: 'Hemograma e perfil lipídico dentro da normalidade.',
      medications: 'Anti-inflamatório ocasional para lombalgia.',
      allergies: 'Dipirona sódica',
      surgeries: 'Cesariana em 2014',
      fractures: JSON.stringify({ has: 'sim', location: 'Punho esquerdo', immobilization: 'Gesso por 30 dias' }),
      luxations: JSON.stringify({ has: 'nao' }),
      pregnancies: JSON.stringify({ has: 'sim', quantity: 1, delivery_type: 'Cesariana', complications: 'Nenhuma' }),
      abortions: JSON.stringify({ has: 'nao' }),
      physical_activity: 'Caminhada leve 2x na semana',
      pain_complaints: JSON.stringify([
        { location: 'Lombar L4-L5', eva_intensity: 8, characteristics: 'Dor em queimação com irradiação para glúteo direito.' },
        { location: 'Cervical C6-C7', eva_intensity: 4, characteristics: 'Tensão muscular ao final do expediente.' },
      ]),
      pain_intensity: 8,
      imaging_exams: 'Ressonância Magnética de Coluna Lombar: Protrusão discal L4-L5 posterior.',
      clinical_notes: 'Foco inicial em descompressão axial e estabilização lombo-pélvica (Powerhouse).',
      created_at: '2026-01-10T10:30:00.000Z',
      updated_at: '2026-01-10T10:30:00.000Z',
    };

    const samplePostural = {
      id: 'pos-luciana',
      patient_id: 'patient-luciana-costa',
      evaluation_date: '2026-01-10',
      head: 'Anteriorizada com leve inclinação lateral direita',
      cervical_spine: 'Retificação da lordose cervical fisiológica',
      shoulders: 'Ombro direito mais elevado em 1.5 cm em relação ao esquerdo',
      scapulae: 'Escápula direita alada e abduzida',
      thoracic_spine: 'Hipercifose torácica moderada',
      lumbar_spine: 'Hiperlordose lombar com báscula anterior da pelve',
      pelvis: 'Anteversão pélvica associada a fraqueza de glúteo máximo',
      knees: 'Valgo dinâmico bilateral discreto',
      feet: 'Pés pronados com desabamento do arco longitudinal medial',
      gluteal_line: 'Assimetria de prega glútea (D > E)',
      popliteal_line: 'Nível preservado',
      scoliosis: 'Atitude escoliótica toracolombar em C à direita (Adams negativo)',
      musculature: 'Encurtamento importante de isquiotibiais e iliopsoas bilateral.',
      notes: 'Prescrição direcionada a alinhamento postural no Reformer e Cadillac.',
      created_at: '2026-01-10T11:00:00.000Z',
      updated_at: '2026-01-10T11:00:00.000Z',
    };

    const sampleBioimpedanceList = [
      {
        id: 'bio-luciana-1',
        patient_id: 'patient-luciana-costa',
        evaluation_date: '2026-01-10',
        weight: 68.0,
        height: 165,
        abdominal_circ: 84.0,
        bmi: 25.0,
        bmr: 1365,
        body_fat_percent: 32.5,
        visceral_fat: 7,
        muscle_mass_kg: 22.8,
        body_water_pct: 49.0,
        fat_arm_r: 29.0,
        fat_arm_l: 29.5,
        fat_trunk: 33.0,
        fat_leg_r: 34.0,
        fat_leg_l: 34.5,
        clinical_opinion: 'Avaliação basal pré-tratamento.',
        created_at: '2026-01-10T11:30:00.000Z',
        updated_at: '2026-01-10T11:30:00.000Z',
      },
      {
        id: 'bio-luciana-2',
        patient_id: 'patient-luciana-costa',
        evaluation_date: '2026-03-12',
        weight: 65.2,
        height: 165,
        abdominal_circ: 80.5,
        bmi: 23.9,
        bmr: 1340,
        body_fat_percent: 29.8,
        visceral_fat: 6,
        muscle_mass_kg: 23.5,
        body_water_pct: 51.2,
        fat_arm_r: 27.5,
        fat_arm_l: 27.8,
        fat_trunk: 30.5,
        fat_leg_r: 32.0,
        fat_leg_l: 32.0,
        clinical_opinion: 'Excelente resposta: redução de 2.7% de gordura e ganho de massa magra.',
        created_at: '2026-03-12T11:30:00.000Z',
        updated_at: '2026-03-12T11:30:00.000Z',
      },
    ];

    test('Generates HTML report with full payload and Dra. Rogéria Collares signature credentials', () => {
      const html = generateClinicalReportHtml({
        patient: samplePatient,
        anamnesis: sampleAnamnesis,
        postural: samplePostural,
        bioimpedanceList: sampleBioimpedanceList,
        generatedAt: '2026-03-15T14:00:00.000Z',
      });

      assert.ok(typeof html === 'string');
      assert.ok(html.length > 2000);

      // 1. Signature block verification
      assert.ok(html.includes(CLINIC_REPORT_IDENTITY.professionalName), 'Must include Dra. Rogéria Collares');
      assert.ok(html.includes(CLINIC_REPORT_IDENTITY.crefito), 'Must include CREFITO 23093-F');
      assert.ok(html.includes(CLINIC_REPORT_IDENTITY.clinicName), 'Must include Pilates Espaço Mulher');
      assert.ok(html.includes('Costa Azul, Rio das Ostras - RJ'), 'Must include Costa Azul location');
      assert.ok(html.includes('(22) 99947-4304'), 'Must include clinical telephone');

      // 2. Official palette colors
      assert.ok(html.includes('#9B6CBA'), 'Must include primary Plum');
      assert.ok(html.includes('#FAF8F5'), 'Must include Ivory background');
      assert.ok(html.includes('#6A1B15'), 'Must include Deep Burgundy accent');
      assert.ok(html.includes('#1B5235'), 'Must include Forest Green accent');

      // 3. Patient data and clinical sections
      assert.ok(html.includes('Luciana Costa Ferreira'));
      assert.ok(html.includes('42 anos'));
      assert.ok(html.includes('(22) 99988-7766'));
      assert.ok(html.includes('Costazul, Rio das Ostras - RJ') || html.includes('Rio das Ostras - RJ'));

      // 4. Anamnesis pain complaint with EVA scale
      assert.ok(html.includes('Lombar L4-L5'));
      assert.ok(html.includes('EVA 8/10'));
      assert.ok(html.includes('Severa / Intensa'));
      assert.ok(html.includes('Cervical C6-C7'));
      assert.ok(html.includes('EVA 4/10'));

      // 5. Postural evaluation sections
      assert.ok(html.includes('Ombro direito mais elevado em 1.5 cm'));
      assert.ok(html.includes('Atitude escoliótica toracolombar em C à direita'));

      // 6. Bioimpedance table with date formatting and progress
      assert.ok(html.includes('10/01/2026'));
      assert.ok(html.includes('12/03/2026'));
      assert.ok(html.includes('68.0 kg'));
      assert.ok(html.includes('65.2 kg'));
      assert.ok(html.includes('Sobrepeso'));
      assert.ok(html.includes('Eutrófico (Normal)'));
    });

    test('STRICT PRIVACY CONSTRAINT: HTML strictly excludes CPF, CEP, and Estado Civil', () => {
      const html = generateClinicalReportHtml({
        patient: samplePatient,
        anamnesis: sampleAnamnesis,
        postural: samplePostural,
        bioimpedanceList: sampleBioimpedanceList,
      });

      assert.doesNotMatch(html, /\bCPF\b/i, 'HTML report must strictly omit CPF');
      assert.doesNotMatch(html, /\bCEP\b/i, 'HTML report must strictly omit CEP');
      assert.doesNotMatch(html, /Estado Civil/i, 'HTML report must strictly omit Estado Civil');
    });

    test('Gracefully handles empty / null anamnesis, postural, and bioimpedance in HTML report', () => {
      const minimalPatient = {
        id: 'patient-minimal',
        name: 'Ana Carolina Santos',
        phone: '(22) 98888-2222',
        city_state: 'Rio das Ostras - RJ',
        status: 'active',
        created_at: '2026-02-01T08:00:00.000Z',
        updated_at: '2026-02-01T08:00:00.000Z',
      };

      const html = generateClinicalReportHtml({
        patient: minimalPatient,
        anamnesis: null,
        postural: null,
        bioimpedanceList: [],
      });

      assert.ok(html.includes('Ana Carolina Santos'));
      assert.ok(html.includes('Nenhuma anamnese clínica registrada no prontuário até o momento.'));
      assert.ok(html.includes('Nenhuma avaliação postural biomecânica registrada no momento.'));
      assert.ok(html.includes('Nenhuma avaliação de bioimpedância registrada até o momento.'));
      assert.ok(html.includes('Dra. Rogéria Collares'));
      assert.ok(html.includes('CREFITO 23093-F'));
    });

    test('generateClinicalReportPdf renders PDF and returns valid file URI', async () => {
      const result = await generateClinicalReportPdf({
        patient: samplePatient,
        anamnesis: sampleAnamnesis,
        postural: samplePostural,
        bioimpedanceList: sampleBioimpedanceList,
      });

      assert.ok(result);
      assert.ok(result.uri);
      assert.ok(result.uri.endsWith('.pdf'));
      assert.ok(result.numberOfPages >= 1);
    });

    test('shareReportPdf triggers native sharing sheet via expo-sharing', async () => {
      const result = await generateClinicalReportPdf({
        patient: samplePatient,
        anamnesis: sampleAnamnesis,
        postural: samplePostural,
        bioimpedanceList: sampleBioimpedanceList,
      });

      const shared = await shareReportPdf(result.uri);
      assert.equal(shared, true);
    });
  });
});
