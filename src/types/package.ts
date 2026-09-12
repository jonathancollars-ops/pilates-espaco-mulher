/**
 * Domain types for Session Packages (Controle de Pacotes de Sessões)
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

export type PackageStatus = 'active' | 'completed' | 'expired';

export interface PackagePlan {
  id: string; // UUID v4
  patient_id: string; // FK -> patients.id
  total_sessions: number; // e.g., 8, 12
  completed_sessions: number; // Number of attended sessions
  start_date: string; // YYYY-MM-DD
  expiration_date?: string | null; // YYYY-MM-DD
  status: PackageStatus; // 'active' | 'completed' | 'expired'
  price_cents?: number | null; // Optional: price in cents (e.g., 35000 = R$ 350,00)
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePackageInput {
  id?: string;
  patient_id: string;
  total_sessions: number;
  completed_sessions?: number; // Defaults to 0
  start_date: string; // YYYY-MM-DD
  expiration_date?: string | null;
  status?: PackageStatus; // Defaults to 'active'
  price_cents?: number | null;
  notes?: string | null;
}

export interface UpdatePackageInput {
  total_sessions?: number;
  completed_sessions?: number;
  start_date?: string;
  expiration_date?: string | null;
  status?: PackageStatus;
  price_cents?: number | null;
  notes?: string | null;
}
