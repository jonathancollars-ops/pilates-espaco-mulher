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

export interface AbdominalCircumferenceEvaluation {
  value: number;
  classification: 'Adequado' | 'Aumentado' | 'Muito Aumentado';
  color: string;
  description: string;
}

/**
 * 7. Abdominal Circumference Classification (OMS / ABESO)
 * Evaluates cardiovascular and metabolic risk based on waist circumference.
 */
export function classifyAbdominalCircumference(
  cm: number,
  sex: 'female' | 'male' = 'female'
): AbdominalCircumferenceEvaluation {
  if (sex === 'female') {
    if (cm < 80) {
      return {
        value: cm,
        classification: 'Adequado',
        color: Colors.success,
        description: 'Risco cardiovascular não aumentado',
      };
    }
    if (cm <= 88) {
      return {
        value: cm,
        classification: 'Aumentado',
        color: Colors.warning,
        description: 'Risco cardiovascular aumentado',
      };
    }
    return {
      value: cm,
      classification: 'Muito Aumentado',
      color: Colors.accent,
      description: 'Risco cardiovascular substancialmente aumentado',
    };
  }

  if (cm < 94) {
    return {
      value: cm,
      classification: 'Adequado',
      color: Colors.success,
      description: 'Risco cardiovascular não aumentado',
    };
  }
  if (cm <= 102) {
    return {
      value: cm,
      classification: 'Aumentado',
      color: Colors.warning,
      description: 'Risco cardiovascular aumentado',
    };
  }
  return {
    value: cm,
    classification: 'Muito Aumentado',
    color: Colors.accent,
    description: 'Risco cardiovascular substancialmente aumentado',
  };
}

export interface BodyFatClassification {
  value: number;
  classification:
    | 'Excelente / Baixo'
    | 'Bom'
    | 'Adequado / Médio'
    | 'Moderadamente Alto'
    | 'Alto / Risco'
    | 'Gordura Essencial';
  color: string;
  description: string;
}

/**
 * 8. Body Fat Percentage Classification (Pollock / Jackson & Pollock)
 */
export function classifyBodyFatPercent(
  fatPct: number,
  sex: 'female' | 'male' = 'female'
): BodyFatClassification {
  if (sex === 'female') {
    if (fatPct < 14) {
      return {
        value: fatPct,
        classification: 'Gordura Essencial',
        color: Colors.warning,
        description: 'Gordura essencial mínima (risco de amenorreia)',
      };
    }
    if (fatPct <= 20) {
      return {
        value: fatPct,
        classification: 'Excelente / Baixo',
        color: Colors.success,
        description: 'Excelente composição corporal / nível atlético',
      };
    }
    if (fatPct <= 24) {
      return {
        value: fatPct,
        classification: 'Bom',
        color: Colors.success,
        description: 'Bom condicionamento físico e metabólico',
      };
    }
    if (fatPct <= 28) {
      return {
        value: fatPct,
        classification: 'Adequado / Médio',
        color: Colors.success,
        description: 'Nível adequado e saudável para a população em geral',
      };
    }
    if (fatPct <= 32) {
      return {
        value: fatPct,
        classification: 'Moderadamente Alto',
        color: Colors.warning,
        description: 'Atenção: percentual de gordura corporal elevado',
      };
    }
    return {
      value: fatPct,
      classification: 'Alto / Risco',
      color: Colors.accent,
      description: 'Percentual de gordura em faixa de sobrepeso/obesidade',
    };
  }

  if (fatPct < 6) {
    return {
      value: fatPct,
      classification: 'Gordura Essencial',
      color: Colors.warning,
      description: 'Gordura essencial mínima',
    };
  }
  if (fatPct <= 14) {
    return {
      value: fatPct,
      classification: 'Excelente / Baixo',
      color: Colors.success,
      description: 'Excelente composição corporal / nível atlético',
    };
  }
  if (fatPct <= 17) {
    return {
      value: fatPct,
      classification: 'Bom',
      color: Colors.success,
      description: 'Bom condicionamento físico',
    };
  }
  if (fatPct <= 24) {
    return {
      value: fatPct,
      classification: 'Adequado / Médio',
      color: Colors.success,
      description: 'Nível adequado e saudável',
    };
  }
  if (fatPct <= 28) {
    return {
      value: fatPct,
      classification: 'Moderadamente Alto',
      color: Colors.warning,
      description: 'Percentual de gordura moderadamente elevado',
    };
  }
  return {
    value: fatPct,
    classification: 'Alto / Risco',
    color: Colors.accent,
    description: 'Percentual de gordura em faixa de sobrepeso/obesidade',
  };
}

export interface AgeComparisonResult {
  difference: number;
  status: 'younger' | 'equal' | 'older';
  label: string;
  color: string;
}

/**
 * 9. Chronological Age vs Body/Metabolic Age Comparative
 */
export function compareAges(chronologicalAge: number, bodyAge: number): AgeComparisonResult {
  if (bodyAge < chronologicalAge) {
    return {
      difference: Math.abs(chronologicalAge - bodyAge),
      status: 'younger',
      label: 'Idade corporal menor que a cronológica (Excelente vitalidade metabólica)',
      color: Colors.success,
    };
  }
  if (bodyAge === chronologicalAge) {
    return {
      difference: 0,
      status: 'equal',
      label: 'Idade corporal compatível com a cronológica',
      color: Colors.primary,
    };
  }
  return {
    difference: Math.abs(bodyAge - chronologicalAge),
    status: 'older',
    label: 'Idade corporal superior à cronológica (Requer atenção metabólica)',
    color: Colors.accent,
  };
}

/**
 * Reference tables for clinical report exhibition and patient education
 */
export const ABDOMINAL_CIRCUMFERENCE_REFERENCE_TABLE = [
  { sex: 'Mulheres', normal: '< 80 cm', increased: '80 a 88 cm', veryHigh: '> 88 cm' },
  { sex: 'Homens', normal: '< 94 cm', increased: '94 a 102 cm', veryHigh: '> 102 cm' },
];

export const BODY_FAT_REFERENCE_TABLE = [
  { classification: 'Excelente / Baixo', female: '< 20.0%', male: '< 14.0%' },
  { classification: 'Bom', female: '20.1 a 24.0%', male: '14.1 a 17.0%' },
  { classification: 'Adequado / Médio', female: '24.1 a 28.0%', male: '17.1 a 24.0%' },
  { classification: 'Moderadamente Alto', female: '28.1 a 32.0%', male: '24.1 a 28.0%' },
  { classification: 'Alto / Risco', female: '> 32.0%', male: '> 28.0%' },
];

export const BMI_REFERENCE_TABLE = [
  { classification: 'Abaixo do peso', range: '< 18.5 kg/m²', risk: 'Baixo (risco de desnutrição)' },
  { classification: 'Normal / Eutrofia', range: '18.5 a 24.9 kg/m²', risk: 'Menor risco metabólico' },
  { classification: 'Sobrepeso', range: '25.0 a 29.9 kg/m²', risk: 'Risco aumentado' },
  { classification: 'Obesidade Grau I', range: '30.0 a 34.9 kg/m²', risk: 'Risco moderado' },
  { classification: 'Obesidade Grau II', range: '35.0 a 39.9 kg/m²', risk: 'Risco grave' },
  { classification: 'Obesidade Grau III', range: '≥ 40.0 kg/m²', risk: 'Risco muito grave' },
];

export const VISCERAL_FAT_REFERENCE_TABLE = [
  { level: '1 a 9', classification: 'Normal / Saudável', meaning: 'Nível adequado de gordura intra-abdominal' },
  { level: '10 a 14', classification: 'Elevado', meaning: 'Atenção: aumento da gordura visceral' },
  { level: '15 a 59', classification: 'Muito Elevado', meaning: 'Risco cardiovascular e metabólico elevado' },
];

