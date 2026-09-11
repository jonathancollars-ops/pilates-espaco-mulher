## 2026-09-11T22:09:18Z
You are the M2 Database Architecture Explorer (teamwork_preview_explorer_m2_1).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m2_1

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md
(Focus on the latest update under "## Follow-up — 2026-09-11T22:01:09Z")
and
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md

Your Tasks:
1. Inspect the Expo SDK 57 `expo-sqlite` modern asynchronous API (`openDatabaseAsync`, `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`, `withTransactionAsync`).
2. Design the database initialization and connection lifecycle in `src/database/index.ts`:
   - Enforce WAL mode: `PRAGMA journal_mode = WAL;`
   - Enforce Foreign Keys: `PRAGMA foreign_keys = ON;`
3. Design versioned migrations using `PRAGMA user_version`:
   - Reading and incrementing `user_version`.
   - Clean sequential migration pattern from version 0 to version 1 (and future extensible migrations).
4. Design the typed repository architecture under `src/database/repositories/`:
   - `patientRepository.ts`
   - `anamnesisRepository.ts`
   - `posturalRepository.ts`
   - `bioimpedanceRepository.ts`
   - `exerciseRepository.ts`
   - `routineRepository.ts`
   Provide exact TypeScript interfaces and function signatures for CRUD operations and queries (e.g. search patients by name/phone, cascade deletions, upsert anamnesis, get latest bioimpedance).
5. Document all architectural designs and implementation recommendations in:
   c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m2_1\handoff.md
   and send a message to parent when done.
