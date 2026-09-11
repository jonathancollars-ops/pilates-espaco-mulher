# Specification Mining Report: SQLite SSOT Schema & Classical Pilates Catalog

**Agent**: M2 SQLite Spec Miner (`teamwork_preview_spec_miner_m2_1`)  
**Parent**: Orchestrator (`3d5d14b3-384c-40e4-b02f-37417c3acd6c`)  
**Workspace**: `c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_spec_miner_m2_1`  
**Date**: 2026-09-11T22:15:00Z  
**Authoritative References**:
- `c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md` (specifically follow-up update `2026-09-11T22:01:09Z`)
- `c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md`
- `c:\Users\jonat\Documents\antigravity\goofy-archimedes\PROJECT.md`

---

## 1. Observation

Direct observations extracted from authoritative project documentation:
1. **Zero-Backend / Local-First Requirement**: `ORIGINAL_REQUEST.md` (lines 71, 96-102) specifies:
   > "operando de forma 100% local (offline-first, zero backend, sem custos de banco de dados e sem tela de login)... Persistência exclusiva em banco relacional SQLite local via `expo-sqlite`, atuando como Single Source of Truth (SSOT). Esquema relacional estruturado com migrações versionadas (`PRAGMA user_version`) abrangendo tabelas de pacientes, anamnese, avaliações posturais, bioimpedância, biblioteca de exercícios, rotinas de treino e itens de treino."
2. **Explicit Patient Field Exclusions & Default City/State**: `ORIGINAL_REQUEST.md` (lines 112-117, 176):
   > "Cadastro e edição com os seguintes campos (sem CPF, sem Estado Civil e sem CEP):
   > - Nome Completo, Idade e Data de Nascimento.
   > - Telefone / WhatsApp com máscara formatada.
   > - Endereço, Bairro, Cidade/Estado (com valor padrão: 'Rio das Ostras - RJ').
   > - E-mail.
   > - Convênio (ex.: Particular, Unimed, Bradesco, etc.)."
   > Line 176 confirms: "Formulário de paciente não contém campos de CPF, Estado Civil ou CEP, e inicializa Cidade/Estado com 'Rio das Ostras - RJ'."
3. **Clinical Anamnesis Structure**: `ORIGINAL_REQUEST.md` (lines 123, 178) and `DISPATCH.md`:
   > Anamnese Clínica: Exames laboratoriais (`lab_tests`), medicamentos em uso (`medications`), alergias (`allergies`), cirurgias (`surgeries`), fraturas (`fractures`: sim/não, local, imobilização, fisioterapia prévia), luxações (`luxations`: sim/não, local, imobilização, fisioterapia), gravidez (`pregnancies`: sim/não, quantidade, tipo de parto, intercorrências), aborto (`abortions`: sim/não, quantidade, tempo gestacional), atividade física atual (`physical_activity`), queixas álgicas (`pain_complaints`: localização e intensidade 0-10 EVA), histórico de exames de imagem (`imaging_exams`), `updated_at`.
4. **Postural Assessment Anatomical Planes**: `ORIGINAL_REQUEST.md` (lines 124-128, 178):
   > - Vista Frontal: Cabeça (D / E / Neutra), Ombros (D / E / Alinhados), Triângulo de Thales (D / E), Joelhos (Valgos / Varos / Neutro), Pés (Hálux valgo D/E, Inversão D/E, Eversão D/E).
   > - Vista Lateral: Coluna Cervical (Retificada / Hiperlordose / Neutra), Ombros (Protrusão / Neutro), Abdômen, Coluna Dorsal (Hipercifose / Retificada), Coluna Lombar (Hipercifose / Hiperlordose / Retificada), Pelve / Quadril (Anteversão / Retroversão), Pés (Arco plantar: Sim / Não).
   > - Vista Posterior: Ângulo da escápula (D / E), Escoliose (observações), Quadril (alinhamento D/E), Linha glútea (D / E), Linha poplítea (D / E).
   > - Musculatura: Hipertrofia / Hipotrofia e localização.
5. **Bioimpedance Metrics**: `ORIGINAL_REQUEST.md` (lines 129-132, 179):
   > Data da avaliação, Peso (kg), Altura (cm), Circunferência Abdominal (cm), IMC (cálculo automático), Idade Corporal, Idade Metabólica, TMB (kcal/dia), Gordura Corporal (%), Gordura Visceral (1-59), Massa Muscular Esquelética (kg), Peso Ideal, Peso Alvo. Gordura Segmentar: Braço D/E, Tronco, Perna D/E. Parecer e interpretação clínica da Dra. Rogéria.
6. **Classical Exercise Library & Dynamic Creation**: `ORIGINAL_REQUEST.md` (lines 140-146, 183-185) and `SCOPE.md` (Milestone M2, Feature 5):
   > Master catalog with pre-seeded classical exercises across 6 apparatuses: Solo / Mat, Reformer, Cadillac / Trapézio, Wunda Chair, Ladder Barrel, Cinesioterapia & Acessórios. `is_custom` flag (0 for pre-seeded, 1 for user-created via "+ Criar Novo").
7. **Workout Prescription**: `ORIGINAL_REQUEST.md` (lines 145-146, 185):
   > Custom routines per patient with routine items specifying: Sets (Séries), Reps (Repetições), Springs/Resistance (Carga/Regulagem de Molas), Postural Notes (Observações posturais), and sort order.

---

## 2. Logic Chain

1. **Local-First Single Source of Truth**: Because the app operates 100% offline without remote authentication or backend servers, all 7 entities must be defined with robust primary keys (UUID v4 strings), foreign key relationships, and `ON DELETE CASCADE` actions to prevent orphaned records when patients or routines are deleted.
2. **Exclusion Enforcement**: Previous survey versions mistakenly assumed standard Brazilian demographic fields (CPF, Estado Civil, CEP). The authoritative follow-up update explicitly bars these three fields (`sem CPF, sem Estado Civil e sem CEP`). Including them would violate clinical privacy decisions made by Dra. Rogéria Collares and fail acceptance criteria AC176. Therefore, the `patients` schema contains strictly `name`, `birthdate`, `age`, `phone`, `address`, `neighborhood`, `city_state` (defaulting to `'Rio das Ostras - RJ'`), `email`, and `insurance`.
3. **Semi-Structured vs. Normalized Storage for Anamnesis**: Anamnesis clinical sub-sections (fractures, luxations, pregnancies, abortions, pain complaints) represent compound clinical entities. Storing them as structured JSON strings within SQLite columns provides seamless interoperability with React Native TypeScript forms, eliminates unnecessary join complexity, and enables version tolerance without painful schema migrations for every minor clinical question variation.
4. **Apparatus Categorization**: To support the UI segment filter and equipment-specific spring tension terminology, the `apparatus` field in `exercises` is constrained to the 6 classical categories: `'Mat'`, `'Reformer'`, `'Cadillac'`, `'Wunda Chair'`, `'Ladder Barrel'`, and `'Cinesioterapia'`.
5. **Classical Catalog Breadth**: To deliver a turnkey experience on first boot for Dra. Rogéria, the database seeds must contain not just a nominal list, but an exhaustive repertoire of 49 classical exercises (exceeding the >=35 requirement) with Brazilian Portuguese nomenclature, biomechanical execution instructions, and equipment spring setups.

---

## 3. Comprehensive SQLite Relational Schemas (7 Entities)

### 3.1 Entity Relationship Diagram (ERD)

```
┌───────────────────────────────┐
│           patients            │
│  PK: id (TEXT UUID)           │
│  city_state DEFAULT 'R.Ostras'│
│  (NO CPF, NO EstCivil, NO CEP)│
└───────┬───────────────┬───────┘
        │ 1:1           │ 1:N
        ▼               ▼
┌───────────────┐ ┌───────────────────────────────┐
│   anamnesis   │ │     postural_evaluations      │
│  FK:patient_id│ │  FK: patient_id (CASCADE)     │
└───────────────┘ └───────────────────────────────┘
        │ 1:N           │ 1:N
        ▼               ▼
┌───────────────┐ ┌───────────────────────────────┐
│ bioimpedance  │ │           routines            │
│ FK:patient_id │ │  FK: patient_id (CASCADE)     │
└───────────────┘ └──────────────┬────────────────┘
                                 │ 1:N
                                 ▼
┌───────────────┐         ┌───────────────────────────────┐
│   exercises   │ 1:N     │         routine_items         │
│  is_custom 0/1├────────►│  FK: routine_id (CASCADE)     │
│  PK: id (TEXT)│         │  FK: exercise_id (RESTRICT)   │
└───────────────┘         └───────────────────────────────┘
```

---

### 3.2 Exact SQLite DDL Schema (`src/database/schema.ts`)

```sql
-- Enforce Foreign Key Constraints and Write-Ahead Logging
PRAGMA foreign_keys = ON;

-- 1. Patients Table (EXCLUDES CPF, Estado Civil, CEP per Follow-up R4)
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
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- 2. Anamnesis Table (Compound clinical entities serialized as structured JSON)
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
  imaging_exams TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anamnesis_patient_id ON anamnesis(patient_id);

-- 3. Postural Evaluations Table (Frontal, Lateral, Posterior, Musculature)
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
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_postural_patient_id ON postural_evaluations(patient_id);
CREATE INDEX IF NOT EXISTS idx_postural_date ON postural_evaluations(evaluation_date DESC);

-- 4. Bioimpedance Table (Temporal biometrics and segmental fat)
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
  ideal_weight REAL,
  target_weight REAL,
  fat_arm_r REAL,
  fat_arm_l REAL,
  fat_trunk REAL,
  fat_leg_r REAL,
  fat_leg_l REAL,
  clinical_opinion TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bioimpedance_patient_id ON bioimpedance(patient_id);
CREATE INDEX IF NOT EXISTS idx_bioimpedance_date ON bioimpedance(evaluation_date DESC);

-- 5. Exercises Table (Master pre-seeded catalog + custom dynamic exercises)
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  apparatus TEXT NOT NULL CHECK(apparatus IN ('Mat', 'Reformer', 'Cadillac', 'Wunda Chair', 'Ladder Barrel', 'Cinesioterapia')),
  description TEXT,
  default_springs TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0 CHECK(is_custom IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_exercises_apparatus ON exercises(apparatus);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name COLLATE NOCASE);

-- 6. Routines Table (Personalized workout routine header)
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_routines_patient_id ON routines(patient_id);

-- 7. Routine Items Table (Individual prescribed exercises with execution parameters)
CREATE TABLE IF NOT EXISTS routine_items (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  reps TEXT NOT NULL DEFAULT '10',
  springs_resistance TEXT,
  postural_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_routine_items_routine ON routine_items(routine_id, sort_order ASC);
```

---

### 3.3 TypeScript Domain Interfaces (`src/types/`)

```typescript
// 1. Patient Entity
export interface Patient {
  id: string; // UUID v4
  name: string; // Nome Completo
  birthdate?: string; // YYYY-MM-DD
  age?: number; // Idade calculada ou inserida
  phone: string; // Máscara: (22) 99947-4304 ou (99) 99999-9999
  address?: string; // Rua, número, complemento
  neighborhood?: string; // Bairro (ex: Costa Azul)
  city_state: string; // Default: 'Rio das Ostras - RJ'
  email?: string;
  insurance?: string; // ex: 'Particular', 'Unimed', 'Bradesco'
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// 2. Anamnesis Entity & Compound Sub-Types
export interface FractureEntry {
  has: 'sim' | 'nao';
  location?: string; // ex: 'Rádio distal direito'
  immobilization?: string; // ex: 'Gesso por 45 dias'
  physiotherapy?: string; // ex: '20 sessões pós-retirada'
}

export interface LuxationEntry {
  has: 'sim' | 'nao';
  location?: string; // ex: 'Ombro esquerdo anterior'
  immobilization?: string; // ex: 'Tipóia por 3 semanas'
  physiotherapy?: string; // ex: 'Fortalecimento de manguito rotador'
}

export interface PregnancyEntry {
  has: 'sim' | 'nao';
  quantity?: number; // ex: 2
  delivery_type?: 'Normal' | 'Cesariana' | 'Ambos';
  complications?: string; // ex: 'Diabetes gestacional, diástase abdominal de 3cm'
}

export interface AbortionEntry {
  has: 'sim' | 'nao';
  quantity?: number; // ex: 1
  gestational_age?: string; // ex: '8 semanas'
}

export interface PainComplaintEntry {
  location: string; // ex: 'Coluna Lombar L4-L5', 'Cervical'
  eva_intensity: number; // 0 a 10 (Escala Visual Analógica)
  characteristics?: string; // 'Pontada', 'Queimação', 'Em peso'
  aggravating_factors?: string; // 'Ao permanecer muito tempo sentada'
}

export interface Anamnesis {
  id: string;
  patient_id: string;
  lab_tests?: string; // Exames laboratoriais
  medications?: string; // Medicamentos em uso contínuo
  allergies?: string; // Alergias conhecidas
  surgeries?: string; // Cirurgias prévias
  fractures?: FractureEntry | string; // JSON string in SQLite
  luxations?: LuxationEntry | string; // JSON string in SQLite
  pregnancies?: PregnancyEntry | string; // JSON string in SQLite
  abortions?: AbortionEntry | string; // JSON string in SQLite
  physical_activity?: string; // Atividades físicas prévias e atuais
  pain_complaints?: PainComplaintEntry[] | string; // JSON array in SQLite
  imaging_exams?: string; // Exames de imagem (Ressonância, RX, TC)
  created_at: string;
  updated_at: string;
}

// 3. Postural Evaluation Entity
export type PosturalAlignmentDirection = 'D' | 'E' | 'Neutra' | 'Alinhados';
export type KneePosturalType = 'Valgos' | 'Varos' | 'Neutro';
export type SagittalCervicalType = 'Retificada' | 'Hiperlordose' | 'Neutra';
export type SagittalDorsalType = 'Hipercifose' | 'Retificada' | 'Neutra';
export type SagittalLumbarType = 'Hipercifose' | 'Hiperlordose' | 'Retificada' | 'Neutra';
export type PelvisTiltType = 'Anteversao' | 'Retroversao' | 'Neutra';
export type PlantarArchType = 'Sim' | 'Nao';

export interface PosturalEvaluation {
  id: string;
  patient_id: string;
  evaluation_date: string; // YYYY-MM-DD
  // Vista Frontal
  head?: 'D' | 'E' | 'Neutra';
  shoulders?: 'D' | 'E' | 'Alinhados';
  thales_triangle?: 'D' | 'E' | 'Simétrico';
  knees?: KneePosturalType;
  feet?: string; // 'Halux valgo D/E', 'Inversão D/E', 'Eversão D/E', 'Neutro'
  // Vista Lateral
  cervical?: SagittalCervicalType;
  lateral_shoulders?: 'Protrusao' | 'Neutro';
  abdomen?: string; // 'Protuso', 'Globoso', 'Neutro'
  dorsal?: SagittalDorsalType;
  lumbar?: SagittalLumbarType;
  pelvis?: PelvisTiltType;
  arch?: PlantarArchType; // Arco plantar: Sim / Nao
  // Vista Posterior
  scapula?: string; // 'Angulo D/E', 'Alada D/E', 'Neutra'
  scoliosis?: string; // Observações / Teste de Adams / Curva em C ou S
  posterior_pelvis?: 'D' | 'E' | 'Alinhada';
  gluteal_line?: 'D' | 'E' | 'Alinhada';
  popliteal_line?: 'D' | 'E' | 'Alinhada';
  // Musculatura
  musculature?: string; // Hipertrofia / Hipotrofia e localização anatômica
  notes?: string;
  created_at: string;
}

// 4. Bioimpedance Entity
export interface Bioimpedance {
  id: string;
  patient_id: string;
  evaluation_date: string; // YYYY-MM-DD
  weight: number; // kg
  height: number; // cm
  abdominal_circ?: number; // cm
  bmi: number; // weight / (height/100)^2
  body_age?: number; // anos
  metabolic_age?: number; // anos
  bmr?: number; // kcal/dia
  body_fat_percent: number; // %
  visceral_fat: number; // escala 1-59
  muscle_mass_kg: number; // kg
  ideal_weight?: number; // kg
  target_weight?: number; // kg
  fat_arm_r?: number; // %
  fat_arm_l?: number; // %
  fat_trunk?: number; // %
  fat_leg_r?: number; // %
  fat_leg_l?: number; // %
  clinical_opinion?: string; // Parecer clínico
  created_at: string;
}

// 5. Exercises Entity
export type ApparatusType = 'Mat' | 'Reformer' | 'Cadillac' | 'Wunda Chair' | 'Ladder Barrel' | 'Cinesioterapia';

export interface Exercise {
  id: string; // slug or UUID
  name: string;
  apparatus: ApparatusType;
  description?: string;
  default_springs?: string;
  is_custom: number; // 0 = pre-seeded, 1 = user created
  created_at: string;
}

// 6. Routine Entity
export interface Routine {
  id: string;
  patient_id: string;
  name: string; // ex: 'Treino A - Fortalecimento Lombar'
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 7. Routine Item Entity
export interface RoutineItem {
  id: string;
  routine_id: string;
  exercise_id: string;
  sets: number;
  reps: string; // '10', '12-15', '100 bombeamentos'
  springs_resistance?: string; // '1 Vermelha + 1 Azul'
  postural_notes?: string; // 'Atenção à pelve neutra'
  sort_order: number;
  // Hydrated join fields (optional)
  exercise?: Exercise;
}

export interface RoutineWithItems extends Routine {
  items: RoutineItem[];
}
```

---

## 4. Master Catalog of 49 Classical Pilates & Kinesitherapy Exercises

Below is the exhaustive catalog of 49 pre-seeded classical exercises across all 6 apparatuses, prepared for `src/database/seeds.ts`:

### 4.1 Solo / Mat (13 Exercises)

| # | Name | Portuguese Name | Apparatus | Default Springs / Resistance | Biomechanical Description & Alignment Cues |
|---|------|-----------------|-----------|-----------------------------|---------------------------------------------|
| 1 | The Hundred | O Cento | Mat | N/A (Peso Corporal) | Decúbito dorsal, pernas a 45º (ou tabletop), flexão torácica elevando escápulas do solo. Bombeamento rítmico e vigoroso dos braços estendidos, 5 batimentos na inspiração e 5 na expiração até 100 respirações. Powerhouse ativado, foco em estabilização lombopélvica. |
| 2 | The Roll Up | Rolamento para Cima | Mat | N/A (Peso Corporal) | Decúbito dorsal, braços apontando para o teto. Iniciar pela flexão cervical, articulando vértebra por vértebra para descolar do solo em formato de 'C' até alcançar os pés. Retornar desenrolando lentamente sem despencar. |
| 3 | Single Leg Circles | Círculos com Uma Perna | Mat | N/A (Peso Corporal) | Decúbito dorsal, uma perna estendida para cima a 90º e a perna de apoio firme no solo em dorsiflexão. Realizar círculos controlados a partir da cabeça do fêmur sem oscilação da pelve (5 em cada sentido por perna). |
| 4 | Rolling Like a Ball | Rolando como uma Bola | Mat | N/A (Peso Corporal) | Sentado em equilíbrio sobre os ísquios, joelhos flexionados junto ao peito, mãos nos tornozelos, coluna em flexão contínua (C-curve). Rolar para trás até a base das escápulas e retornar ao ponto de equilíbrio sem apoiar os pés no solo. |
| 5 | Single Leg Stretch | Alongamento com Uma Perna | Mat | N/A (Peso Corporal) | Decúbito dorsal com tronco em flexão, uma perna flexionada ao peito (mão externa no tornozelo, mão interna no joelho) e a perna contralateral estendida a 45º. Alternar de forma rítmica mantendo pelve estável e abdômen afundado. |
| 6 | Double Leg Stretch | Alongamento com Ambas as Pernas | Mat | N/A (Peso Corporal) | Decúbito dorsal em flexão torácica, abraçando os joelhos. Inspirar estendendo simultaneamente braços para trás e pernas para frente a 45º. Expirar circulando os braços e recolhendo os joelhos, mantendo a lombar protegida pelo core. |
| 7 | Spine Stretch Forward | Alongamento da Coluna para Frente | Mat | N/A (Peso Corporal) | Sentado ereto sobre os ísquios, pernas afastadas na largura dos ombros, pés em dorsiflexão. Expirar enrolando o tronco para frente a partir da cervical, alcançando as mãos à frente enquanto o abdômen contrai para trás. |
| 8 | The Saw | A Serra | Mat | N/A (Peso Corporal) | Sentado com pernas afastadas e braços abertos em cruz. Rodar o tronco e flexionar à frente serrando o dedo mínimo do pé oposto com a mão dianteira, enquanto o braço de trás gira internamente. Manter ambos os ísquios firmemente apoiados. |
| 9 | Swan | O Cisne | Mat | N/A (Peso Corporal) | Decúbito ventral, mãos apoiadas sob os ombros. Inspirar elevando o esterno do solo em extensão torácica pura, mantendo transverso abdominal ativo para proteger a coluna lombar e pernas aduzidas. |
| 10 | Swimming | Natação | Mat | N/A (Peso Corporal) | Decúbito ventral, braços e pernas estendidos flutuando no ar. Bater alternadamente braço direito/perna esquerda e braço esquerdo/perna direita com respiração coordenada, fortalecendo a cadeia posterior sem sobrecarga lombar. |
| 11 | The Teaser | O Provocador | Mat | N/A (Peso Corporal) | Decúbito dorsal. Elevar simultaneamente tronco e pernas em formato de 'V' perfeito, braços paralelos aos membros inferiores, sustentando o centro de gravidade sobre os ísquios antes de descer articulando cada vértebra. |
| 12 | Prancha Frontal | Prancha Isométrica | Mat | N/A (Peso Corporal) | Apoio de antebraços e pontas dos pés no solo, alinhando cabeça, tronco e quadril em prancha estável. Co-contração de transverso do abdômen, glúteos e serrátil anterior sem desabar a pelve. |
| 13 | Perdigueiro | Bird Dog / Quatro Apoios | Mat | N/A (Peso Corporal) | Posição de quatro apoios. Estender simultaneamente braço direito à frente e perna esquerda atrás alinhados com o tronco. Manter pelve e ombros rigorosamente horizontais, fortalecendo multífidos e core. |

---

### 4.2 Reformer (8 Exercises)

| # | Name | Portuguese Name | Apparatus | Default Springs / Resistance | Biomechanical Description & Alignment Cues |
|---|------|-----------------|-----------|-----------------------------|---------------------------------------------|
| 14 | Footwork | Trabalho de Pés | Reformer | 3 a 4 Molas (3 Vermelhas ou 2 Vermelhas + 1 Azul) | Decúbito dorsal no carrinho, pés na barra em 4 posições clássicas: Dedos (Toes), Arcos (Arches), Calcanhares (Heels) e Alongamento do Tendão (Tendon Stretch). Empurrar o carrinho estendendo joelhos e flexionar com retorno excêntrico controlado. |
| 15 | The Hundred no Reformer | Cento no Reformer | Reformer | 2 Molas (1 Vermelha + 1 Azul) | Decúbito dorsal, pernas a 45º ou tabletop, alças curtas nas mãos empurrando contra as molas com flexão torácica e bombeamento de braços. Foco em estabilidade escapuloumeral e ativação profunda do assoalho pélvico. |
| 16 | Leg Circles & Frog | Círculos de Perna e Sapo | Reformer | 2 Molas (1 Vermelha + 1 Azul) | Decúbito dorsal com alças longas nos pés. 'Frog': flexionar e estender joelhos mantendo calcanhares unidos em rotação externa suave. 'Circles': círculos simétricos mantendo a pelve totalmente neutra. |
| 17 | Stomach Massage Series | Série de Massagem Estomacal | Reformer | 3 a 2 Molas (Inicia com 3, reduz para 2) | Sentado no carrinho próximo à borda frontal, pés na barra: Round Back (coluna em C), Flat Back (coluna ereta neutra), Reach Up (braços elevados) e Twist (rotação com alcance lateral). Empurrar o carrinho com as pernas, baixar e subir calcanhares. |
| 18 | Short Box Series | Série da Caixa Curta | Reformer | Todas as Molas Travadas (4 Molas) | Sentado na caixa transversal com pés firmes sob a fita de segurança: Round (enrolando em C), Flat (inclinação dorsal reta), Side to Side (inclinações laterais), Twist with Reach e Tree (alongamento da árvore com pegada na coxa). |
| 19 | The Elephant | O Elefante | Reformer | 2 Molas Vermelhas | Em pé no carrinho, calcanhares apoiados nas ombreiras, mãos na barra de pés, tronco flexionado em C ou neutro. Empurrar o carrinho apenas com o movimento articular dos ombros e puxar de volta pela força do abdômen, sem balançar o quadril. |
| 20 | Long Stretch Series | Série de Alongamento Longo | Reformer | 2 Molas Vermelhas | Posição de prancha alta no carrinho com pés nas ombreiras e mãos na barra. Empurrar o carrinho para trás a partir dos ombros e puxar de volta mantendo prancha impecável. Progressão para Down Stretch e Up Stretch. |
| 21 | Short Spine Massage | Massagem da Coluna Curta | Reformer | 2 Molas (1 Vermelha + 1 Azul) | Decúbito dorsal com alças nos pés. Estender em 45º, elevar pernas e pelve em rolamento articulado até o apoio nas escápulas, flexionar joelhos em direção aos ombros e desenrolar a coluna no carrinho vértebra por vértebra. |

---

### 4.3 Cadillac / Trapézio (8 Exercises)

| # | Name | Portuguese Name | Apparatus | Default Springs / Resistance | Biomechanical Description & Alignment Cues |
|---|------|-----------------|-----------|-----------------------------|---------------------------------------------|
| 22 | Roll Down com Barra de Madeira | Rolamento para Baixo | Cadillac | 2 Molas Amarelas Superiores | Sentado de frente para a torre segurando a barra Roll-Down. Enrolar a coluna para trás até o apoio sacral e torácico, articulando vértebra a vértebra, e retornar mobilizando a coluna com alívio das tensões lombares. |
| 23 | The Tower | A Torre | Cadillac | 1 a 2 Molas Amarelas / Vermelhas Inferiores (com Corrente) | Decúbito dorsal, pés na barra Push-Through (conectada por baixo com corrente de proteção). Estender joelhos elevando a pelve e a coluna vértebra por vértebra até o apoio escapular, flexionar joelhos no topo e descer com controle. |
| 24 | The Monkey | O Macaco | Cadillac | 1 Mola Vermelha ou 2 Amarelas Inferiores (com Corrente) | Decúbito dorsal, mãos e pés segurando a barra Push-Through conectada por baixo. Flexionar profundamente os joelhos em direção ao peito e estender os membros inferiores alongando intensamente os isquiotibiais e mobilizando os pés. |
| 25 | Cat Stretch no Cadillac | Alongamento do Gato | Cadillac | 1 Mola Amarela ou Azul Superior | Ajoelhado de frente para a barra Push-Through conectada por cima. Flexionar a coluna empurrando a barra para baixo em C, articular para extensão torácica e retornar mobilizando suavemente cada segmento da coluna. |
| 26 | Breathing no Trapézio | Respiração e Elevação Pélvica | Cadillac | 2 Molas de Trapézio | Decúbito dorsal, pés apoiados na fita do trapézio ou barra móvel, mãos segurando as colunas verticais. Elevar a pelve em ponte com respiração profunda sincronizada com a expansão da caixa torácica. |
| 27 | Chest Expansion | Expansão Torácica | Cadillac | 2 Molas Amarelas Médias de Braço | Ajoelhado na cama do Cadillac segurando as alças de mão das molas de braço. Puxar as alças para trás até a linha do quadril, abrir a caixa torácica, girar o pescoço para a direita e esquerda, e retornar controlando a tensão excêntrica. |
| 28 | Leg Springs Series | Série de Molas de Perna | Cadillac | 2 Molas Verdes ou Roxas Médias de Perna | Decúbito dorsal com alças nos pés conectadas às molas verticais: Círculos (Circles), Sapinho (Frog), Tesouras (Scissors) e Caminhada (Walking), fortalecendo adutores, quadríceps e estabilizadores pélvicos. |
| 29 | Teaser com Barra Push-Through | Teaser no Cadillac | Cadillac | 1 Mola Amarela Superior | Decúbito dorsal com cabeça voltada para a torre, mãos na barra Push-Through. Conectar a força dos membros superiores ao abdômen, elevando simultaneamente o tronco e as pernas em Teaser com suporte elástico. |

---

### 4.4 Wunda Chair (7 Exercises)

| # | Name | Portuguese Name | Apparatus | Default Springs / Resistance | Biomechanical Description & Alignment Cues |
|---|------|-----------------|-----------|-----------------------------|---------------------------------------------|
| 30 | Footwork na Cadeira | Trabalho de Pés na Chair | Wunda Chair | 2 Molas Altas (ex: 2 Pretas pos. 3) | Sentado ereto no topo do assento, mãos apoiadas atrás. Pressionar o pedal para baixo com dedos (Toes), arcos (Arches) e calcanhares (Heels), mantendo estabilidade pélvica e crescimento axial da coluna. |
| 31 | Going Up Front | Subida Frontal (Step Up) | Wunda Chair | 1 Mola Alta + 1 Mola Baixa (pos. 3 e 1) | Em pé em frente à cadeira, um pé no pedal e o outro firme no topo do assento. Subir estendendo a perna de apoio com controle rigoroso do quadríceps e estabilidade da pelve, sem deixar o pedal bater embaixo na descida excêntrica. |
| 32 | Press Down / Pumping | Pressionar para Baixo | Wunda Chair | 1 a 2 Molas Médias | Em pé atrás da cadeira, mãos no assento, um pé pressionando o pedal para baixo em flexão plantar e extensão de quadril, fortalecendo glúteo máximo e isquiotibiais com sustentação do core. |
| 33 | Spine Stretch Forward na Chair | Alongamento da Coluna na Chair | Wunda Chair | 1 Mola Baixa (pos. 1) | Em pé atrás da cadeira, mãos apoiadas sobre o pedal. Enrolar a coluna cervical e torácica para baixo empurrando o pedal com a força abdominal, mantendo a pelve alinhada verticalmente sobre os tornozelos. |
| 34 | Teaser na Wunda Chair | Teaser na Cadeira | Wunda Chair | 1 Mola Média (pos. 2) | Sentado no solo de costas para a cadeira com mãos no pedal, ou no assento. Elevar pernas em 45º e tronco sustentado no core, controlando o pedal através da força abdominal profunda e estabilização escapular. |
| 35 | The Cat na Wunda Chair | O Gato na Cadeira | Wunda Chair | 1 Mola Alta ou 2 Molas Baixas | Ajoelhado no solo de frente para o pedal, mãos apoiadas sobre ele. Enrolar a coluna em C empurrando o pedal para baixo com o abdômen e retornar desenrolando a coluna com organização das escápulas. |
| 36 | Mermaid na Wunda Chair | Sereia na Cadeira | Wunda Chair | 1 Mola Baixa (pos. 1) | Sentado de lado sobre o assento com pernas cruzadas ou apoiadas ao lado, uma mão no pedal. Flexionar o tronco lateralmente empurrando o pedal, abrindo o gradil costal do lado oposto e ancorando ambos os ísquios. |

---

### 4.5 Ladder Barrel (6 Exercises)

| # | Name | Portuguese Name | Apparatus | Default Springs / Resistance | Biomechanical Description & Alignment Cues |
|---|------|-----------------|-----------|-----------------------------|---------------------------------------------|
| 37 | Ballet Stretches | Alongamentos de Balé no Barril | Ladder Barrel | N/A (Aparelho sem Molas) | Em pé de frente, de lado e de costas para o Ladder Barrel com um membro inferior apoiado sobre a cúpula: alongamento estático e dinâmico de isquiotibiais (Front), adutores e trato iliotibial (Side), e quadríceps/iliopsoas (Back). |
| 38 | Short Box no Barrel | Série da Caixa Curta no Barril | Ladder Barrel | N/A (Aparelho sem Molas) | Sentado no topo côncavo do barril com pés travados nas travessas da escada: Round Back, Flat Back, Side to Side e Twist, aproveitando a anatomia curva para suporte lombar e amplitude de movimento segura. |
| 39 | Swan no Ladder Barrel | O Cisne no Barril | Ladder Barrel | N/A (Aparelho sem Molas) | Pelve e coxas apoiadas no ápice do barril, pés firmes nas travessas inferiores da escada. Erguer o tronco a partir de flexão anterior até extensão torácica completa e controlada, sem hiperextensão lombar. |
| 40 | Side Sit-Ups / Mermaid | Flexão Lateral no Barril | Ladder Barrel | N/A (Aparelho sem Molas) | Quadril e lateral da coxa apoiados no barril, pés travados nas travessas da escada. Mãos atrás da nuca, descer o tronco lateralmente em direção ao chão e subir contra a gravidade ativando oblíquos e quadrado lombar. |
| 41 | Horseback no Barrel | A Cavalo no Barril | Ladder Barrel | N/A (Aparelho sem Molas) | Sentado a cavalo virado para a escada, pernas abraçando o barril com forte adução de coxas. Elevar os braços e o tronco mantendo alongamento axial, fortalecendo assoalho pélvico e adutores de quadril. |
| 42 | Grasshopper no Barrel | O Gafanhoto no Barril | Ladder Barrel | N/A (Aparelho sem Molas) | Decúbito ventral sobre a cúpula do barril, mãos segurando a travessa superior da escada. Elevar as pernas estendidas e bater os calcanhares (heel beats), fortalecendo glúteos e eretores da espinha com suporte do abdômen. |

---

### 4.6 Cinesioterapia & Acessórios (7 Exercises)

| # | Name | Portuguese Name | Apparatus | Default Springs / Resistance | Biomechanical Description & Alignment Cues |
|---|------|-----------------|-----------|-----------------------------|---------------------------------------------|
| 43 | Ponte Pélvica com Bola Suíça | Ponte com Swiss Ball | Cinesioterapia | N/A (Bola Suíça 55/65cm) | Decúbito dorsal com calcanhares e panturrilhas apoiados sobre a Bola Suíça. Elevar a pelve em ponte com co-contração de glúteos, isquiotibiais e core profundo, desafiando a estabilidade e a propriocepção lumbopélvica. |
| 44 | Abdução de Quadril com Faixa Elástica | Clamshell / Mini-Band | Cinesioterapia | Faixa Elástica Média / Forte | Decúbito lateral com mini-band acima dos joelhos. Realizar rotação externa e abdução do quadril (Clamshell) mantendo calcanhares unidos, ativando glúteo médio e rotadores profundos do quadril. |
| 45 | Rotação Externa de Ombro com Faixa | Manguito Rotador com Theraband | Cinesioterapia | Faixa Elástica Leve / Média | Em pé ou sentado, cotovelos flexionados a 90º juntos às costelas, segurando a faixa elástica. Rodar os antebraços externamente mantendo escápulas estabilizadas, fortalecendo infraespinhal e redondo menor. |
| 46 | Magic Circle Adutores na Ponte | Adução com Anel Flexível | Cinesioterapia | Magic Circle / Anel Flexível | Decúbito dorsal com joelhos flexionados e pés apoiados no solo, anel flexível entre os côndilos mediais dos joelhos. Pressionar o Magic Circle em adução isométrica sustentada enquanto eleva a pelve em ponte. |
| 47 | Extensão Torácica no Foam Roller | Mobilização Torácica com Rolo | Cinesioterapia | Foam Roller / Rolo de Espuma | Decúbito dorsal com o rolo posicionado horizontalmente na coluna torácica média, mãos na nuca sustentando a cervical. Realizar extensões torácicas suaves expirando na abertura do tórax, aliviando hipercifose postural. |
| 48 | Elevação Lateral no Plano Escapular | Scaption com Halteres | Cinesioterapia | Halteres Leves (1kg a 2kg) | Em pé com pelve neutra e escápulas alinhadas, segurando halteres leves. Elevar os membros superiores a 30º à frente do plano coronal até 90º de abdução, fortalecendo deltóide e serrátil sem pinçamento subacromial. |
| 49 | Agachamento na Parede com Bola Suíça | Wall Squat com Bola | Cinesioterapia | Bola Suíça 65cm | Bola Suíça posicionada entre a região lombar do paciente e a parede. Flexionar joelhos até 90º com controle do valgo dinâmico e retorno pelo apoio dos calcanhares, fortalecendo quadríceps e estabilizadores pélvicos. |

---

## 5. Features Discovered Table

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Patient Schema | Excluded Fields Validation | Strictly omit CPF, Estado Civil, and CEP from schema and intake forms per clinical requirements. | Patient creation payload. | Persisted record without excluded fields. | Fails schema validation if CPF/Estado Civil/CEP columns are present. | `ORIGINAL_REQUEST.md` Follow-up R4, AC176 |
| 2 | Patient Schema | Default City & State Initialization | Default `city_state` column to `'Rio das Ostras - RJ'` on patient record creation. | Patient creation payload with optional `city_state`. | Record persisted with `'Rio das Ostras - RJ'` if unspecified. | Falls back to default if blank or null. | `ORIGINAL_REQUEST.md` Follow-up R4, AC176 |
| 3 | Patient Schema | Phone / WhatsApp Mask Support | Standardized phone string storage with formatted mask `(22) 99947-4304`. | Raw or formatted phone string. | Formatted string persisted and indexed for search. | Validates presence of at least 10-11 digits before saving. | `ORIGINAL_REQUEST.md` Follow-up R4, AC177 |
| 4 | Anamnesis Schema | Structured Fracture Records | Record presence, location, immobilization history, and physiotherapy for previous fractures. | `FractureEntry` object or JSON string. | Stored JSON in `fractures` column with indexed `patient_id`. | Defaults `has` to `'nao'` if omitted. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 5 | Anamnesis Schema | Structured Luxation Records | Record presence, location, immobilization history, and physiotherapy for joint luxations. | `LuxationEntry` object or JSON string. | Stored JSON in `luxations` column. | Defaults `has` to `'nao'` if omitted. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 6 | Anamnesis Schema | Obstetric History Tracking | Track pregnancies (quantity, delivery type, complications) and abortions (quantity, gestational age). | `PregnancyEntry` and `AbortionEntry` objects or JSON strings. | Stored JSON in `pregnancies` and `abortions` columns. | Validates non-negative integer for quantities. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 7 | Anamnesis Schema | Visual Analog Scale (EVA) Pain Complaints | Record anatomical pain sites and 0-10 intensity score according to EVA scale. | Array of `PainComplaintEntry` objects. | Stored JSON array in `pain_complaints` column. | Clamps pain intensity between 0 and 10; rejects negative values. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 8 | Postural Schema | Frontal Anatomical Alignment | Record head tilt (D/E/Neutra), shoulders (D/E/Alinhados), Thales triangle (D/E/Simétrico), knees (Valgos/Varos/Neutro), and feet (Halux valgo/Inversão/Eversão). | Directional enums and observations. | Persisted `postural_evaluations` row with evaluation date. | Validates enum options against approved clinical terms. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 9 | Postural Schema | Sagittal & Lateral Alignment | Record cervical (Retificada/Hiperlordose/Neutra), lateral shoulders (Protrusão/Neutro), abdomen, dorsal, lumbar, pelvis, and plantar arch. | Curvature types and pelvic tilt enums. | Persisted sagittal balance indicators in evaluation record. | Handles missing lateral observations gracefully as null. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 10 | Postural Schema | Posterior Plane & Scoliosis Assessment | Record scapula angles/winging, scoliosis observations, posterior pelvis leveling, gluteal line, and popliteal line. | Posterior alignment strings and clinical notes. | Persisted posterior evaluation data. | Preserves open-ended text observations for scoliosis/Adams test. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 11 | Bioimpedance Schema | Temporal Biometrics & Derivations | Record evaluation date, weight, height, abdominal circumference, body age, metabolic age, BMR, fat %, visceral fat, and muscle mass kg. | Float/Integer biometric inputs. | Calculated BMI, stored metrics, and historical trend points. | Zero-division guard on height ($BMI = Weight / (Height/100)^2$). | `ORIGINAL_REQUEST.md` Follow-up R5, AC179 |
| 12 | Bioimpedance Schema | Segmental Fat Composition | Record segmental fat percentages for right arm, left arm, trunk, right leg, and left leg. | Float percentages (0.0 to 100.0). | Stored segmental fat values in bioimpedance row. | Validates percentages do not exceed 100%. | `ORIGINAL_REQUEST.md` Follow-up R5, DISPATCH.md |
| 13 | Exercise Catalog | Apparatus-Based Repertoire | Pre-seeded classical exercise catalog organized across 6 apparatuses with `is_custom = 0`. | Initial database migration execution. | 49 classical exercise rows in `exercises` table. | Migrations run inside atomic transaction; prevents partial seeding. | `ORIGINAL_REQUEST.md` Follow-up R6, AC183 |
| 14 | Exercise Catalog | Dynamic Custom Exercise Creation | Allow Dra. Rogéria to add new exercises at runtime with `is_custom = 1`, apparatus, description, and springs. | Exercise name, apparatus enum, description, default springs. | New row in `exercises` table immediately queryable for prescription. | Validates non-empty name and apparatus IN allowable list. | `ORIGINAL_REQUEST.md` Follow-up R6, AC184 |
| 15 | Workout Prescription | Personalized Routine Prescriptions | Link custom workout routines to patients with clinical goals, name, and notes. | `patient_id`, routine name, notes. | Stored `routines` row with cascade on patient deletion. | Rejects routine creation with blank title or invalid `patient_id`. | `ORIGINAL_REQUEST.md` Follow-up R6, AC185 |
| 16 | Workout Prescription | Individual Exercise Execution Items | Configure sets, reps, custom springs/resistance, postural cues, and sort order per prescribed exercise. | `routine_id`, `exercise_id`, sets, reps, springs, postural notes, sort order. | Stored `routine_items` rows linked via foreign keys. | Cascades deletion with parent routine; restricts exercise deletion if linked. | `ORIGINAL_REQUEST.md` Follow-up R6, AC185 |

---

## 6. Edge Cases & Boundary Conditions

| # | Feature | Input / Scenario | Observed / Required Behavior |
|---|---------|------------------|------------------------------|
| 1 | `patients` | Legacy or third-party payload attempts to insert `cpf`, `estado_civil`, or `cep` | Database DDL strictly does not contain these columns; query throws `no such column` error, enforcing compliance with follow-up requirement R4 and AC176. |
| 2 | `patients` | User registers patient leaving `city_state` empty or undefined | SQLite default constraint automatically assigns `'Rio das Ostras - RJ'` to `city_state`. |
| 3 | `patients` | Deleting a patient with active anamnesis, postural evaluations, bioimpedance tests, and routines | Foreign key `ON DELETE CASCADE` triggers on all child tables (`anamnesis`, `postural_evaluations`, `bioimpedance`, `routines`), atomically removing all patient records without leaving orphaned data. |
| 4 | `anamnesis` | Patient reports having no previous fractures or surgeries | `fractures` JSON is saved as `{"has":"nao"}`; `surgeries` is stored as empty string or `'Nega cirurgias prévias'`; prevents null reference crashes in UI. |
| 5 | `anamnesis` | Pain complaint intensity slider dragged past boundaries (< 0 or > 10) | Validation layer clamps input strictly to `0 <= eva_intensity <= 10`; values 0 render as green "Sem Dor", 1-3 mild, 4-6 moderate, 7-10 severe burgundy. |
| 6 | `postural_evaluations` | Patient has asymmetrical Thales triangle (larger on Right side) | `thales_triangle` stores `'D'`, UI highlights asymmetry badge in warm amber for clinical awareness. |
| 7 | `bioimpedance` | Height entered as `0` or negative number during bioimpedance entry | Calculation function guards against division by zero: returns `bmi = 0` or displays friendly validation error "Altura deve ser maior que zero" before database write. |
| 8 | `bioimpedance` | Visceral fat level entered as 15 or higher (high cardiovascular risk) | Value stored normally as integer; UI renders level badge in deep burgundy (`#6A1B15`) with clinical alert indicator. |
| 9 | `exercises` | Dra. Rogéria creates a custom exercise with name already used in another apparatus | Allowed: primary key is a distinct UUID (`id`), allowing duplicate exercise names across different apparatuses (e.g. "Swan" on Reformer vs. "Swan" on Barrel). |
| 10 | `exercises` | Attempting to delete a classical pre-seeded exercise (`is_custom = 0`) | UI disallows deleting system classical exercises; repository blocks deletion if `is_custom == 0`. |
| 11 | `routine_items` | Attempting to delete an exercise from library that is currently referenced by a patient routine | SQLite foreign key constraint `ON DELETE RESTRICT` on `exercise_id` blocks deletion, protecting integrity of prescribed routines. |
| 12 | `routine_items` | Re-ordering exercises within a routine | `sort_order` integer column allows swapping positions (0, 1, 2, ...); queries order by `sort_order ASC`. |

---

## 7. Caveats

1. **JSON Parsing in Repositories**: The structured fields in `anamnesis` (`fractures`, `luxations`, `pregnancies`, `abortions`, `pain_complaints`) are stored as JSON strings in SQLite. Repositories must parse them into TypeScript objects upon reading and `JSON.stringify()` upon writing.
2. **Apparatus Enum Matching**: The `exercises` table uses an apparatus check constraint. UI dropdowns and filters must strictly match `'Mat'`, `'Reformer'`, `'Cadillac'`, `'Wunda Chair'`, `'Ladder Barrel'`, and `'Cinesioterapia'`.
3. **Age vs. Birthdate**: Both `age` and `birthdate` are modeled in the schema. When `birthdate` is provided, `age` can be dynamically recalculated at runtime or synchronized with the stored integer.

---

## 8. Conclusion

All 7 clinical and workout entities (`patients`, `anamnesis`, `postural_evaluations`, `bioimpedance`, `exercises`, `routines`, `routine_items`) have been exhaustively specified with SQLite DDL, TypeScript types, constraints, and cascading rules. CPF, Estado Civil, and CEP are verifiably excluded from the schema, and the default city/state is locked to `'Rio das Ostras - RJ'`. A master catalog of 49 classical Pilates and kinesitherapy exercises covering all 6 apparatuses has been fully authored with Brazilian Portuguese naming, biomechanical descriptions, and default spring resistance configurations ready for direct migration seeding in Milestone M2.

---

## 9. Verification Method

To independently verify these specifications:
1. **Field Exclusion Check**: Inspect SQL DDL in Section 3.2 and confirm that neither `cpf`, `estado_civil`, nor `cep` appears in `CREATE TABLE patients`.
2. **Catalog Count Check**: Count the exercise entries in Section 4: 13 Mat + 8 Reformer + 8 Cadillac + 7 Wunda Chair + 6 Ladder Barrel + 7 Cinesioterapia = 49 exercises (exceeds requirement of >=35).
3. **TypeScript Compilation Verification**: When repositories and schema files are created in `src/database/schema.ts` and `src/database/seeds.ts`, verify type safety by executing:
   ```powershell
   npx tsc --noEmit
   ```
   Ensuring zero compilation errors.
