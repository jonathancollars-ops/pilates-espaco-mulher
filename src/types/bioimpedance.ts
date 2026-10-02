/**
 * Domain types for Bioimpedance body composition assessment
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

export interface Bioimpedance {
  id: string; // UUID v4
  patient_id: string; // FK -> patients.id
  evaluation_date: string; // YYYY-MM-DD
  weight: number; // kg
  height: number; // cm
  abdominal_circ?: number | null; // cm
  bmi: number; // kg/m^2 (calculated)
  chronological_age?: number | null; // anos (Idade Cronológica)
  body_age?: number | null; // anos (Idade Corporal da balança)
  metabolic_age?: number | null; // anos
  bmr?: number | null; // kcal/dia (TMB)
  body_fat_percent: number; // %
  visceral_fat: number; // nível 1-59
  muscle_mass_kg: number; // kg
  muscle_mass_percent?: number | null; // %
  body_water_pct?: number | null; // %
  ideal_weight?: number | null; // kg
  target_weight?: number | null; // kg
  
  // Segmental Fat Distribution
  fat_arm_r?: number | null; // % or kg
  fat_arm_l?: number | null; // % or kg
  fat_trunk?: number | null; // % or kg
  fat_leg_r?: number | null; // % or kg
  fat_leg_l?: number | null; // % or kg
  
  clinical_opinion?: string | null; // Parecer clínico da fisioterapeuta
  created_at: string;
  updated_at: string;
}

export interface CreateBioimpedanceInput {
  evaluation_date?: string;
  weight: number | string;
  height: number | string;
  abdominal_circ?: number | string | null;
  bmi?: number | string | null; // Optional on input, calculated if not provided
  chronological_age?: number | string | null;
  body_age?: number | string | null;
  metabolic_age?: number | string | null;
  bmr?: number | string | null;
  body_fat_percent: number | string;
  visceral_fat: number | string;
  muscle_mass_kg: number | string;
  muscle_mass_percent?: number | string | null;
  body_water_pct?: number | string | null;
  ideal_weight?: number | string | null;
  target_weight?: number | string | null;
  fat_arm_r?: number | string | null;
  fat_arm_l?: number | string | null;
  fat_trunk?: number | string | null;
  fat_leg_r?: number | string | null;
  fat_leg_l?: number | string | null;
  clinical_opinion?: string | null;
}

export type UpdateBioimpedanceInput = Partial<CreateBioimpedanceInput>;
