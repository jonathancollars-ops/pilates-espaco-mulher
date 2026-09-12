require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  appointmentRepository,
  packageRepository,
} = require('../src/database/repositories/index.ts');

const {
  exportDatabaseBackup,
  importDatabaseBackup,
  validateBackupPayload,
  validateBackupDataSchema,
  sanitizePackageStatus,
} = require('../src/services/backupService.ts');

const {
  SCHEMA_V2_TABLES,
  SCHEMA_V2_INDICES,
} = require('../src/database/schema.ts');

const {
  Colors,
} = require('../src/design-system/tokens.ts');

/**
 * Creates an in-memory transactional mock database for packages and backup regression testing.
 * Supports ACID snapshot rollback and simulated disk/IO failures.
 */
function createMockPackagesDb(initialData = {}) {
  let tables = {
    patients: new Map(initialData.patients ?? []),
    anamnesis: new Map(initialData.anamnesis ?? []),
    postural_evaluations: new Map(initialData.postural_evaluations ?? []),
    bioimpedance: new Map(initialData.bioimpedance ?? []),
    exercises: new Map(initialData.exercises ?? []),
    routines: new Map(initialData.routines ?? []),
    routine_items: new Map(initialData.routine_items ?? []),
    package_plans: new Map(initialData.package_plans ?? []),
    appointments: new Map(initialData.appointments ?? []),
  };

  let failOnTableInsert = null;
  let failOnTableUpdate = null;

  return {
    get tables() {
      return tables;
    },
    set tables(val) {
      tables = val;
    },
    setFailOnTableInsert(tableName) {
      failOnTableInsert = tableName;
    },
    setFailOnTableUpdate(tableName) {
      failOnTableUpdate = tableName;
    },

    async withTransactionAsync(task) {
      const snapshot = {
        patients: new Map(tables.patients),
        anamnesis: new Map(tables.anamnesis),
        postural_evaluations: new Map(tables.postural_evaluations),
        bioimpedance: new Map(tables.bioimpedance),
        exercises: new Map(tables.exercises),
        routines: new Map(tables.routines),
        routine_items: new Map(tables.routine_items),
        package_plans: new Map(tables.package_plans),
        appointments: new Map(tables.appointments),
      };

      try {
        await task();
      } catch (err) {
        tables.patients = snapshot.patients;
        tables.anamnesis = snapshot.anamnesis;
        tables.postural_evaluations = snapshot.postural_evaluations;
        tables.bioimpedance = snapshot.bioimpedance;
        tables.exercises = snapshot.exercises;
        tables.routines = snapshot.routines;
        tables.routine_items = snapshot.routine_items;
        tables.package_plans = snapshot.package_plans;
        tables.appointments = snapshot.appointments;
        throw err;
      }
    },

    async execAsync(sql) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.includes('DELETE FROM APPOINTMENTS') && trimmed.includes('DELETE FROM PATIENTS')) {
        tables.appointments.clear();
        tables.package_plans.clear();
        tables.routine_items.clear();
        tables.routines.clear();
        tables.bioimpedance.clear();
        tables.postural_evaluations.clear();
        tables.anamnesis.clear();
        tables.exercises.clear();
        tables.patients.clear();
      }
    },

    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      // INSERT PATIENTS
      if (trimmed.startsWith('INSERT INTO PATIENTS')) {
        if (failOnTableInsert === 'patients') {
          throw new Error('Simulated SQLite Disk Error: failed inserting patient');
        }
        const [
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at,
        ] = params;
        tables.patients.set(id, {
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // INSERT PACKAGE_PLANS
      if (trimmed.startsWith('INSERT INTO PACKAGE_PLANS')) {
        if (failOnTableInsert === 'package_plans') {
          throw new Error('Simulated SQLite Disk Error: failed inserting package_plan');
        }
        const [
          id, patient_id, total_sessions, completed_sessions,
          start_date, expiration_date, status, price_cents, notes,
          created_at, updated_at,
        ] = params;
        tables.package_plans.set(id, {
          id, patient_id, total_sessions, completed_sessions,
          start_date, expiration_date, status, price_cents, notes,
          created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE PACKAGE_PLANS
      if (trimmed.startsWith('UPDATE PACKAGE_PLANS')) {
        if (failOnTableUpdate === 'package_plans') {
          throw new Error('Simulated SQLite Disk Error: failed updating package_plans');
        }
        if (trimmed.includes('SET COMPLETED_SESSIONS = ?, STATUS = ?, UPDATED_AT = ? WHERE ID = ?')) {
          const [completed_sessions, status, updated_at, id] = params;
          const existing = tables.package_plans.get(id);
          if (existing) {
            tables.package_plans.set(id, {
              ...existing,
              completed_sessions,
              status,
              updated_at,
            });
            return { lastInsertRowId: 1, changes: 1 };
          }
        }
        // General update
        const id = params[params.length - 1];
        const existing = tables.package_plans.get(id);
        if (existing) {
          if (trimmed.includes('STATUS = ?') && params.length === 3) {
            tables.package_plans.set(id, { ...existing, status: params[0], updated_at: params[1] });
          } else {
            const updated = { ...existing };
            let paramIdx = 0;
            if (trimmed.includes('TOTAL_SESSIONS = ?')) updated.total_sessions = params[paramIdx++];
            if (trimmed.includes('COMPLETED_SESSIONS = ?')) updated.completed_sessions = params[paramIdx++];
            if (trimmed.includes('START_DATE = ?')) updated.start_date = params[paramIdx++];
            if (trimmed.includes('EXPIRATION_DATE = ?')) updated.expiration_date = params[paramIdx++];
            if (trimmed.includes('STATUS = ?')) updated.status = params[paramIdx++];
            if (trimmed.includes('PRICE_CENTS = ?')) updated.price_cents = params[paramIdx++];
            if (trimmed.includes('NOTES = ?')) updated.notes = params[paramIdx++];
            if (trimmed.includes('UPDATED_AT = ?')) updated.updated_at = params[paramIdx++];
            tables.package_plans.set(id, updated);
          }
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // DELETE PACKAGE_PLANS
      if (trimmed.startsWith('DELETE FROM PACKAGE_PLANS WHERE ID = ?')) {
        const [id] = params;
        const had = tables.package_plans.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      // INSERT APPOINTMENTS
      if (trimmed.startsWith('INSERT INTO APPOINTMENTS')) {
        if (failOnTableInsert === 'appointments') {
          throw new Error('Simulated SQLite Disk Error: failed inserting appointment');
        }
        const [
          id, patient_id, patient_name, date, start_time, end_time,
          status, type, notes, created_at, updated_at,
        ] = params;
        tables.appointments.set(id, {
          id, patient_id, patient_name, date, start_time, end_time,
          status, type, notes, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE APPOINTMENTS
      if (failOnTableUpdate === 'appointments' && trimmed.startsWith('UPDATE APPOINTMENTS')) {
        throw new Error('Simulated SQLite Disk Error: failed updating appointments');
      }

      if (trimmed.startsWith('UPDATE APPOINTMENTS SET STATUS = ?, UPDATED_AT = ? WHERE ID = ?')) {
        const [status, updated_at, id] = params;
        const existing = tables.appointments.get(id);
        if (existing) {
          tables.appointments.set(id, { ...existing, status, updated_at });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      if (trimmed.startsWith('UPDATE APPOINTMENTS SET')) {
        const id = params[params.length - 1];
        const existing = tables.appointments.get(id);
        if (existing) {
          const updated = { ...existing };
          let paramIdx = 0;
          if (trimmed.includes('PATIENT_ID = ?')) updated.patient_id = params[paramIdx++];
          if (trimmed.includes('PATIENT_NAME = ?')) updated.patient_name = params[paramIdx++];
          if (trimmed.includes('DATE = ?')) updated.date = params[paramIdx++];
          if (trimmed.includes('START_TIME = ?')) updated.start_time = params[paramIdx++];
          if (trimmed.includes('END_TIME = ?')) updated.end_time = params[paramIdx++];
          if (trimmed.includes('STATUS = ?')) updated.status = params[paramIdx++];
          if (trimmed.includes('TYPE = ?')) updated.type = params[paramIdx++];
          if (trimmed.includes('NOTES = ?')) updated.notes = params[paramIdx++];
          if (trimmed.includes('UPDATED_AT = ?')) updated.updated_at = params[paramIdx++];
          tables.appointments.set(id, updated);
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.includes('PRAGMA USER_VERSION')) {
        return { user_version: 2 };
      }

      if (trimmed.startsWith('SELECT NAME FROM PATIENTS WHERE ID = ?')) {
        const [id] = params;
        const p = tables.patients.get(id);
        return p ? { name: p.name } : null;
      }

      if (trimmed.startsWith('SELECT * FROM PACKAGE_PLANS WHERE ID = ?')) {
        const [id] = params;
        const row = tables.package_plans.get(id);
        return row ? { ...row } : null;
      }

      if (trimmed.includes('FROM PACKAGE_PLANS') && trimmed.includes("STATUS = 'ACTIVE'")) {
        const [patientId] = params;
        const activePackages = Array.from(tables.package_plans.values())
          .filter((p) => p.patient_id === patientId && p.status === 'active')
          .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at));
        return activePackages[0] ? { ...activePackages[0] } : null;
      }

      if (trimmed.startsWith('SELECT * FROM APPOINTMENTS WHERE ID = ?')) {
        const [id] = params;
        const row = tables.appointments.get(id);
        return row ? { ...row } : null;
      }

      return null;
    },

    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM PATIENTS')) {
        return Array.from(tables.patients.values());
      }
      if (trimmed.startsWith('SELECT * FROM ANAMNESIS')) {
        return Array.from(tables.anamnesis.values());
      }
      if (trimmed.startsWith('SELECT * FROM POSTURAL_EVALUATIONS')) {
        return Array.from(tables.postural_evaluations.values());
      }
      if (trimmed.startsWith('SELECT * FROM BIOIMPEDANCE')) {
        return Array.from(tables.bioimpedance.values());
      }
      if (trimmed.startsWith('SELECT * FROM EXERCISES')) {
        return Array.from(tables.exercises.values());
      }
      if (trimmed.startsWith('SELECT * FROM ROUTINES')) {
        return Array.from(tables.routines.values());
      }
      if (trimmed.startsWith('SELECT * FROM ROUTINE_ITEMS')) {
        return Array.from(tables.routine_items.values());
      }

      // PACKAGE_PLANS listByPatientId
      if (trimmed.includes('FROM PACKAGE_PLANS WHERE PATIENT_ID = ?')) {
        const [patientId] = params;
        return Array.from(tables.package_plans.values())
          .filter((p) => p.patient_id === patientId)
          .sort((a, b) => b.start_date.localeCompare(a.start_date) || b.created_at.localeCompare(a.created_at));
      }

      // PACKAGE_PLANS listAllWithPatient
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

      // PACKAGE_PLANS listAllActive
      if (trimmed.includes('FROM PACKAGE_PLANS') && trimmed.includes("STATUS = 'ACTIVE'")) {
        return Array.from(tables.package_plans.values()).filter((p) => p.status === 'active');
      }

      // PACKAGE_PLANS ALL
      if (trimmed.startsWith('SELECT * FROM PACKAGE_PLANS')) {
        return Array.from(tables.package_plans.values());
      }

      // APPOINTMENTS listByDate
      if (trimmed.includes('FROM APPOINTMENTS') && trimmed.includes('WHERE DATE = ?')) {
        const [date] = params;
        return Array.from(tables.appointments.values())
          .filter((a) => a.date === date)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
      }

      // APPOINTMENTS ALL
      if (trimmed.startsWith('SELECT * FROM APPOINTMENTS')) {
        return Array.from(tables.appointments.values()).sort(
          (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
        );
      }

      if (trimmed.includes('PRAGMA FOREIGN_KEY_CHECK')) {
        return [];
      }

      return [];
    },
  };
}

describe('M7 Session Packages & Backup Regression QA Suite', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockPackagesDb({
      patients: [
        ['pat-1', { id: 'pat-1', name: 'Maria Silva', phone: '(22) 99999-1111', status: 'active', city_state: 'Rio das Ostras - RJ', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
        ['pat-2', { id: 'pat-2', name: 'Carla Dias', phone: '(22) 98888-2222', status: 'active', city_state: 'Rio das Ostras - RJ', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
      ],
    });
  });

  // ============================================================================
  // 1. Package Plan Model, Defaults & Lifecycle
  // ============================================================================
  describe('1. Package Plan Model, Defaults & Lifecycle', () => {
    test('Creates package with default values (completed_sessions = 0, status = active)', async () => {
      const pkg = await packageRepository.create(
        {
          patient_id: 'pat-1',
          total_sessions: 10,
          start_date: '2026-03-01',
          expiration_date: '2026-05-01',
          price_cents: 35000,
          notes: 'Pacote 10 sessões Pilates',
        },
        mockDb
      );

      assert.ok(pkg.id);
      assert.equal(pkg.patient_id, 'pat-1');
      assert.equal(pkg.total_sessions, 10);
      assert.equal(pkg.completed_sessions, 0);
      assert.equal(pkg.status, 'active');
      assert.equal(pkg.price_cents, 35000);
      assert.equal(pkg.notes, 'Pacote 10 sessões Pilates');

      const retrieved = await packageRepository.findById(pkg.id, mockDb);
      assert.ok(retrieved);
      assert.equal(retrieved.id, pkg.id);
    });

    test('Auto-completes package on creation if completed_sessions >= total_sessions', async () => {
      const pkg = await packageRepository.create(
        {
          patient_id: 'pat-1',
          total_sessions: 5,
          completed_sessions: 5,
          start_date: '2026-03-01',
        },
        mockDb
      );

      assert.equal(pkg.completed_sessions, 5);
      assert.equal(pkg.status, 'completed');
    });

    test('getActiveByPatientId returns first active package ordered chronologically', async () => {
      const pkg1 = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 8, start_date: '2026-03-01' },
        mockDb
      );

      const active = await packageRepository.getActiveByPatientId('pat-1', mockDb);
      assert.ok(active);
      assert.equal(active.id, pkg1.id);
      assert.equal(active.status, 'active');
    });

    test('Updates and deletes package plan cleanly', async () => {
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 5, start_date: '2026-03-01' },
        mockDb
      );

      const updated = await packageRepository.update(
        pkg.id,
        { notes: 'Nota atualizada', price_cents: 20000 },
        mockDb
      );
      assert.equal(updated.notes, 'Nota atualizada');
      assert.equal(updated.price_cents, 20000);

      const deleted = await packageRepository.delete(pkg.id, mockDb);
      assert.equal(deleted, true);

      const notFound = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(notFound, null);
    });

    test('STRICT PRIVACY: Package domain models strictly exclude CPF, CEP, and Estado Civil', () => {
      const pkgTypePath = path.resolve(__dirname, '../src/types/package.ts');
      const pkgRepoPath = path.resolve(__dirname, '../src/database/repositories/packageRepository.ts');

      for (const filePath of [pkgTypePath, pkgRepoPath]) {
        const content = fs.readFileSync(filePath, 'utf8');
        const nonCommentLines = content
          .split('\n')
          .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
          .join('\n')
          .toLowerCase();

        assert.doesNotMatch(nonCommentLines, /\bcpf\b/);
        assert.doesNotMatch(nonCommentLines, /\bcep\b/);
        assert.doesNotMatch(nonCommentLines, /\bestado[_\s-]?civil\b/);
        assert.doesNotMatch(nonCommentLines, /\bmarital[_\s-]?status\b/);
      }
    });
  });

  // ============================================================================
  // 2. Atomic Session Deduction & Attendance Consumption
  // ============================================================================
  describe('2. Atomic Session Consumption in SQLite Transactions', () => {
    test('Marking appointment as attended atomically consumes 1 session from active package', async () => {
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 5, start_date: '2026-03-01' },
        mockDb
      );
      assert.equal(pkg.completed_sessions, 0);

      const apt = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-10', start_time: '09:00', end_time: '10:00' },
        mockDb
      );

      const updatedApt = await appointmentRepository.updateStatus(apt.id, 'attended', mockDb);
      assert.equal(updatedApt.status, 'attended');

      const activePkg = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(activePkg.completed_sessions, 1);
      assert.equal(activePkg.status, 'active');
    });

    test('Idempotency: Re-saving an already attended appointment does NOT increment package session again', async () => {
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 5, start_date: '2026-03-01' },
        mockDb
      );

      const apt = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-10', start_time: '09:00', end_time: '10:00' },
        mockDb
      );

      // First attendance
      await appointmentRepository.updateStatus(apt.id, 'attended', mockDb);
      let pkgCheck = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgCheck.completed_sessions, 1);

      // Second attendance call (idempotent)
      await appointmentRepository.updateStatus(apt.id, 'attended', mockDb);
      pkgCheck = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgCheck.completed_sessions, 1, 'Completed sessions must remain 1');
    });

    test('Exhausting the package completes it and subsequent appointments do not fail when no active package exists', async () => {
      // 1-session package
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 1, start_date: '2026-03-01' },
        mockDb
      );

      const apt1 = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-10', start_time: '09:00', end_time: '10:00' },
        mockDb
      );

      await appointmentRepository.updateStatus(apt1.id, 'attended', mockDb);

      const pkgAfter = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgAfter.completed_sessions, 1);
      assert.equal(pkgAfter.status, 'completed');

      // Next appointment with no remaining active package completes without error
      const apt2 = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-12', start_time: '09:00', end_time: '10:00' },
        mockDb
      );

      const updatedApt2 = await appointmentRepository.updateStatus(apt2.id, 'attended', mockDb);
      assert.equal(updatedApt2.status, 'attended');
    });

    test('appointmentRepository.update atomically increments active package when changing status to attended', async () => {
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 5, start_date: '2026-03-01' },
        mockDb
      );

      const apt = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-10', start_time: '09:00', end_time: '10:00', status: 'scheduled' },
        mockDb
      );

      const updated = await appointmentRepository.update(apt.id, { status: 'attended' }, mockDb);
      assert.equal(updated.status, 'attended');

      const pkgCheck = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgCheck.completed_sessions, 1);
    });

    test('Status transitions to absent or cancelled do NOT increment package sessions', async () => {
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 5, start_date: '2026-03-01' },
        mockDb
      );

      const apt = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-10', start_time: '09:00', end_time: '10:00' },
        mockDb
      );

      await appointmentRepository.updateStatus(apt.id, 'absent', mockDb);
      let pkgCheck = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgCheck.completed_sessions, 0);

      await appointmentRepository.updateStatus(apt.id, 'cancelled', mockDb);
      pkgCheck = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgCheck.completed_sessions, 0);
    });
  });

  // ============================================================================
  // 3. Transaction Rollback Atomicity (ACID Failure Resilience)
  // ============================================================================
  describe('3. Transaction Rollback Atomicity (ACID Failure Resilience)', () => {
    test('When package increment fails during updateStatus, appointment status rolls back to original state', async () => {
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 5, start_date: '2026-03-01' },
        mockDb
      );

      const apt = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-10', start_time: '09:00', end_time: '10:00', status: 'scheduled' },
        mockDb
      );

      // Inject simulated database failure on package_plans table update
      mockDb.setFailOnTableUpdate('package_plans');

      await assert.rejects(
        () => appointmentRepository.updateStatus(apt.id, 'attended', mockDb),
        /Simulated SQLite Disk Error: failed updating package_plans/
      );

      // Status must roll back to scheduled
      const aptCheck = await appointmentRepository.findById(apt.id, mockDb);
      assert.equal(aptCheck.status, 'scheduled');

      // Package completed sessions must remain 0
      const pkgCheck = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgCheck.completed_sessions, 0);
    });

    test('When package increment fails during appointmentRepository.update, appointment rolls back to original state', async () => {
      const pkg = await packageRepository.create(
        { patient_id: 'pat-1', total_sessions: 5, start_date: '2026-03-01' },
        mockDb
      );

      const apt = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-10', start_time: '09:00', end_time: '10:00', status: 'scheduled', notes: 'Nota original' },
        mockDb
      );

      mockDb.setFailOnTableUpdate('package_plans');

      await assert.rejects(
        () => appointmentRepository.update(apt.id, { status: 'attended', notes: 'Nota modificada' }, mockDb),
        /Simulated SQLite Disk Error: failed updating package_plans/
      );

      const aptCheck = await appointmentRepository.findById(apt.id, mockDb);
      assert.equal(aptCheck.status, 'scheduled');
      assert.equal(aptCheck.notes, 'Nota original');

      const pkgCheck = await packageRepository.findById(pkg.id, mockDb);
      assert.equal(pkgCheck.completed_sessions, 0);
    });
  });

  // ============================================================================
  // 4. Renewal Alert Threshold & Aesthetics
  // ============================================================================
  describe('4. Renewal Alert Threshold & Aesthetics (total - completed <= 1)', () => {
    // The renewal alert rule in PackagesScreen:
    // status === 'active' && (total_sessions - completed_sessions <= 1)
    function shouldShowRenewalAlert(pkg) {
      return pkg.status === 'active' && (pkg.total_sessions - pkg.completed_sessions <= 1);
    }

    test('Category-Partition & Boundary Value Analysis of renewal alert rule', () => {
      // 10 total, 0 completed (10 remaining) -> false
      assert.equal(shouldShowRenewalAlert({ status: 'active', total_sessions: 10, completed_sessions: 0 }), false);

      // 10 total, 8 completed (2 remaining) -> false (boundary above 1)
      assert.equal(shouldShowRenewalAlert({ status: 'active', total_sessions: 10, completed_sessions: 8 }), false);

      // 10 total, 9 completed (1 remaining) -> true (boundary threshold = 1)
      assert.equal(shouldShowRenewalAlert({ status: 'active', total_sessions: 10, completed_sessions: 9 }), true);

      // 1 total, 0 completed (1 remaining) -> true
      assert.equal(shouldShowRenewalAlert({ status: 'active', total_sessions: 1, completed_sessions: 0 }), true);

      // 10 total, 10 completed, status 'completed' -> false (not active)
      assert.equal(shouldShowRenewalAlert({ status: 'completed', total_sessions: 10, completed_sessions: 10 }), false);

      // 10 total, 9 completed, status 'expired' -> false (not active)
      assert.equal(shouldShowRenewalAlert({ status: 'expired', total_sessions: 10, completed_sessions: 9 }), false);
    });

    test('Aesthetic tokens: Colors.accent is wine #6A1B15 for Apple HIG high-priority clinical alerts', () => {
      assert.equal(Colors.accent, '#6A1B15');
    });
  });

  // ============================================================================
  // 5. Backup Regression: Export & Restore with Appointments and Packages
  // ============================================================================
  describe('5. Backup Regression with New Tables (appointments and package_plans)', () => {
    beforeEach(async () => {
      await packageRepository.create(
        {
          id: 'pkg-reg-1',
          patient_id: 'pat-1',
          total_sessions: 10,
          completed_sessions: 2,
          start_date: '2026-03-01',
          expiration_date: '2026-05-01',
          status: 'active',
          price_cents: 35000,
          notes: 'Pacote de teste regressão',
        },
        mockDb
      );

      await appointmentRepository.create(
        {
          id: 'apt-reg-1',
          patient_id: 'pat-1',
          patient_name: 'Maria Silva',
          date: '2026-03-15',
          start_time: '09:00',
          end_time: '10:00',
          status: 'scheduled',
          type: 'pilates_individual',
          notes: 'Agendamento teste regressão',
        },
        mockDb
      );
    });

    test('exportDatabaseBackup exports all 9 tables, databaseVersion 2, and accurate counts', async () => {
      const exportResult = await exportDatabaseBackup(mockDb);
      assert.equal(exportResult.success, true);

      const parsed = JSON.parse(exportResult.jsonString);
      assert.equal(parsed.metadata.databaseVersion, 2);
      assert.equal(parsed.metadata.counts.appointments, 1);
      assert.equal(parsed.metadata.counts.package_plans, 1);

      assert.equal(parsed.data.appointments.length, 1);
      assert.equal(parsed.data.appointments[0].id, 'apt-reg-1');
      assert.equal(parsed.data.package_plans.length, 1);
      assert.equal(parsed.data.package_plans[0].id, 'pkg-reg-1');

      // Privacy audit: no CPF, CEP, or Estado Civil in export
      assert.equal(exportResult.jsonString.includes('cpf'), false);
      assert.equal(exportResult.jsonString.includes('cep'), false);
      assert.equal(exportResult.jsonString.includes('estado_civil'), false);
    });

    test('validateBackupPayload dry-run catches orphan appointments referencing non-existent patients', () => {
      const invalidBackup = {
        metadata: { app: 'pilates-espaco-mulher', schemaVersion: 1 },
        data: {
          patients: [{ id: 'pat-1', name: 'Maria' }],
          anamnesis: [],
          postural_evaluations: [],
          bioimpedance: [],
          exercises: [],
          routines: [],
          routine_items: [],
          appointments: [{ id: 'apt-orphan', patient_id: 'pat-nonexistent' }],
        },
      };

      assert.throws(
        () => validateBackupPayload(invalidBackup),
        /Integridade referencial violada: Agendamento apt-orphan referencia paciente inexistente/
      );
    });

    test('validateBackupPayload dry-run catches orphan package_plans referencing non-existent patients', () => {
      const invalidBackup = {
        metadata: { app: 'pilates-espaco-mulher', schemaVersion: 1 },
        data: {
          patients: [{ id: 'pat-1', name: 'Maria' }],
          anamnesis: [],
          postural_evaluations: [],
          bioimpedance: [],
          exercises: [],
          routines: [],
          routine_items: [],
          package_plans: [{ id: 'pkg-orphan', patient_id: 'pat-nonexistent' }],
        },
      };

      assert.throws(
        () => validateBackupPayload(invalidBackup),
        /Integridade referencial violada: Pacote de sessões pkg-orphan referencia paciente inexistente/
      );
    });

    test('importDatabaseBackup restores appointments and package_plans with reverse-topological wipe', async () => {
      const backupJson = JSON.stringify({
        metadata: {
          app: 'pilates-espaco-mulher',
          schemaVersion: 1,
          counts: {
            patients: 1,
            anamnesis: 0,
            postural_evaluations: 0,
            bioimpedance: 0,
            exercises: 0,
            routines: 0,
            routine_items: 0,
            appointments: 1,
            package_plans: 1,
          },
        },
        data: {
          patients: [
            { id: 'pat-restored', name: 'Ana Costa', phone: '(22) 97777-6666', city_state: 'Rio das Ostras - RJ', status: 'active', created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-03-01T00:00:00.000Z' },
          ],
          anamnesis: [],
          postural_evaluations: [],
          bioimpedance: [],
          exercises: [],
          routines: [],
          routine_items: [],
          package_plans: [
            { id: 'pkg-restored', patient_id: 'pat-restored', total_sessions: 12, completed_sessions: 3, start_date: '2026-03-01', status: 'active' },
          ],
          appointments: [
            { id: 'apt-restored', patient_id: 'pat-restored', patient_name: 'Ana Costa', date: '2026-03-25', start_time: '10:00', end_time: '11:00', status: 'scheduled', type: 'pilates_individual' },
          ],
        },
      });

      const importResult = await importDatabaseBackup(mockDb, backupJson);
      assert.equal(importResult.success, true);

      // Old records wiped
      assert.equal(mockDb.tables.patients.has('pat-1'), false);
      assert.equal(mockDb.tables.package_plans.has('pkg-reg-1'), false);
      assert.equal(mockDb.tables.appointments.has('apt-reg-1'), false);

      // New records restored
      assert.equal(mockDb.tables.patients.has('pat-restored'), true);
      assert.equal(mockDb.tables.package_plans.has('pkg-restored'), true);
      assert.equal(mockDb.tables.appointments.has('apt-restored'), true);
    });

    test('TRANSACTION ROLLBACK: Failure during restore preserves original database state', async () => {
      mockDb.setFailOnTableInsert('appointments');

      const backupJson = JSON.stringify({
        metadata: {
          app: 'pilates-espaco-mulher',
          schemaVersion: 1,
          counts: { patients: 1, anamnesis: 0, postural_evaluations: 0, bioimpedance: 0, exercises: 0, routines: 0, routine_items: 0 },
        },
        data: {
          patients: [{ id: 'pat-new', name: 'Novo Paciente' }],
          anamnesis: [],
          postural_evaluations: [],
          bioimpedance: [],
          exercises: [],
          routines: [],
          routine_items: [],
          package_plans: [{ id: 'pkg-new', patient_id: 'pat-new', total_sessions: 10, completed_sessions: 0, start_date: '2026-03-01' }],
          appointments: [{ id: 'apt-new', patient_id: 'pat-new', date: '2026-03-10', start_time: '08:00', end_time: '09:00' }],
        },
      });

      await assert.rejects(
        () => importDatabaseBackup(mockDb, backupJson),
        /Simulated SQLite Disk Error: failed inserting appointment/
      );

      // Previous state must be completely preserved
      assert.equal(mockDb.tables.patients.has('pat-1'), true);
      assert.equal(mockDb.tables.package_plans.has('pkg-reg-1'), true);
      assert.equal(mockDb.tables.appointments.has('apt-reg-1'), true);
      assert.equal(mockDb.tables.patients.has('pat-new'), false);
    });
  });

  // ============================================================================
  // 6. Adversarial Testing & Malicious Data Rejection
  // ============================================================================
  describe('6. Adversarial Testing & Malicious Data Rejection', () => {
    test('validateBackupDataSchema rejects appointments with malformed start_time', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        appointments: [{ id: 'apt-bad-time', patient_id: 'pat-1', start_time: '25:00' }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela appointments: start_time '25:00' deve estar no formato HH:MM \(24h\)\./
      );

      invalidBackup.appointments[0].start_time = '9:00';
      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela appointments: start_time '9:00' deve estar no formato HH:MM \(24h\)\./
      );

      invalidBackup.appointments[0].start_time = 'invalid_time';
      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela appointments: start_time 'invalid_time' deve estar no formato HH:MM \(24h\)\./
      );
    });

    test('validateBackupDataSchema rejects appointments with malformed end_time', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        appointments: [{ id: 'apt-bad-end', patient_id: 'pat-1', end_time: '12:65' }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela appointments: end_time '12:65' deve estar no formato HH:MM \(24h\)\./
      );
    });

    test('validateBackupDataSchema rejects appointments with malformed date', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        appointments: [{ id: 'apt-bad-date', patient_id: 'pat-1', date: '15/03/2026' }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela appointments: date '15\/03\/2026' deve estar no formato YYYY-MM-DD\./
      );
    });

    test('validateBackupDataSchema rejects appointments with invalid status', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        appointments: [{ id: 'apt-bad-status', patient_id: 'pat-1', status: 'DROP TABLE appointments' }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela appointments: status 'DROP TABLE appointments' não é permitido\./
      );
    });

    test('validateBackupDataSchema rejects appointments with null bytes in notes', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        appointments: [{ id: 'apt-bad-notes', patient_id: 'pat-1', notes: 'Inject\0 malicious payload' }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela appointments: campo notes com formato inválido ou caracteres nulos proibidos\./
      );
    });

    test('validateBackupDataSchema rejects package_plans with invalid status', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        package_plans: [{ id: 'pkg-bad-status', patient_id: 'pat-1', status: 'archived_invalid' }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela package_plans: status 'archived_invalid' não é permitido\./
      );
    });

    test('validateBackupDataSchema rejects package_plans with non-positive total_sessions or negative completed_sessions', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        package_plans: [{ id: 'pkg-bad-total', patient_id: 'pat-1', total_sessions: 0 }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela package_plans: total_sessions deve ser um número maior ou igual a 1\./
      );

      invalidBackup.package_plans[0].total_sessions = 10;
      invalidBackup.package_plans[0].completed_sessions = -2;

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela package_plans: completed_sessions deve ser um número não negativo\./
      );
    });

    test('validateBackupDataSchema rejects package_plans with null bytes in notes', () => {
      const invalidBackup = {
        patients: [],
        anamnesis: [],
        postural_evaluations: [],
        bioimpedance: [],
        exercises: [],
        routines: [],
        routine_items: [],
        package_plans: [{ id: 'pkg-bad-notes', patient_id: 'pat-1', notes: 'Pacote\0com byte nulo' }],
      };

      assert.throws(
        () => validateBackupDataSchema(invalidBackup),
        /Registro inválido na tabela package_plans: campo notes com formato inválido ou caracteres nulos proibidos\./
      );
    });
  });
});
