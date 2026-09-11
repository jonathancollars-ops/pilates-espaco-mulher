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
  body_age?: number | null; // anos
  metabolic_age?: number | null; // anos
  bmr?: number | null; // kcal/dia (TMB)
  body_fat_percent: number; // %
  visceral_fat: number; // nível 1-59
  muscle_mass_kg: number; // kg
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
  evaluation_date: string;
  weight: number;
  height: number;
  abdominal_circ?: number | null;
  bmi?: number; // Optional on input, calculated if not provided
  body_age?: number | null;
  metabolic_age?: number | null;
  bmr?: number | null;
  body_fat_percent: number;
  visceral_fat: number;
  muscle_mass_kg: number;
  body_water_pct?: number | null;
  ideal_weight?: number | null;
  target_weight?: number | null;
  fat_arm_r?: number | null;
  fat_arm_l?: number | null;
  fat_trunk?: number | null;
  fat_leg_r?: number | null;
  fat_leg_l?: number | null;
  clinical_opinion?: string | null;
}

export type UpdateBioimpedanceInput = Partial<CreateBioimpedanceInput>;
