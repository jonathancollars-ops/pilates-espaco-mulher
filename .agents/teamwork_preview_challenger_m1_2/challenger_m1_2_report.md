# Milestone 1 Empirical Challenge Report: Apple HIG Design System & Core UI
**Project**: Pilates Espaço Mulher (Dra. Rogéria Collares — CREFITO 23093-F)  
**Agent**: Empirical Challenger 2 (`teamwork_preview_challenger_m1_2`)  
**Target Milestone**: Milestone 1 (M1)  
**Date**: 2026-09-11  
**Verdict**: ❌ **REQUEST_CHANGES**

---

## 1. Executive Summary & Verdict

Milestone 1 implements an extensive, high-quality Apple Human Interface Guidelines (HIG) component suite and navigation shell. The typography scale, brand color tokens, strict TypeScript typing (`tsc --noEmit`), and barrel exports are exceptionally well structured, and internal module dependencies have been empirically verified to be **completely free of circular dependencies (0 cycles)**.

However, empirical stress testing has surfaced **two critical blockers** that prevent the application from starting or loading its configuration in Expo/Metro, along with **one visual edge-case flaw** in the Inset Grouped List component:

1. **[CRITICAL BLOCKER] Unresolvable Entry Point in `package.json`**:
   `package.json` defines `"main": "index.ts"`, but `index.ts` does not exist on disk. Metro bundler and Expo CLI resolution fail immediately with:
   `ConfigError: Cannot resolve entry file: The main field defined in your package.json points to an unresolvable or non-existent path.`
2. **[CRITICAL BLOCKER] Invalid Plugin Entry `"expo-print"` in `app.json`**:
   `app.json` includes `"expo-print"` inside `"plugins"`. `expo-print` is a standard runtime client library and does **not** provide an Expo Config Plugin (`app.plugin.js`). Running `npx expo config` throws `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` and crashes with exit code 1.
3. **[MODERATE DEFECT] Falsy/Conditional Child Squircle Clipping in `InsetGroup`**:
   In `src/design-system/InsetGroupedList.tsx`, `totalRows` is computed from a filtered array, but child iteration uses `React.Children.map(children, ...)`. When leading or trailing conditional rows evaluate to `false` or `null`, `isFirst` and `isLast` indices misalign, resulting in unrounded (sharp) outer corners.

Because of the two critical blockers, **the Expo project cannot bundle or run**. Therefore, the formal empirical verdict is **REQUEST_CHANGES**.

---

## 2. Empirical Verification & Evidence Matrix

| Area / Contract | Expected | Observed | Status |
|-----------------|----------|----------|:------:|
| **Typecheck** | `tsc --noEmit` exits 0 | Exits code 0 (0 errors, 0 warnings) | ✅ PASS |
| **Design Tokens** | Brand palette `#9B6CBA`, `#7A4F94`, `#FAF8F5`, `#F4EEF7`, `#6A1B15`, `#1B5235` | Exact hex values verified | ✅ PASS |
| **Typography Scale** | Apple SF Pro 11-step scale (`largeTitle` 34pt down to `caption2` 11pt) | 100% compliant | ✅ PASS |
| **Export Integrity** | `src/design-system/index.ts` exports all 9 submodules | All 9 modules re-exported and exist on disk | ✅ PASS |
| **Circular Dependencies** | Directed Acyclic Graph (DAG) with 0 cycles | DFS analysis across `src/` confirmed 0 cycles | ✅ PASS |
| **Navigation Shell** | 5 tabs (`Pacientes`, `Treinos`, `Aparelhos`, `Relatórios`, `Ajustes`) | Defined in `RootTabParamList` and `Tab.Screen` | ✅ PASS |
| **Icons & Haptics** | Valid Ionicons and selection haptics | All 36 icons verified in Ionicons glyph map | ✅ PASS |
| **Clinical Identifiers** | Dra. Rogéria Collares, CREFITO 23093-F, Rio das Ostras, WhatsApp | Fully present in `app.json`, `tokens.ts`, `ClinicIdentity.tsx` | ✅ PASS |
| **Firebase Identifiers** | `espacomulher-84137` credentials in `app.json` extra | Exact matching credentials configured | ✅ PASS |
| **Expo Config Loading** | `npx expo config --type public` exits 0 | **Exits code 1** due to `"expo-print"` in `"plugins"` | ❌ **FAIL** |
| **Bundler Entry Point** | `@expo/config` `resolveEntryPoint` resolves valid entry | **Throws error**: `main` points to missing `index.ts` | ❌ **FAIL** |
| **InsetGroup Corners** | Squircle radii on first/last visible row when conditional rows used | Sharp corners when leading row is `false` | ⚠️ **FAIL** |

---

## 3. Detailed Failure Analysis

### Failure 1: Unresolvable Entry Point
- **File**: `package.json:5`
- **Current Value**: `"main": "index.ts"`
- **Observed**: `index.ts` does not exist in the project root. Root component registration is performed in `App.tsx` (`registerRootComponent(App)`).
- **Reproduction**:
  ```powershell
  node --test tests/entry_resolution.test.js
  ```
- **Error Output**:
  ```
  ConfigError: Cannot resolve entry file: The `main` field defined in your `package.json` points to an unresolvable or non-existent path.
      at resolveEntryPoint (.../node_modules/@expo/config/build/Paths/paths.js:103:13)
  ```
- **Blast Radius**: Prevents `expo start`, `expo export`, Metro bundling, and all downstream mobile test harnesses.
- **Required Fix**:
  Create `index.ts` in project root:
  ```typescript
  import registerRootComponent from 'expo/src/launch/registerRootComponent';
  import App from './App';

  registerRootComponent(App);
  ```
  Or change `package.json` `"main"` to `"App.tsx"` or `"expo/AppEntry.js"`.

---

### Failure 2: Invalid Config Plugin `"expo-print"` in `app.json`
- **File**: `app.json:50`
- **Current Value**: `"plugins": [ "expo-sqlite", [...], [...], "expo-print" ]`
- **Observed**: `expo-print` does not export an `app.plugin.js`. It is a client API module (`build/Print.js`). When Expo CLI parses `app.json`, `@expo/config-plugins` attempts to evaluate the package's main entry, pulling in `expo-modules-core/src/index.ts` which crashes Node's loader with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.
- **Reproduction**:
  ```powershell
  npx expo config --type public
  ```
- **Error Output**:
  ```
  PluginError: Stripping types is currently unsupported for files under node_modules, for "...\node_modules\expo-modules-core\src\index.ts"
  No "app.plugin.{js,cjs,mjs,ts,cts,mts}" file was found in "expo-print", so the package's main entry was loaded instead.
  ```
- **Blast Radius**: Any command utilizing `@expo/config` (including `npx expo prebuild`, `npx expo config`, and `expo start`) immediately aborts with error code 1.
- **Required Fix**:
  Remove `"expo-print"` from the `"plugins"` array in `app.json`. (`expo-print` does not need native plugin hooks in Expo managed workflow).

---

### Failure 3: Conditional Children Squircle Corner Bug in `InsetGroup`
- **File**: `src/design-system/InsetGroupedList.tsx:78-107`
- **Observed**:
  ```typescript
  const childArray = React.Children.toArray(children).filter(Boolean);
  const totalRows = childArray.length;
  ...
  {React.Children.map(children, (child, index) => {
    ...
    const isFirst = index === 0;
    const isLast = index === totalRows - 1;
  ```
  When a user writes:
  ```tsx
  <InsetGroup>
    {showAdmin && <InsetRow label="Admin" />}
    <InsetRow label="Paciente" />
    <InsetRow label="Histórico" />
  </InsetGroup>
  ```
  If `showAdmin` is `false`, `children` index 0 is `false`. The first rendered element (`Paciente`) receives `index = 1`. Consequently, `isFirst` is `1 === 0` (`false`). `Paciente` will NOT receive `borderTopLeftRadius = 14` / `borderTopRightRadius = 14`.
- **Reproduction**:
  ```powershell
  node --test tests/inset_group_edge_case.test.js
  ```
- **Required Fix**:
  Map over `childArray` rather than `children`:
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

## 4. Test Suite Execution Summary

We created 4 dedicated test suites to empirically stress-test the delivery:
1. `tests/m1_challenger.test.js`: 18 tests covering tokens, typography, radii, touch targets, exports, DFS circular dependency graph, navigation tabs, and clinic identity constants. (18/18 PASSED).
2. `tests/entry_resolution.test.js`: 1 test verifying Expo entry point resolution via `@expo/config`. (FAILED as expected, reproducing Bug 1).
3. `tests/expo_config.test.js`: 1 test verifying `app.json` plugin resolution via `@expo/config`. (FAILED as expected, reproducing Bug 2).
4. `tests/inset_group_edge_case.test.js`: 1 test verifying conditional children handling in `InsetGroup`. (Reproduced squircle calculation flaw).

Full test runner results (`npm test`):
```
ℹ tests 21
ℹ suites 11
ℹ pass 19
ℹ fail 2
ℹ duration_ms 1669.1585
```

---

## 5. Remedial Action Plan for M1 Worker

To achieve **APPROVE** status, the M1 Worker must apply the following minimal, targeted fixes:

1. **Fix Entry Point (`package.json` / `index.ts`)**:
   Create `index.ts` in the project root:
   ```typescript
   import registerRootComponent from 'expo/src/launch/registerRootComponent';
   import App from './App';

   registerRootComponent(App);
   ```
   *Verification*: `node --test tests/entry_resolution.test.js` exits 0.

2. **Fix `app.json` Plugins**:
   In `app.json`, remove `"expo-print"` from `"expo.plugins"`. The resulting plugins array should be:
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
     ]
   ]
   ```
   *Verification*: `npx expo config --type public` exits 0 without error, and `node --test tests/expo_config.test.js` exits 0.

3. **Fix `InsetGroup` Child Corner Mapping**:
   In `src/design-system/InsetGroupedList.tsx`, update the render loop to map over `childArray` rather than `children`.
   *Verification*: Test with conditional leading rows renders squircle corners on the first visible row.

4. **Verify Clean Suite Run**:
   Execute `npm test` and ensure all 21 tests pass with 0 failures, and `npm run typecheck` exits 0.
