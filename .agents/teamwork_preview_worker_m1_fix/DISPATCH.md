## 2026-09-11T22:04:20Z

You are the M1 Remediation Worker (teamwork_preview_worker_m1_fix).
Your working directory is:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_worker_m1_fix

You MUST read the authoritative requirements in:
c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\ORIGINAL_REQUEST.md
(Focus on the latest update under "## Follow-up — 2026-09-11T22:01:09Z")

Also read the feedback reports from the reviewers and challengers:
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_reviewer_m1_2\handoff.md
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_challenger_m1_1\handoff.md
- c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_challenger_m1_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Create `index.ts` in the project root:
   ```typescript
   import { registerRootComponent } from 'expo';
   import App from './App';

   registerRootComponent(App);
   ```
   Ensure `package.json` `"main": "index.ts"` resolves cleanly.
2. In `app.json`, remove `"expo-print"` from the `"plugins"` array because `expo-print` does not export an Expo config plugin (`app.plugin.js`) and triggers a PluginError during `expo config`.
3. In `src/design-system/InsetGroupedList.tsx`, fix the corner calculation bug in `InsetGroup`: when rendering children, iterate over `childArray` (the filtered non-falsy elements) instead of `children` with `React.Children.map`, ensuring `index === 0` and `index === totalRows - 1` are properly assigned even when conditional rows evaluate to false.
4. In `src/design-system/SegmentedControl.tsx`, add `hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}` to ensure the touch area adheres to Apple HIG >=44pt.
5. In `src/design-system/Badge.tsx`, add `accessibilityRole="button"` when `onPress` is provided.
6. Verify your work by running:
   - `npx tsc --noEmit`
   - `npx expo config --type public`
   - `node --test tests/entry_resolution.test.js`
   - `node --test tests/inset_group_edge_case.test.js`
   - `npx tsx -r ./tests/mock-rn.cjs --test tests/tier1-features/tokens.test.ts tests/tier1-features/clinic_identity.test.ts tests/tier1-features/haptics.test.ts tests/tier2-boundary/segmented_control_edge_cases.test.ts tests/tier2-boundary/inset_grouped_list_edge_cases.test.ts tests/tier5-adversarial/adversarial_stress.test.ts`
7. Write your complete handoff report to:
   c:\Users\jonat\Documents\antigravity\goofy-archimedes\.agents\teamwork_preview_worker_m1_fix\handoff.md
   and send a message to parent when complete.
