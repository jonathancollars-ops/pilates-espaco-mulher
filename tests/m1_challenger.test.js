const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

describe('Milestone 1 Empirical Challenger Verification & Stress Tests', () => {

  describe('1. Clinical Metadata and Config Identifiers (app.json)', () => {
    const appJsonPath = path.join(projectRoot, 'app.json');
    assert.ok(fs.existsSync(appJsonPath), 'app.json must exist in project root');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const expo = appJson.expo;

    test('Expo app manifest core fields', () => {
      assert.equal(expo.name, 'Pilates Espaço Mulher');
      assert.equal(expo.slug, 'pilates-espaco-mulher');
      assert.equal(expo.version, '1.0.0');
      assert.equal(expo.primaryColor, '#9B6CBA');
      assert.equal(expo.userInterfaceStyle, 'light');
      assert.equal(expo.orientation, 'portrait');
      assert.equal(expo.splash.backgroundColor, '#FAF8F5');
    });

    test('Firebase credentials and Project ID: espacomulher-84137', () => {
      assert.ok(expo.extra, 'app.json must contain expo.extra');
      assert.ok(expo.extra.firebase, 'app.json must contain expo.extra.firebase');
      const fb = expo.extra.firebase;
      assert.equal(fb.projectId, 'espacomulher-84137', 'Project ID must strictly match espacomulher-84137');
      assert.equal(fb.apiKey, 'AIzaSyDTW3CGDdCnhdq5xm3kFC6DdwCDnbkUa5o');
      assert.equal(fb.authDomain, 'espacomulher-84137.firebaseapp.com');
      assert.equal(fb.storageBucket, 'espacomulher-84137.firebasestorage.app');
      assert.equal(fb.messagingSenderId, '484275307620');
      assert.equal(fb.appId, '1:484275307620:web:511b242f9ff23e703f4b71');
      assert.equal(fb.measurementId, 'G-7FZV1VKLZY');
    });

    test('Dra. Rogéria Collares clinical identity in app.json extra', () => {
      assert.ok(expo.extra.clinician, 'app.json must contain expo.extra.clinician');
      const c = expo.extra.clinician;
      assert.equal(c.name, 'Dra. Rogéria Collares');
      assert.equal(c.crefito, 'CREFITO 23093-F');
      assert.equal(c.clinic, 'Pilates Espaço Mulher');
      assert.equal(c.neighborhood, 'Costa Azul');
      assert.equal(c.city, 'Rio das Ostras');
      assert.equal(c.state, 'RJ');
      assert.equal(c.phone, '(22) 99947-4304');
    });

    test('iOS bundle identifier and clinical camera/photo permissions', () => {
      assert.equal(expo.ios.bundleIdentifier, 'com.espacomulher.pilates');
      assert.ok(expo.ios.supportsTablet === true);
      assert.ok(expo.ios.infoPlist.NSCameraUsageDescription, 'Camera description required for postural photogrammetry');
      assert.ok(expo.ios.infoPlist.NSPhotoLibraryUsageDescription, 'Photo library description required');
      assert.ok(expo.ios.infoPlist.NSPhotoLibraryAddUsageDescription, 'Photo library add description required');
    });

    test('Android package and native permissions', () => {
      assert.equal(expo.android.package, 'com.espacomulher.pilates');
      assert.ok(expo.android.permissions.includes('CAMERA'));
      assert.ok(expo.android.permissions.includes('READ_EXTERNAL_STORAGE'));
      assert.ok(expo.android.permissions.includes('WRITE_EXTERNAL_STORAGE'));
    });
  });

  describe('2. Design System Tokens Exact Specification (tokens.ts)', () => {
    const tokensFile = path.join(projectRoot, 'src', 'design-system', 'tokens.ts');
    assert.ok(fs.existsSync(tokensFile), 'tokens.ts must exist');
    const content = fs.readFileSync(tokensFile, 'utf8');

    test('Official brand color palette hex codes exact matches', () => {
      assert.match(content, /primary:\s*['"]#9B6CBA['"]/i, 'Primary lilac must be #9B6CBA');
      assert.match(content, /primaryDark:\s*['"]#7A4F94['"]/i, 'Primary Dark purple must be #7A4F94');
      assert.match(content, /surface:\s*['"]#FAF8F5['"]/i, 'Surface off-white must be #FAF8F5');
      assert.match(content, /surfaceSecondary:\s*['"]#F4EEF7['"]/i, 'Surface Secondary lavender must be #F4EEF7');
      assert.match(content, /accent:\s*['"]#6A1B15['"]/i, 'Accent wine red must be #6A1B15');
      assert.match(content, /success:\s*['"]#1B5235['"]/i, 'Success forest green must be #1B5235');
    });

    test('Apple SF Pro 11-step typography scale exact font sizes', () => {
      const expectedSizes = {
        largeTitle: 34,
        title1: 28,
        title2: 22,
        title3: 20,
        headline: 17,
        body: 17,
        callout: 16,
        subhead: 15,
        footnote: 13,
        caption1: 12,
        caption2: 11,
      };

      for (const [scale, size] of Object.entries(expectedSizes)) {
        const regex = new RegExp(`${scale}:\\s*\\{[^}]*fontSize:\\s*${size}`, 's');
        assert.match(content, regex, `Typography ${scale} must have fontSize: ${size}`);
      }
    });

    test('Apple HIG touch metrics and continuous curve radii', () => {
      assert.match(content, /card:\s*14/, 'Card radius must be 14pt (squircle)');
      assert.match(content, /minTouchTarget:\s*44/, 'HIG minimum touch target must be 44pt');
      assert.match(content, /rowMinHeight:\s*48/, 'Row minimum height must be 48pt');
      assert.match(content, /separatorIndentWithIcon:\s*58/, 'Separator indent with icon must be 58pt');
      assert.match(content, /separatorIndentWithoutIcon:\s*16/, 'Separator indent without icon must be 16pt');
    });
  });

  describe('3. Design System Barrel Exports & Completeness (src/design-system/index.ts)', () => {
    const indexPath = path.join(projectRoot, 'src', 'design-system', 'index.ts');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    const expectedModules = [
      'tokens',
      'Haptics',
      'InsetGroupedList',
      'LargeTitleHeader',
      'SegmentedControl',
      'Button',
      'Badge',
      'Card',
      'ClinicIdentity'
    ];

    test('index.ts re-exports all 9 design system submodules', () => {
      for (const mod of expectedModules) {
        const pattern = new RegExp(`export\\s+\\*\\s+from\\s+['"]\\.\\/${mod}['"]`, 'i');
        assert.ok(pattern.test(indexContent), `index.ts must export * from './${mod}'`);
      }
    });

    test('All 9 module source files physically exist on disk', () => {
      for (const mod of expectedModules) {
        const tsPath = path.join(projectRoot, 'src', 'design-system', `${mod}.ts`);
        const tsxPath = path.join(projectRoot, 'src', 'design-system', `${mod}.tsx`);
        assert.ok(
          fs.existsSync(tsPath) || fs.existsSync(tsxPath),
          `Module ${mod} must exist as .ts or .tsx`
        );
      }
    });

    test('Key symbols defined across modules', () => {
      const tokensCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'tokens.ts'), 'utf8');
      assert.ok(tokensCode.includes('export const Colors'));
      assert.ok(tokensCode.includes('export const Typography'));
      assert.ok(tokensCode.includes('export const Spacing'));
      assert.ok(tokensCode.includes('export const Radii'));
      assert.ok(tokensCode.includes('export const Shadows'));
      assert.ok(tokensCode.includes('export const Layout'));

      const hapticsCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'Haptics.ts'), 'utf8');
      assert.ok(hapticsCode.includes('export const Haptics'));
      assert.ok(hapticsCode.includes('export async function selectionAsync'));
      assert.ok(hapticsCode.includes('export async function notificationAsync'));
      assert.ok(hapticsCode.includes('export async function impactAsync'));

      const listCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'InsetGroupedList.tsx'), 'utf8');
      assert.ok(listCode.includes('export function InsetGroupedList'));
      assert.ok(listCode.includes('export function InsetGroup'));
      assert.ok(listCode.includes('export function InsetRow'));

      const headerCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'LargeTitleHeader.tsx'), 'utf8');
      assert.ok(headerCode.includes('export function LargeTitleHeader') || headerCode.includes('export function LargeTitleNavBar'));
      assert.ok(headerCode.includes('export function LargeTitleHero'));
      assert.ok(headerCode.includes('export function LargeTitleLayout'));
      assert.ok(headerCode.includes('export function useLargeTitleScroll'));

      const segCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'SegmentedControl.tsx'), 'utf8');
      assert.ok(segCode.includes('export function SegmentedControl'));

      const btnCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'Button.tsx'), 'utf8');
      assert.ok(btnCode.includes('export function Button'));

      const badgeCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'Badge.tsx'), 'utf8');
      assert.ok(badgeCode.includes('export function Badge'));

      const cardCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'Card.tsx'), 'utf8');
      assert.ok(cardCode.includes('export function Card'));

      const clinicCode = fs.readFileSync(path.join(projectRoot, 'src', 'design-system', 'ClinicIdentity.tsx'), 'utf8');
      assert.ok(clinicCode.includes('export const CLINIC_IDENTITY'));
      assert.ok(clinicCode.includes('export function ClinicIdentity'));
      assert.ok(clinicCode.includes('export async function openClinicWhatsApp'));
    });
  });

  describe('4. Circular Dependency Stress Test (DFS Cycle Detection)', () => {
    function getAllTsFiles(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllTsFiles(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(fullPath);
        }
      });
      return results;
    }

    test('Zero circular dependencies in src/design-system and src/', () => {
      const allFiles = getAllTsFiles(path.join(projectRoot, 'src'));
      const adj = new Map();
      allFiles.forEach(f => adj.set(path.resolve(f), []));

      const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;

      allFiles.forEach(file => {
        const code = fs.readFileSync(file, 'utf8');
        const dir = path.dirname(path.resolve(file));
        let match;
        while ((match = importRegex.exec(code)) !== null) {
          const importTarget = match[1];
          if (importTarget.startsWith('.')) {
            const candidates = [
              path.resolve(dir, importTarget + '.ts'),
              path.resolve(dir, importTarget + '.tsx'),
              path.resolve(dir, importTarget, 'index.ts'),
              path.resolve(dir, importTarget, 'index.tsx'),
              path.resolve(dir, importTarget)
            ];
            for (const cand of candidates) {
              if (adj.has(cand)) {
                adj.get(path.resolve(file)).push(cand);
                break;
              }
            }
          }
        }
      });

      const state = new Map(); // 0=unvisited, 1=visiting, 2=visited
      allFiles.forEach(f => state.set(path.resolve(f), 0));
      let cycleFound = null;

      function dfs(node, stack) {
        state.set(node, 1);
        stack.push(node);
        for (const neighbor of (adj.get(node) || [])) {
          if (state.get(neighbor) === 1) {
            const idx = stack.indexOf(neighbor);
            cycleFound = stack.slice(idx).concat([neighbor]);
            return true;
          }
          if (state.get(neighbor) === 0) {
            if (dfs(neighbor, stack)) return true;
          }
        }
        stack.pop();
        state.set(node, 2);
        return false;
      }

      for (const f of allFiles) {
        const p = path.resolve(f);
        if (state.get(p) === 0) {
          if (dfs(p, [])) break;
        }
      }

      assert.equal(cycleFound, null, `Circular dependency found: ${cycleFound ? cycleFound.map(x => path.basename(x)).join(' -> ') : 'none'}`);
    });
  });

  describe('5. Navigation Routes and Tab Definitions (src/navigation/index.tsx)', () => {
    const navPath = path.join(projectRoot, 'src', 'navigation', 'index.tsx');
    const content = fs.readFileSync(navPath, 'utf8');

    test('RootTabParamList contains all 5 tabs', () => {
      const requiredTabs = ['Pacientes', 'Treinos', 'Aparelhos', 'Relatórios', 'Ajustes'];
      for (const tab of requiredTabs) {
        assert.ok(content.includes(`${tab}: undefined`), `RootTabParamList must define route: ${tab}`);
      }
    });

    test('Tab.Screen mounts each of the 5 routes', () => {
      const requiredScreens = [
        'name="Pacientes"',
        'name="Treinos"',
        'name="Aparelhos"',
        'name="Relatórios"',
        'name="Ajustes"'
      ];
      for (const screen of requiredScreens) {
        assert.ok(content.includes(screen), `Tab.Navigator must mount <Tab.Screen ${screen} />`);
      }
    });

    test('Tab bar styling adheres to Apple HIG and brand theme', () => {
      assert.ok(content.includes('tabBarActiveTintColor: Colors.primary'));
      assert.ok(content.includes('tabBarInactiveTintColor: Colors.textSecondary'));
      assert.ok(content.includes('backgroundColor: Colors.surface'));
      assert.ok(content.includes('Haptics.selection()'));
    });
  });

  describe('6. Application Root & Theme Integration (App.tsx)', () => {
    const appTsxPath = path.join(projectRoot, 'App.tsx');
    const content = fs.readFileSync(appTsxPath, 'utf8');

    test('App mounts NavigationContainer with PilatesTheme', () => {
      assert.ok(content.includes('PilatesTheme: Theme'));
      assert.ok(content.includes('NavigationContainer theme={PilatesTheme}'));
      assert.ok(content.includes('StatusBar style="dark"'));
      assert.ok(content.includes('RootNavigator'));
      assert.ok(content.includes('registerRootComponent(App)'));
    });
  });

  describe('7. Clinic Identity WhatsApp Formatter & Credentials', () => {
    const clinicFile = path.join(projectRoot, 'src', 'design-system', 'ClinicIdentity.tsx');
    const content = fs.readFileSync(clinicFile, 'utf8');

    test('CLINIC_IDENTITY credentials match project requirements', () => {
      assert.match(content, /professionalName:\s*['"]Dra\. Rogéria Collares['"]/);
      assert.match(content, /crefito:\s*['"]CREFITO 23093-F['"]/);
      assert.match(content, /clinicName:\s*['"]Pilates Espaço Mulher['"]/);
      assert.match(content, /phone:\s*['"]\(22\) 99947-4304['"]/);
      assert.match(content, /phoneDigitsOnly:\s*['"]5522999474304['"]/);
      assert.match(content, /whatsAppUrl:\s*['"]https:\/\/wa\.me\/5522999474304['"]/);
      assert.match(content, /whatsAppDeepLink:\s*['"]whatsapp:\/\/send\?phone=5522999474304['"]/);
    });

    test('openClinicWhatsApp handles message encoding safely', () => {
      assert.ok(content.includes('encodeURIComponent(customMessage)'));
      assert.ok(content.includes('Linking.canOpenURL'));
      assert.ok(content.includes('Linking.openURL'));
    });
  });
});
