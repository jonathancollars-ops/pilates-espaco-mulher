/**
 * Domain types for Postural Evaluation
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

export type PosturalAlignmentDirection = 'D' | 'E' | 'Neutra' | 'Alinhados';
export type KneePosturalType = 'Valgos' | 'Varos' | 'Neutro';
export type SagittalCervicalType = 'Retificada' | 'Hiperlordose' | 'Neutra';
export type SagittalDorsalType = 'Hipercifose' | 'Retificada' | 'Neutra';
export type SagittalLumbarType = 'Hipercifose' | 'Hiperlordose' | 'Retificada' | 'Neutra';
export type PelvisTiltType = 'Anteversao' | 'Retroversao' | 'Neutra';
export type PlantarArchType = 'Sim' | 'Nao';

export interface PosturalEvaluation {
  id: string; // UUID v4
  patient_id: string; // FK -> patients.id
  evaluation_date: string; // YYYY-MM-DD
  
  // Vista Frontal
  head?: 'D' | 'E' | 'Neutra' | null;
  shoulders?: 'D' | 'E' | 'Alinhados' | null;
  thales_triangle?: 'D' | 'E' | 'Simétrico' | null;
  knees?: KneePosturalType | null;
  feet?: string | null; // ex.: 'Halux valgo D/E', 'Inversão D/E', 'Eversão D/E', 'Neutro'
  
  // Vista Lateral
  cervical?: SagittalCervicalType | null;
  lateral_shoulders?: 'Protrusao' | 'Neutro' | null;
  abdomen?: string | null; // ex.: 'Protuso', 'Globoso', 'Neutro'
  dorsal?: SagittalDorsalType | null;
  lumbar?: SagittalLumbarType | null;
  pelvis?: PelvisTiltType | null;
  arch?: PlantarArchType | null; // Arco plantar: Sim / Nao
  
  // Vista Posterior
  scapula?: string | null; // ex.: 'Angulo D/E', 'Alada D/E', 'Neutra'
  scoliosis?: string | null; // Observações / Teste de Adams / Curva em C ou S
  posterior_pelvis?: 'D' | 'E' | 'Alinhada' | null;
  gluteal_line?: 'D' | 'E' | 'Alinhada' | null;
  popliteal_line?: 'D' | 'E' | 'Alinhada' | null;
  
  // Musculatura
  musculature?: string | null; // Hipertrofia / Hipotrofia e localização anatômica
  
  // Photogrammetry
  photo_frontal_uri?: string | null;
  photo_lateral_uri?: string | null;
  photo_posterior_uri?: string | null;
  
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePosturalInput {
  evaluation_date: string;
  head?: 'D' | 'E' | 'Neutra' | null;
  shoulders?: 'D' | 'E' | 'Alinhados' | null;
  thales_triangle?: 'D' | 'E' | 'Simétrico' | null;
  knees?: KneePosturalType | null;
  feet?: string | null;
  cervical?: SagittalCervicalType | null;
  lateral_shoulders?: 'Protrusao' | 'Neutro' | null;
  abdomen?: string | null;
  dorsal?: SagittalDorsalType | null;
  lumbar?: SagittalLumbarType | null;
  pelvis?: PelvisTiltType | null;
  arch?: PlantarArchType | null;
  scapula?: string | null;
  scoliosis?: string | null;
  posterior_pelvis?: 'D' | 'E' | 'Alinhada' | null;
  gluteal_line?: 'D' | 'E' | 'Alinhada' | null;
  popliteal_line?: 'D' | 'E' | 'Alinhada' | null;
  musculature?: string | null;
  photo_frontal_uri?: string | null;
  photo_lateral_uri?: string | null;
  photo_posterior_uri?: string | null;
  notes?: string | null;
}

export type UpdatePosturalInput = Partial<CreatePosturalInput>;
