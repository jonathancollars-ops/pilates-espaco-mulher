## 2026-09-11T22:09:19Z

<USER_REQUEST>
You are the M2 Backup and Biometrics Explorer (teamwork_preview_explorer_m2_2).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m2_2

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md
(Focus on the latest update under "## Follow-up — 2026-09-11T22:01:09Z")
and
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md

Your Tasks:
1. Design the Local Backup and Restore engine for SQLite:
   - Export: extract all records across all tables (`patients`, `anamnesis`, `postural_evaluations`, `bioimpedance`, `exercises`, `routines`, `routine_items`) into a clean, portable, versioned JSON schema (`EspacoMulherBackupV1`).
   - Integration with `expo-sharing` and `expo-file-system` to export JSON to device files or share sheet.
   - Import: validate backup JSON structure and version, wrap in a database transaction (`withTransactionAsync`), restore all tables with foreign key integrity.
2. Design the biometric calculation and formatting utilities in `src/utils/`:
   - `biometrics.ts`:
     - BMI (IMC) calculation: `weight / ((height / 100) ** 2)` with clinical classification (Abaixo do peso, Normal, Sobrepeso, Obesidade I, II, III).
     - BMR/TMB (Taxa Metabólica Basal) calculation using Mifflin-St Jeor / Harris-Benedict formulas based on sex, age, weight, height.
     - Ideal body weight and target weight formulas.
     - Segmental fat indicators.
   - `formatters.ts`:
     - Phone/WhatsApp mask: `(XX) XXXXX-XXXX`
     - Date formatters: `DD/MM/YYYY` to/from ISO strings
     - Number formatters: kg, cm, kcal
3. Document all designs, schemas, and mathematical formulas in:
   c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m2_2\handoff.md
   and send a message to parent when done.
</USER_REQUEST>
