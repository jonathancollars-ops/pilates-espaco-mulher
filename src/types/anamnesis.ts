/**
 * Domain types for Anamnesis clinical evaluation
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

export interface FractureEntry {
  has: 'sim' | 'nao';
  location?: string; // ex.: 'Rádio distal direito'
  immobilization?: string; // ex.: 'Gesso por 45 dias'
  physiotherapy?: string; // ex.: '20 sessões pós-retirada'
}

export interface LuxationEntry {
  has: 'sim' | 'nao';
  location?: string; // ex.: 'Ombro esquerdo anterior'
  immobilization?: string; // ex.: 'Tipóia por 3 semanas'
  physiotherapy?: string; // ex.: 'Fortalecimento de manguito rotador'
}

export interface PregnancyEntry {
  has?: 'sim' | 'nao';
  has_pregnancies?: boolean;
  quantity?: number; // Número de partos
  count?: number;
  delivery_type?: 'Normal' | 'Cesárea' | 'Cesariana' | 'Ambos' | 'both' | 'cesarean' | 'normal' | string;
  last_pregnancy_time?: string; // Tempo da última gestação (ex: '2 anos', '8 meses')
  complications?: string; // ex.: 'Diástase abdominal de 3cm'
  notes?: string;
}

export interface AbortionEntry {
  has?: 'sim' | 'nao';
  has_abortions?: boolean;
  quantity?: number; // Número de abortos
  count?: number;
  gestational_age?: string; // ex.: '8 semanas'
  time?: string;
  notes?: string;
}

export interface PainComplaintEntry {
  location: string; // ex.: 'Coluna Lombar L4-L5', 'Cervical'
  eva_intensity: number; // 0 a 10 (Escala Visual Analógica da Dor)
  characteristics?: string; // 'Pontada', 'Queimação', 'Em peso', etc.
  aggravating_factors?: string; // 'Ao permanecer muito tempo sentada'
}

export interface Anamnesis {
  id: string; // UUID v4
  patient_id: string; // FK -> patients.id (1:1)
  main_complaint?: string | null; // Queixa principal
  clinical_history?: string | null; // Histórico clínico detalhado
  lab_tests?: string | null; // Exames laboratoriais
  medications?: string | null; // Medicamentos em uso contínuo
  allergies?: string | null; // Alergias conhecidas
  surgeries?: string | null; // Cirurgias prévias
  fractures?: FractureEntry | string | null; // JSON string in SQLite
  luxations?: LuxationEntry | string | null; // JSON string in SQLite
  pregnancies?: PregnancyEntry | string | null; // JSON string in SQLite
  abortions?: AbortionEntry | string | null; // JSON string in SQLite
  physical_activity?: string | null; // Atividades físicas prévias e atuais
  pain_complaints?: PainComplaintEntry[] | string | null; // JSON array in SQLite
  pain_intensity?: number; // Escala EVA 0 a 10
  imaging_exams?: string | null; // Exames de imagem (Ressonância, RX, TC)
  clinical_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertAnamnesisInput {
  main_complaint?: string | null;
  clinical_history?: string | null;
  lab_tests?: string | null;
  medications?: string | null;
  allergies?: string | null;
  surgeries?: string | null;
  fractures?: FractureEntry | string | null;
  luxations?: LuxationEntry | string | null;
  pregnancies?: PregnancyEntry | string | null;
  abortions?: AbortionEntry | string | null;
  physical_activity?: string | null;
  pain_complaints?: PainComplaintEntry[] | string | null;
  pain_intensity?: number;
  imaging_exams?: string | null;
  clinical_notes?: string | null;
  date?: string | null;
}
