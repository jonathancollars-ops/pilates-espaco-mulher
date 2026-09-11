# Milestone 1 Empirical Challenge Report: Apple HIG Design System & Core UI
**Project**: Pilates Espaço Mulher (Dra. Rogéria Collares — CREFITO 23093-F)  
**Agent**: Empirical Challenger 1 (`teamwork_preview_challenger_m1_1`)  
**Target Milestone**: Milestone 1 (M1)  
**Date**: 2026-09-11  
**Verdict**: ❌ **REQUEST_CHANGES**

---

## 1. Executive Summary & Verdict

Milestone 1 delivers a comprehensive, Apple Human Interface Guidelines (HIG) compliant design system and navigation shell for *Pilates Espaço Mulher*, tailored for Dra. Rogéria Collares.

Our empirical investigation verified the design tokens, official brand hex values, typography scale, haptic fallbacks, component edge cases, and strict TypeScript compilation (`npx tsc --noEmit` exits with code 0). We developed and executed 30 automated verification and boundary tests across 6 suites in `tests/`, all passing (30/30).

However, rigorous empirical stress testing across the project configuration and build pipeline uncovered **two critical blocking defects** and **one component rendering flaw**:
1. **[CRITICAL BLOCKER] Missing Entry Point `index.ts` defined in `package.json`**: `package.json` sets `"main": "index.ts"`, but `index.ts` does not exist in the root directory. Expo CLI bundler resolution (`resolveEntryPoint`) fails with `ConfigError`.
2. **[CRITICAL BLOCKER] Invalid Config Plugin `"expo-print"` in `app.json`**: `expo-print` does not export an `app.plugin.js`. When running `npx expo config --type public`, Expo CLI crashes with `PluginError` and exit code 1.
3. **[MODERATE FLAW] Conditional Child Index Mismatch in `InsetGroup`**: In `src/design-system/InsetGroupedList.tsx`, `totalRows` is calculated after filtering falsy children, but `React.Children.map` iterates over raw `children`. When leading rows are conditionally hidden (e.g. `{showItem && <InsetRow .../>}` evaluates to `false`), the first visible row receives index `1` instead of `0`, breaking squircle corner clipping and separator rendering.

Because the project cannot currently be launched or configured with Expo CLI, the required empirical verdict is **REQUEST_CHANGES**.

---

## 2. Empirical Verification Matrix

| Verification Area | Requirement | Test Suite & Method | Empirical Result | Status |
|---|---|---|---|:---:|
| **Brand Hex Codes** | `#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235` | `tests/tier1-features/tokens.test.ts` | All 6 hex values match official palette exactly | ✅ PASS |
| **Typography Scale** | Apple SF Pro 11-step scale (largeTitle 34pt down to caption2 11pt) | `tests/tier1-features/tokens.test.ts` | Exact fontSize, lineHeight, and fontWeight matched | ✅ PASS |
| **Touch & Layout Metrics** | 44pt min touch target, 48pt row min height, 14pt card squircle, 58pt/16pt separator indents | `tests/tier1-features/tokens.test.ts` | All HIG metrics present and verified | ✅ PASS |
| **CLINIC_IDENTITY** | Dra. Rogéria Collares, CREFITO 23093-F, Costa Azul, Rio das Ostras, (22) 99947-4304 | `tests/tier1-features/clinic_identity.test.ts` | All credentials, WhatsApp deep link & web fallback verified | ✅ PASS |
| **Haptic Feedback** | Taptic Engine triggers + Web vibration fallback + Safe headless degradation | `tests/tier1-features/haptics.test.ts` | Selection, success, warning, error, impact light/medium/heavy verified | ✅ PASS |
| **SegmentedControl: Empty Tabs** | `values: []` | `tests/tier2-boundary/segmented_control_edge_cases.test.ts` | Safe container returned, 0 division avoided, no crash | ✅ PASS |
| **SegmentedControl: Single Tab** | `values: ['Apenas Um']` | `tests/tier2-boundary/segmented_control_edge_cases.test.ts` | 1 tab rendered, width computed, press handled | ✅ PASS |
| **SegmentedControl: Long Labels** | Long text string | `tests/tier2-boundary/segmented_control_edge_cases.test.ts` | Constrained to 1 line (`numberOfLines={1}`) with ellipsis | ✅ PASS |
| **SegmentedControl: Out-of-Bounds** | `selectedIndex` -1, 999 | `tests/tier2-boundary/segmented_control_edge_cases.test.ts` | Clamping math prevents NaN and out-of-bounds error | ✅ PASS |
| **InsetGroupedList: 0 Rows** | Empty children `[]` | `tests/tier2-boundary/inset_grouped_list_edge_cases.test.ts` | Renders container, header, footer safely without crash | ✅ PASS |
| **InsetGroupedList: 1 Row** | Single `<InsetRow />` | `tests/tier2-boundary/inset_grouped_list_edge_cases.test.ts` | `isFirst: true`, `isLast: true`, 14pt squircle all 4 corners, no separator | ✅ PASS |
| **InsetGroupedList: 50 Rows** | 50 rows stress test | `tests/tier2-boundary/inset_grouped_list_edge_cases.test.ts` | First row: top corners; Middle: no radius + 58/16pt separator; Last: bottom corners | ✅ PASS |
| **InsetRow: Destructive** | Wine red label & warning haptics | `tests/tier2-boundary/inset_grouped_list_edge_cases.test.ts` | Label color is `#6A1B15`, press triggers warning haptics | ✅ PASS |
| **Button, Card, Badge Stress** | Loading, disabled, hitSlop, variant styles, LargeTitle rubber banding | `tests/tier5-adversarial/adversarial_stress.test.ts` | All 8 adversarial scenarios passed | ✅ PASS |
| **TypeScript Compilation** | Strict typecheck (`npx tsc --noEmit`) | Shell execution in project root | Exits with code 0 (0 diagnostic errors, 0 warnings) | ✅ PASS |
| **Expo Entry Resolution** | Entry file resolution via `@expo/config` | `node --test tests/entry_resolution.test.js` | Throws `ConfigError: Cannot resolve entry file` | ❌ **FAIL** |
| **Expo CLI Config** | `npx expo config --type public` | Shell execution in project root | Exits with code 1 (`PluginError` on `expo-print`) | ❌ **FAIL** |
| **InsetGroup Conditional Children** | Conditional row handling (`{cond && <Row />}`) | `node --test tests/inset_group_edge_case.test.js` | `isFirst` and `isLast` index mismatch with conditional rows | ⚠️ **FAIL** |

---

## 3. Detailed Failure Findings

### Finding 1: [CRITICAL] Unresolvable Entry Point in `package.json`
- **Location**: `package.json:5`
- **Code**: `"main": "index.ts"`
- **Observed Behavior**: `index.ts` does not exist in the root directory. Root registration is placed in `App.tsx` (`registerRootComponent(App)`).
- **Reproduction**:
  ```powershell
  node --test tests/entry_resolution.test.js
  ```
- **Error Output**:
  ```
  ConfigError: Cannot resolve entry file: The `main` field defined in your `package.json` points to an unresolvable or non-existent path.
      at resolveEntryPoint (.../node_modules/@expo/config/build/Paths/paths.js:103:13)
  ```
- **Blast Radius**: Prevents `npx expo start`, `npx expo export`, and any mobile dev server from starting.
- **Remediation**:
  Create `index.ts` in the project root:
  ```typescript
  import registerRootComponent from 'expo/src/launch/registerRootComponent';
  import App from './App';

  registerRootComponent(App);
  ```
  Or adjust `"main"` in `package.json` to `"App.tsx"`.

---

### Finding 2: [CRITICAL] Invalid Config Plugin `"expo-print"` in `app.json`
- **Location**: `app.json:50`
- **Code**:
  ```json
  "plugins": [
    "expo-sqlite",
    [
      "expo-camera",
      {
        "cameraPermission": "Permitir acesso à câmera para captura de fotos de avaliação postural com grid de alinhamento."
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "Permitir acesso à galeria para importação de fotos de avaliação postural."
      }
    ],
    "expo-print"
  ]
  ```
- **Observed Behavior**: `expo-print` does not supply an `app.plugin.js`. When `@expo/config` evaluates the plugins array, it attempts to load `expo-print`'s main entry point, triggering `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` and crashing.
- **Reproduction**:
  ```powershell
  npx expo config --type public
  ```
- **Error Output**:
  ```
  PluginError: Stripping types is currently unsupported for files under node_modules, for ".../node_modules/expo-modules-core/src/index.ts"
  No "app.plugin.{js,cjs,mjs,ts,cts,mts}" file was found in "expo-print", so the package's main entry was loaded instead.
  ```
- **Blast Radius**: Blocks all Expo CLI tooling, including configuration loading, prebuild, and bundler initialization.
- **Remediation**:
  Remove `"expo-print"` from `"plugins"` in `app.json`. `expo-print` is an autolinked runtime library and does not need a config plugin.

---

### Finding 3: [MODERATE] `InsetGroup` Squircle Corner Misalignment on Conditional Children
- **Location**: `src/design-system/InsetGroupedList.tsx:78-107`
- **Observed Behavior**:
  `totalRows` is calculated using:
  ```typescript
  const childArray = React.Children.toArray(children).filter(Boolean);
  const totalRows = childArray.length;
  ```
  However, child cloning uses:
  ```typescript
  {React.Children.map(children, (child, index) => {
    ...
    const isFirst = index === 0;
    const isLast = index === totalRows - 1;
  ```
  If `children` contains conditional expressions like `{showBadge && <InsetRow ... />}`, and `showBadge` is `false`, `child` at index `0` is `false`. The first rendered `InsetRow` receives `index = 1`. Therefore, `isFirst` is `1 === 0` (`false`), and the top corners of the group card remain unrounded (sharp).
- **Reproduction**:
  ```powershell
  node --test tests/inset_group_edge_case.test.js
  ```
- **Remediation**:
  Map over `childArray` instead of `children`:
  ```typescript
  {childArray.map((child, index) => {
    if (!React.isValidElement(child)) return child;
    const isFirst = index === 0;
    const isLast = index === totalRows - 1;
    const existingProps = child.props as InsetRowProps;
    return React.cloneElement(child as React.ReactElement<InsetRowProps>, {
      isFirst: existingProps.isFirst ?? isFirst,
      isLast: existingProps.isLast ?? isLast,
    });
  })}
  ```

---

## 4. Test Suite Execution Logs

Challenger 1 executed the complete suite of 30 tests across 6 test specifications in `tests/`:

```powershell
npx tsx -r ./tests/mock-rn.cjs --test tests/tier1-features/tokens.test.ts tests/tier1-features/clinic_identity.test.ts tests/tier1-features/haptics.test.ts tests/tier2-boundary/segmented_control_edge_cases.test.ts tests/tier2-boundary/inset_grouped_list_edge_cases.test.ts tests/tier5-adversarial/adversarial_stress.test.ts
```

**Output**:
```
▶ Professional Clinic Identity — Dra. Rogéria Collares Specifications
  ✔ Exact Professional Credential Strings in CLINIC_IDENTITY (2.5692ms)
  ✔ openClinicWhatsApp URL generation and execution (1.2935ms)
  ✔ ClinicIdentity component variations render without crashing (1.549ms)
✔ Professional Clinic Identity — Dra. Rogéria Collares Specifications (8.9337ms)
▶ Haptic Feedback Engine — Safe Fallbacks & Native Taptic Triggers
  ✔ Native iOS Taptic Triggers Dispatch Correct Types (3.8818ms)
  ✔ Semantic Convenience Methods on Haptics Object (1.0887ms)
  ✔ Web Vibration Fallback Mechanics when Platform.OS is web (2.8944ms)
  ✔ Silent Degradation when hardware or browser vibration is unavailable (1.1975ms)
✔ Haptic Feedback Engine — Safe Fallbacks & Native Taptic Triggers (13.1119ms)
▶ Design System Tokens — Exact Specifications & HIG Compliance
  ✔ Exact Official Brand Hex Values (2.3496ms)
  ✔ Apple SF Pro 11-Step Typography Scale (0.8748ms)
  ✔ Apple HIG Layout & Touch Targets (0.3989ms)
  ✔ Spacing and Radii Hierarchy Completeness (0.3472ms)
✔ Design System Tokens — Exact Specifications & HIG Compliance (7.7469ms)
▶ InsetGroupedList — Boundary Values & Edge Cases (0, 1, 50 rows)
  ✔ Edge Case 1: InsetGroup with 0 rows (empty group) (6.1222ms)
  ✔ Edge Case 2: InsetGroup with exactly 1 row (single item) (3.776ms)
  ✔ Edge Case 3: InsetGroup with 50 rows (large stress-test dataset) (11.4336ms)
  ✔ Edge Case 4: Destructive InsetRow styling and warning haptics (1.4026ms)
  ✔ Edge Case 5: Falsy and null children in InsetGroup handled safely (1.2952ms)
✔ InsetGroupedList — Boundary Values & Edge Cases (0, 1, 50 rows) (27.9497ms)
▶ SegmentedControl — Boundary Values & Adversarial Edge Cases
  ✔ Edge Case 1: Empty Tabs array (values: []) (8.0357ms)
  ✔ Edge Case 2: Single Tab (values: ["Apenas Um"]) (2.453ms)
  ✔ Edge Case 3: Long String Labels Truncation (numberOfLines = 1) (1.2585ms)
  ✔ Edge Case 4: Out of bounds selectedIndex (-1, 999) (1.6101ms)
  ✔ Edge Case 5: Disabled state prevents press and haptics (2.6668ms)
  ✔ Edge Case 6: Numeric and String Badges Rendering (1.451ms)
✔ SegmentedControl — Boundary Values & Adversarial Edge Cases (23.3461ms)
▶ Adversarial Stress Testing — Button, Card, Badge, LargeTitle
  ✔ Button: Loading state suppresses onPress and haptics (5.1249ms)
  ✔ Button: Disabled state suppresses onPress and haptics (0.7953ms)
  ✔ Button: Small size touch ergonomics applies hitSlop (2.7036ms)
  ✔ Button: Destructive variant triggers warning haptics by default (1.3301ms)
  ✔ Card: Resilient to missing headers and footers (2.073ms)
  ✔ Card: Elevated, outlined, and filled variant styles (1.0112ms)
  ✔ Badge: Variant themes and style types (4.3101ms)
  ✔ LargeTitle: Hero and NavBar animated components handle extreme offsets (2.3322ms)
✔ Adversarial Stress Testing — Button, Card, Badge, LargeTitle (24.3172ms)
ℹ tests 30
ℹ suites 6
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1242.0621
```

TypeScript compilation verification:
```powershell
npx tsc --noEmit
```
**Result**: Exited with code 0. Zero diagnostic errors.

---

## 5. Required Actions for Approval

1. **Create `index.ts`** in the project root registering `App` via `registerRootComponent(App)` so that `"main": "index.ts"` in `package.json` resolves cleanly.
2. **Remove `"expo-print"`** from `"plugins"` array in `app.json`.
3. **Update `InsetGroup`** in `src/design-system/InsetGroupedList.tsx` to map over `childArray` rather than `children`.
4. Verify that `npm test` and `npx expo config --type public` both exit with code 0 without any errors.
