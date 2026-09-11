# Technical Architecture & Integration Specification
# Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)

> **Document Version:** 1.0.0  
> **Author:** Architecture & Integration Analyst (`teamwork_preview_explorer_survey_3`)  
> **Target Framework:** Expo / React Native (TypeScript Strict Mode)  
> **Persistence Model:** Local-First SQLite (`expo-sqlite`) + Firebase Spark Plan Quota-Protected Cloud Sync  
> **Design Language:** Apple Human Interface Guidelines (HIG) Inset Grouped Hierarchy  

---

## 1. Executive Architectural Summary

The "Pilates Espaço Mulher" mobile application is an exclusive clinical tool designed for physiotherapist Dra. Rogéria Collares. The system manages clinical anamnesis, postural analysis with photographic alignment grids, bioimpedance evolution tracking, Pilates routine prescription across classical apparatuses (Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat, Accessories), workout execution logs, and clinical report generation for patient export via PDF and WhatsApp.

### Core Architectural Pillars
1. **Local-First Single Source of Truth (SSOT):** The device's local SQLite database holds the authoritative state. All reads, searches, writes, and computations execute locally with zero network latency and 100% offline capability.
2. **Firebase Spark Plan Quota Protection:** To safely operate within Firebase's free tier (50,000 reads/day, 20,000 writes/day), the architecture strictly prohibits real-time collection listeners (`onSnapshot`) and periodic polling loops. Cloud sync operates via **consolidated document bundles** (1 document per patient containing their complete clinical history), reducing cloud writes and reads by ~95%.
3. **Apple HIG Design System:** Implements native iOS aesthetics: SF Pro typography hierarchy, dynamic collapsible Large Titles, Inset Grouped Lists with continuous squircle corners, Segmented Controls, and haptic feedback via `expo-haptics`.
4. **Professional Identity Integration:** Dra. Rogéria Collares' professional credentials (CREFITO 23093-F, Costa Azul, Rio das Ostras - RJ, WhatsApp (22) 99947-4304) are intrinsically embedded into app headers, clinical summaries, and generated PDF reports.

---

## 2. Local-First SQLite Database Engine

### 2.1 Database Configuration & Storage Engine
- **Engine:** `expo-sqlite` (modern synchronous/async API introduced in Expo SDK 50+).
- **Database File:** `pilates_espacomulher.db` located in the sandboxed app documents directory.
- **Connection Pragma Configuration:**
  ```sql
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;          -- Write-Ahead Logging for high concurrency
  PRAGMA synchronous = NORMAL;        -- Optimal balance of durability and write speed
  PRAGMA temp_store = MEMORY;         -- In-memory temporary tables and indices
  PRAGMA cache_size = -64000;         -- 64MB database cache
  ```

### 2.2 Table Schemas (DDL Specifications)

#### 2.2.1 Table: `patients`
Stores patient demographic, contact, and base medical records.
```sql
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    name TEXT NOT NULL,                          -- Full patient name
    birth_date TEXT,                             -- ISO 8601 YYYY-MM-DD
    gender TEXT CHECK(gender IN ('F', 'M', 'Outro')),
    cpf TEXT,                                    -- Brazilian tax ID (optional)
    phone TEXT NOT NULL,                         -- (XX) XXXXX-XXXX
    email TEXT,
    occupation TEXT,                             -- Profissão/Atividade laboral
    emergency_contact TEXT,                      -- Nome do contato de emergência
    emergency_phone TEXT,                        -- Telefone do contato de emergência
    medical_history TEXT,                        -- Patologias prévias, histórico familiar
    surgical_history TEXT,                       -- Cirurgias prévias
    medications TEXT,                            -- Medicamentos em uso
    physical_activity TEXT,                      -- Prática atual de atividade física
    main_complaint TEXT NOT NULL,                -- Queixa principal (ex: dor lombar crônica)
    clinical_goals TEXT,                         -- Objetivos com o Pilates
    is_active INTEGER NOT NULL DEFAULT 1,        -- 1 = Ativo, 0 = Inativo
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted INTEGER NOT NULL DEFAULT 0        -- Soft-delete flag for sync tombstones
);
```

#### 2.2.2 Table: `anamnesis`
Clinical anamnesis assessments linked to a patient.
```sql
CREATE TABLE IF NOT EXISTS anamnesis (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    evaluation_date TEXT NOT NULL,               -- ISO 8601 YYYY-MM-DD
    lifestyle TEXT,                              -- Sono, nível de estresse, rotina
    pain_level INTEGER NOT NULL DEFAULT 0 CHECK(pain_level BETWEEN 0 AND 10), -- EVA 0-10
    pain_characteristics TEXT,                   -- Queimação, pontada, peso, latejante
    pain_locations TEXT NOT NULL DEFAULT '[]',   -- JSON array of anatomical zones
    aggravating_factors TEXT,                    -- Fatores de piora
    relieving_factors TEXT,                      -- Fatores de alívio
    posture_habits TEXT,                         -- Posturas habituais e ergonomia
    clinical_notes TEXT,                         -- Observações livres da Dra. Rogéria
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted INTEGER NOT NULL DEFAULT 0
);
```

#### 2.2.3 Table: `postural_evaluations`
Static and dynamic postural evaluations including photogrammetry benchmarks.
```sql
CREATE TABLE IF NOT EXISTS postural_evaluations (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    evaluation_date TEXT NOT NULL,               -- ISO 8601 YYYY-MM-DD
    view_anterior TEXT NOT NULL DEFAULT '{}',    -- JSON: Head tilt, shoulder height, clavicles, thorax, pelvis, knees, feet
    view_posterior TEXT NOT NULL DEFAULT '{}',   -- JSON: Head alignment, scapulae, scoliosis/spine deviation, pelvic tilt, popliteal lines, calcaneus
    view_lateral_right TEXT NOT NULL DEFAULT '{}', -- JSON: Head anteriorization, cervical lordosis, thoracic kyphosis, lumbar lordosis, pelvis, knees
    view_lateral_left TEXT NOT NULL DEFAULT '{}',  -- JSON: Bilateral comparisons
    dynamic_tests TEXT NOT NULL DEFAULT '{}',    -- JSON: Adams test, deep squat, single-leg stance, flexibility (finger-to-floor)
    photos TEXT NOT NULL DEFAULT '[]',           -- JSON array: [{ view: 'anterior', uri: 'file://...', grid_offset: 0, benchmarks: [] }]
    diagnostic_summary TEXT,                     -- Diagnóstico postural consolidado
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted INTEGER NOT NULL DEFAULT 0
);
```

#### 2.2.4 Table: `bioimpedances`
Body composition metrics and temporal tracking points.
```sql
CREATE TABLE IF NOT EXISTS bioimpedances (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    evaluation_date TEXT NOT NULL,               -- ISO 8601 YYYY-MM-DD
    weight_kg REAL NOT NULL CHECK(weight_kg > 0),
    height_cm REAL NOT NULL CHECK(height_cm > 0),
    bmi REAL NOT NULL,                           -- IMC: weight / (height/100)^2
    body_fat_pct REAL NOT NULL,                  -- % Gordura Corporal
    muscle_mass_pct REAL NOT NULL,               -- % Massa Muscular Esquelética
    body_water_pct REAL NOT NULL,                -- % Água Corporal Total
    visceral_fat_level INTEGER NOT NULL,         -- Gordura Visceral (nível 1-59)
    bmr_kcal INTEGER NOT NULL,                   -- Taxa Metabólica Basal (kcal)
    metabolic_age INTEGER,                       -- Idade Metabólica (anos)
    bone_mass_kg REAL,                           -- Massa Óssea estimada (kg)
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted INTEGER NOT NULL DEFAULT 0
);
```

#### 2.2.5 Table: `exercise_catalog`
Pre-seeded classical Pilates exercises categorized by apparatus.
```sql
CREATE TABLE IF NOT EXISTS exercise_catalog (
    id TEXT PRIMARY KEY NOT NULL,                -- Slug identifier or UUID (e.g., 'ref_footwork')
    name TEXT NOT NULL,                          -- e.g., 'Footwork - Toes', 'The Hundred', 'Swan Dive'
    apparatus TEXT NOT NULL CHECK(apparatus IN (
        'reformer', 'cadillac', 'wunda_chair', 'ladder_barrel', 'mat', 'accessories'
    )),
    level TEXT NOT NULL CHECK(level IN ('beginner', 'intermediate', 'advanced')),
    primary_target TEXT NOT NULL,                -- 'core_powerhouse', 'spine_articulation', 'scapular_stability', etc.
    muscle_groups TEXT NOT NULL DEFAULT '[]',    -- JSON array: ["transversus_abdominis", "gluteals", "hamstrings"]
    setup_description TEXT NOT NULL,             -- Posição do carrinho, barra de pés, molas padrão
    default_springs TEXT NOT NULL,               -- e.g., '2 Vermelhas e 1 Azul', 'Molas altas'
    execution_cues TEXT NOT NULL,                -- Instruções posturais e proprioceptivas
    precautions TEXT,                            -- Cuidados posturais
    contraindications TEXT,                      -- e.g., 'Hérnia de disco aguda', 'Espondilolistese'
    media_asset_uri TEXT,                        -- URI de ilustração local ou ícone representativo
    is_custom INTEGER NOT NULL DEFAULT 0,        -- 0 = Catálogo clássico de fábrica, 1 = Criado pela Dra.
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 2.2.6 Table: `routines`
Prescribed workout routine headers customized for each patient.
```sql
CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                          -- e.g., 'Rotina de Fortalecimento Core e Descompressão'
    objective TEXT NOT NULL,                     -- Objetivo terapêutico
    date_prescribed TEXT NOT NULL,               -- ISO 8601 YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted INTEGER NOT NULL DEFAULT 0
);
```

#### 2.2.7 Table: `routine_items`
Ordered items within a prescribed routine specifying apparatus settings and reps.
```sql
CREATE TABLE IF NOT EXISTS routine_items (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercise_catalog(id) ON DELETE RESTRICT,
    sequence_order INTEGER NOT NULL,             -- 1, 2, 3...
    sets INTEGER NOT NULL DEFAULT 1,
    repetitions TEXT NOT NULL,                   -- '10 reps', '8 a 10 cada lado', '60s'
    spring_setting TEXT NOT NULL,                -- e.g., '1 Mola Azul + 1 Vermelha'
    accessory_details TEXT,                      -- e.g., 'Overball entre joelhos', 'Faixa elástica média'
    specific_cues TEXT,                          -- Instruções específicas para a condição da paciente
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 2.2.8 Table: `workout_sessions`
Execution logs of executed Pilates classes and patient real-time feedback.
```sql
CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    routine_id TEXT REFERENCES routines(id) ON DELETE SET NULL,
    session_date TEXT NOT NULL,                  -- ISO 8601 YYYY-MM-DD HH:mm
    duration_minutes INTEGER NOT NULL DEFAULT 50,
    exercises_completed TEXT NOT NULL DEFAULT '[]', -- JSON array of completed exercise IDs & modifications
    patient_feedback TEXT,                       -- Sensação de esforço, alívio, cansaço
    pain_reported INTEGER NOT NULL DEFAULT 0 CHECK(pain_reported BETWEEN 0 AND 10), -- EVA relatada
    observations TEXT,                           -- Anotações clínicas da Dra. Rogéria Collares
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted INTEGER NOT NULL DEFAULT 0
);
```

#### 2.2.9 Table: `sync_status`
Tracks dirty/modified records pending remote synchronization.
```sql
CREATE TABLE IF NOT EXISTS sync_status (
    id TEXT PRIMARY KEY NOT NULL,                -- UUID v4
    entity_type TEXT NOT NULL,                   -- 'patient', 'anamnesis', 'postural', 'bioimpedance', 'routine', 'workout_session'
    entity_id TEXT NOT NULL,                     -- Local primary key of the record
    patient_id TEXT NOT NULL,                    -- Root patient ID for bundling
    action TEXT NOT NULL CHECK(action IN ('UPSERT', 'DELETE')),
    dirty INTEGER NOT NULL DEFAULT 1,            -- 1 = Modified locally, pending sync; 0 = In sync
    last_attempt_at TEXT,                        -- Timestamp of last sync attempt
    last_synced_at TEXT,                         -- Timestamp of successful sync
    error_message TEXT,                          -- Error details if sync failed
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.3 Indexing Strategy for Zero-Latency Local Queries
```sql
-- Patients fast search and sorting
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_patients_updated ON patients(updated_at DESC);

-- Foreign key indices for instant child collection retrieval
CREATE INDEX IF NOT EXISTS idx_anamnesis_patient ON anamnesis(patient_id, evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_postural_patient ON postural_evaluations(patient_id, evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_bioimpedance_patient ON bioimpedances(patient_id, evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_routines_patient ON routines(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_routine_items_routine ON routine_items(routine_id, sequence_order ASC);
CREATE INDEX IF NOT EXISTS idx_sessions_patient ON workout_sessions(patient_id, session_date DESC);

-- Exercise catalog lookup indices
CREATE INDEX IF NOT EXISTS idx_exercise_apparatus ON exercise_catalog(apparatus, level);
CREATE INDEX IF NOT EXISTS idx_exercise_name ON exercise_catalog(name COLLATE NOCASE);

-- Sync engine query optimization: instant dirty set identification
CREATE INDEX IF NOT EXISTS idx_sync_status_dirty ON sync_status(dirty, patient_id);
```

### 2.4 SQLite Migration & Versioning Engine
Migrations are managed using SQLite's native PRAGMA `user_version` counter:
1. On app boot, `DatabaseProvider` opens connection:
   ```typescript
   import * as SQLite from 'expo-sqlite';
   const db = SQLite.openDatabaseSync('pilates_espacomulher.db');
   ```
2. Checks current version:
   ```typescript
   const result = db.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
   const currentVersion = result?.user_version ?? 0;
   ```
3. Sequentially executes pending migrations in an atomic transaction:
   ```typescript
   const migrations: Array<{ version: number; name: string; run: (db: SQLite.SQLiteDatabase) => void }> = [
     { version: 1, name: '001_initial_schema', run: (db) => { /* Execute full DDL & indexes */ } },
     { version: 2, name: '002_seed_pilates_catalog', run: (db) => { /* Seed classical exercises */ } },
   ];

   for (const migration of migrations) {
     if (migration.version > currentVersion) {
       db.withTransactionSync(() => {
         migration.run(db);
         db.execSync(`PRAGMA user_version = ${migration.version};`);
       });
     }
   }
   ```

---

## 3. Firebase Spark Plan Quota Protection

### 3.1 Spark Plan Quota Limits & Threat Analysis

| Resource | Spark Plan Daily Limit | Threat Scenario in Normalized NoSQL | Quota-Protected Design Guarantee |
|---|---|---|---|
| **Document Reads** | 50,000 / day | Real-time `onSnapshot` listeners on collections stream 100+ reads per screen opening. 50 screen transitions = 5,000 reads. | **0 listeners.** Read on-demand only during initial cloud restore: 1 read per patient bundle. Typical daily reads: < 50. |
| **Document Writes** | 20,000 / day | Normalized schema writes 1 patient + 1 anamnesis + 1 evaluation + 1 routine + 10 items = 14 writes per clinical visit. | **1 write per patient bundle.** All modified entities packed into single document. 20 patients seen = 20 writes (< 0.1% of quota). |
| **Document Deletes** | 20,000 / day | Cascade deleting child documents consumes 15 deletes. | Single write updating `deleted: true` tombstone on patient bundle. |
| **Storage (Firestore)** | 1 GiB total | Storing Base64 images directly in Firestore documents quickly exhausts 1 GiB. | **Strictly prohibited.** Firestore stores only textual JSON. Photo assets stay local or upload to Firebase Storage bucket. |

### 3.2 Consolidated Document Architecture

Instead of distributing a patient's history across subcollections (`/patients/{id}/anamneses/...`), each patient is modeled as an atomic **Consolidated Patient Document Bundle**:

**Firestore Path:** `clinics/espacomulher/patients/{patientId}`

```typescript
export interface ConsolidatedPatientBundle {
  // Identification & Metadata
  patientId: string;
  schemaVersion: number;
  lastModifiedLocally: string; // ISO 8601
  isDeleted: boolean;

  // Primary Profile
  profile: {
    name: string;
    birthDate: string | null;
    gender: 'F' | 'M' | 'Outro';
    cpf: string | null;
    phone: string;
    email: string | null;
    occupation: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    medicalHistory: string | null;
    surgicalHistory: string | null;
    medications: string | null;
    physicalActivity: string | null;
    mainComplaint: string;
    clinicalGoals: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };

  // Complete Clinical History Arrays
  anamneses: Array<AnamnesisDTO>;
  posturalEvaluations: Array<PosturalEvaluationDTO>;
  bioimpedances: Array<BioimpedanceDTO>;
  routines: Array<RoutineDTO & { items: RoutineItemDTO[] }>;
  workoutSessions: Array<WorkoutSessionDTO>;

  // Clinical Summary Metadata for High-Level Dashboards
  summary: {
    totalSessionsCount: number;
    lastEvaluationDate: string | null;
    lastPainScore: number;
    lastWeightKg: number | null;
    lastBmi: number | null;
    activeRoutineName: string | null;
  };
}
```

#### Document Size Safety Verification
- Firestore maximum document size: **1,048,576 bytes (1 MiB)**.
- Average Patient Profile JSON: ~1.2 KB
- 10 Anamneses: ~8 KB
- 10 Postural Evaluations (vector benchmarks, no raw images): ~15 KB
- 50 Bioimpedance records: ~12 KB
- 10 Pilates Routines + 100 items: ~18 KB
- 100 Workout Session logs: ~22 KB
- **Total Bundle Size after 2 years of weekly sessions:** **~76 KB** (only **7.2%** of the 1MB limit!).
- *Photo asset handling:* Postural evaluation photos are stored locally on device. If cloud backup is enabled, photos are uploaded to Firebase Storage (`espacomulher-84137.firebasestorage.app/patients/{patientId}/postural/{id}.jpg`), and only the cloud storage URL is stored in the document bundle.

### 3.3 Batch Write & Dirty Flag State Machine

```
                   ┌─────────────┐
                   │    CLEAN    │ (dirty = 0)
                   │  In Sync    │
                   └──────┬──────┘
                          │ Local CRUD event (Insert / Update / Soft Delete)
                          ▼
                   ┌─────────────┐
                   │    DIRTY    │ (dirty = 1, error = NULL)
                   │ Sync Pending│
                   └──────┬──────┘
                          │ Manual Trigger or Debounced On-Save
                          ▼
                   ┌─────────────┐
                   │   SYNCING   │ (In-Flight HTTP setDoc)
                   └──────┬──────┘
             Success      │      Network / Auth Failure
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
┌─────────────┐                       ┌─────────────┐
│    CLEAN    │                       │    DIRTY    │ (dirty = 1,
│ dirty = 0   │                       │ retry_count++, error logged)
└─────────────┘                       └─────────────┘
```

#### State Machine Implementation Logic:
1. **Local Mutation Interceptor:** Whenever any record in `patients`, `anamnesis`, `postural_evaluations`, `bioimpedances`, `routines`, or `workout_sessions` is modified, the transaction inserts or updates `sync_status`:
   ```sql
   INSERT INTO sync_status (id, entity_type, entity_id, patient_id, action, dirty, updated_at)
   VALUES ($uuid, $entity, $recordId, $patientId, 'UPSERT', 1, datetime('now'))
   ON CONFLICT(id) DO UPDATE SET dirty = 1, updated_at = datetime('now');
   ```
2. **Coalesced Patient Packing:**
   ```typescript
   // Query all patients with pending changes
   const dirtyPatients = db.getAllSync<{ patient_id: string }>(
     'SELECT DISTINCT patient_id FROM sync_status WHERE dirty = 1;'
   );

   for (const { patient_id } of dirtyPatients) {
     // Compile entire bundle from local SQLite
     const bundle = compilePatientBundleFromSqlite(db, patient_id);

     // One-shot write to Firestore
     const patientRef = doc(firestoreDb, 'clinics/espacomulher/patients', patient_id);
     await setDoc(patientRef, bundle, { merge: true });

     // Clear dirty flags locally
     db.runSync(
       `UPDATE sync_status 
        SET dirty = 0, last_synced_at = datetime('now'), error_message = NULL, retry_count = 0 
        WHERE patient_id = ?`,
       [patient_id]
     );
   }
   ```

### 3.4 Sync Trigger Logic (Zero Listeners)
1. **Explicit / On-Demand Sync (Primary Mode):**
   - Visible in Navigation Bar & Settings: Cloud status icon showing:
     - 🟢 *Tudo Sincronizado* (0 dirty records)
     - 🟠 *X Alterações Pendentes* (N dirty records)
   - Tapping "Sincronizar Agora" triggers the sync worker, activates `expo-haptics` feedback, and presents a non-blocking progress HUD.
2. **Debounced Background On-Save (Secondary Mode):**
   - After a clinical form (e.g. Anamnesis or Postural Evaluation) is saved locally:
   - Schedules a debounced background task (5 seconds delay).
   - Verifies network connectivity via `NetInfo.fetch()`.
   - If offline: keeps records dirty and aborts silently without user disruption.
   - If online: sends the single bundled write.
3. **No Polling & No Collection Listeners Rule:**
   - No `setInterval` / `setTimeout` loops checking Firestore.
   - No `onSnapshot()` subscriptions.

---

## 4. Apple HIG UI Architecture

### 4.1 Design System Tokens

```typescript
export const PilatesTokens = {
  colors: {
    // Official Brand Palette
    primaryLilacLight: '#9B6CBA',    // Destaques / Elementos interativos
    primaryLilacDark: '#7A4F94',     // Identidade institucional / Header Brand
    surfaceOffWhite: '#FAF8F5',      // Background padrão agrupado (Apple HIG Canvas)
    surfaceSoftLilac: '#F4EEF7',     // Background de cartões secundários / Inset Selecionado
    accentWine: '#6A1B15',           // Alertas clínicos, dor aguda, contraindicações
    indicatorForestGreen: '#1B5235', // Indicadores positivos, treinos concluídos, status sincronizado

    // Apple Neutral Scale
    textPrimary: '#1C1824',          // Charcoal escuro com subtom lilás
    textSecondary: '#6E6A75',        // Texto secundário e legendas
    textTertiary: '#A5A0AD',         // Placeholders e divisores inativos
    cardBackground: '#FFFFFF',       // Superfície dos Inset Grouped cards
    separator: '#E8E2EC',            // Divisores de linha suaves
    destructive: '#D32F2F',          // Ações destrutivas (exclusão)
  },

  typography: {
    // Apple SF Pro Display & Text Scale
    largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
    title1:     { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
    title2:     { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
    title3:     { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
    headline:   { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
    body:       { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
    callout:    { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
    subheadline:{ fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
    footnote:   { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
    caption1:   { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
    caption2:   { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.07 },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    section: 40,
  },

  radii: {
    small: 8,
    medium: 12,
    card: 14,      // Apple HIG Continuous Corner Curve
    modal: 20,
    pill: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#1C1824',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    modal: {
      shadowColor: '#1C1824',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    }
  }
} as const;
```

### 4.2 Inset Grouped List Component Architecture

The primary form and list layout follows iOS `UITableViewStyleInsetGrouped`:
- **Card Container:** Inset by `16pt` on left and right margins, rounded corners with `14pt` radius, background `#FFFFFF`, subtle `0.5pt` border `#E8E2EC`.
- **Rows:** Minimum height of `48pt`, vertically aligned content, horizontal padding `16pt`.
- **Separators:** Inset separator line spanning from after the leading icon (offset `56pt`) to the right edge.
- **Section Headers:** Uppercase `13pt` footnote `#6E6A75` with `16pt` horizontal padding.
- **Section Footers:** `13pt` footnote `#8E8A94` providing clinical context or validation instructions.

```tsx
// Pattern: InsetGroupedCard
<View style={styles.groupContainer}>
  {header && <Text style={styles.groupHeader}>{header}</Text>}
  <View style={styles.card}>
    {children}
  </View>
  {footer && <Text style={styles.groupFooter}>{footer}</Text>}
</View>
```

### 4.3 Large Title Collapsible Header Pattern
Standard native iOS header with dynamic transition upon scrolling:
1. **Initial State (Expanded):** Header displays Large Title (34pt Bold) with Dra. Rogéria's credential subtitle in `#7A4F94`.
2. **Scroll Transition:** An `Animated.ScrollView` or `Reanimated` scroll listener calculates offset:
   - Offset `0 - 50pt`: Large title smoothly shrinks and fades out (`opacity: 1 -> 0`).
   - Offset `> 50pt`: Navigation bar renders compact centered title (17pt Semibold) with subtle frosted background blur / translucent surface and `#E8E2EC` bottom border.
3. **Always-Accessible Actions:** Header hosts the Search bar, Quick Add (+) action, and Cloud Sync Indicator.

### 4.4 Haptics Integration Points (`expo-haptics`)

| User Interaction | Trigger Method | Haptic Pattern |
|---|---|---|
| Tab bar or Segmented Control switch | `onPress` | `Haptics.selectionAsync()` |
| Saving clinical record / evaluation | Form submit success | `Haptics.notificationAsync(Success)` |
| Cloud sync completed | Sync engine success | `Haptics.notificationAsync(Success)` |
| Destructive action (Delete patient / reset) | Confirmation modal tap | `Haptics.impactAsync(Heavy)` |
| Pain scale EVA slider change (0-10) | Slider notch snap | `Haptics.selectionAsync()` |
| Clinical alert or unsaved changes warning | Back press with dirty state | `Haptics.notificationAsync(Warning)` |
| Sync failure / Validation error | Submit error | `Haptics.notificationAsync(Error)` |

### 4.5 Postural Alignment Visual Grid (SVG Benchmark Engine)

The postural evaluation module renders an SVG alignment canvas over the patient's photo or real-time camera viewfinder:
- **Central Vertical Plumb Line (Fio de Prumo):** High-visibility dashed line in `#9B6CBA` running vertically through the center of gravity.
- **Horizontal Anatomical Benchmark Guides:**
  1. *Bi-pupillary Line:* Aligns head tilt / cervical lateralization.
  2. *Bi-acromial Line:* Evaluates shoulder elevation asymmetry.
  3. *Inferior Scapular Line:* Assesses scapular winging and asymmetry.
  4. *Bi-iliac Line:* Measures pelvic tilt and leg length discrepancies.
  5. *Patellar Line:* Identifies genu valgum / varum.
  6. *Bi-malleolar Line:* Evaluates foot pronation / supination.
- **SVG Implementation (`react-native-svg`):**
  - Uses `<Svg viewBox="0 0 300 400">` overlay.
  - Interactive draggable anchor points allow Dra. Rogéria to mark anatomical landmarks and compute deviation angles in degrees.

### 4.6 Bioimpedance Temporal Charts (Lightweight SVG Engine)

To maintain lightweight bundle size and avoid broken dependencies from heavy third-party charting libraries, the evolution chart is built using native SVG path generators:
- **Metrics Covered:** Weight (kg), % Body Fat, % Muscle Mass, Visceral Fat.
- **Path Calculation:** Implements cubic Bezier smoothing between evaluation dates:
  $$P_i \rightarrow P_{i+1} \text{ via control points } (x_i + \Delta x/2, y_i) \text{ and } (x_{i+1} - \Delta x/2, y_{i+1})$$
- **Visuals:**
  - Area gradient beneath curve: LinearGradient `#9B6CBA` (alpha 0.35) fading to transparent.
  - Solid stroke `#7A4F94` (strokeWidth: 3).
  - Highlighting dots at evaluation points with tap callout showing exact date, value, and difference ($\Delta$) vs. baseline.

---

## 5. Clinical Report & Professional Signature Architecture

### 5.1 Report Generation Pipeline (`expo-print`)

Clinical reports are rendered as professional A4 PDF documents using an HTML5/CSS3 template engineered for high-resolution vector printing via `expo-print.printToFileAsync`.

```
[Clinical State: Patient + Eval + Bio + Routine]
                      │
                      ▼
       [HTML/CSS Printable Template Builder]
                      │
                      ▼
       [expo-print: printToFileAsync({ html })]
                      │
                      ▼
              [Temporary PDF File]
                      │
       ┌──────────────┴──────────────┐
       ▼                             ▼
 [expo-sharing: shareAsync]     [WhatsApp Direct Intent: wa.me]
```

### 5.2 Responsive A4 HTML/CSS Clinical Template Specification

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 20mm 15mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1C1824;
    background: #FFFFFF;
    margin: 0;
    padding: 0;
    font-size: 10pt;
    line-height: 1.4;
  }
  .header {
    border-bottom: 2.5px solid #7A4F94;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .clinic-name {
    font-size: 18pt;
    font-weight: 700;
    color: #7A4F94;
    letter-spacing: -0.5px;
    text-transform: uppercase;
  }
  .clinic-subtitle {
    font-size: 9pt;
    color: #6E6A75;
    margin-top: 2px;
  }
  .physio-badge {
    text-align: right;
    font-size: 9pt;
    color: #1C1824;
  }
  .physio-name {
    font-weight: 700;
    color: #7A4F94;
    font-size: 11pt;
  }
  .crefito {
    font-weight: 600;
    color: #6A1B15;
  }
  .section-title {
    font-size: 12pt;
    font-weight: 700;
    color: #7A4F94;
    background: #F4EEF7;
    padding: 6px 10px;
    border-radius: 4px;
    margin-top: 14px;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
  .patient-box {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 8px;
    background: #FAF8F5;
    border: 1px solid #E8E2EC;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 12px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
  }
  .data-table th {
    background: #7A4F94;
    color: #FFFFFF;
    text-align: left;
    padding: 6px 8px;
    font-size: 8.5pt;
    text-transform: uppercase;
  }
  .data-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #E8E2EC;
    font-size: 9pt;
  }
  .data-table tr:nth-child(even) {
    background: #FAF8F5;
  }
  .badge-success {
    background: #1B5235;
    color: #FFFFFF;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 7.5pt;
    font-weight: 600;
  }
  .signature-block {
    margin-top: 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    page-break-inside: avoid;
  }
  .signature-line {
    width: 280px;
    border-top: 1.5px solid #1C1824;
    margin-bottom: 6px;
  }
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid #E8E2EC;
    padding-top: 6px;
    font-size: 7.5pt;
    color: #6E6A75;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic-name">Pilates Espaço Mulher</div>
      <div class="clinic-subtitle">Fisioterapia Especializada • Reabilitação Postural • Pilates Clínico</div>
      <div class="clinic-subtitle">Costa Azul, Rio das Ostras - RJ • WhatsApp: (22) 99947-4304</div>
    </div>
    <div class="physio-badge">
      <div class="physio-name">Dra. Rogéria Collares</div>
      <div class="crefito">Fisioterapeuta — CREFITO 23093-F</div>
    </div>
  </div>

  <div class="patient-box">
    <div><strong>Paciente:</strong> {{patient.name}}</div>
    <div><strong>Data Nasc:</strong> {{patient.birthDate}}</div>
    <div><strong>Data Avaliação:</strong> {{evaluation.date}}</div>
    <div style="grid-column: span 3;"><strong>Queixa Principal:</strong> {{patient.mainComplaint}}</div>
  </div>

  <div class="section-title">Evolução de Bioimpedância e Composição Corporal</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Parâmetro</th>
        <th>Avaliação Inicial</th>
        <th>Avaliação Anterior</th>
        <th>Avaliação Atual</th>
        <th>Evolução</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Peso Corporal</strong></td>
        <td>{{initial.weight}} kg</td>
        <td>{{previous.weight}} kg</td>
        <td><strong>{{current.weight}} kg</strong></td>
        <td><span class="badge-success">{{delta.weight}}</span></td>
      </tr>
      <tr>
        <td><strong>% Gordura Corporal</strong></td>
        <td>{{initial.fat}} %</td>
        <td>{{previous.fat}} %</td>
        <td><strong>{{current.fat}} %</strong></td>
        <td><span class="badge-success">{{delta.fat}}</span></td>
      </tr>
      <tr>
        <td><strong>% Massa Muscular</strong></td>
        <td>{{initial.muscle}} %</td>
        <td>{{previous.muscle}} %</td>
        <td><strong>{{current.muscle}} %</strong></td>
        <td><span class="badge-success">{{delta.muscle}}</span></td>
      </tr>
      <tr>
        <td><strong>Gordura Visceral</strong></td>
        <td>Nível {{initial.visceral}}</td>
        <td>Nível {{previous.visceral}}</td>
        <td><strong>Nível {{current.visceral}}</strong></td>
        <td>Estável</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Prescrição de Treino de Pilates Clínico</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Aparelho</th>
        <th>Exercício</th>
        <th>Molas / Resistência</th>
        <th>Repetições</th>
        <th>Foco Terapêutico</th>
      </tr>
    </thead>
    <tbody>
      {{#each routine.items}}
      <tr>
        <td><strong>{{apparatus}}</strong></td>
        <td>{{exerciseName}}</td>
        <td>{{springSetting}}</td>
        <td>{{repetitions}}</td>
        <td>{{specificCues}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="signature-block">
    <div class="signature-line"></div>
    <div style="font-weight: 700; font-size: 11pt; color: #7A4F94;">Dra. Rogéria Collares</div>
    <div style="font-size: 9pt; color: #6A1B15; font-weight: 600;">Fisioterapeuta — CREFITO 23093-F</div>
    <div style="font-size: 8pt; color: #6E6A75;">Pilates Espaço Mulher • Rio das Ostras - RJ</div>
  </div>

  <div class="footer">
    <div>Pilates Espaço Mulher • Costa Azul, Rio das Ostras - RJ • (22) 99947-4304</div>
    <div>Documento emitido em {{generatedAt}} • Autenticidade Profissional Garantida</div>
  </div>
</body>
</html>
```

### 5.3 Export & Sharing Handlers

#### 1. PDF Export via `expo-sharing`:
```typescript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportClinicalReportPdf(reportHtml: string, patientName: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({
    html: reportHtml,
    base64: false,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Relatório Clínico - ${patientName}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}
```

#### 2. WhatsApp Direct Link Intent:
```typescript
import { Linking } from 'react-native';

export function shareReportViaWhatsApp(phone: string, patientName: string) {
  const sanitizedPhone = phone.replace(/\D/g, '');
  const targetPhone = sanitizedPhone.startsWith('55') ? sanitizedPhone : `55${sanitizedPhone}`;
  
  const textMessage = 
    `Olá ${patientName}!\n\n` +
    `Segue o seu Relatório de Avaliação e Evolução Clínica do Pilates Espaço Mulher com a Dra. Rogéria Collares (CREFITO 23093-F).\n\n` +
    `Qualquer dúvida sobre a sua prescrição ou evolução, estou à disposição!\n\n` +
    `Pilates Espaço Mulher • Costa Azul, Rio das Ostras - RJ\n` +
    `WhatsApp: (22) 99947-4304`;

  const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(textMessage)}`;
  Linking.openURL(url);
}
```

---

## 6. Modular Directory Layout Proposal

```
goofy-archimedes/
├── App.tsx                               # Application root & Providers wrapper
├── app.json                              # Expo application manifest
├── tsconfig.json                         # Strict TypeScript configuration
├── package.json                          # Dependencies & scripts
└── src/
    ├── assets/                           # Static branding assets & illustrations
    │   ├── brand/                        # Clinic logos, signature stamps, icons
    │   └── exercises/                    # Apparatus & posture vector glyphs
    │
    ├── database/                         # Local-First SQLite Persistence Layer
    │   ├── client.ts                     # Database connection instance & WAL pragmas
    │   ├── migrations/                   # Sequential migrations (PRAGMA user_version)
    │   │   ├── 001_initial_schema.ts     # Tables DDL and performance indices
    │   │   └── 002_seed_exercises.ts     # Classical Pilates catalog seed data
    │   └── repositories/                 # Strongly-typed Data Access Objects (DAOs)
    │       ├── PatientRepository.ts      # Patients CRUD and search
    │       ├── AnamnesisRepository.ts    # Clinical anamnesis operations
    │       ├── PosturalRepository.ts     # Postural assessments and photogrammetry
    │       ├── BioimpedanceRepository.ts # Bioimpedance measurements and time series
    │       ├── RoutineRepository.ts      # Exercise catalog, routines, and items
    │       ├── SessionRepository.ts      # Workout session logs
    │       └── SyncRepository.ts         # Dirty queue state management
    │
    ├── design-system/                    # Apple HIG Component Library
    │   ├── tokens/                       # Design tokens
    │   │   ├── colors.ts                 # Lilac, Off-white, Wine, Forest Green
    │   │   ├── typography.ts             # SF Pro text scales
    │   │   ├── spacing.ts                # 4pt grid system
    │   │   └── radii.ts                  # Apple continuous squircle radii
    │   ├── components/                   # Native reusable UI components
    │   │   ├── InsetGroupedList.tsx      # iOS Inset Grouped container & row
    │   │   ├── LargeTitleHeader.tsx      # Dynamic collapsible Large Title
    │   │   ├── SegmentedControl.tsx      # Native iOS Segmented Control
    │   │   ├── PosturalGridOverlay.tsx   # SVG plumb line & benchmark canvas
    │   │   ├── BioimpedanceChart.tsx     # Lightweight SVG Bezier line/bar chart
    │   │   ├── SyncBadge.tsx             # Cloud sync status indicator
    │   │   └── ActionButton.tsx          # Apple HIG buttons with tactile feedback
    │   └── hooks/
    │       ├── useHaptics.ts             # Typed wrapper around expo-haptics
    │       └── useTheme.ts               # Theme tokens accessor
    │
    ├── features/                         # Domain-Driven Clinical Modules
    │   ├── patients/                     # Patient management & search
    │   │   ├── screens/                  # PatientListScreen, PatientDetailScreen, PatientFormScreen
    │   │   └── hooks/                    # usePatients, usePatientSearch
    │   ├── anamnesis/                    # Clinical Anamnesis
    │   │   ├── screens/                  # AnamnesisFormScreen, AnamnesisDetailScreen
    │   │   └── components/               # PainScaleSlider, AnatomicalZonePicker
    │   ├── postural/                     # Postural Analysis & Grid
    │   │   ├── screens/                  # PosturalEvaluationScreen, PhotoCaptureScreen
    │   │   └── components/               # BenchmarkAngleRuler, LandmarkPicker
    │   ├── bioimpedance/                 # Bioimpedance & Body Composition
    │   │   ├── screens/                  # BioimpedanceFormScreen, EvolutionDashboardScreen
    │   │   └── components/               # MetricDeltaCard, CompositionSummary
    │   ├── pilates-routines/             # Apparatus Catalog & Prescription
    │   │   ├── screens/                  # RoutineBuilderScreen, ExerciseCatalogScreen
    │   │   └── components/               # ApparatusSelector, SpringSettingPicker
    │   ├── workout-sessions/             # Session Execution Logs
    │   │   ├── screens/                  # ActiveSessionScreen, SessionHistoryScreen
    │   │   └── components/               # ExerciseChecklist, FeedbackSlider
    │   └── reports/                      # Clinical Report Generation
    │       ├── screens/                  # ReportPreviewScreen
    │       ├── templates/                # ReportHtmlBuilder.ts
    │       └── services/                 # ReportExportService.ts
    │
    ├── navigation/                       # Application Navigation Hierarchy
    │   ├── RootNavigator.tsx             # Navigation container & Modal stack
    │   ├── TabNavigator.tsx              # Bottom tab bar (Pacientes, Treinos, Relatórios, Ajustes)
    │   └── types.ts                      # Strongly-typed route parameters
    │
    ├── services/                         # External & Platform Services
    │   ├── firebase/                     # Firebase SDK initialization
    │   │   ├── config.ts                 # Credentials for 'espacomulher-84137'
    │   │   └── firestore.ts              # One-shot setDoc/getDoc bundle wrappers
    │   ├── sync/                         # Quota-Protected Synchronization Service
    │   │   ├── SyncEngine.ts             # Dirty state machine & coalesced packing
    │   │   └── NetworkMonitor.ts         # Connectivity state evaluator
    │   ├── pdf/                          # PDF generation wrapper (expo-print)
    │   └── share/                        # Sharing & WhatsApp intent handlers
    │
    ├── types/                            # Global TypeScript Declarations
    │   ├── models.ts                     # Database entity interfaces
    │   ├── sync.ts                       # Consolidated bundle DTO contracts
    │   └── clinical.ts                   # Anatomical landmarks, apparatus enums
    │
    └── utils/                            # Shared Utilities & Helpers
        ├── calculations.ts               # BMI, BMR, % delta math
        ├── dates.ts                      # Brazilian date formatters (dd/MM/yyyy)
        └── validation.ts                 # Input validation rules
```

---

## 7. Architectural Decisions Record (ADR)

### ADR 001: Local-First with SQLite over Pure Remote Firestore
- **Context:** The clinic operates in Rio das Ostras where cellular reception can be intermittent. Physiotherapists cannot afford loading spinners or frozen screens while interacting with patients.
- **Decision:** Use SQLite via `expo-sqlite` as the Single Source of Truth. The local database executes all CRUD operations instantaneously. Firestore acts strictly as an off-device backup and disaster recovery replica.
- **Consequence:** Instantaneous UI responsiveness, zero offline errors, and predictable performance.

### ADR 002: Consolidated Document Bundling for Firestore Quota Protection
- **Context:** Firebase Spark plan provides only 50,000 reads and 20,000 writes per day. Fine-grained normalized NoSQL models risk quota exhaustion when managing complex clinical histories.
- **Decision:** Bundle each patient's complete textual history into a single document at `clinics/espacomulher/patients/{patientId}`. Prohibit all real-time snapshot listeners (`onSnapshot`).
- **Consequence:** A full clinical visit consumes exactly 1 write instead of 15+. Daily quota consumption remains under 0.25%, ensuring perpetual free-tier safety.

### ADR 003: Pure SVG Charts over Heavyweight Charting Dependencies
- **Context:** Third-party charting libraries (e.g. `react-native-chart-kit`, `victory-native`) add 3-5 MB to bundle size and frequently suffer from version incompatibilities with newer Expo SDK releases.
- **Decision:** Implement a dedicated, lightweight SVG chart component using `react-native-svg` with cubic Bezier curves and area gradients.
- **Consequence:** Zero external chart dependencies, zero build breakages, and 100% custom styling matching the official brand palette (`#9B6CBA`, `#7A4F94`).

---

## 8. Summary of Interface Contracts & Implementation Milestones

```typescript
// Core Data Contract: Local Patient Record
export interface PatientRecord {
  id: string;
  name: string;
  birthDate: string | null;
  gender: 'F' | 'M' | 'Outro';
  cpf: string | null;
  phone: string;
  email: string | null;
  occupation: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  medicalHistory: string | null;
  surgicalHistory: string | null;
  medications: string | null;
  physicalActivity: string | null;
  mainComplaint: string;
  clinicalGoals: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

// Core Sync Service Contract
export interface ISyncService {
  getPendingChangesCount(): Promise<number>;
  syncPatient(patientId: string): Promise<boolean>;
  syncAllPending(): Promise<{ success: boolean; syncedCount: number; errors: string[] }>;
  restoreFromCloud(): Promise<{ restoredCount: number }>;
}
```

This architecture provides the foundational technical blueprint for all subsequent development milestones (M1 to M6), ensuring seamless execution, clinical precision, strict Apple HIG aesthetics, and bulletproof Firebase quota protection.
