/**
 * Domain types for Workout Routine Prescription
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { Exercise } from './exercise';

export type RoutineStatus = 'active' | 'archived' | 'completed';

export interface Routine {
  id: string; // UUID v4
  patient_id: string; // FK -> patients.id
  name: string; // ex.: 'Treino A - Fortalecimento Lombopélvico'
  notes?: string | null;
  status: RoutineStatus;
  created_at: string;
  updated_at: string;
}

export interface RoutineItem {
  id: string; // UUID v4
  routine_id: string; // FK -> routines.id
  exercise_id: string; // FK -> exercises.id
  sets: number;
  reps: string; // '10', '12-15', '100 bombeamentos', 'Até a falha'
  springs_resistance?: string | null; // ex.: '1 Vermelha', 'Amarela no 2'
  postural_notes?: string | null; // ex.: 'Manter pelve neutra e ombros longe das orelhas'
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  // Hydrated join field
  exercise?: Exercise;
}

export interface RoutineWithItems extends Routine {
  items: RoutineItem[];
}

export interface CreateRoutineItemInput {
  id?: string;
  exercise_id: string;
  sets?: number;
  reps?: string;
  springs_resistance?: string | null;
  postural_notes?: string | null;
  sort_order?: number;
}

export interface CreateRoutineInput {
  id?: string;
  name: string;
  notes?: string | null;
  status?: RoutineStatus;
  items?: CreateRoutineItemInput[];
}

export interface UpdateRoutineInput {
  name?: string;
  notes?: string | null;
  status?: RoutineStatus;
  items?: CreateRoutineItemInput[];
}

export type UpdateRoutineItemInput = Partial<Omit<CreateRoutineItemInput, 'id' | 'exercise_id'>>;
