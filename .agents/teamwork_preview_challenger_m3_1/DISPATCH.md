## 2026-09-11T22:51:04Z

You are M3 Empirical Challenger 1 (teamwork_preview_challenger_m3_1).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_challenger_m3_1

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md
(Focus on the latest update under ## Follow-up — 2026-09-11T22:01:09Z)
and
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md

Also read the M3 worker handoff report:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_worker_m3_1\handoff.md

Your Tasks:
1. Adversarially stress-test and challenge the Patient Intake & Edit Form:
   - Validation on empty name or blank phone.
   - Formatting phone mask with short inputs, invalid characters, edge lengths.
   - Date parsing edge cases (e.g. leap year, invalid month/day, future birthdates).
   - Age calculation edge cases (e.g. born today, 100 years old).
   - Default city/state fallback when left blank.
   - Negative constraint: verify no CPF, Estado Civil, or CEP fields exist.
2. Write and run empirical test scripts (e.g. under 	ests/) to verify these behaviors.
3. Run 
px tsc --noEmit and 
pm test.
4. Document all findings and verdict (APPROVE or REQUEST_CHANGES) in:
   c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_challenger_m3_1\handoff.md
   and message parent when done.
