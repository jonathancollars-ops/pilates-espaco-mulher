# Specification Survey & Clinical Requirements Mining
**Project**: Pilates Espaço Mulher (Dra. Rogéria Collares)  
**Agent**: Requirements & Clinical Spec Miner (`teamwork_preview_spec_miner_survey_1`)  
**Date**: 2026-09-11T20:18:00Z  
**Authoritative Reference**: `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary & Clinical Domain Overview

The application "Pilates Espaço Mulher" is a dedicated, native mobile application (iOS and Android via Expo / React Native) designed specifically for **Dra. Rogéria Collares** (Physiotherapist, CREFITO 23093-F), operating at Costa Azul, Rio das Ostras - RJ.

The platform unifies three clinical pilares of physiotherapy practice:
1. **Clinical Assessment (Avaliação Fisioterapêutica)**: Anamnesis, static and dynamic postural evaluation with photographic alignment grid guides, and bioimpedance analysis with temporal evolution tracking.
2. **Pilates Prescription & Execution (Prescrição e Execução de Treinos)**: Comprehensive classical apparatus catalog (Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat/Solo, and Small Accessories) with custom exercise sequencing, spring/resistance tensions, repetition counts, and clinical cues.
3. **Clinical Communication & Professional Export (Relatórios e Exportação)**: Generating polished, branded clinical reports with professional signature and enabling one-touch sharing via WhatsApp and PDF.

The system is engineered under strict **Apple Human Interface Guidelines (HIG)** standards and a **Local-First SQLite** architecture that protects the shared **Firebase Spark Plan** quotas against runaway read/write costs.

---

## 2. Professional & Practice Identity Specifications

All headers, footers, generated documents, reports, and communication templates must embed the official clinical identity:
- **Professional**: Dra. Rogéria Collares
- **Professional Registration**: Fisioterapeuta — CREFITO 23093-F
- **Clinic**: Pilates Espaço Mulher
- **Location**: Costa Azul, Rio das Ostras — RJ
- **Contact / WhatsApp**: (22) 99947-4304
- **Official Brand Colors**:
  - Primary Highlight: Lilás / Roxo (`#9B6CBA`, `#7A4F94`)
  - Surface / Inset Grouped: Off-white / Nude Suave (`#FAF8F5`, `#F4EEF7`)
  - Accent / Alerts / Red Flags: Vinho / Bordô Escuro (`#6A1B15`)
  - Success / Healthy Indicators: Verde Floresta Profundo (`#1B5235`)

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Patient Management | Patient Registration (CRUD) | Complete registration of patient personal, demographic, and contact information. | Full name, birth date, gender, CPF, phone/WhatsApp, email, address, occupation. | Created patient record with UUID, local SQLite persistence, dirty flag for sync. | Validation error on blank name or invalid phone/CPF format; prevents duplicate CPF. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 2 | Patient Management | Instant Local Patient Search & Filter | Sub-millisecond search across patient list by name, phone, or CPF directly from local SQLite. | Query string, sort order (alphabetical, most recent, active/inactive). | Filtered list of patient summary cards with avatar initials, phone, last visit date. | Returns empty state gracefully with "Nenhum paciente encontrado"; no SQL injection. | `ORIGINAL_REQUEST.md` R3, AC63 |
| 3 | Patient Management | Patient Clinical Timeline & History | Chronological view of all clinical interactions, anamnesis, postural evaluations, bioimpedance tests, and workout routines. | `patient_id`. | Ordered chronological feed of clinical cards with timestamps and status indicators. | Displays empty history placeholder if patient has no past sessions. | `ORIGINAL_REQUEST.md` R3 |
| 4 | Clinical Anamnesis | Chief Complaint & HDA | Structured recording of primary complaint (QP) in patient's words and history of current disease (HDA). | Chief complaint text, onset date, pain character (sharp, dull, throbbing), aggravating/relieving factors. | Persisted anamnesis section with pain typology. | Enforces non-empty chief complaint before finalizing anamnesis. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 5 | Clinical Anamnesis | Visual Analog Pain Scale (EVA / VAS) | Interactive 0 to 10 pain intensity rating with color-coded feedback and anatomical pain mapping. | Numeric rating (0-10), pain anatomical sites (cervical, lumbar, shoulders, knees, etc.). | Stored pain score, visual gauge representation (green 0-3, yellow 4-6, red 7-10). | Out-of-bounds numbers clamped to 0-10; invalid input rejected. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 6 | Clinical Anamnesis | Pathological & Surgical History | Tracking of chronic conditions, previous surgeries, fractures, trauma, and systemic illnesses. | Multi-select checkboxes + custom notes: Hypertension, Diabetes, Osteoporosis, Scoliosis, Herniated Disc, etc. | Structured flags in patient clinical profile; tags highlighted in red/burgundy if red flags. | Validates date format for past surgeries; logs unknown comorbidities as notes. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 7 | Clinical Anamnesis | Lifestyle, Ergonomics & Physical Activity | Assessment of sedentary lifestyle, daily posture (sitting/standing hours), sleep quality, and prior Pilates experience. | Daily work posture hours, exercise frequency, sleep quality score (1-5), previous physical activities. | Ergonomic risk classification for targeted Pilates routine design. | Gracefully defaults missing non-critical lifestyle fields to "Não informado". | `ORIGINAL_REQUEST.md` R3 |
| 8 | Clinical Anamnesis | Clinical Contraindications & Red Flags | Automated detection of Pilates movement contraindications based on anamnesis inputs. | Pathologies selected (e.g. acute disc herniation, severe osteoporosis, pregnancy). | Clinical alert banners advising against specific movements (e.g. loaded spinal flexion). | Prominently displayed in workout prescription interface with `#6A1B15` styling. | `ORIGINAL_REQUEST.md` R3, R4 |
| 9 | Postural Evaluation | Static Posture Assessment (Frontal/Anterior) | Evaluation of head tilt, shoulder height, clavicle leveling, chest symmetry, Thalles triangles, ASIS pelvic tilt, knee valgus/varus, feet pronation. | Dropdown/Segmented selections for each anatomical landmark (Normal, Elevated Left, Elevated Right, Valgus, etc.). | Normalized anatomical deviation metrics and qualitative clinical notes. | Incomplete entries marked as "Pendente de avaliação"; non-blocking. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 10 | Postural Evaluation | Static Posture Assessment (Posterior) | Evaluation of head alignment, scapulae (elevation, adduction, winged scapula), spinal curvature, PSIS level, gluteal fold, popliteal crease, heel valgus. | Segmented ratings per posterior landmark, scoliosis presence, rib hump (giba). | Posterior deviation score and postural diagnosis. | Prevents silent data corruption by strictly validating enum options. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 11 | Postural Evaluation | Static Posture Assessment (Right & Left Profiles) | Evaluation of forward head posture, cervical lordosis, shoulder protraction/retraction, thoracic hyperkyphosis/flat back, lumbar lordosis, pelvic tilt, knee hyperextension. | Sagittal alignment selections per segment (Hyperlordosis, Rectified, Normal, Kyphotic). | Complete sagittal balance profile. | Auto-populates neutral defaults when user selects "Alinhamento Fisiológico". | `ORIGINAL_REQUEST.md` R3, AC61 |
| 12 | Postural Evaluation | Dynamic Postural & Functional Assessment | Movement screening tests: Squat test, single-leg stance (Trendelenburg), forward trunk flexion (Adams), spinal roll-down, arm elevation. | Functional test observations, compensation patterns, movement restrictions, instability flags. | Dynamic mobility & functional stability summary. | Preserves notes and flags even if only a subset of dynamic tests are conducted. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 13 | Postural Evaluation | Photographic Grid & Plumb Line Alignment Guide | Camera capture and gallery upload with interactive plumb line (Fio de Prumo) and horizontal reference grid overlay. | Camera/photo picker URI, orientation (Anterior, Posterior, Lateral D, Lateral E). | Stored local image URI with calibrated grid coordinates, zoom, and alignment marks. | Graceful handling if camera permission is denied with explanation sheet. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 14 | Postural Evaluation | Photographic Side-by-Side Comparison | Compare postural photos across different evaluation dates to visually assess alignment evolution. | Two evaluation IDs for the same patient, selected perspective. | Side-by-side or slider comparison view with synchronized alignment grid. | Fallback message if photo for a specific perspective was not captured in one date. | `ORIGINAL_REQUEST.md` R3 |
| 15 | Bioimpedance | Biometric Input & Composition Recording | Entry of bioimpedance scale measurements: Weight (kg), Height (cm), % Fat, % Muscle, Body Water, Visceral Fat, TMB, Bone Mass. | Numerical biometric inputs from bioimpedance scale. | Raw and derived biometrics stored in SQLite with evaluation date and timestamp. | Input validation: rejects negative numbers, zero height, unrealistic percentages (>100%). | `ORIGINAL_REQUEST.md` R3, AC61 |
| 16 | Bioimpedance | Automated BMI & Body Composition Derivations | Automatic calculation of BMI ($kg/m^2$), Fat Mass (kg), Lean Mass (kg), and WHO/clinical classifications. | Weight, Height, % Fat. | Calculated BMI, BMI classification, Fat Mass in kg, Lean Mass in kg, ideal weight range. | Zero division guard on height input; displays "Aguardando altura válida". | `ORIGINAL_REQUEST.md` R3, AC61 |
| 17 | Bioimpedance | Comparative Metrics & Delta Calculation | Instant calculation of changes ($\Delta$) compared to initial baseline and immediately previous evaluation. | Current bioimpedance record, baseline record, previous record. | Colored comparison chips ($\Delta$ Weight, $\Delta$ % Fat, $\Delta$ % Muscle, $\Delta$ Visceral Fat) with direction arrows. | Displays "Primeira avaliação (Linha de base)" if no previous evaluation exists. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 18 | Bioimpedance | Temporal Evolution Charts | Graphical trend lines showing weight, body fat %, muscle mass %, and visceral fat progression over time. | Patient evaluation time series data. | Interactive trend charts with data points, date labels, and target goal reference lines. | Graceful single-point visualization or empty state prompt when <2 records exist. | `ORIGINAL_REQUEST.md` R3, AC61 |
| 19 | Bioimpedance | Target Goal Setting & Progress Tracking | Setting patient-specific targets for weight, body fat %, and muscle mass with progress percentage. | Target weight, target body fat %, target muscle %, target date. | Progress bars and percentage completion toward physiological goals. | Clamps progress between 0% and 100%; handles non-numeric target entries. | `ORIGINAL_REQUEST.md` R3 |
| 20 | Exercise Catalog | Classical Pilates Equipment Taxonomy | Master catalog of exercises organized by classical apparatus: Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat / Solo, Small Accessories. | Apparatus filter selection, difficulty filter (Iniciante, Intermediário, Avançado), search query. | Paginated / categorized list of classical exercises with apparatus badges. | Instant local fallback; seeds database with classical repertoire on initial run. | `ORIGINAL_REQUEST.md` R4, AC62 |
| 21 | Exercise Catalog | Exercise Detail & Biomechanical Parameters | Detailed view of exercise: English/PT name, apparatus, default spring setting, target muscles, starting position, movement cues, contraindications. | `exercise_id`. | Full exercise sheet with spring diagrams, instructional text, and anatomical focus. | Returns "Exercício não encontrado" if ID is missing or corrupted. | `ORIGINAL_REQUEST.md` R4 |
| 22 | Exercise Catalog | Custom Exercise Creation & Management | Ability for Dra. Rogéria to add new studio-specific exercises or variations to any apparatus category. | Exercise name, apparatus category, default springs, difficulty, instructions, precautions. | Persisted custom exercise record available in routine builder. | Validates required name and apparatus category; flags as custom. | `ORIGINAL_REQUEST.md` R4 |
| 23 | Workout Prescription | Routine Builder & Custom Sequencing | Compose personalized workout routines for a patient, selecting exercises across any apparatus and ordering them. | `patient_id`, routine title, target objective, ordered list of selected exercises. | Created workout routine entity linked to patient in SQLite with active status. | Prevents saving completely empty routine; warns if routine has no exercises. | `ORIGINAL_REQUEST.md` R4, AC62 |
| 24 | Workout Prescription | Apparatus Spring & Tension Customization | Fine-tune spring configurations per exercise item in the prescribed routine (e.g. 1 Vermelha + 1 Azul, Mola Alta/Baixa). | Routine item ID, spring colors/quantities, gear bar position, footbar height, headrest. | Custom resistance configuration stored with routine item. | Provides intuitive quick-picker for standard studio spring color codes. | `ORIGINAL_REQUEST.md` R4, AC62 |
| 25 | Workout Prescription | Repetitions, Sets & Postural Instructions | Specify repetitions (e.g. 8-10), sets, hold duration, and patient-specific postural focus (e.g. "Manter pelve neutra"). | Reps count, sets, duration (seconds), specific clinical observation notes. | Prescribed exercise execution parameters. | Enforces positive integer for reps/sets; supports open-ended clinical notes. | `ORIGINAL_REQUEST.md` R4, AC62 |
| 26 | Workout Execution | Session Execution Logger & Adherence | Track completed studio sessions: date, completed exercises, skipped exercises, resistance adjustments made. | `routine_id`, execution date, completed exercise item IDs, actual repetitions/springs used. | Logged session record in patient history with completion rate. | Allows partial completion saving; records skipped reason if provided. | `ORIGINAL_REQUEST.md` R4, AC62 |
| 27 | Workout Execution | Patient Session Feedback & Perceived Exertion | Record patient's perceived exertion (Borg CR10 1-10), pain during exercise (EVA 0-10), and subjective feedback. | Borg exertion score, EVA score, patient comments, fatigue signs observed. | Stored session feedback used to adjust future prescription intensity. | Limits Borg to 1-10 scale and EVA to 0-10 scale. | `ORIGINAL_REQUEST.md` R4 |
| 28 | Clinical Reports | Comprehensive Assessment Report Generator | Generate complete clinical evaluation report combining personal data, anamnesis, postural findings, and bioimpedance. | `patient_id`, `evaluation_id`, clinical notes from Dra. Rogéria. | Formatted clinical document object ready for preview and PDF export. | Handles missing optional evaluation sections without crashing layout. | `ORIGINAL_REQUEST.md` R5, AC53 |
| 29 | Clinical Reports | Bioimpedance Evolution Report | Generate concise report focusing on physical evolution, weight/fat/muscle deltas, and progress charts. | `patient_id`, date range or selected evaluation pair. | Evolution summary report with comparative table and chart snapshots. | Requires at least one bioimpedance evaluation; displays prompt if none. | `ORIGINAL_REQUEST.md` R5 |
| 30 | Clinical Reports | Workout Prescription Sheet Export | Generate clean workout sheet for patient reference listing exercises, apparatus, spring setups, and postural instructions. | `routine_id`. | Cleanly formatted prescription sheet with studio branding. | Fallback to default notes if specific instructions were omitted. | `ORIGINAL_REQUEST.md` R5 |
| 31 | Clinical Reports | Professional Branding & Signature Header | Embedded professional header & signature: Dra. Rogéria Collares (CREFITO 23093-F), Costa Azul, Rio das Ostras. | Professional profile metadata, clinic logo/watermark asset. | Standardized header and signature block in all exported documents. | Embedded as constant/configuration so clinical identity is never omitted. | `ORIGINAL_REQUEST.md` R1, R5, AC53 |
| 32 | Clinical Reports | Native PDF Export & Print | Compile report into high-resolution, print-ready PDF using native print/file sharing API. | Rendered HTML/print template with inline styling and vector graphics. | Generated PDF file stored in temporary app cache with file URI. | Handles file system write errors gracefully; notifies user if export fails. | `ORIGINAL_REQUEST.md` R5 |
| 33 | Clinical Reports | Direct WhatsApp Message & Share Integration | Share clinical report summary text directly to patient's WhatsApp or attach generated PDF via system share sheet. | Patient phone number, formatted message summary, optional PDF file URI. | Triggers `Linking.openURL('whatsapp://send...')` or native Share dialog. | Falls back to system Share Sheet or SMS if WhatsApp is not installed. | `ORIGINAL_REQUEST.md` R5 |
| 34 | Design System (HIG) | Inset Grouped List Architecture | UI layout implementing Apple HIG Inset Grouped List standard with rounded cards, section headers, and separators. | Section header string, item rows, footer disclaimer. | Rendered iOS-native grouped table view with `#FAF8F5` background and `#F4EEF7` cells. | Ensures consistent responsive layout across iPhone and iPad / Android screens. | `ORIGINAL_REQUEST.md` R1, AC50 |
| 35 | Design System (HIG) | Dynamic Large Titles & Scroll Transitions | Collapsing navigation header transitioning smoothly from Large Title (34pt Bold) to compact inline title on scroll. | Scroll offset `scrollY`, screen title string. | Animated header bar with fluid opacity and translation. | Prevents stuttering by using React Native Animated / Reanimated native driver. | `ORIGINAL_REQUEST.md` R1, AC51 |
| 36 | Design System (HIG) | Segmented Controls & Native Tabs | Apple-style segmented tabs with sliding pill indicator for switching views (e.g. Avaliação / Postura / Bioimpedância). | Array of segment labels, active index, onSelect callback. | Fluid animated segmented control with tactile feedback. | Clamps index within bounds; defaults to first segment if index invalid. | `ORIGINAL_REQUEST.md` R1 |
| 37 | Design System (HIG) | Haptic Feedback Engine | Context-aware tactile vibrations via `expo-haptics` for selections, confirmations, warnings, and deletions. | Action type: `selection`, `success`, `warning`, `error`, `impactLight`, `impactHeavy`. | Triggered physical haptic sensation on iOS/Android device. | Silently fails on unsupported web/simulator environments without error. | `ORIGINAL_REQUEST.md` R1, AC52 |
| 38 | Design System (HIG) | Modals & Bottom Sheets with Squircles | Native presentation sheets with smooth continuous corner radius, drag handle, and gesture dismissal. | Sheet content, title, snap points, isOpen state. | Smooth bottom sheet with backdrop dimming and spring physics. | Intercepts back button on Android to dismiss sheet cleanly. | `ORIGINAL_REQUEST.md` R1 |
| 39 | Design System (HIG) | Official Brand Palette Enforcement | Centralized theme tokens strictly applying `#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235`. | Theme provider context. | Consistent styling across typography, borders, badges, buttons, and icons. | Strict TypeScript types prevent arbitrary unapproved hex colors. | `ORIGINAL_REQUEST.md` R1, AC50 |
| 40 | Database (Local-First) | SQLite Single Source of Truth Engine | Embedded SQLite database (`expo-sqlite`) managing all tables, foreign keys, and indexes locally on device. | SQL queries, migrations, transactions. | Instant local read/write operations with zero network latency. | Rolls back failed transactions automatically; logs query errors cleanly. | `ORIGINAL_REQUEST.md` R2, AC56 |
| 41 | Database (Local-First) | Local Schema Migrations & Seeding | Automated migration runner creating tables and seeding default classical Pilates exercises on first boot. | Migration version counter in SQLite `user_version` PRAGMA. | Up-to-date relational schema across app versions. | Safe migration execution inside transactions; prevents data loss. | `ORIGINAL_REQUEST.md` R2 |
| 42 | Database (Local-First) | Dirty Tracking & Sync Metadata Flags | Tracking modification state per row (`sync_status`: `synced`, `pending_insert`, `pending_update`, `pending_delete`). | Record create/update/delete operations. | Updated `sync_status` and `updated_at` timestamps for differential sync. | Automatically updates flag to `pending_update` on any local modification. | `ORIGINAL_REQUEST.md` R2, AC56 |
| 43 | Firebase Quota Guard | Consolidated Document Synchronization | Batch writes to Firestore bundling patient profile, anamnesis, evaluations, and routines into consolidated documents. | Local dirty records for patient. | Single consolidated Firestore document write per patient sync operation. | Drastically reduces write operations to preserve Spark Free Tier. | `ORIGINAL_REQUEST.md` R2, AC57, AC58 |
| 44 | Firebase Quota Guard | Zero-Listener & Zero-Polling Guard | Complete elimination of persistent `onSnapshot()` listeners and periodic `setInterval` background polling. | Manual / on-demand sync triggers or explicit save events. | One-shot atomic `getDoc()` / `setDoc()` calls strictly when requested. | Throws fatal lint/build error or logs warning if any real-time listener is registered. | `ORIGINAL_REQUEST.md` R2, AC57 |
| 45 | Firebase Quota Guard | On-Demand Sync Trigger & Status UI | User-facing sync indicator and manual "Sincronizar com Nuvem" button showing pending changes and sync status. | User tap or deliberate batch trigger when online. | Synchronized state with timestamp; badge showing count of unsynced items. | Detects offline state immediately and informs user without attempting network calls. | `ORIGINAL_REQUEST.md` R2, AC57 |
| 46 | Code Quality & Typing | Strict TypeScript Architecture | 100% strict TypeScript types (`npx tsc --noEmit`) across domain models, UI props, database queries, and services. | TypeScript compiler execution. | Clean compile with zero errors, zero `any` shortcuts in domain entities. | Halts build pipeline if type mismatches or unhandled nullables occur. | `ORIGINAL_REQUEST.md` AC66, AC67 |

---

## 4. Edge Cases & Boundary Conditions

| # | Feature | Input / Scenario | Observed / Required Behavior |
|---|---------|------------------|------------------------------|
| 1 | Patient Registration | CPF entered with dots/dashes, or invalid length | Format input mask dynamically `000.000.000-00`; validate 11 digits and CPF check-digit algorithm; block save if invalid. |
| 2 | Patient Registration | WhatsApp phone number without DDD or with 8 digits | Format phone mask `(99) 99999-9999`; ensure country code `+55` is properly prepended when opening WhatsApp link. |
| 3 | Patient Registration | Patient with exact same name as existing patient | Allow duplicate names but assign distinct UUIDs; display birth date or phone in search results to disambiguate. |
| 4 | Patient Registration | Accented characters, uppercase/lowercase variations in search | Search query normalized using `COLLATE NOCASE` or unaccented lower strings (`Rogéria` matches `rogeria`, `JOAO` matches `João`). |
| 5 | Clinical Anamnesis | Patient has critical contraindication (e.g. recent spinal surgery, acute disc prolapse, unmanaged hypertension) | Highlight red flag tags in `#6A1B15`; show clinical advisory banner on routine prescription screen preventing contraindicated exercises. |
| 6 | Clinical Anamnesis | Visual Analog Pain Scale (EVA) slider moved to 0 | Color code changes to deep forest green (`#1B5235`); label updates to "Sem dor / Dor ausente". |
| 7 | Clinical Anamnesis | Visual Analog Pain Scale (EVA) slider moved to 10 | Color code changes to deep burgundy (`#6A1B15`); label updates to "Dor insuportável / Máxima intensidade"; triggers haptic warning. |
| 8 | Postural Evaluation | User attempts to save postural evaluation without capturing photos | Allowed: photos are clinical aids but not mandatory; evaluation status marked as "Completa sem fotos anexadas". |
| 9 | Postural Evaluation | Device camera permission denied by user | Show graceful explanatory modal explaining why camera is needed for postural alignment; provide fallback to upload from gallery or skip. |
| 10 | Postural Evaluation | Photo taken in landscape orientation instead of portrait | Automatic detection and rotation to vertical portrait orientation to match vertical plumb line grid. |
| 11 | Postural Evaluation | Device rotated during camera grid preview | Alignment grid recalculates coordinates and maintains vertical gravity plumb line alignment. |
| 12 | Bioimpedance | Height input is 0 cm, negative, or blank | Guard against division by zero in BMI calculation ($BMI = Weight / (Height / 100)^2$); display "Aguardando altura válida"; block save. |
| 13 | Bioimpedance | Patient with cardiac pacemaker or pregnancy undergoes bioimpedance | Prominent clinical safety alert: Bioimpedance is contraindicated for patients with pacemakers or during pregnancy; allow entering weight only. |
| 14 | Bioimpedance | Visceral fat value exceeds healthy threshold (e.g. $\ge 10$) | Badge renders in alert burgundy (`#6A1B15`) with text "Nível Elevado - Atenção"; values 1-9 render in green (`#1B5235`). |
| 15 | Bioimpedance | Single bioimpedance test recorded (first session) | Baseline mode activated: Delta indicators show "Linha de Base"; temporal chart renders a single anchor point with baseline badge. |
| 16 | Bioimpedance | Body fat percentage decreases while muscle mass percentage increases | Comparative chip displays green (`#1B5235`) with down arrow for fat $\Delta$ and green up arrow for muscle $\Delta$ (desirable clinical outcome). |
| 17 | Exercise Catalog | Search query matches no exercises in current apparatus | Display friendly empty state: "Nenhum exercício encontrado para este aparelho"; provide button to clear filter or add custom exercise. |
| 18 | Workout Prescription | Routine created with zero exercises | Validation warning: "A rotina precisa conter pelo menos um exercício antes de ser salva". |
| 19 | Workout Prescription | Exercise prescribed for patient with active contraindicated condition (e.g. Roll Over on Reformer for patient with cervical hernia) | Display amber/burgundy clinical warning modal: "Atenção Dra. Rogéria: Este exercício exige flexão cervical e o paciente possui histórico de hérnia cervical". |
| 20 | Workout Prescription | Spring tension customized with non-standard studio configuration | Support free-form text input alongside preset quick-pickers (e.g. "1 Azul + meia mola amarela"). |
| 21 | Workout Execution | Session aborted mid-way or interrupted | Save partial execution log with completed exercises checked and remaining marked as uncompleted. |
| 22 | Clinical Reports | PDF generation triggered on low memory device with high-resolution photos | Image compression/downsampling applied before HTML canvas/PDF injection to prevent Out-Of-Memory (OOM) crashes. |
| 23 | Clinical Reports | Patient does not have WhatsApp installed on device | Try `whatsapp://` URL scheme; if rejected or fails, open system native Share Sheet (`Sharing.shareAsync` or `Share.share`) as universal fallback. |
| 24 | Local Database | App opened for the very first time on empty device | Automated database initialization executes DDL schema migrations in an SQLite transaction and seeds 40+ classical Pilates exercises. |
| 25 | Local Database | App killed by OS while writing evaluation record | SQLite write performed inside `BEGIN TRANSACTION ... COMMIT`; journal mode `WAL` guarantees atomicity and zero database corruption. |
| 26 | Firebase Sync | Device is completely offline (Airplane mode / No cellular) | App operates seamlessly with zero delay; sync indicator shows "Offline (Alterações salvas localmente)"; no failed network exceptions. |
| 27 | Firebase Sync | Remote sync triggered with 15 pending changes across 3 patients | Group changes by patient ID; execute exactly 3 consolidated `setDoc(..., { merge: true })` calls; mark records as `synced`; zero individual row writes. |
| 28 | Firebase Sync | User rapidly taps "Sincronizar" multiple times | Debounce sync handler with an `isSyncing` mutex lock; subsequent taps are ignored while a sync pass is active. |

---

## 5. Detailed Clinical Domain Specifications

### 5.1 Patient Registration & Anamnesis Data Structure
```typescript
interface Patient {
  id: string; // UUID v4
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  gender: 'female' | 'male' | 'other';
  cpf: string; // Formatted 000.000.000-00
  phone: string; // (22) 99999-9999
  email?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string; // Default: Rio das Ostras
    state: string; // Default: RJ
    zipCode?: string;
  };
  occupation: string; // e.g. Professora, Advogada, Do lar (biomechanical posture context)
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string; // ISO 8601
  updatedAt: string;
  syncStatus: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

interface Anamnesis {
  id: string;
  patientId: string;
  chiefComplaint: string; // Queixa Principal (QP)
  historyOfPresentIllness: string; // HDA
  painVAS: number; // 0 to 10 Visual Analog Scale
  painLocations: string[]; // ['Cervical', 'Lombar', 'Ombro Direito', etc.]
  painCharacteristics: string[]; // ['Queimação', 'Pontada', 'Latejante', 'Irradiada']
  aggravatingFactors: string;
  relievingFactors: string;
  pathologicalHistory: {
    hypertension: boolean;
    diabetes: boolean;
    osteoporosis: boolean;
    osteopenia: boolean;
    fibromyalgia: boolean;
    herniatedDisc: boolean;
    herniatedDiscLocation?: string;
    scoliosis: boolean;
    arthrosis: boolean;
    arthritis: boolean;
    cardiacIssues: boolean;
    respiratoryIssues: boolean;
    otherPathologies?: string;
  };
  surgicalHistory: string; // Surgeries & dates
  currentMedications: string;
  physicalActivityLevel: 'sedentary' | 'light' | 'moderate' | 'intense';
  pilatesExperience: boolean;
  workErgonomics: {
    hoursSitting: number;
    hoursStanding: number;
    repetitiveStrain: boolean;
    description?: string;
  };
  clinicalImpression: string; // Dra. Rogéria's diagnostic notes
  therapeuticGoals: string[]; // ['Alívio da dor', 'Fortalecimento do Core', 'Flexibilidade', 'Correção Postural']
  evaluatedAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending_insert' | 'pending_update';
}
```

### 5.2 Postural Evaluation Landmarks & Grid System
The postural evaluation covers three standard planes and dynamic functional movements:

1. **Anterior (Frontal) Plane**:
   - **Cabeça**: Alinhada / Inclinação D / Inclinação E / Rotação D / Rotação E
   - **Ombros**: Nivelados / Elevação D / Elevação E / Protração
   - **Clavículas**: Simétricas / Desniveladas
   - **Tórax**: Simétrico / Pectus Excavatum / Pectus Carinatum
   - **Trígono de Thalles (Triângulo da Cintura)**: Simétrico / Assimétrico (maior à D / maior à E)
   - **Pelve (EIAS)**: Nivelada / Crista ilíaca elevada à D / Crista ilíaca elevada à E
   - **Joelhos**: Normais / Genu Valgo / Genu Varo / Estrabismo Patelar
   - **Pés / Tornozelos**: Neutros / Pronados / Supinados / Hálux Valgo

2. **Posterior Plane**:
   - **Cabeça**: Alinhada / Inclinação D / Inclinação E
   - **Ombros**: Nivelados / Elevado D / Elevado E
   - **Escápulas**: Neutras / Aladas (unilateral D/E ou bilateral) / Abduzidas / Aduzidas / Elevadas
   - **Coluna Vertebral**: Alinhada / Desvio Escoliótico (Cérvico-Torácico, Torácico, Lombar, Duplo em S)
   - **Teste de Adams (Gibosidade)**: Ausente / Presente à D / Presente à E
   - **Pelve (EIPS)**: Nivelada / Desnivelada
   - **Prega Glútea**: Nivelada / Desnivelada
   - **Linha Poplítea**: Nivelada / Desnivelada
   - **Tendão Calcâneo / Retropé**: Alinhado / Valgo / Varo

3. **Lateral (Sagittal) Plane (Right & Left Profiles)**:
   - **Cabeça**: Alinhada / Anteriorizada / Retificada
   - **Coluna Cervical**: Fisiológica / Hiperlordose / Retificação
   - **Ombros**: Neutros / Protusos (anteriorizados) / Retraídos
   - **Coluna Torácica**: Fisiológica / Hipercifose / Dorso Plano
   - **Coluna Lombar**: Fisiológica / Hiperlordose / Retificação
   - **Pelve**: Neutra / Anteversão / Retroversão
   - **Joelhos**: Neutros / Genu Recurvato (hiperextensão) / Semifletidos

4. **Dynamic Functional Screening**:
   - **Agachamento Livre (Overhead / Hands-on-hips Squat)**: Avalia valgo dinâmico de joelhos, perda da lordose lombar (butt wink), inclinação anterior excessiva do tronco, elevação precoce de calcanhares.
   - **Apoio Unipodal (Teste de Trendelenburg)**: Avalia estabilidade dos glúteos médios e desabamento pélvico contralateral.
   - **Flexão Anterior de Tronco (Rolldown da Coluna)**: Avalia harmonia da articulação vértebra por vértebra e encurtamento da cadeia posterior.
   - **Elevação de Membros Superiores**: Avalia ritmo escapuloumeral e compensação com anteriorização de costelas (rib flare).

5. **Photographic Alignment Grid Coordinates**:
   - **Vertical Axis (Fio de Prumo / Plumb Line)**: Centerline at $x = 50\%$ intersecting standard anatomical landmarks (glabella, sternum, umbilicus, pubic symphysis, equidistant between medial malleoli).
   - **Horizontal Reference Lines**:
     - Line 1: Tragus / Earlobes (Auditivo externo)
     - Line 2: Acromia (Nível dos ombros)
     - Line 3: EIAS / Cristas Ilíacas (Nível pélvico anterior)
     - Line 4: Patella / Interlinha articular do joelho
     - Line 5: Maléolos mediais (Tornozelo)
   - Storage of camera captures: Stored in app local sandbox directory with persistent relative paths in SQLite.

### 5.3 Bioimpedance Evaluation & Evolution Formulations
```typescript
interface BioimpedanceRecord {
  id: string;
  patientId: string;
  evaluationDate: string; // YYYY-MM-DD
  weightKg: number; // e.g. 64.5
  heightCm: number; // e.g. 165
  bmi: number; // calculated: weight / (height/100)^2
  bmiClassification: string; // Abaixo do peso, Normal, Sobrepeso, Obesidade I, etc.
  bodyFatPercent: number; // e.g. 24.2%
  fatMassKg: number; // calculated: weight * (bodyFatPercent / 100)
  muscleMassPercent: number; // e.g. 33.1%
  muscleMassKg: number; // calculated: weight * (muscleMassPercent / 100)
  totalBodyWaterPercent: number; // e.g. 52.4%
  visceralFatLevel: number; // integer 1 to 59 (1-9 normal, 10-14 alto, >=15 muito alto)
  basalMetabolicRateKcal: number; // TMB, e.g. 1380 kcal
  boneMassKg?: number; // e.g. 2.4 kg
  metabolicAgeYears?: number; // e.g. 28 anos
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending_insert' | 'pending_update';
}
```

**Normative Classifications & Health Ranges (Female Emphasis)**:
- **IMC (WHO)**:
  - $< 18.5$: Baixo Peso
  - $18.5 - 24.9$: Peso Normal / Adequado (Verde `#1B5235`)
  - $25.0 - 29.9$: Sobrepeso (Amarelo/Âmbar `#C27803`)
  - $30.0 - 34.9$: Obesidade Grau I (Bordô `#6A1B15`)
  - $\ge 35.0$: Obesidade Grau II / III (Bordô `#6A1B15`)
- **% Gordura Corporal (Mulheres)**:
  - $< 14\%$: Muito Baixa / Atleta de Alta Performance
  - $14\% - 20\%$: Excelente / Atleta
  - $21\% - 24\%$: Bom / Fitness
  - $25\% - 31\%$: Aceitável / Saudável
  - $\ge 32\%$: Elevado / Excesso de Gordura
- **Gordura Visceral**:
  - $1 - 9$: Nível Saudável (Verde `#1B5235`)
  - $10 - 14$: Nível Elevado / Atenção (Bordô `#6A1B15`)
  - $\ge 15$: Nível Muito Alto / Risco Cardiovascular
- **Cálculo de Deltas ($\Delta$)**:
  $$\Delta Peso = Peso_{atual} - Peso_{anterior}$$
  $$\Delta \%Gordura = \%Gordura_{atual} - \%Gordura_{anterior}$$
  $$\Delta \%MassaMuscular = \%MassaMuscular_{atual} - \%MassaMuscular_{anterior}$$

### 5.4 Classical Pilates Apparatus & Exercise Catalog

The catalog is pre-seeded with classical exercises categorized across the 6 equipment types:

#### 1. Reformer
- **Footwork**: Toes / Dedos (10 reps, 3-4 molas), Arches / Arcos dos Pés (10 reps), Heels / Calcanhares (10 reps), Tendon Stretch / Alongamento do Tendão (10 reps).
- **The Hundred**: 100 respirações / bombeamentos, 2-3 molas, alças de mãos, Powerhouse ativado.
- **Leg Circles & Frog**: 8 reps cada, 2 molas, alças nos pés, foco em rotação neutra de quadril e estabilização lombopélvica.
- **Stomach Massage Series**: Round (10 reps), Flat Back (10 reps), Reach Up (8 reps), Twist (6 reps cada lado), 3 a 2 molas.
- **Short Box Series**: Round (6 reps), Flat (6 reps), Side to Side (6 reps), Twist with Reach (6 reps), Around the World, Tree (3 reps cada perna).
- **Elephant**: Round back & Flat back (8-10 reps), 2 molas, articulação dos calcanhares sem oscilar quadril.
- **Long Stretch Series**: Long Stretch (5 reps, 2 molas), Down Stretch (5 reps), Up Stretch (5 reps).
- **Knee Stretches**: Round Back (10 reps), Flat Back (10 reps), Knees Off / Corrida no Reformer (10 reps), 2 molas.
- **Running**: 20 alternâncias, 2 molas, calcanhares descendo suavemente.
- **Pelvic Lift / Bottom Lift**: 10 reps, 2 molas, mobilização segmentar da pelve.
- **Mermaid no Reformer**: 5 reps cada lado, 1 mola azul (leve), flexão lateral do tronco com ancoragem dos ísquios.
- **Long Box**: Swan (5 reps, 1 mola), Pulling Straps (5 reps), T-Pull (5 reps).

#### 2. Cadillac / Trapeze Table
- **Roll Down**: Barra de Roll-Down com molas superiores, 8 reps, rolamento vértebra por vértebra, alívio lombar.
- **Breathing**: Barra de trapézio com mola de sustentação, 5 respirações completas com elevação da pelve.
- **Push Through**: Barra de empurrar para frente (Push-Through Bar), molas superiores ou inferiores com trava de segurança, 6-8 reps.
- **Tower**: Deitado com pés na barra Push-Through conectada por baixo com corrente de segurança, 8 reps, descompressão espinhal.
- **Monkey**: Pés na barra Push-Through, flexão profunda de joelhos e alongamento dos ísquiotibiais, 5 reps.
- **Leg Springs (Molas de Pernas)**: Círculos (8 reps), Tesouras (8 reps), Sapinho / Frog (8 reps), Caminhada / Walking (10 reps).
- **Arm Springs (Molas de Braços)**: Chest Expansion (6 reps), Biceps Curl (8 reps), Triceps Press (8 reps), Hug a Tree (6 reps).
- **Cat / Swan no Cadillac**: Apoio de joelhos ou mãos, extensão torácica pura com ativação de trapézio inferior e grande dorsal.
- **Hanging / Spread Eagle**: No trapézio e postes verticais para tração corporal assistida.

#### 3. Wunda Chair
- **Footwork na Cadeira**: Sentado no topo, empurrando o pedal com dedos, arcos e calcanhares (10 reps cada, 2 molas altas).
- **Pumping / Pressing Down**: Em pé ou sentado, acionamento do pedal pelo transverso do abdômen e glúteos.
- **Spine Stretch Forward**: Em pé atrás da cadeira, rolamento para baixo empurrando o pedal.
- **Going Up Front (Step Up)**: Subida frontal na cadeira com controle excêntrico do quadríceps e estabilização de pelve (8 reps cada perna, 1 mola 3 + 1 mola 2).
- **Going Up Side (Lunge Lateral)**: 8 reps cada lado, fortalecimento de glúteo médio e adutores.
- **Push Ups na Cadeira**: Mãos no pedal ou nos blocos, flexão de braços com estabilidade de cintura escapular (8-10 reps).
- **Teaser na Cadeira**: No chão com mãos no pedal ou sentado na cadeira (5 reps).
- **Mermaid na Cadeira**: Sentado de lado no assento, empurrando o pedal lateralmente (5 reps cada lado).
- **Swan na Cadeira**: Deitado em pronação no assento com mãos no pedal, extensão torácica sem compressão lombar.

#### 4. Ladder Barrel
- **Ballet Stretches**: Alongamentos estáticos e dinâmicos de isquiotibiais, adutores, quadríceps e trato iliotibial (30s cada posição).
- **Short Box no Barrel**: Round, Flat e Side-to-Side aproveitando o formato anatômico do barril.
- **Swan no Barrel**: Apoio do púbis no ápice do barril, pés nas travessas da escada, extensão profunda da coluna torácica.
- **Side Sit-Ups / Mermaid**: Trabalho de oblíquos e flexão lateral contra a gravidade.
- **Horseback no Barrel**: Sentado a cavalo, fortalecimento de adutores e alongamento axial.
- **Grasshopper / Back Extensions**: Fortalecimento de paravertebrais e cadeia posterior.

#### 5. Mat / Solo
- **The Hundred**: Clássico no solo com bombeamento de braços e pernas em tabletop ou 45 graus.
- **The Roll Up**: Flexão anterior lenta vértebra por vértebra, descolando do chão sem impulso.
- **Single Leg Circles**: Estabilidade de pelve com círculos controlados no quadril.
- **Rolling Like a Ball**: Equilíbrio sobre os ísquios em posição de C-curve.
- **Abdominal Series of Five**: Single Leg Stretch, Double Leg Stretch, Single Straight Leg Stretch (Scissors), Double Straight Leg Lower-Lift, Criss-Cross.
- **Spine Stretch Forward**: Sentado com pernas afastadas, flexão anterior do tronco crescendo a coluna.
- **Open Leg Rocker**: Rolamento mantendo abertura e pegada nos tornozelos.
- **Saw**: Rotação com flexão do tronco, alcançando o dedo mínimo do pé oposto.
- **Swan Dive**: Extensão torácica dinâmica com braços abertos.
- **Swimming**: Batimento alternado de braços e pernas em pronação.
- **Teaser 1, 2, 3**: O ápice do controle de centro e força de flexores de quadril.
- **Seal & Crab**: Rolamentos finais de massagem espinhal.

#### 6. Small Accessories (Pequenos Acessórios)
- **Magic Circle (Anel Flexível)**:
  - Adução isométrica entre os joelhos na ponte pélvica.
  - Pressão peitoral e de cintura escapular em pé ou sentado.
  - Alinhamento de tornozelos em decúbito dorsal.
- **Foam Roller (Rolo)**:
  - Deitado longitudinalmente sobre o rolo para alinhamento da coluna e abertura peitoral.
  - Mobilização torácica em extensão.
  - Ponte com pés apoiados no rolo (desafio proprioceptivo).
- **Overball / Soft Ball**:
  - Posicionada sob o sacro para feedback de pelve neutra e estabilização do core.
  - Entre os joelhos para ativação de adutores e assoalho pélvico.
- **Theraband (Faixa Elástica)**:
  - Rotação externa de ombro para fortalecimento de manguito rotador.
  - Assistência ao alongamento de isquiotibiais e panturrilha.
- **Swiss Ball (Fitball / Bola Suíça)**:
  - Prancha com antebraços na bola.
  - Extensão de coluna e descompressão lombar sobre a bola.

---

## 6. Apple HIG Design System & UI Architecture

### 6.1 Color Palette Tokens
```typescript
export const Colors = {
  // Brand Primaries
  primary: '#9B6CBA', // Lilás Oficial Espaço Mulher (Destaques, Botões Principais)
  primaryDark: '#7A4F94', // Roxo Profundo (Active, Pressed, Selected Tabs)
  primaryLight: '#D4BFE3', // Lilás Claro para badges e highlights suaves

  // Surfaces & Backgrounds
  background: '#FAF8F5', // Off-white / Nude Suave (Fundo agrupado oficial HIG)
  cardBackground: '#F4EEF7', // Lavanda Nude Suave (Fundo dos cards Inset Grouped)
  surfaceElevated: '#FFFFFF', // Branco puro para modais e popovers

  // Semantic & Feedback
  accentAlert: '#6A1B15', // Vinho / Bordô Escuro (Alertas, Red Flags, Deletar)
  accentSuccess: '#1B5235', // Verde Floresta Profundo (Indicadores Saudáveis, Sucesso)
  warning: '#C27803', // Âmbar para advertências clínicas moderadas

  // Typography & Neutrais
  textPrimary: '#1F1A24', // Preto carvão suave com subtom lilás escuro
  textSecondary: '#6B6472', // Cinza médio para descrições e legendas
  textMuted: '#9E97A6', // Cinza claro para placeholders e ícones inativos
  border: '#E7E0EB', // Divisores de linhas e bordas sutis
  separator: '#E2DAE8', // Linhas separadoras do padrão Inset Grouped List
};
```

### 6.2 Typography Scale (Apple SF Pro / System Font)
- **Large Title**: 34pt, Bold, Tracking: 0.37, Leading: 41pt
- **Title 1**: 28pt, Bold, Tracking: 0.36, Leading: 34pt
- **Title 2**: 22pt, Bold, Tracking: 0.35, Leading: 28pt
- **Title 3**: 20pt, SemiBold, Tracking: 0.38, Leading: 25pt
- **Headline**: 17pt, SemiBold, Tracking: -0.41, Leading: 22pt
- **Body**: 17pt, Regular, Tracking: -0.41, Leading: 22pt
- **Callout**: 16pt, Regular, Tracking: -0.32, Leading: 21pt
- **Subhead**: 15pt, Regular, Tracking: -0.24, Leading: 20pt
- **Footnote**: 13pt, Regular, Tracking: -0.08, Leading: 18pt
- **Caption 1**: 12pt, Regular, Tracking: 0.00, Leading: 16pt
- **Caption 2**: 11pt, Regular, Tracking: 0.07, Leading: 13pt

### 6.3 HIG Component Rules
- **Inset Grouped List**:
  - Horizontal margin: `16px` on iPhone, `24px` on iPad.
  - Border radius: `12px` to `16px` continuous curve (squircle).
  - Background: Section background `#FAF8F5`, row container `#F4EEF7` or `#FFFFFF`.
  - Section headers: Uppercase, `13pt` footnote style with `16px` leading padding.
  - Separators: `0.5px` hairline indented by `16px` (or aligned with the trailing edge of row icons).
- **Large Titles with Dynamic Collapsing Scroll**:
  - Standard iOS navigation bar pattern: renders 34pt bold title when scrolled to top.
  - Transitions to centered 17pt headline title smoothly as user scrolls down.
- **Segmented Control**:
  - Pill-shaped container with background `#EFE9F3`, rounded corners `8px`.
  - Active segment has white card background, subtle drop shadow, and triggers `Haptics.selectionAsync()`.
- **Haptic Feedback Patterns**:
  - Selection of exercise, tab, or picker item: `Haptics.selectionAsync()`
  - Save evaluation / workout success: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
  - Clinical red flag detected or validation error: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)`
  - Delete patient / session confirmation: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)`
  - Quick action tap: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`

---

## 7. Local-First SQLite & Firebase Spark Quota Guard Architecture

### 7.1 Single Source of Truth (SSOT) Local SQLite Schema
All app operations interact exclusively with local SQLite via `expo-sqlite`.
Relational Tables:
1. `patients`: ID, personal info, contact info, timestamps, `sync_status`.
2. `anamneses`: ID, `patient_id`, complaints, pain score, medical history JSON, timestamps, `sync_status`.
3. `postural_evaluations`: ID, `patient_id`, anterior JSON, posterior JSON, lateral JSON, dynamic JSON, photo URIs JSON, timestamps, `sync_status`.
4. `bioimpedance_evaluations`: ID, `patient_id`, weight, height, BMI, % fat, % muscle, water, visceral fat, TMB, timestamps, `sync_status`.
5. `exercises`: ID, name, apparatus, default springs, difficulty, instructions, isCustom, timestamps.
6. `routines`: ID, `patient_id`, title, objective, isActive, timestamps, `sync_status`.
7. `routine_items`: ID, `routine_id`, `exercise_id`, sequenceOrder, springs, reps, sets, posturalInstructions.
8. `session_logs`: ID, `patient_id`, `routine_id`, sessionDate, completedExercises JSON, borgExertion, painScore, observations, timestamps, `sync_status`.

### 7.2 Firebase Spark Plan Protection Rules
- **No Real-Time Listeners**:
  - Strictly banned: `onSnapshot(collection(...))`, `onSnapshot(doc(...))`.
  - No continuous subscriptions that re-read documents on every background ping.
- **No Polling Loops**:
  - Strictly banned: `setInterval(() => fetchFromFirebase(), 5000)`.
- **Consolidated Patient Document Pattern**:
  - In Firestore, data is structured as:
    `patients/{patientId}`:
    ```json
    {
      "profile": { "id": "...", "fullName": "...", "phone": "..." },
      "anamnesis": { ... },
      "posturalEvaluations": [ ... ],
      "bioimpedanceEvaluations": [ ... ],
      "routines": [ ... ],
      "sessionLogs": [ ... ],
      "_lastSyncedAt": "2026-09-11T20:18:00Z",
      "_schemaVersion": 1
    }
    ```
  - Result: Syncing an entire patient's record consumes **1 single write** to Firestore instead of 20+ separate document writes.
- **Sync Triggering Policy**:
  - On-demand button: "Sincronizar Dados" in Settings / Header.
  - Smart dirty check: Only patients with `sync_status != 'synced'` are uploaded.
  - Low-frequency batch sync: When returning online, perform a single batch pass for dirty records.

---

## 8. Clinical Reports & WhatsApp/PDF Export Architecture

### 8.1 Professional Header & Footer Specifications
Every exported document (PDF or formatted text) must incorporate:
```
============================================================
              PILATES ESPAÇO MULHER
        Dra. Rogéria Collares | CREFITO 23093-F
       Fisioterapia & Avaliação Postural Personalizada
   Costa Azul, Rio das Ostras - RJ | WhatsApp: (22) 99947-4304
============================================================
```

### 8.2 WhatsApp Text Message Template Generator
Direct text sharing via `whatsapp://send?phone=+5522...&text=...`:
```
Olá [Nome do Paciente]! Aqui é a Dra. Rogéria Collares do Pilates Espaço Mulher.

Segue o resumo da sua avaliação realizada em [Data]:
• Peso: [XX.X] kg
• % Gordura: [XX.X]% ([Δ: -X.X%])
• % Massa Muscular: [XX.X]% ([Δ: +X.X%])
• IMC: [XX.X] ([Classificação])
• Nível de Gordura Visceral: [X]

🎯 Plano Terapêutico:
[Resumo das condutas posturais e rotina de Pilates prescrita]

O relatório clínico completo em PDF segue em anexo.
Qualquer dúvida estou à disposição! 💜
```

---

## 9. Acceptance Criteria Traceability Matrix

| AC Identifier | Requirement Clause | How Addressed in Specification & Design |
|---|---|---|
| **AC50** | Official brand palette (`#9B6CBA`, `#FAF8F5`, `#6A1B15`, `#1B5235`) & Apple Inset Grouped List | Section 6.1 defines exact color tokens; Section 6.3 specifies Inset Grouped List dimensions, squircle radius, and typography. |
| **AC51** | Large Titles with dynamic smooth scroll transition | Section 6.3 & Feature #35 define the collapsing navigation header behavior with native driver animations. |
| **AC52** | Haptics feedback on selections, confirmations, deletions | Section 6.3 & Feature #37 define `expo-haptics` integration patterns across success, warning, and selection triggers. |
| **AC53** | Header/Footer with Dra. Rogéria Collares (CREFITO 23093-F) & Costa Azul | Section 2, 8.1 & Feature #31 define persistent clinical credentials across reports, headers, and exports. |
| **AC56** | 100% offline local SQLite persistence for all CRUD | Section 7.1 & Feature #40 define complete relational schema in `expo-sqlite` as SSOT. |
| **AC57** | Firebase configured with `espacomulher-84137`, zero polling, no onSnapshot | Section 7.2 & Features #43, #44 define consolidated document pattern and zero-listener policy. |
| **AC58** | Consolidated documents for patient and evaluations in Firestore | Section 7.2 & Feature #43 specify consolidated JSON document schema per patient. |
| **AC61** | Full patient, anamnesis, postural grid & bioimpedance flow | Features #1-#19, Section 5.1-5.3 specify complete clinical workflow, equations, and landmark evaluations. |
| **AC62** | Pilates routine builder with equipment catalog & prescription | Features #20-#27, Section 5.4 specify all 6 classical apparatus categories, exercises, spring configs, and session logs. |
| **AC63** | Instant local search for patients | Feature #2 & Edge Cases #4 specify indexed local SQLite search with accent and case insensitivity. |
| **AC66** | Strict TypeScript (`npx tsc --noEmit`) | Feature #46 & Section 5 define exhaustive TypeScript interfaces for all clinical domain entities. |
| **AC67** | Modular architecture (Theme, Database, Services, Features) | Section 10 below defines clear directory layout and module boundaries. |

---

## 10. Recommended Modular Architecture Layout

```
src/
├── theme/                     # Design System & Apple HIG Tokens
│   ├── colors.ts              # Paleta oficial (#9B6CBA, #FAF8F5, #6A1B15, #1B5235)
│   ├── typography.ts          # SF Pro / System Font scale
│   ├── spacing.ts             # Inset Grouped margins, paddings
│   └── index.ts
├── components/                # Reusable HIG UI Components
│   ├── InsetGroupedList.tsx   # Rounded grouped table view
│   ├── InsetGroupedCell.tsx   # Row with label, value, chevron, icon
│   ├── LargeTitleHeader.tsx   # Collapsing Large Title
│   ├── SegmentedControl.tsx   # Pill-shaped animated switch
│   ├── HapticButton.tsx       # Button with expo-haptics
│   ├── StatusBadge.tsx        # Colored chip for BMI, Visceral Fat
│   └── ModalSheet.tsx         # Bottom sheet with squircle corners
├── database/                  # SQLite Local-First Engine
│   ├── db.ts                  # expo-sqlite connection & WAL setup
│   ├── migrations.ts          # DDL migrations runner
│   ├── seedData.ts            # Classical Pilates exercises seeder
│   └── repositories/          # Type-safe local repositories
│       ├── patientRepository.ts
│       ├── anamnesisRepository.ts
│       ├── postureRepository.ts
│       ├── bioimpedanceRepository.ts
│       ├── exerciseRepository.ts
│       ├── routineRepository.ts
│       └── sessionLogRepository.ts
├── services/                  # External & Infrastructure Services
│   ├── firebase.ts            # Firebase app init with espacomulher-84137
│   ├── syncService.ts         # Consolidated batch sync (Quota-Protected)
│   ├── reportGenerator.ts     # HTML/PDF clinical report compiler
│   └── shareService.ts        # WhatsApp linking & native Share Sheet
├── features/                  # Clinical Domain Features
│   ├── patients/              # Patient list, search, registration
│   ├── anamnesis/             # Pain scale, comorbidity checklist, goals
│   ├── posture/               # Alignment grid, photo guide, landmark scoring
│   ├── bioimpedance/          # Biometrics entry, temporal charts, deltas
│   ├── workouts/              # Equipment catalog, routine builder, session log
│   └── reports/               # Report preview, PDF export, WhatsApp share
└── types/                     # Strict TypeScript Domain Interfaces
    ├── patient.ts
    ├── anamnesis.ts
    ├── posture.ts
    ├── bioimpedance.ts
    ├── exercise.ts
    ├── workout.ts
    └── sync.ts
```
