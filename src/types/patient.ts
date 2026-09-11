/**
 * Domain types for Patient entity
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * CRITICAL CLINICAL REQUIREMENT:
 * Must strictly EXCLUDE CPF, Estado Civil, and CEP per follow-up specification R4 / AC176.
 */

export type PatientStatus = 'active' | 'archived' | 'discharged';

export interface Patient {
  id: string; // UUID v4
  name: string; // Nome Completo
  birthdate?: string | null; // YYYY-MM-DD
  age?: number | null; // Idade calculada ou inserida
  phone: string; // Formatted mask: (XX) XXXXX-XXXX
  address?: string | null; // Logradouro e número
  neighborhood?: string | null; // Bairro (ex.: Costa Azul)
  city_state: string; // Default: 'Rio das Ostras - RJ'
  email?: string | null;
  insurance?: string | null; // Convênio: 'Particular', 'Unimed', 'Bradesco', etc.
  status: PatientStatus; // 'active' | 'archived' | 'discharged'
  created_at: string; // ISO 8601 UTC
  updated_at: string; // ISO 8601 UTC
}

export interface CreatePatientInput {
  id?: string;
  name: string;
  birthdate?: string | null;
  age?: number | null;
  phone: string;
  address?: string | null;
  neighborhood?: string | null;
  city_state?: string; // If omitted, defaults to 'Rio das Ostras - RJ'
  email?: string | null;
  insurance?: string | null;
  status?: PatientStatus; // If omitted, defaults to 'active'
}

export interface UpdatePatientInput {
  name?: string;
  birthdate?: string | null;
  age?: number | null;
  phone?: string;
  address?: string | null;
  neighborhood?: string | null;
  city_state?: string;
  email?: string | null;
  insurance?: string | null;
  status?: PatientStatus;
}

export interface PatientFilterOptions {
  search?: string;
  status?: PatientStatus;
  limit?: number;
  offset?: number;
}
