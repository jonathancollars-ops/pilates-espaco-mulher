/**
 * Domain types for Patient Condition Photos
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

export type ConditionPhotoCategory =
  | 'Geral'
  | 'Postura'
  | 'Escoliose'
  | 'Cicatriz / Cirurgia'
  | 'Edema / Inchaço'
  | 'Diástase Abdominal'
  | 'Articulações / Joelhos / Pés'
  | 'Flexibilidade / Alongamento'
  | 'Outro';

export interface PatientConditionPhoto {
  id: string; // UUID v4
  patient_id: string; // FK -> patients.id
  photo_uri: string; // Local file URI (file://...)
  category: ConditionPhotoCategory | string;
  title?: string | null;
  notes?: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
  updated_at?: string;
}

export interface CreateConditionPhotoInput {
  id?: string;
  patient_id: string;
  photo_uri: string;
  category?: ConditionPhotoCategory | string;
  title?: string | null;
  notes?: string | null;
  date?: string;
}

export interface UpdateConditionPhotoInput {
  category?: ConditionPhotoCategory | string;
  title?: string | null;
  notes?: string | null;
  date?: string;
}
