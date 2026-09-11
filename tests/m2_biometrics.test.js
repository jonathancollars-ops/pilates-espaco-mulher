require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateBMI,
  calculateBMR,
  calculateIdealWeight,
  calculateTargetWeight,
  classifyVisceralFat,
  analyzeSegmentalSymmetry,
} = require('../src/utils/biometrics.ts');

const { Colors } = require('../src/design-system/tokens.ts');

describe('M2 Clinical Biometrics Calculations & Classifications', () => {
  describe('1. Clinical BMI / IMC Calculation (ABESO / WHO Tiers)', () => {
    test('Normal weight: 55 kg, 165 cm -> IMC 20.2 (Normal, Forest Green)', () => {
      const res = calculateBMI(55, 165);
      assert.equal(res.value, 20.2);
      assert.equal(res.classification, 'Normal');
      assert.equal(res.color, Colors.success);
      assert.equal(res.minNormalWeight, 50.4);
      assert.equal(res.maxNormalWeight, 67.8);
    });

    test('Underweight: 45 kg, 165 cm -> IMC 16.5 (Abaixo do peso, Amber/Warning)', () => {
      const res = calculateBMI(45, 165);
      assert.equal(res.value, 16.5);
      assert.equal(res.classification, 'Abaixo do peso');
      assert.equal(res.color, Colors.warning);
    });

    test('Overweight: 75 kg, 165 cm -> IMC 27.5 (Sobrepeso, Warning)', () => {
      const res = calculateBMI(75, 165);
      assert.equal(res.value, 27.5);
      assert.equal(res.classification, 'Sobrepeso');
      assert.equal(res.color, Colors.warning);
    });

    test('Obesity Class I: 90 kg, 165 cm -> IMC 33.1 (Obesidade I, Accent Burgundy)', () => {
      const res = calculateBMI(90, 165);
      assert.equal(res.value, 33.1);
      assert.equal(res.classification, 'Obesidade I');
      assert.equal(res.color, Colors.accent);
    });

    test('Obesity Class II: 100 kg, 165 cm -> IMC 36.7 (Obesidade II, Accent Burgundy)', () => {
      const res = calculateBMI(100, 165);
      assert.equal(res.value, 36.7);
      assert.equal(res.classification, 'Obesidade II');
      assert.equal(res.color, Colors.accent);
    });

    test('Obesity Class III: 120 kg, 165 cm -> IMC 44.1 (Obesidade III, Accent Burgundy)', () => {
      const res = calculateBMI(120, 165);
      assert.equal(res.value, 44.1);
      assert.equal(res.classification, 'Obesidade III');
      assert.equal(res.color, Colors.accent);
    });

    test('Boundary edge cases: height 0 or negative weight returns safe fallback', () => {
      const zeroHeight = calculateBMI(60, 0);
      assert.equal(zeroHeight.value, 0);
      const negWeight = calculateBMI(-50, 160);
      assert.equal(negWeight.value, 0);
    });
  });

  describe('2. Basal Metabolic Rate (BMR / TMB)', () => {
    test('Mifflin-St Jeor formula for female: 60 kg, 165 cm, 35 years = 1295 kcal/day', () => {
      const bmr = calculateBMR({
        weightKg: 60,
        heightCm: 165,
        ageYears: 35,
        sex: 'female',
        formula: 'mifflin-st-jeor',
      });
      assert.equal(bmr, 1295);
    });

    test('Mifflin-St Jeor formula for male: 75 kg, 175 cm, 30 years = 1699 kcal/day', () => {
      const bmr = calculateBMR({
        weightKg: 75,
        heightCm: 175,
        ageYears: 30,
        sex: 'male',
        formula: 'mifflin-st-jeor',
      });
      assert.equal(bmr, 1699);
    });

    test('Harris-Benedict formula (Roza-Shizgal 1984) for female: 60 kg, 165 cm, 35 years = 1362 kcal/day', () => {
      const bmr = calculateBMR({
        weightKg: 60,
        heightCm: 165,
        ageYears: 35,
        sex: 'female',
        formula: 'harris-benedict',
      });
      assert.equal(bmr, 1362);
    });

    test('BMR handles invalid/zero inputs gracefully', () => {
      assert.equal(calculateBMR({ weightKg: 0, heightCm: 160, ageYears: 30 }), 0);
      assert.equal(calculateBMR({ weightKg: 60, heightCm: 0, ageYears: 30 }), 0);
      assert.equal(calculateBMR({ weightKg: 60, heightCm: 160, ageYears: 0 }), 0);
    });
  });

  describe('3. Ideal Body Weight and Target Weight', () => {
    test('calculateIdealWeight for 165 cm: ideal = 59.9 kg (BMI 22.0 midpoint)', () => {
      const res = calculateIdealWeight(165);
      assert.equal(res.ideal, 59.9);
      assert.equal(res.range.min, 50.4);
      assert.equal(res.range.max, 67.8);
      assert.ok(res.devine > 50 && res.devine < 65, 'Devine formula should be in reasonable range');
    });

    test('calculateTargetWeight preserving Fat-Free Mass (FFM)', () => {
      const target = calculateTargetWeight({
        weightKg: 70,
        currentFatPercent: 35,
        targetFatPercent: 25,
      });
      assert.equal(target, 60.7);
    });

    test('calculateTargetWeight falls back to BMI 22.0 when fat percent is not specified', () => {
      const target = calculateTargetWeight({
        weightKg: 70,
        heightCm: 165,
      });
      assert.equal(target, 59.9);
    });
  });

  describe('4. Visceral Fat Classification', () => {
    test('Level 5 is Normal (low cardiovascular risk)', () => {
      const res = classifyVisceralFat(5);
      assert.equal(res.classification, 'Normal');
      assert.equal(res.color, Colors.success);
    });

    test('Level 12 is Elevado (warning)', () => {
      const res = classifyVisceralFat(12);
      assert.equal(res.classification, 'Elevado');
      assert.equal(res.color, Colors.warning);
    });

    test('Level 18 is Muito Elevado (high risk, accent burgundy)', () => {
      const res = classifyVisceralFat(18);
      assert.equal(res.classification, 'Muito Elevado');
      assert.equal(res.color, Colors.accent);
    });
  });

  describe('5. Segmental Fat Symmetry Analysis', () => {
    test('Equal measurements are classified as Equilibrado and Simétrico', () => {
      const res = analyzeSegmentalSymmetry(5.0, 5.0);
      assert.equal(res.status, 'Equilibrado');
      assert.equal(res.dominantSide, 'Simétrico');
      assert.equal(res.differenceKg, 0);
    });

    test('Minor asymmetry within 5-10% is classified as Assimetria Leve', () => {
      const res = analyzeSegmentalSymmetry(5.0, 4.6);
      assert.equal(res.status, 'Assimetria Leve');
      assert.equal(res.dominantSide, 'Direito');
      assert.equal(res.differenceKg, 0.4);
    });

    test('Significant asymmetry >10% is classified as Assimetria Significativa', () => {
      const res = analyzeSegmentalSymmetry(4.5, 6.0);
      assert.equal(res.status, 'Assimetria Significativa');
      assert.equal(res.dominantSide, 'Esquerdo');
      assert.equal(res.differenceKg, 1.5);
    });
  });
});
