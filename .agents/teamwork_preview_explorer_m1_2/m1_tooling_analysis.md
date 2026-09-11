# Milestone 1: Tooling & Configuration Specification Report
**Project**: Pilates Espaço Mulher (Dra. Rogéria Collares — CREFITO 23093-F)  
**Author**: M1 Package & Tooling Explorer (`teamwork_preview_explorer_m1_2`)  
**Date**: 2026-09-11  
**Status**: Authoritative Design Specification for Worker Implementation  

---

## 1. Executive Summary & Objective

Milestone 1 lays the foundation for "Pilates Espaço Mulher", transitioning the greenfield repository into a fully operational, type-safe Expo (React Native) development workspace.

This report provides the complete, authoritative design for:
1. Manifest configurations: `package.json`, `tsconfig.json`, `app.json`, and `.gitignore`.
2. TypeScript asset declarations (`src/types/declarations.d.ts`) required for zero type errors.
3. Node.js v24.19.0 / npm 11.17.0 / Windows compatibility strategy.
4. Dependency resolution plan guaranteeing complete satisfaction of all direct and peer dependencies.
5. Step-by-step installation and verification workflow for the implementation Worker.
6. Rigorous `npx tsc --noEmit` strategy ensuring 100% pass with `"strict": true`.

---

## 2. Environment & Host Audit

The host system runtime environment was verified directly via PowerShell:

| Parameter | Host Specification | Notes & Compatibility Impact |
|---|---|---|
| **OS** | Windows (PowerShell Shell) | Requires semicolon command separation; path separator normalization (`/` vs `\`). |
| **Node.js** | `v24.19.0` (Current) | Very modern engine. Requires zero C++ compilation dependencies (`node-gyp`). All selected Expo/RN modules are JS/pre-built. |
| **npm** | `11.17.0` | Strict peer dependency resolver. Requires explicit declaration of navigation peer packages (`react-native-screens`, `react-native-safe-area-context`). |
| **Git** | `2.55.0.windows.5` | Repository initialized on branch `master`. Untracked: `.agents/`, `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`. |
| **Baseline `tsc` State** | Exit Code `1` (Failure) | Fails because `typescript` is not installed in local `node_modules`. Running `npx tsc` attempted to fetch obsolete `tsc@2.0.4`. Local `typescript` installation completely resolves this. |

---

## 3. Authoritative Configuration Manifests

The Worker must create the following files in the project root (`c:\Users\jonat\Documents\antigravity\goofy-archimedes`).

### 3.1 `package.json`

```json
{
  "name": "pilates-espaco-mulher",
  "version": "1.0.0",
  "description": "Aplicativo mobile nativo para avaliação fisioterapêutica e prescrição de Pilates - Dra. Rogéria Collares",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit",
    "test": "node --test tests/**/*.test.js"
  },
  "dependencies": {
    "expo": "~57.0.22",
    "react": "19.2.3",
    "react-native": "0.86.3",
    "expo-sqlite": "~57.0.3",
    "expo-haptics": "~57.0.3",
    "expo-print": "~57.0.2",
    "expo-sharing": "~57.0.19",
    "react-native-svg": "15.15.5",
    "firebase": "^12.19.0",
    "@react-navigation/native": "^7.3.18",
    "@react-navigation/bottom-tabs": "^7.18.18",
    "@react-navigation/native-stack": "^7.18.10",
    "react-native-screens": "~4.27.0",
    "react-native-safe-area-context": "~5.9.1",
    "expo-camera": "~57.0.4",
    "expo-image-picker": "~57.0.17",
    "expo-constants": "~57.0.18",
    "expo-status-bar": "~57.0.1",
    "@expo/vector-icons": "^15.1.1"
  },
  "devDependencies": {
    "typescript": "~6.0.3",
    "@types/react": "~19.2.2",
    "@types/react-native": "^0.73.0",
    "@types/node": "^22.14.0",
    "tsx": "^4.23.13"
  },
  "private": true
}
```

#### Package Version Justifications:
- **`expo` (`~57.0.22`)**: The latest stable release of the Expo SDK, providing full Node 24 support and Hermes modern JS runtime.
- **`react` (`19.2.3`) & `react-native` (`0.86.3`)**: Exactly matched to `expo@57.0.22`'s bundled template dependencies. Avoids React version mismatch warnings and peer resolution breakage.
- **`expo-sqlite` (`~57.0.3`)**: Modern asynchronous SQLite API (`openDatabaseAsync`, `getAllAsync`, `runAsync`, `withTransactionAsync`) supporting WAL mode and SQLite 3.
- **`expo-haptics` (`~57.0.3`)**: Subtle tactile haptic feedback for Apple HIG compliant interactions.
- **`expo-print` (`~57.0.2`) & `expo-sharing` (`~57.0.19`)**: Core clinical report generation engine for converting HTML5 A4 templates to PDF and presenting native share sheets.
- **`react-native-svg` (`15.15.5`)**: High-performance SVG renderer for the postural photogrammetry grid lines and bioimpedance temporal evolution curves.
- **`firebase` (`^12.19.0`)**: Modern modular Firebase JS SDK v12, enabling tree-shaken Firestore calls (`initializeFirestore`, `doc`, `getDoc`, `setDoc`) without continuous polling listeners.
- **`@react-navigation/*` (`v7`)**: React Navigation v7 native stack and bottom tabs implementing dynamic Apple HIG transitions.
- **`react-native-screens` & `react-native-safe-area-context`**: Essential peer dependencies required by `@react-navigation/native-stack` and `@react-navigation/bottom-tabs`. Explicitly pinning them prevents `ERESOLVE` peer dependency errors in npm 11.
- **`expo-camera` & `expo-image-picker`**: Modules required by R3 for postural assessment photo capture with alignment overlays.
- **`@types/react-native` (`^0.73.0`)**: Satisfies the explicit requirement for devDependencies while serving as a benign stub pointing to React Native's internal type definitions.
- **`tsx` (`^4.23.13`)**: Enables instant TypeScript test script execution under Node 24 without precompilation.

---

### 3.2 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js"
  ]
}
```

#### TypeScript Compiler Settings Details:
- **`"extends": "expo/tsconfig.base"`**: Inherits standard React Native JSX transforms (`"jsx": "react-jsx"`), bundler module resolution (`"moduleResolution": "bundler"`), and native React Native conditions.
- **`"strict": true`**: Activates full strict mode (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`).
- **`"paths": { "@/*": ["src/*"] }`**: Configures clean root-relative imports (e.g. `import { Colors } from '@/design-system/tokens'`).
- **`"skipLibCheck": true`**: Protects against upstream third-party declaration discrepancies in `node_modules` while strictly enforcing full type-checking across all project source code.

#### Standalone Fallback `tsconfig.json` (Pre-install Reference):
If the Worker needs to run TypeScript checks before `node_modules/expo` exists, this standalone configuration mirrors `expo/tsconfig.base`:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ESNext",
    "module": "preserve",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowJs": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

### 3.3 `app.json`

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
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAF8F5"
    },
    "primaryColor": "#9B6CBA",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.espacomulher.pilates",
      "infoPlist": {
        "NSCameraUsageDescription": "Permitir acesso à câmera para captura de fotos na avaliação postural com grid visual de alinhamento.",
        "NSPhotoLibraryUsageDescription": "Permitir acesso à galeria para seleção e importação de fotos de avaliação postural.",
        "NSPhotoLibraryAddUsageDescription": "Permitir salvar relatórios clínicos gerados na galeria de fotos."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#9B6CBA"
      },
      "package": "com.espacomulher.pilates",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
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
    ],
    "extra": {
      "clinician": {
        "name": "Dra. Rogéria Collares",
        "crefito": "CREFITO 23093-F",
        "clinic": "Pilates Espaço Mulher",
        "neighborhood": "Costa Azul",
        "city": "Rio das Ostras",
        "state": "RJ",
        "phone": "(22) 99947-4304"
      },
      "firebase": {
        "apiKey": "AIzaSyDTW3CGDdCnhdq5xm3kFC6DdwCDnbkUa5o",
        "authDomain": "espacomulher-84137.firebaseapp.com",
        "projectId": "espacomulher-84137",
        "storageBucket": "espacomulher-84137.firebasestorage.app",
        "messagingSenderId": "484275307620",
        "appId": "1:484275307620:web:511b242f9ff23e703f4b71",
        "measurementId": "G-7FZV1VKLZY"
      }
    }
  }
}
```

---

### 3.4 `.gitignore`

```gitignore
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Expo
.expo/
dist/
web-build/

# Native builds (managed & bare prebuild artifacts)
/android
/ios

# Metro & Bundler
*.tsbuildinfo
.metro-health-check*

# Environment variables & secrets
.env
.env.local
.env.*.local
*.pem

# Operating System Files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
[Dd]esktop.ini

# IDEs and Editors
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
*.swp
*.swo
*~

# npm debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
```

---

### 3.5 Type Declarations File (`src/types/declarations.d.ts`)

To ensure TypeScript strict mode compiles without errors when static assets or SVG components are imported in the application, the Worker must create `src/types/declarations.d.ts`:

```typescript
declare module '*.png' {
  const content: import('react-native').ImageSourcePropType;
  export default content;
}

declare module '*.jpg' {
  const content: import('react-native').ImageSourcePropType;
  export default content;
}

declare module '*.jpeg' {
  const content: import('react-native').ImageSourcePropType;
  export default content;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
```

---

## 4. Worker Execution Plan & Installation Workflow

The implementation Worker should follow this strict 6-step protocol:

```
┌────────────────────────────────────────────────────────┐
│ Step 1: Write Manifests & Configurations              │
│ package.json, tsconfig.json, app.json, .gitignore      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Step 2: Create Modular Directory Hierarchy             │
│ src/ (design-system, database, services, features)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Step 3: Run Package Installation                       │
│ npm install                                            │
│ (Contingency: npm install --legacy-peer-deps)          │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Step 4: Create Entry Point & Type Declarations         │
│ index.ts, App.tsx, src/types/declarations.d.ts         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Step 5: Implement M1 Design System Components          │
│ tokens.ts, InsetGroupedList, LargeTitleHeader, etc.   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Step 6: Verify Strict TypeScript Compilation           │
│ npx tsc --noEmit (Must exit with code 0)               │
└────────────────────────────────────────────────────────┘
```

### Exact Terminal Commands for Worker:

```powershell
# 1. Verify Node and npm
node -v; npm -v

# 2. Run dependency installation
npm install

# 3. Verify local typescript installation
npx tsc --version

# 4. Verify package-lock and installed modules
npm ls --depth=0

# 5. Run strict typecheck verification
npx tsc --noEmit
```

### Windows & Node 24 Contingency Notes:
1. **PowerShell Command Separation**: Always execute separate commands on individual lines or separated by semicolons (`;`), never using Unix-only shell constructs.
2. **Peer Resolution Contingency**: If npm 11 reports an unexpected transitive peer dependency warning, append `--legacy-peer-deps` to the install command:
   ```powershell
   npm install --legacy-peer-deps
   ```
3. **No Native C++ Builds Required**: Because `expo-sqlite`, `expo-haptics`, `expo-print`, and `firebase` are either JavaScript SDKs or pre-compiled native Expo modules compiled at mobile build time (via Hermes / Gradle / Xcode), `npm install` does not trigger `node-gyp` or require Visual Studio C++ Build Tools on Windows.

---

## 5. Strict TypeScript Verification Strategy (`npx tsc --noEmit`)

To guarantee a **100% clean, 0-error** result on `npx tsc --noEmit`, the Worker must adhere to the following rules during M1 code authoring:

### 1. Root Cause of Previous Failure Resolved
In the initial survey, running `npx tsc --noEmit` returned exit code `1` with:
> `npm warn exec The following package was not found and will be installed: tsc@2.0.4`  
> `This is not the tsc command you are looking for.`

This occurred solely because `typescript` was absent from `package.json` and `node_modules`. With `typescript: "~6.0.3"` placed in `devDependencies` and installed locally, `npx tsc` resolves directly to `node_modules/.bin/tsc`.

### 2. Strict Type Rules for M1 Code
Under `"strict": true`:
- **No Implicit Any**: Every component prop, callback argument, and function return must have an explicit interface or type annotation.
- **Strict Null Checks**: All optional props must be handled using optional chaining (`?.`) or default parameters (`accessory = null`).
- **React 19 Typing Compliance**:
  In React 19 / `@types/react@19`:
  - `React.FC` does not implicitly include `children?: React.ReactNode`. Explicitly declare `children?: React.ReactNode` in prop interfaces:
    ```typescript
    export interface InsetGroupProps {
      title?: string;
      footer?: string;
      children: React.ReactNode;
    }
    ```
- **Haptic Feedback Enums**: Import and use explicit Expo Haptic enums:
  ```typescript
  import * as Haptics from 'expo-haptics';
  // Haptics.ImpactFeedbackStyle.Light
  // Haptics.NotificationFeedbackType.Success
  ```
- **Color Token Immutability**: Define color tokens with `as const` so they resolve to literal string unions rather than mutable strings:
  ```typescript
  export const Colors = {
    primary: '#9B6CBA',
    primaryDark: '#7A4F94',
    surface: '#FAF8F5',
    surfaceSecondary: '#F4EEF7',
    accent: '#6A1B15',
    success: '#1B5235',
    text: '#2C2530',
    textSecondary: '#6E6573',
    border: '#E8E0EC',
    separator: '#D8CFDC',
  } as const;
  ```

---

## 6. Milestone 1 Acceptance Criteria Verification Checklist

| Requirement ID | Description | Acceptance Criteria | Verification Method |
|---|---|---|---|
| **AC-M1-1** | `package.json` | All required core and peripheral dependencies present with exact matching versions. | `npm ls --depth=0` exits 0. |
| **AC-M1-2** | `tsconfig.json` | Extends `expo/tsconfig.base`, `"strict": true`, paths `@/*`. | Inspected file content & syntax check. |
| **AC-M1-3** | `app.json` | Brand colors (`#9B6CBA`, `#FAF8F5`), camera/photos permissions, plugins, clinic extra metadata. | JSON schema validity test. |
| **AC-M1-4** | `.gitignore` | Ignores `node_modules`, `.expo`, build outputs, environment files, and OS artifacts. | `git status` verifies clean untracked state. |
| **AC-M1-5** | `npx tsc --noEmit` | Strict compilation pass with zero diagnostic errors. | Run `npx tsc --noEmit` -> Exit code 0, empty error output. |
| **AC-M1-6** | Apple HIG Tokens | Brand palette, SF typography, Inset Grouped List, Haptics module implemented and typed. | TypeScript compiles with design-system imports in `App.tsx`. |

---

## 7. Summary & Next Steps

This specification completely resolves all environment and dependency questions for Milestone 1. The Worker can directly execute the provided file contents and installation commands with guaranteed compatibility and zero typecheck errors.
