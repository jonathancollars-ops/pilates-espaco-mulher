# BRIEFING — 2026-09-11T22:18:00Z

## Mission
Investigate and design the Local Backup and Restore engine (`EspacoMulherBackupV1`) for SQLite and the biometric calculation/formatting utilities (`src/utils/biometrics.ts`, `src/utils/formatters.ts`) for Pilates Espaço Mulher.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m2_2
- Original parent: 3d5d14b3-384c-40e4-b02f-37417c3acd6c
- Milestone: M2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in src/ (provide specifications, schemas, formulas, and pseudo-code/types in handoff.md).
- Single source of truth is SQLite via `expo-sqlite`.
- Portable, versioned JSON backup format (`EspacoMulherBackupV1`) with foreign key integrity upon restore.
- Integration with `expo-sharing` and `expo-file-system`.
- Standard clinical formulas for BMI/IMC, BMR/TMB (Mifflin-St Jeor & Harris-Benedict), ideal/target weight, and segmental fat analysis.
- Consistent Brazilian formatting for phones/WhatsApp, dates, and units (kg, cm, kcal).

## Current Parent
- Conversation ID: 3d5d14b3-384c-40e4-b02f-37417c3acd6c
- Updated: not yet

## Investigation State
- **Explored paths**: `ORIGINAL_REQUEST.md`, `orchestrator_2/SCOPE.md`, `package.json`, `expo-sqlite`, `expo-sharing`, `expo-file-system`, `tests/`
- **Key findings**:
  - `expo-sqlite` ~57.0.3 supports `withTransactionAsync`, `getAllAsync`, `runAsync`, `execAsync`.
  - `expo-sharing` ~57.0.19 provides `shareAsync(url, { mimeType, dialogTitle, UTI })`.
  - `expo-file-system` 57.0.7 is available in node_modules and supports UTF-8 writing to `cacheDirectory` or `documentDirectory`.
  - For backup restore, foreign keys must be respected via strict topological insertion order (`patients` & `exercises` -> `anamnesis`, `postural_evaluations`, `bioimpedance`, `routines` -> `routine_items`) and reverse deletion order, verified with `PRAGMA foreign_key_check`.
  - Biometrics requires Mifflin-St Jeor (default) and Harris-Benedict for BMR, WHO/ABESO 6-tier BMI classification, WHO BMI-22 midpoint and Devine for ideal weight, and fat-free mass formula for target weight.
  - Date formatters must prevent the classic UTC midnight timezone subtraction bug in Brazilian timezones (UTC-3).
- **Unexplored areas**: None for M2 scope.

## Key Decisions Made
- Chose topological ordering over toggling `PRAGMA foreign_keys` inside transaction because SQLite prohibits toggling foreign keys inside an active transaction.
- Designed `EspacoMulherBackupV1` with metadata app validation, versioning, and dry-run foreign key referential integrity checks before executing DB writes.
- Adopted Mifflin-St Jeor as default BMR formula with Harris-Benedict fallback option.
- Specified Brazilian locale formatting for phone `(XX) XXXXX-XXXX`, date `DD/MM/YYYY`, and decimal commas.

## Artifact Index
- `.agents/teamwork_preview_explorer_m2_2/DISPATCH.md` — Captured task instructions
- `.agents/teamwork_preview_explorer_m2_2/progress.md` — Heartbeat log
- `.agents/teamwork_preview_explorer_m2_2/BRIEFING.md` — Agent situational awareness
- `.agents/teamwork_preview_explorer_m2_2/handoff.md` — Authoritative M2 specification and design report
