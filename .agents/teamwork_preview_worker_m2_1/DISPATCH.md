## 2026-09-11T22:13:37Z

You are the M2 Database & Engine Worker (teamwork_preview_worker_m2_1).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_worker_m2_1

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md
(Focus on the latest update under "## Follow-up — 2026-09-11T22:01:09Z")
and
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md

Also read the comprehensive specifications and blueprints created by the M2 explorers:
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_spec_miner_m2_1\handoff.md
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m2_1\handoff.md
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m2_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `src/types/` (`patient.ts`, `anamnesis.ts`, `postural.ts`, `bioimpedance.ts`, `exercise.ts`, `routine.ts`, `backup.ts`, `index.ts`)
- `src/database/` (`index.ts`, `schema.ts`, `migrations.ts`, `seeds.ts`)
- `src/database/repositories/` (`patientRepository.ts`, `anamnesisRepository.ts`, `posturalRepository.ts`, `bioimpedanceRepository.ts`, `exerciseRepository.ts`, `routineRepository.ts`, `index.ts`)
- `src/utils/` (`biometrics.ts`, `formatters.ts`)
- `src/services/` (`backupService.ts`)
- `tests/` (unit tests for database schema, seeds, biometrics, formatters, and backup)

Detailed Implementation Steps:
1. `src/types/`: Define TypeScript domain interfaces for all clinical entities. Patients MUST strictly exclude CPF, Estado Civil, and CEP.
2. `src/database/schema.ts`: SQLite DDL for all 7 relational tables (`patients`, `anamnesis`, `postural_evaluations`, `bioimpedance`, `exercises`, `routines`, `routine_items`) and performance indices. Include cascading foreign keys on patient child tables and default `'Rio das Ostras - RJ'` on `patients.city_state`.
3. `src/database/seeds.ts`: Pre-seeded catalog of 49 classical Pilates and kinesitherapy exercises across all 6 apparatuses (`Mat`, `Reformer`, `Cadillac`, `Wunda Chair`, `Ladder Barrel`, `Cinesioterapia`) with Portuguese names, descriptions, default springs, and `is_custom: 0`.
4. `src/database/migrations.ts`: `PRAGMA user_version` sequential runner with atomic migration v1.
5. `src/database/index.ts`: Connection singleton enforcing `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;` upon creation.
6. `src/database/repositories/`: Typed CRUD repositories for each entity with fast search, filtering, and cascading integrity.
7. `src/utils/biometrics.ts`: Clinical BMI calculation with ABESO/WHO tiers, BMR/TMB calculation (Mifflin-St Jeor and Harris-Benedict), Ideal Weight, Target Weight, and Visceral Fat classification.
8. `src/utils/formatters.ts`: Phone/WhatsApp mask `(XX) XXXXX-XXXX`, Brazilian date parsing/formatting with timezone offset guard, and number formatters.
9. `src/services/backupService.ts`: Local JSON backup export and import with in-memory dry-run validation, atomic transaction, and topological restore.
10. `tests/`: Add unit tests covering biometrics calculations, phone/date formatters, and backup JSON validation.
11. Run verification commands:
    - `npx tsc --noEmit`
    - `npm test`
12. Write your complete handoff report to:
    c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_worker_m2_1\handoff.md
    and message parent when complete.
