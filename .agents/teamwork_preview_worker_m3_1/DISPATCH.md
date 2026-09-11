## 2026-09-11T22:42:43Z

You are the M3 Patient Dashboard & Intake Worker (teamwork_preview_worker_m3_1).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_worker_m3_1

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md
(Focus on the latest update under "## Follow-up — 2026-09-11T22:01:09Z")
and
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md

Also read the proposed designs and code from all three M3 explorers:
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m3_1\handoff.md
  (and files `proposed_PatientCard.tsx`, `proposed_PatientSearchBar.tsx`, `proposed_PatientQuickActions.tsx`, `proposed_PatientEmptyState.tsx`, `proposed_PatientStatusBadge.tsx`, `proposed_PatientsDashboardScreen.tsx`)
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m3_2\handoff.md
  (and file `proposed_PatientFormModal.tsx` — note: use `Haptics.error()` instead of `Haptics.notificationError()`)
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m3_3\handoff.md
  (and files `proposed_App.tsx`, `proposed_AppLoadingSplash.tsx`, `proposed_PatientContext.tsx`, `proposed_navigation_index.tsx`)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `src/features/patients/` (`PatientCard.tsx`, `PatientSearchBar.tsx`, `PatientQuickActions.tsx`, `PatientEmptyState.tsx`, `PatientStatusBadge.tsx`, `PatientFormModal.tsx`, `PatientsDashboardScreen.tsx`, `PatientContext.tsx`, `index.ts`)
- `src/components/AppLoadingSplash.tsx`
- `src/navigation/index.tsx`
- `App.tsx`
- `tests/` (unit and integration tests for M3)

Your Tasks:
1. Implement all components in `src/features/patients/`:
   - `PatientCard.tsx`: Apple HIG Inset Grouped card, avatar circle, masked phone with WhatsApp button, age/birthdate, neighborhood/city ("Rio das Ostras - RJ"), insurance and status badges, quick actions bar.
   - `PatientSearchBar.tsx`: Instant search field with debounce, clear button, and haptics.
   - `PatientQuickActions.tsx`: Action buttons ("Ver Avaliação", "Editar Cadastro", "Gerenciar Treinos", "Excluir" with native Alert confirmation + Haptics).
   - `PatientEmptyState.tsx`: High-polish empty state for search vs empty DB.
   - `PatientStatusBadge.tsx`: Status and Insurance chips.
   - `PatientFormModal.tsx`: PageSheet modal. Permitted fields: Nome Completo, Idade, Data de Nascimento, Telefone/WhatsApp (masked with `formatPhone`), Endereço, Bairro, Cidade/Estado (default: "Rio das Ostras - RJ"), E-mail, Convênio. EXCLUDE CPF, Estado Civil, and CEP.
   - `PatientContext.tsx`: Reactive state provider & `usePatients` hook wrapping `patientRepository`.
   - `PatientsDashboardScreen.tsx`: Complete screen with `LargeTitleLayout` ("Pacientes"), "+ Novo Paciente" action, search bar, segmented status filter, pull-to-refresh, list of cards, and clinic footer.
   - `index.ts`: Barrel export.
2. Implement `src/components/AppLoadingSplash.tsx`: Branded loading screen displaying Dra. Rogéria Collares credentials, offline badge, and loading indicator.
3. Update `App.tsx` and `src/navigation/index.tsx`:
   - App opens directly on Patients Dashboard with zero login screen.
   - Database initialization via `initDatabase(db)` or `getDatabase()`, showing `AppLoadingSplash` while loading.
   - `<PatientProvider>` root provider wrapping navigation container.
   - Navigation connects to real `PatientsDashboardScreen`.
4. Add automated test suites in `tests/` validating patient form validation, search filtering, default city/state, phone masking, and zero login startup.
5. Verify:
   - `npx tsc --noEmit` (must pass with 0 errors)
   - `npm test` (all tests must pass)
6. Write your complete handoff report to:
   c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_worker_m3_1\handoff.md
   and message parent when complete.
