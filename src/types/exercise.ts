/**
 * Domain types for Exercise entity
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

export type ApparatusType =
  | 'Mat'
  | 'Reformer'
  | 'Cadillac'
  | 'Wunda Chair'
  | 'Ladder Barrel'
  | 'Cinesioterapia';

export type ExerciseLevel = 'iniciante' | 'intermediário' | 'avançado';

export interface Exercise {
  id: string; // Slug or UUID
  name: string; // Nome do exercício
  apparatus: ApparatusType; // Aparelho clássico ou modalidade
  description?: string | null; // Cues biomecânicos e instruções de alinhamento
  default_springs?: string | null; // ex.: '2 Vermelhas + 1 Azul', 'N/A'
  default_reps?: string | null; // ex.: '10', '100 bombeamentos'
  default_sets?: number | null; // ex.: 1, 3
  level?: ExerciseLevel | null; // 'iniciante' | 'intermediário' | 'avançado'
  postural_focus?: string | null; // ex.: 'Fortalecimento de Core, Extensão Torácica'
  contraindications?: string | null; // ex.: 'Hérnia discal lombar aguda'
  is_custom: number; // 0 = Classical pre-seeded catalog, 1 = Custom created by Dra. Rogéria
  created_at: string;
  updated_at: string;
}

export interface CreateExerciseInput {
  id?: string;
  name: string;
  apparatus: ApparatusType;
  description?: string | null;
  default_springs?: string | null;
  default_reps?: string | null;
  default_sets?: number | null;
  level?: ExerciseLevel | null;
  postural_focus?: string | null;
  contraindications?: string | null;
  is_custom?: number; // Defaults to 1 for dynamically created exercises
}

export type UpdateExerciseInput = Partial<Omit<CreateExerciseInput, 'id' | 'is_custom'>>;

export interface ExerciseFilterOptions {
  apparatus?: ApparatusType;
  search?: string;
  level?: ExerciseLevel;
  isCustomOnly?: boolean;
}
