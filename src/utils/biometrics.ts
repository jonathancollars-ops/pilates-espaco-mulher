/**
 * Biometric and Clinical Body Composition Calculators
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { Colors } from '../design-system/tokens';

export type BMIClassification =
  | 'Abaixo do peso'
  | 'Normal'
  | 'Sobrepeso'
  | 'Obesidade I'
  | 'Obesidade II'
  | 'Obesidade III';

export interface BMIResult {
  value: number;
  classification: BMIClassification;
  color: string;
  minNormalWeight: number;
  maxNormalWeight: number;
}

/**
 * 1. BMI / IMC Calculation: weight (kg) / ((height (cm) / 100) ** 2)
 * According to WHO and Brazilian ABESO standards.
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) {
    return {
      value: 0,
      classification: 'Normal',
      color: Colors.success,
      minNormalWeight: 0,
      maxNormalWeight: 0,
    };
  }

  const heightM = heightCm / 100;
  const bmiRaw = weightKg / (heightM * heightM);
  const value = Math.round(bmiRaw * 10) / 10;

  const minNormalWeight = Math.round(18.5 * heightM * heightM * 10) / 10;
  const maxNormalWeight = Math.round(24.9 * heightM * heightM * 10) / 10;

  let classification: BMIClassification = 'Normal';
  let color: string = Colors.success;

  if (value < 18.5) {
    classification = 'Abaixo do peso';
    color = Colors.warning;
  } else if (value < 25.0) {
    classification = 'Normal';
    color = Colors.success;
  } else if (value < 30.0) {
    classification = 'Sobrepeso';
    color = Colors.warning;
  } else if (value < 35.0) {
    classification = 'Obesidade I';
    color = Colors.accent;
  } else if (value < 40.0) {
    classification = 'Obesidade II';
    color = Colors.accent;
  } else {
    classification = 'Obesidade III';
    color = Colors.accent;
  }

  return {
    value,
    classification,
    color,
    minNormalWeight,
    maxNormalWeight,
  };
}

export interface BMRParams {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex?: 'female' | 'male';
  formula?: 'mifflin-st-jeor' | 'harris-benedict';
}

/**
 * 2. Basal Metabolic Rate (BMR / TMB) in kcal/day.
 * Defaults to Mifflin-St Jeor and Female (Pilates Espaço Mulher demographic).
 */
export function calculateBMR({
  weightKg,
  heightCm,
  ageYears,
  sex = 'female',
  formula = 'mifflin-st-jeor',
}: BMRParams): number {
  if (!weightKg || !heightCm || !ageYears || weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    return 0;
  }

  if (formula === 'harris-benedict') {
    if (sex === 'female') {
      // Roza & Shizgal (1984) female revision
      return Math.round(
        447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears
      );
    }
    // Male revision
    return Math.round(
      88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
    );
  }

  // Mifflin-St Jeor (Current clinical gold standard)
  if (sex === 'female') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5);
}

/**
 * 3. Ideal Body Weight (Peso Ideal)
 * Clinical BMI midpoint (22.0 kg/m^2) and Devine reference formula.
 */
export function calculateIdealWeight(heightCm: number): {
  ideal: number;
  devine: number;
  range: { min: number; max: number };
} {
  if (!heightCm || heightCm <= 0) {
    return { ideal: 0, devine: 0, range: { min: 0, max: 0 } };
  }

  const heightM = heightCm / 100;
  const ideal = Math.round(22.0 * heightM * heightM * 10) / 10;
  const min = Math.round(18.5 * heightM * heightM * 10) / 10;
  const max = Math.round(24.9 * heightM * heightM * 10) / 10;

  // Devine formula for adult female
  const devine = Math.round((45.5 + 0.9 * (heightCm - 152.4)) * 10) / 10;

  return {
    ideal,
    devine: Math.max(devine, min),
    range: { min, max },
  };
}

export interface TargetWeightParams {
  weightKg: number;
  currentFatPercent?: number | null;
  targetFatPercent?: number | null;
  heightCm?: number;
}

/**
 * 4. Target Weight (Peso Alvo)
 * Based on Fat-Free Mass preservation:
 * Target Weight = FatFreeMass / (1 - TargetFat% / 100)
 */
export function calculateTargetWeight({
  weightKg,
  currentFatPercent,
  targetFatPercent,
  heightCm,
}: TargetWeightParams): number {
  if (
    weightKg > 0 &&
    currentFatPercent != null &&
    currentFatPercent > 0 &&
    targetFatPercent != null &&
    targetFatPercent > 0 &&
    targetFatPercent < 100
  ) {
    const fatFreeMass = weightKg * (1 - currentFatPercent / 100);
    const target = fatFreeMass / (1 - targetFatPercent / 100);
    return Math.round(target * 10) / 10;
  }

  if (heightCm && heightCm > 0) {
    const heightM = heightCm / 100;
    return Math.round(22.0 * heightM * heightM * 10) / 10;
  }

  return weightKg;
}

export interface VisceralFatEvaluation {
  level: number;
  classification: 'Normal' | 'Elevado' | 'Muito Elevado';
  color: string;
  description: string;
}

/**
 * 5. Visceral Fat Classification (Nível de Gordura Visceral 1 a 59)
 */
export function classifyVisceralFat(level: number): VisceralFatEvaluation {
  if (level <= 9) {
    return {
      level,
      classification: 'Normal',
      color: Colors.success,
      description: 'Nível adequado (baixo risco cardiovascular e metabólico)',
    };
  }
  if (level <= 14) {
    return {
      level,
      classification: 'Elevado',
      color: Colors.warning,
      description: 'Atenção: gordura intra-abdominal aumentada',
    };
  }
  return {
    level,
    classification: 'Muito Elevado',
    color: Colors.accent,
    description: 'Risco cardiovascular e metabólico substancialmente aumentado',
  };
}

export interface SegmentalSymmetry {
  differenceKg: number;
  percentageDiff: number;
  status: 'Equilibrado' | 'Assimetria Leve' | 'Assimetria Significativa';
  dominantSide: 'Direito' | 'Esquerdo' | 'Simétrico';
}

/**
 * 6. Segmental Fat Asymmetry Analysis (Braço D/E e Perna D/E)
 */
export function analyzeSegmentalSymmetry(right: number, left: number): SegmentalSymmetry {
  const diff = Math.abs(right - left);
  const max = Math.max(right, left);
  const percentageDiff = max > 0 ? Math.round((diff / max) * 1000) / 10 : 0;

  let status: SegmentalSymmetry['status'] = 'Equilibrado';
  if (percentageDiff > 10) {
    status = 'Assimetria Significativa';
  } else if (percentageDiff > 5) {
    status = 'Assimetria Leve';
  }

  let dominantSide: SegmentalSymmetry['dominantSide'] = 'Simétrico';
  if (right > left) dominantSide = 'Direito';
  else if (left > right) dominantSide = 'Esquerdo';

  return {
    differenceKg: Math.round(diff * 10) / 10,
    percentageDiff,
    status,
    dominantSide,
  };
}
