## 2026-09-11T22:32:40Z

You are M3 Patient Dashboard UI Explorer (teamwork_preview_explorer_m3_1).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m3_1

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md
(Focus on the latest update under "## Follow-up — 2026-09-11T22:01:09Z")
and
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md

Your Tasks:
1. Design the Patient Dashboard UI in `src/features/patients/`:
   - Apple HIG Inset Grouped cards for each patient.
   - Search bar with instant real-time filtering by name or phone calling `patientRepository.search(query)`.
   - Card layout displaying: Name, Phone (with `(22) 99947-4304` mask), Age/Birthdate, City/Neighborhood, Insurance badge, and status.
   - Quick action buttons/action sheet on each card:
     1. "Ver Avaliação" (navigates to clinical evaluation sheet)
     2. "Editar Cadastro" (opens edit modal)
     3. "Gerenciar Treinos" (navigates to workout routines)
     4. "Excluir" (with native `Alert.alert` confirmation and `Haptics.warning()`)
   - Empty state when no patients are found or search yields no results.
   - Prominent Apple HIG "+ Novo Paciente" button in the navigation header.
2. Provide complete component architecture, mock props, and styling adhering to the brand palette (`#9B6CBA`, `#FAF8F5`, `#6A1B15`, `#1B5235`).
3. Document your design in:
   c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m3_1\handoff.md
   and send a message to parent when done.
