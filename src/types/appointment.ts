/**
 * Domain types for Clinical Appointments (Agenda Clínica)
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Strict privacy: excludes CPF, CEP, and Estado Civil.
 */

export type AppointmentStatus =
  | 'scheduled'
  | 'attended'
  | 'cancelled'
  | 'absent'
  | 'rescheduled';

export type AppointmentType =
  | 'pilates_individual'
  | 'pilates_group'
  | 'clinical_evaluation'
  | 'rehabilitation';

export interface Appointment {
  id: string; // UUID v4
  patient_id: string; // FK -> patients.id
  patient_name: string; // Denormalized or cached name for high-performance calendar rendering
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentInput {
  id?: string;
  patient_id: string;
  patient_name?: string; // Optional: auto-resolved from patient repository if omitted
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status?: AppointmentStatus; // Default: 'scheduled'
  type?: AppointmentType; // Default: 'pilates_individual'
  notes?: string | null;
}

export interface UpdateAppointmentInput {
  patient_id?: string;
  patient_name?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  notes?: string | null;
}

export interface AppointmentFilterOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
  patient_id?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
}
