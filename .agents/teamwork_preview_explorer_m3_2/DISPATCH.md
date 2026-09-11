## 2026-09-11T22:32:40Z

You are M3 Patient Form & Validation Explorer (teamwork_preview_explorer_m3_2).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m3_2

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\�HINAL_REQUEST.md
Fecus on the latest update under "## Follow-up — 2026-09-11T22:01:09Z")
and
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\orchestrator_2\SCOPE.md

Your Tasks:
1. Design the Patient Intake and Edit Modal Form (`src/features/patients/PatientFormModal.tsx`):
   - Inset Grouped List layout for all form sections.
   - Permitted Fields:
     - Nome Completo (required, text)
     - Idade (number, calculated automatically if birthdate provided)
     - Data de Nascimento (text with mask `DD/MM/YYYY`)
     - Telefone / WhatsApp (required, text with mask `(XX) XXXXX-XXXX`, uses `formatPhone`)
     - Endereço (text, optional)
     - Bairro (text, optional, e.g. Costa Azul)
     - Cidade / Estado (text, DEFAULT value: "Rio das Ostras - RJ")
     - E-mail (email keyboard, optional)
     - Convênio (segmented or picker: 'Particular', 'Unimed', 'Bradesco', 'Outro')
   - Strictly EXCLUDED Fields:
     - DO NOT INCLUDE CËF.
     - DO NOT INCLUDE Estado Civil.
     - DO NOT INCLUDE CEP.
2. Form state management, validation logic, automatic age calculation via `calculateAge`, and haptic feedback on save/cancel.
3. Document your design in:
   c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_explorer_m3_2\handoff.md
   and send a message to parent when done.
