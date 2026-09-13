/**
 * Domain types for Local JSON Backup and Restore
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

import { Patient } from './patient';
import { Anamnesis } from './anamnesis';
import { PosturalEvaluation } from './postural';
import { Bioimpedance } from './bioimpedance';
import { Exercise } from './exercise';
import { Routine, RoutineItem } from './routine';
import { Appointment } from './appointment';
import { PackagePlan } from './package';
import { PatientConditionPhoto } from './conditionPhoto';

export interface BackupMetadata {
  version: '1.0.0';
  schemaVersion: 1;
  app: 'pilates-espaco-mulher';
  appName: 'Pilates Espaço Mulher';
  professional: {
    name: string; // 'Dra. Rogéria Collares'
    crefito: string; // 'CREFITO 23093-F'
    clinic: string; // 'Pilates Espaço Mulher — Costa Azul, Rio das Ostras'
    phone: string; // '(22) 99947-4304'
  };
  exportedAt: string; // ISO 8601 UTC
  databaseVersion: number; // PRAGMA user_version
  counts: {
    patients: number;
    anamnesis: number;
    postural_evaluations: number;
    bioimpedance: number;
    exercises: number;
    routines: number;
    routine_items: number;
    appointments?: number;
    package_plans?: number;
    patient_condition_photos?: number;
  };
}

export interface BackupData {
  patients: Patient[];
  anamnesis: Anamnesis[];
  postural_evaluations: PosturalEvaluation[];
  bioimpedance: Bioimpedance[];
  exercises: Exercise[];
  routines: Routine[];
  routine_items: RoutineItem[];
  appointments?: Appointment[];
  package_plans?: PackagePlan[];
  patient_condition_photos?: PatientConditionPhoto[];
}

export interface EspacoMulherBackupV1 {
  metadata: BackupMetadata;
  data: BackupData;
}
