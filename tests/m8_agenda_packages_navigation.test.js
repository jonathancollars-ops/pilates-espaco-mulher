/**
 * Test Suite: tests/m8_agenda_packages_navigation.test.js
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Milestone 8: 4-Tab Navigation Experience, Agenda Module (Appointments & Timeline),
 * and Session Packages Management with Renewal Alerts & Attendance Tracking.
 */

require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

const { appointmentRepository } = require('../src/database/repositories/appointmentRepository.ts');
const { packageRepository } = require('../src/database/repositories/packageRepository.ts');
const { patientRepository } = require('../src/database/repositories/patientRepository.ts');

/**
 * Creates an in-memory transactional mock database for testing repository queries.
 */
function createMockDb() {
  const tables = {
    patients: new Map(),
    appointments: new Map(),
    package_plans: new Map(),
  };

  return {
    tables,
    async withTransactionAsync(task) {
      await task();
    },
    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT INTO PATIENTS')) {
        const [id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, status, created_at, updated_at] = params;
        tables.patients.set(id, { id, name, birthdate, age, phone, address, neighborhood, city_state, email, insurance, status, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO APPOINTMENTS')) {
        const [id, patient_id, patient_name, date, start_time, end_time, status, type, notes, created_at, updated_at] = params;
        tables.appointments.set(id, { id, patient_id, patient_name, date, start_time, end_time, status, type, notes, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('INSERT INTO PACKAGE_PLANS')) {
        const [id, patient_id, total_sessions, completed_sessions, start_date, expiration_date, status, price_cents, notes, created_at, updated_at] = params;
        tables.package_plans.set(id, { id, patient_id, total_sessions, completed_sessions, start_date, expiration_date, status, price_cents, notes, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('UPDATE APPOINTMENTS SET STATUS = ?, UPDATED_AT = ? WHERE ID = ?')) {
        const [status, updated_at, id] = params;
        const app = tables.appointments.get(id);
        if (app) {
          tables.appointments.set(id, { ...app, status, updated_at });
          return { lastInsertRowId: 1, changes: 1 };
        }
      }

      if (trimmed.startsWith('DELETE FROM APPOINTMENTS WHERE ID = ?')) {
        const [id] = params;
        return { lastInsertRowId: 0, changes: tables.appointments.delete(id) ? 1 : 0 };
      }

      if (trimmed.startsWith('DELETE FROM PACKAGE_PLANS WHERE ID = ?')) {
        const [id] = params;
        return { lastInsertRowId: 0, changes: tables.package_plans.delete(id) ? 1 : 0 };
      }

      return { lastInsertRowId: 1, changes: 1 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT NAME FROM PATIENTS WHERE ID = ?')) {
        const [id] = params;
        const p = tables.patients.get(id);
        return p ? { name: p.name } : null;
      }

      if (trimmed.startsWith('SELECT * FROM APPOINTMENTS WHERE ID = ?')) {
        const [id] = params;
        return tables.appointments.get(id) || null;
      }

      if (trimmed.startsWith('SELECT * FROM PACKAGE_PLANS WHERE ID = ?')) {
        const [id] = params;
        return tables.package_plans.get(id) || null;
      }

      if (trimmed.includes('FROM APPOINTMENTS') && trimmed.includes('PATIENT_ID = ?') && trimmed.includes('COUNT(*)')) {
        const [patientId] = params;
        const patientApps = Array.from(tables.appointments.values()).filter((a) => a.patient_id === patientId);
        const total = patientApps.length;
        const attended = patientApps.filter((a) => a.status === 'attended').length;
        const absent = patientApps.filter((a) => a.status === 'absent').length;
        const cancelled = patientApps.filter((a) => a.status === 'cancelled').length;
        return { total, attended, absent, cancelled };
      }

      return null;
    },

    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.includes('FROM PACKAGE_PLANS PP') && trimmed.includes('JOIN PATIENTS P')) {
        return Array.from(tables.package_plans.values()).map((pkg) => {
          const patient = tables.patients.get(pkg.patient_id);
          return {
            ...pkg,
            patient_name: patient ? patient.name : 'Paciente',
            patient_phone: patient ? patient.phone : '',
          };
        });
      }

      if (trimmed.includes('FROM PACKAGE_PLANS') && trimmed.includes("STATUS = 'ACTIVE'")) {
        return Array.from(tables.package_plans.values()).filter((p) => p.status === 'active');
      }

      if (trimmed.startsWith('SELECT * FROM PACKAGE_PLANS')) {
        return Array.from(tables.package_plans.values());
      }

      if (trimmed.includes('FROM APPOINTMENTS WHERE DATE = ?')) {
        const [date] = params;
        return Array.from(tables.appointments.values())
          .filter((a) => a.date === date)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
      }

      return [];
    },
  };
}

describe('M8 4-Tab Navigation, Agenda & Session Packages Suite', () => {
  let mockDb;
  const testPatientId = 'patient-m8-test-uuid';

  beforeEach(() => {
    mockDb = createMockDb();
    mockDb.tables.patients.set(testPatientId, {
      id: testPatientId,
      name: 'Camila Fernandes M8',
      phone: '(22) 99876-5432',
      status: 'active',
      neighborhood: 'Costa Azul',
      city_state: 'Rio das Ostras - RJ',
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Navigation Shell & 4 Official Tabs Architecture
  // ---------------------------------------------------------------------------
  describe('1. Navigation Shell & 4 Official Tabs Architecture', () => {
    const navPath = path.join(projectRoot, 'src', 'navigation', 'index.tsx');
    assert.ok(fs.existsSync(navPath), 'src/navigation/index.tsx must exist');
    const content = fs.readFileSync(navPath, 'utf8');

    test('RootTabParamList declares the 4 official tabs', () => {
      assert.ok(content.includes('Agenda: undefined;'), 'RootTabParamList must define Agenda');
      assert.ok(content.includes('Pacientes: undefined;'), 'RootTabParamList must define Pacientes');
      assert.ok(content.includes('Treinos: undefined;'), 'RootTabParamList must define Treinos');
      assert.ok(content.includes('Sessões: undefined;'), 'RootTabParamList must define Sessões');
    });

    test('MainTabsNavigator sets initialRouteName to Agenda', () => {
      assert.match(content, /initialRouteName="Agenda"/, 'MainTabsNavigator must boot into Agenda tab');
    });

    test('Tab.Navigator mounts the 4 official visible tab screens', () => {
      assert.ok(content.includes('<Tab.Screen name="Agenda" component={AgendaTabScreen} />'));
      assert.ok(content.includes('<Tab.Screen name="Pacientes" component={PacientesTabScreen} />'));
      assert.ok(content.includes('<Tab.Screen name="Treinos" component={TreinosTabScreen} />'));
      assert.ok(content.includes('<Tab.Screen name="Sessões" component={SessoesTabScreen} />'));
    });

    test('Tab bar icons map calendar, people, fitness, and stats-chart', () => {
      assert.ok(content.includes("'calendar'"));
      assert.ok(content.includes("'people'"));
      assert.ok(content.includes("'fitness'"));
      assert.ok(content.includes("'stats-chart'"));
    });

    test('SettingsModalSheet physically exists and is exported from settings feature', () => {
      const sheetPath = path.join(projectRoot, 'src', 'features', 'settings', 'SettingsModalSheet.tsx');
      assert.ok(fs.existsSync(sheetPath), 'SettingsModalSheet.tsx must exist');
      const settingsIndexPath = path.join(projectRoot, 'src', 'features', 'settings', 'index.ts');
      const settingsIndex = fs.readFileSync(settingsIndexPath, 'utf8');
      assert.ok(settingsIndex.includes("export * from './SettingsModalSheet'"));
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Agenda Module & Daily/Monthly Appointments Integrity
  // ---------------------------------------------------------------------------
  describe('2. Agenda Module & Daily/Monthly Appointments Integrity', () => {
    test('Agenda screen and appointment modal source files exist and barrel export', () => {
      const agendaPath = path.join(projectRoot, 'src', 'features', 'agenda', 'AgendaScreen.tsx');
      const modalPath = path.join(projectRoot, 'src', 'features', 'agenda', 'AppointmentModal.tsx');
      const indexPath = path.join(projectRoot, 'src', 'features', 'agenda', 'index.ts');
      assert.ok(fs.existsSync(agendaPath));
      assert.ok(fs.existsSync(modalPath));
      assert.ok(fs.existsSync(indexPath));

      const indexContent = fs.readFileSync(indexPath, 'utf8');
      assert.ok(indexContent.includes("export * from './AgendaScreen'"));
      assert.ok(indexContent.includes("export * from './AppointmentModal'"));
    });

    test('AgendaScreen features SegmentedControl for [ Hoje | Mês ] and Highlight Card', () => {
      const agendaContent = fs.readFileSync(
        path.join(projectRoot, 'src', 'features', 'agenda', 'AgendaScreen.tsx'),
        'utf8'
      );
      assert.ok(agendaContent.includes("SegmentedControl"));
      assert.ok(agendaContent.includes("['Hoje', 'Mês']"));
      assert.ok(agendaContent.includes('ATENDIMENTO AGORA'));
      assert.ok(agendaContent.includes('Marcar Presença'));
      assert.ok(agendaContent.includes('SettingsModalSheet'));
    });

    test('Calculates attendance statistics (getAttendanceStats) for patient', async () => {
      const todayISO = '2026-09-12';

      // Create an attended appointment
      await appointmentRepository.create({
        patient_id: testPatientId,
        date: todayISO,
        start_time: '08:00',
        end_time: '08:50',
        status: 'attended',
        type: 'pilates_individual',
      }, mockDb);

      // Create an absent appointment
      await appointmentRepository.create({
        patient_id: testPatientId,
        date: todayISO,
        start_time: '09:00',
        end_time: '09:50',
        status: 'absent',
        type: 'pilates_individual',
      }, mockDb);

      // Create a scheduled appointment
      await appointmentRepository.create({
        patient_id: testPatientId,
        date: todayISO,
        start_time: '10:00',
        end_time: '10:50',
        status: 'scheduled',
        type: 'pilates_individual',
      }, mockDb);

      const stats = await appointmentRepository.getAttendanceStats(testPatientId, mockDb);
      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.attended, 1);
      assert.strictEqual(stats.absent, 1);
      assert.strictEqual(stats.cancelled, 0);
      assert.strictEqual(stats.attendanceRate, 50); // 1 attended out of 2 completed (1 attended + 1 absent)
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Session Packages Management & Renewal Alerts Integrity
  // ---------------------------------------------------------------------------
  describe('3. Session Packages Management & Renewal Alerts Integrity', () => {
    test('Packages screen file exists and is barrel exported', () => {
      const screenPath = path.join(projectRoot, 'src', 'features', 'packages', 'PackagesScreen.tsx');
      const indexPath = path.join(projectRoot, 'src', 'features', 'packages', 'index.ts');
      assert.ok(fs.existsSync(screenPath));
      assert.ok(fs.existsSync(indexPath));

      const indexContent = fs.readFileSync(indexPath, 'utf8');
      assert.ok(indexContent.includes("export * from './PackagesScreen'"));
    });

    test('packageRepository provides listAllActive and listAllWithPatient', async () => {
      // Create package with 8 total sessions and 7 completed (1 remaining -> triggers alert)
      const pkg = await packageRepository.create({
        patient_id: testPatientId,
        total_sessions: 8,
        completed_sessions: 7,
        start_date: '2026-09-01',
        status: 'active',
      }, mockDb);

      const activeList = await packageRepository.listAllActive(mockDb);
      assert.ok(activeList.some((p) => p.id === pkg.id));

      const withPatient = await packageRepository.listAllWithPatient(mockDb);
      const match = withPatient.find((p) => p.id === pkg.id);
      assert.ok(match, 'Must join with patient table');
      assert.strictEqual(match.patient_name, 'Camila Fernandes M8');
    });

    test('PackagesScreen renders Renewal Alert in wine #6A1B15 when 1 session remains', () => {
      const packagesContent = fs.readFileSync(
        path.join(projectRoot, 'src', 'features', 'packages', 'PackagesScreen.tsx'),
        'utf8'
      );
      assert.ok(packagesContent.includes('#6A1B15'), 'Must use official wine color');
      assert.ok(packagesContent.includes('Pacote terminando: Renovar com'));
      assert.ok(packagesContent.includes('Renovar Pacote'));
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Strict Privacy Architecture (Exclusion of CPF, CEP, Estado Civil)
  // ---------------------------------------------------------------------------
  describe('4. Strict Privacy Architecture (Exclusion of CPF, CEP, Estado Civil)', () => {
    const filesToAudit = [
      'src/features/agenda/AgendaScreen.tsx',
      'src/features/agenda/AppointmentModal.tsx',
      'src/features/agenda/index.ts',
      'src/features/packages/PackagesScreen.tsx',
      'src/features/packages/index.ts',
      'src/features/settings/SettingsModalSheet.tsx',
      'src/navigation/index.tsx',
    ];

    test('Strict Privacy: No CPF, CEP, or Estado Civil in any new UI or navigation files', () => {
      for (const relPath of filesToAudit) {
        const fullPath = path.join(projectRoot, relPath);
        assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
        const code = fs.readFileSync(fullPath, 'utf8');

        // Filter out comments
        const nonCommentLines = code
          .split('\n')
          .filter((line) => {
            const trimmed = line.trim();
            return !trimmed.startsWith('*') && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
          })
          .join('\n');

        assert.strictEqual(
          nonCommentLines.match(/\bcpf\b/i),
          null,
          `CPF must NOT appear in non-comment code of ${relPath}`
        );
        assert.strictEqual(
          nonCommentLines.match(/\bcep\b/i),
          null,
          `CEP must NOT appear in non-comment code of ${relPath}`
        );
        assert.strictEqual(
          nonCommentLines.match(/estado[\s_]?civil/i),
          null,
          `Estado Civil must NOT appear in non-comment code of ${relPath}`
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Apple HIG Design Tokens & Ergonomics
  // ---------------------------------------------------------------------------
  describe('5. Apple HIG Design Tokens & Ergonomics', () => {
    test('Agenda and Packages screens enforce continuous squircle Radii.card and LargeTitleLayout', () => {
      const agendaContent = fs.readFileSync(
        path.join(projectRoot, 'src', 'features', 'agenda', 'AgendaScreen.tsx'),
        'utf8'
      );
      const packagesContent = fs.readFileSync(
        path.join(projectRoot, 'src', 'features', 'packages', 'PackagesScreen.tsx'),
        'utf8'
      );

      assert.ok(agendaContent.includes('LargeTitleLayout'));
      assert.ok(packagesContent.includes('LargeTitleLayout'));
      assert.ok(agendaContent.includes('Radii.card'));
      assert.ok(packagesContent.includes('Radii.card'));
    });

    test('Agenda and Packages screens integrate Haptic feedback on interactions', () => {
      const agendaContent = fs.readFileSync(
        path.join(projectRoot, 'src', 'features', 'agenda', 'AgendaScreen.tsx'),
        'utf8'
      );
      const packagesContent = fs.readFileSync(
        path.join(projectRoot, 'src', 'features', 'packages', 'PackagesScreen.tsx'),
        'utf8'
      );

      assert.ok(agendaContent.includes('Haptics.selection()'));
      assert.ok(packagesContent.includes('Haptics.selection()'));
      assert.ok(agendaContent.includes('Haptics.success()'));
      assert.ok(packagesContent.includes('Haptics.success()'));
    });
  });
});
