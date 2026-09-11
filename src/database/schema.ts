/**
 * SQLite Schema and Performance Indices
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Single Source of Truth (SSOT) Relational DDL
 * Follow-up Specification 2026-09-11T22:01:09Z:
 * - 100% Local-First, zero backend, zero login.
 * - Patients schema strictly excludes CPF, Estado Civil, and CEP.
 * - Patients city_state defaults to 'Rio das Ostras - RJ'.
 * - Cascading foreign keys on all patient-dependent tables.
 */

export const SCHEMA_V1_TABLES = {
  patients: `
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      birthdate TEXT,
      age INTEGER,
      phone TEXT NOT NULL,
      address TEXT,
      neighborhood TEXT,
      city_state TEXT NOT NULL DEFAULT 'Rio das Ostras - RJ',
      email TEXT,
      insurance TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'discharged')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `,

  anamnesis: `
    CREATE TABLE IF NOT EXISTS anamnesis (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL UNIQUE,
      lab_tests TEXT,
      medications TEXT,
      allergies TEXT,
      surgeries TEXT,
      fractures TEXT,
      luxations TEXT,
      pregnancies TEXT,
      abortions TEXT,
      physical_activity TEXT,
      pain_complaints TEXT,
      pain_intensity INTEGER NOT NULL DEFAULT 0 CHECK(pain_intensity >= 0 AND pain_intensity <= 10),
      imaging_exams TEXT,
      clinical_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `,

  postural_evaluations: `
    CREATE TABLE IF NOT EXISTS postural_evaluations (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      evaluation_date TEXT NOT NULL,
      head TEXT,
      shoulders TEXT,
      thales_triangle TEXT,
      knees TEXT,
      feet TEXT,
      cervical TEXT,
      lateral_shoulders TEXT,
      abdomen TEXT,
      dorsal TEXT,
      lumbar TEXT,
      pelvis TEXT,
      arch TEXT,
      scapula TEXT,
      scoliosis TEXT,
      posterior_pelvis TEXT,
      gluteal_line TEXT,
      popliteal_line TEXT,
      musculature TEXT,
      photo_frontal_uri TEXT,
      photo_lateral_uri TEXT,
      photo_posterior_uri TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `,

  bioimpedance: `
    CREATE TABLE IF NOT EXISTS bioimpedance (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      evaluation_date TEXT NOT NULL,
      weight REAL NOT NULL,
      height REAL NOT NULL,
      abdominal_circ REAL,
      bmi REAL NOT NULL,
      body_age INTEGER,
      metabolic_age INTEGER,
      bmr REAL,
      body_fat_percent REAL NOT NULL,
      visceral_fat INTEGER NOT NULL,
      muscle_mass_kg REAL NOT NULL,
      body_water_pct REAL,
      ideal_weight REAL,
      target_weight REAL,
      fat_arm_r REAL,
      fat_arm_l REAL,
      fat_trunk REAL,
      fat_leg_r REAL,
      fat_leg_l REAL,
      clinical_opinion TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `,

  exercises: `
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      apparatus TEXT NOT NULL CHECK(apparatus IN ('Mat', 'Reformer', 'Cadillac', 'Wunda Chair', 'Ladder Barrel', 'Cinesioterapia')),
      description TEXT,
      default_springs TEXT,
      default_reps TEXT DEFAULT '10',
      default_sets INTEGER DEFAULT 1,
      level TEXT DEFAULT 'iniciante' CHECK(level IN ('iniciante', 'intermediário', 'avançado')),
      postural_focus TEXT,
      contraindications TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0 CHECK(is_custom IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `,

  routines: `
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `,

  routine_items: `
    CREATE TABLE IF NOT EXISTS routine_items (
      id TEXT PRIMARY KEY NOT NULL,
      routine_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      sets INTEGER NOT NULL DEFAULT 1,
      reps TEXT NOT NULL DEFAULT '10',
      springs_resistance TEXT,
      postural_notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
    );
  `,
};

export const SCHEMA_V1_DDL = `
  ${SCHEMA_V1_TABLES.patients}
  ${SCHEMA_V1_TABLES.anamnesis}
  ${SCHEMA_V1_TABLES.postural_evaluations}
  ${SCHEMA_V1_TABLES.bioimpedance}
  ${SCHEMA_V1_TABLES.exercises}
  ${SCHEMA_V1_TABLES.routines}
  ${SCHEMA_V1_TABLES.routine_items}
`;

export const SCHEMA_V1_INDICES = `
  CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
  CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);

  CREATE INDEX IF NOT EXISTS idx_anamnesis_patient_id ON anamnesis(patient_id);

  CREATE INDEX IF NOT EXISTS idx_postural_patient_id ON postural_evaluations(patient_id);
  CREATE INDEX IF NOT EXISTS idx_postural_date ON postural_evaluations(patient_id, evaluation_date DESC);

  CREATE INDEX IF NOT EXISTS idx_bioimpedance_patient_id ON bioimpedance(patient_id);
  CREATE INDEX IF NOT EXISTS idx_bioimpedance_date ON bioimpedance(patient_id, evaluation_date DESC);

  CREATE INDEX IF NOT EXISTS idx_exercises_apparatus ON exercises(apparatus);
  CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name COLLATE NOCASE);

  CREATE INDEX IF NOT EXISTS idx_routines_patient_id ON routines(patient_id);

  CREATE INDEX IF NOT EXISTS idx_routine_items_routine ON routine_items(routine_id, sort_order ASC);
`;
