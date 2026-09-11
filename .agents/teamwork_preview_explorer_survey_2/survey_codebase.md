# Codebase & Dependency Survey Report: Pilates Espaço Mulher

**Project**: Pilates Espaço Mulher (Dra. Rogéria Collares - CREFITO 23093-F)  
**Surveyed Directory**: `c:\Users\jonat\Documents\antigravity\goofy-archimedes`  
**Inspector**: Explorer 2 (Codebase & Dependency Inspector)  
**Date**: 2026-09-11  
**Status**: Greenfield Repository (Unscaffolded)

---

## 1. Executive Summary & Baseline Project State

The project directory at `c:\Users\jonat\Documents\antigravity\goofy-archimedes` is currently an uninitialized, greenfield workspace. A Git repository exists with an empty initial commit, but no application code, package manifests, or compiler configurations have been initialized yet.

### Current File Inventory
```
c:\Users\jonat\Documents\antigravity\goofy-archimedes\
├── .agents/                                # Multi-agent orchestration metadata
├── .git/                                   # Git repository root
└── ORIGINAL_REQUEST.md                     # Authoritative user requirements & clinical specifications
```

### Manifest & Configuration Status
| File / Config | Status | Observation |
|---|---|---|
| `package.json` | **MISSING** | No project manifest or dependency declarations exist. |
| `package-lock.json` | **MISSING** | No locked package tree exists. |
| `node_modules/` | **MISSING** | No npm dependencies are installed locally. |
| `tsconfig.json` | **MISSING** | No TypeScript compiler configuration exists. |
| `app.json` / `app.config.js` | **MISSING** | No Expo manifest exists. |
| `babel.config.js` | **MISSING** | No Babel configuration exists. |
| `metro.config.js` | **MISSING** | No Metro bundler configuration exists. |
| Source code (`src/` or `app/`) | **MISSING** | No source files, components, or screens exist. |

### Git State
- **Branch**: `master`
- **Initial Commit**: `2b2e2fcb16056e378528e3f6578929327686e85f` (`Initial commit`, empty commit)
- **Untracked files**: `.agents/`, `ORIGINAL_REQUEST.md`

---

## 2. Environment & Tooling Audit

A verification of the host system's runtime and package managers yielded the following active environment:

| Tool | Version | Status |
|---|---|---|
| **Node.js** | `v24.19.0` | Installed & active |
| **npm** | `11.17.0` | Installed & active |
| **Git** | `2.55.0.windows.5` | Installed & active |
| **Global npm modules** | `@expo/ngrok@4.1.3`, `n8n@2.30.7`, `qrcode@1.5.4` | No global `expo-cli` or `typescript` |

### TypeScript Compilation Test (`npx tsc --noEmit`)
- **Execution**: Run from project root `c:\Users\jonat\Documents\antigravity\goofy-archimedes`.
- **Exit Code**: `1` (Failure)
- **Output / Diagnostic**:
  ```
  npm warn exec The following package was not found and will be installed: tsc@2.0.4
  npm warn deprecated tsc@2.0.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
  This is not the tsc command you are looking for.
  To get access to the TypeScript compiler, tsc, from the command line either:
  - Use npm install typescript to first add TypeScript to your project before using npx
  ```
- **Finding**: Because `typescript` is not installed locally in `node_modules`, `npx tsc` fails by trying to download the legacy npm placeholder `tsc` package. `typescript` and `@types/*` must be added as devDependencies.

---

## 3. Requirement-to-Package Gap Analysis

To fulfill all requirements set forth in `ORIGINAL_REQUEST.md`, the following packages are required and were audited against the current npm registry:

| Requirement Area | Target Package | Role & Justification | Current Local State | npm Registry Version (Latest) |
|---|---|---|---|---|
| **Core Framework** | `expo` | Managed React Native framework | **Missing** | `~57.0.22` |
| **Core Framework** | `react` | UI component runtime | **Missing** | `~19.3.0` |
| **Core Framework** | `react-native` | Native mobile bridge | **Missing** | `~0.87.1` |
| **R1. Apple HIG Navigation** | `@react-navigation/native`<br>`@react-navigation/native-stack`<br>`@react-navigation/bottom-tabs`<br>`react-native-screens`<br>`react-native-safe-area-context` | Native tab & stack navigation compliant with Apple Human Interface Guidelines | **Missing** | `^7.3.18`<br>`^7.18.10`<br>`^7.18.18`<br>`^4.27.0`<br>`^5.9.1` |
| **R1. Tactile Feedback** | `expo-haptics` | Subtle tactile haptic feedback for selections, saves, deletions | **Missing** | `~57.0.3` |
| **R1. Icons & Styling** | `@expo/vector-icons` | SF-style / Ionicons symbols for HIG UI | **Missing** | `^15.1.1` |
| **R2. Local-First Engine** | `expo-sqlite` | Local SQLite database as Single Source of Truth | **Missing** | `~57.0.3` |
| **R2. Quota-Safe Sync** | `firebase` | Firebase JS SDK for quota-protected Firestore sync (`espacomulher-84137`) | **Missing** | `^12.19.0` |
| **R3. Postural Evaluation** | `expo-camera`<br>`expo-image-picker` | Photo capture and gallery selection for postural analysis | **Missing** | `~57.0.4`<br>`~57.0.17` |
| **R3. Grid & Charts** | `react-native-svg` | Alignment plumb-line grid overlay & temporal bioimpedance charts | **Missing** | `~15.15.5` |
| **R5. Clinical Reports** | `expo-print` | PDF generation from clinical HTML templates with clinic signature | **Missing** | `~57.0.2` |
| **R5. Report Sharing** | `expo-sharing` | Native sharing sheet for clinical PDF reports | **Missing** | `~57.0.19` |
| **Dev / Type Safety** | `typescript`<br>`@types/react`<br>`@types/react-native` | Strict typechecking (`npx tsc --noEmit`) | **Missing** | `^5.7.0` or `^7.0.2`<br>`^19.3.0`<br>`^0.73.0` |

---

## 4. Required Scaffolding Specifications

To transition the project from greenfield to an operational state, the following configuration files and structures must be created in Phase 1:

### 4.1 `package.json` Specification
```json
{
  "name": "pilates-espaco-mulher",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~57.0.22",
    "expo-camera": "~57.0.4",
    "expo-constants": "~57.0.18",
    "expo-haptics": "~57.0.3",
    "expo-image-picker": "~57.0.17",
    "expo-print": "~57.0.2",
    "expo-sharing": "~57.0.19",
    "expo-sqlite": "~57.0.3",
    "expo-status-bar": "~57.0.1",
    "firebase": "^12.19.0",
    "react": "19.3.0",
    "react-native": "0.87.1",
    "react-native-safe-area-context": "5.9.1",
    "react-native-screens": "4.27.0",
    "react-native-svg": "15.15.5",
    "@react-navigation/native": "^7.3.18",
    "@react-navigation/native-stack": "^7.18.10",
    "@react-navigation/bottom-tabs": "^7.18.18",
    "@expo/vector-icons": "^15.1.1"
  },
  "devDependencies": {
    "@types/react": "~19.3.0",
    "typescript": "^5.7.3"
  },
  "private": true
}
```

### 4.2 `app.json` Specification
```json
{
  "expo": {
    "name": "Pilates Espaço Mulher",
    "slug": "pilates-espaco-mulher",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "backgroundColor": "#FAF8F5"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.espacomulher.pilates"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#9B6CBA"
      },
      "package": "com.espacomulher.pilates"
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Permitir acesso à câmera para captura de fotos de avaliação postural."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Permitir acesso à galeria para importação de fotos de avaliação postural."
        }
      ],
      "expo-sqlite"
    ]
  }
}
```

### 4.3 `tsconfig.json` Specification
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ]
}
```

### 4.4 Recommended Modular Source Structure (`src/`)
```
src/
├── design-system/                  # Apple HIG tokens, components, colors
│   ├── tokens/
│   │   ├── colors.ts              # #9B6CBA, #FAF8F5, #6A1B15, #1B5235
│   │   ├── typography.ts          # SF Pro / System scale, Large Titles
│   │   └── spacing.ts             # HIG 8pt grid, standard insets
│   └── components/
│       ├── InsetGroupedList.tsx    # iOS Inset Grouped layout container
│       ├── LargeHeader.tsx        # Dynamic collapsable Large Title
│       ├── SegmentedControl.tsx   # iOS style segment switch
│       └── HighlightBadge.tsx     # Status/indicator tags
├── database/                       # Local-First SQLite Database Engine
│   ├── connection.ts              # openDatabaseAsync init
│   ├── schema.ts                  # DDL tables & indexes
│   ├── migrations.ts              # Schema version migration runner
│   └── repositories/              # PatientRepo, EvaluationRepo, RoutineRepo
├── services/                       # External services & sync
│   ├── firebase.ts                # Firebase config (espacomulher-84137)
│   ├── syncManager.ts             # Dirty flags, batch Firestore writes, on-demand sync
│   └── reportGenerator.ts         # HTML-to-PDF template with Dra. Rogéria branding
├── features/                       # Clinical business modules
│   ├── patients/                  # Registration, list, search, anamnesis
│   ├── evaluation/                # Postural static/dynamic grid & bioimpedance charts
│   ├── pilates/                   # Equipment catalog & custom workout prescription
│   └── reports/                   # Clinical summary view & PDF/WhatsApp share
├── navigation/                     # App tab navigator & stack navigation
│   ├── RootNavigator.tsx
│   └── TabNavigator.tsx
└── types/                          # Core TypeScript domain models
    ├── patient.ts
    ├── evaluation.ts
    ├── pilates.ts
    └── sync.ts
```

---

## 5. Summary of Findings & Implementation Prerequisites

1. **Current State**: Greenfield repository. Zero dependencies currently installed.
2. **Immediate Blocker for `tsc --noEmit`**: Lack of local `typescript` package and `tsconfig.json`.
3. **Compatibility Verified**: The host machine (Node.js 24.19.0, npm 11.17.0, Windows) is fully compatible with Expo 57 and modern React 19.
4. **Implementation Path**:
   - Create `package.json`, `tsconfig.json`, `app.json`.
   - Run `npm install` to establish the dependency lock and enable `npx tsc --noEmit`.
   - Scaffold the modular folder structure under `src/`.
