require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  appointmentRepository,
} = require('../src/database/repositories/appointmentRepository.ts');

const {
  formatWhatsAppDeepLink,
  formatWhatsAppUrl,
  formatAppointmentConfirmationWhatsApp,
  cleanDigits,
  formatPhone,
} = require('../src/utils/formatters.ts');

const {
  sanitizeAppointmentStatus,
  sanitizeAppointmentType,
} = require('../src/services/backupService.ts');

const {
  SCHEMA_V2_TABLES,
  SCHEMA_V2_INDICES,
} = require('../src/database/schema.ts');

/**
 * Creates an in-memory transactional mock database for clinical agenda and appointments testing.
 */
function createMockAgendaDb(initialData = {}) {
  let tables = {
    patients: new Map(initialData.patients ?? []),
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
        appointments: new Map(tables.appointments),
      };

      try {
        await task();
      } catch (err) {
        tables.patients = snapshot.patients;
        tables.appointments = snapshot.appointments;
        throw err;
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

      // DELETE APPOINTMENTS
      if (trimmed.startsWith('DELETE FROM APPOINTMENTS WHERE ID = ?')) {
        const [id] = params;
        const had = tables.appointments.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
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
        const row = tables.appointments.get(id);
        return row ? { ...row } : null;
      }

      // getAttendanceStats
      if (trimmed.includes('FROM APPOINTMENTS') && trimmed.includes('PATIENT_ID = ?') && trimmed.includes('COUNT(*)')) {
        const [patientId] = params;
        const patientAppts = Array.from(tables.appointments.values()).filter((a) => a.patient_id === patientId);
        const total = patientAppts.length;
        const attended = patientAppts.filter((a) => a.status === 'attended').length;
        const absent = patientAppts.filter((a) => a.status === 'absent').length;
        const cancelled = patientAppts.filter((a) => a.status === 'cancelled').length;
        return { total, attended, absent, cancelled };
      }

      // getCurrentAndNext: Current
      if (
        trimmed.includes('FROM APPOINTMENTS') &&
        trimmed.includes('START_TIME <= ?') &&
        trimmed.includes('END_TIME > ?')
      ) {
        const [currentDate, currentTime] = params;
        const valid = Array.from(tables.appointments.values())
          .filter(
            (a) =>
              a.date === currentDate &&
              a.start_time <= currentTime &&
              a.end_time > currentTime &&
              a.status !== 'cancelled' &&
              a.status !== 'rescheduled'
          )
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        return valid[0] ? { ...valid[0] } : null;
      }

      // getCurrentAndNext: Next
      if (
        trimmed.includes('FROM APPOINTMENTS') &&
        trimmed.includes('START_TIME > ?')
      ) {
        const [currentDate, currentTime] = params;
        const valid = Array.from(tables.appointments.values())
          .filter(
            (a) =>
              a.date === currentDate &&
              a.start_time > currentTime &&
              a.status !== 'cancelled' &&
              a.status !== 'rescheduled'
          )
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        return valid[0] ? { ...valid[0] } : null;
      }

      return null;
    },

    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      // APPOINTMENTS findConflicts
      if (
        trimmed.includes('FROM APPOINTMENTS') &&
        trimmed.includes("STATUS != 'CANCELLED'") &&
        trimmed.includes('START_TIME < ?') &&
        trimmed.includes('END_TIME > ?')
      ) {
        let date, excludeId, endTime, startTime;
        if (params.length === 4) {
          [date, excludeId, endTime, startTime] = params;
        } else {
          [date, endTime, startTime] = params;
        }

        return Array.from(tables.appointments.values())
          .filter(
            (a) =>
              a.date === date &&
              a.status !== 'cancelled' &&
              (!excludeId || a.id !== excludeId) &&
              a.start_time < endTime &&
              a.end_time > startTime
          )
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
      }

      // APPOINTMENTS getMonthSummary (must precede generic listByMonth check)
      if (trimmed.includes('COUNT(*) AS COUNT') && trimmed.includes('GROUP BY DATE')) {
        const [prefix] = params;
        const cleanPrefix = prefix.replace('%', '');
        const matching = Array.from(tables.appointments.values()).filter(
          (a) => a.date.startsWith(cleanPrefix) && a.status !== 'cancelled'
        );

        const map = new Map();
        for (const a of matching) {
          const cur = map.get(a.date) || { date: a.date, count: 0, attendedCount: 0 };
          cur.count++;
          if (a.status === 'attended') cur.attendedCount++;
          map.set(a.date, cur);
        }

        return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
      }

      // APPOINTMENTS listByDate
      if (trimmed.includes('FROM APPOINTMENTS') && trimmed.includes('WHERE DATE = ?')) {
        const [date] = params;
        return Array.from(tables.appointments.values())
          .filter((a) => a.date === date)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
      }

      // APPOINTMENTS listByMonth
      if (trimmed.includes('FROM APPOINTMENTS') && trimmed.includes('WHERE DATE LIKE ?') && trimmed.includes('ORDER BY DATE ASC')) {
        const [prefix] = params;
        const cleanPrefix = prefix.replace('%', '');
        return Array.from(tables.appointments.values())
          .filter((a) => a.date.startsWith(cleanPrefix))
          .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
      }

      // APPOINTMENTS listByPatientId
      if (trimmed.includes('FROM APPOINTMENTS WHERE PATIENT_ID = ?')) {
        const [patientId] = params;
        return Array.from(tables.appointments.values())
          .filter((a) => a.patient_id === patientId)
          .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
      }

      // APPOINTMENTS ALL
      if (trimmed.startsWith('SELECT * FROM APPOINTMENTS')) {
        return Array.from(tables.appointments.values()).sort(
          (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
        );
      }

      return [];
    },
  };
}

describe('M7 Clinical Agenda & Appointments QA Test Suite', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockAgendaDb({
      patients: [
        ['pat-1', { id: 'pat-1', name: 'Maria Silva', phone: '(22) 99999-1111', status: 'active' }],
        ['pat-2', { id: 'pat-2', name: 'Carla Dias', phone: '(22) 98888-2222', status: 'active' }],
        ['pat-3', { id: 'pat-3', name: 'Juliana Mendes', phone: '22977773333', status: 'active' }],
      ],
    });
  });

  // ============================================================================
  // 1. Strict Privacy & Schema Integrity
  // ============================================================================
  describe('1. Strict Privacy & Schema Integrity', () => {
    test('SCHEMA_V2 defines appointments table with CASCADE delete on patient_id', () => {
      assert.ok(SCHEMA_V2_TABLES.appointments);
      assert.ok(
        SCHEMA_V2_TABLES.appointments.includes('FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE')
      );
    });

    test('SCHEMA_V2 defines high-performance indices for date/time queries', () => {
      assert.ok(SCHEMA_V2_INDICES.includes('idx_appointments_date_time'));
      assert.ok(SCHEMA_V2_INDICES.includes('idx_appointments_patient_id'));
    });

    test('STRICT PRIVACY: Domain schemas and files strictly exclude CPF, CEP, and Estado Civil', () => {
      const apptPath = path.resolve(__dirname, '../src/types/appointment.ts');
      const repoPath = path.resolve(__dirname, '../src/database/repositories/appointmentRepository.ts');

      for (const f of [apptPath, repoPath]) {
        const content = fs.readFileSync(f, 'utf8');
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

    test('Sanitizers enforce valid enum constraints with safe defaults', () => {
      assert.equal(sanitizeAppointmentStatus('scheduled'), 'scheduled');
      assert.equal(sanitizeAppointmentStatus('attended'), 'attended');
      assert.equal(sanitizeAppointmentStatus('cancelled'), 'cancelled');
      assert.equal(sanitizeAppointmentStatus('absent'), 'absent');
      assert.equal(sanitizeAppointmentStatus('rescheduled'), 'rescheduled');
      assert.equal(sanitizeAppointmentStatus('unknown_status'), 'scheduled');

      assert.equal(sanitizeAppointmentType('pilates_individual'), 'pilates_individual');
      assert.equal(sanitizeAppointmentType('pilates_group'), 'pilates_group');
      assert.equal(sanitizeAppointmentType('clinical_evaluation'), 'clinical_evaluation');
      assert.equal(sanitizeAppointmentType('rehabilitation'), 'rehabilitation');
      assert.equal(sanitizeAppointmentType('non_existent'), 'pilates_individual');
    });
  });

  // ============================================================================
  // 2. Appointment Scheduling & Validation Flow
  // ============================================================================
  describe('2. Appointment Scheduling & Validation Flow', () => {
    test('Creates appointment with auto-resolved patient name from database', async () => {
      const apt = await appointmentRepository.create(
        {
          patient_id: 'pat-1',
          date: '2026-03-15',
          start_time: '09:00',
          end_time: '10:00',
          type: 'pilates_individual',
        },
        mockDb
      );

      assert.ok(apt.id);
      assert.equal(apt.patient_id, 'pat-1');
      assert.equal(apt.patient_name, 'Maria Silva');
      assert.equal(apt.status, 'scheduled');
      assert.equal(apt.type, 'pilates_individual');
      assert.equal(apt.date, '2026-03-15');
      assert.equal(apt.start_time, '09:00');
      assert.equal(apt.end_time, '10:00');
      assert.equal(apt.notes, null);
    });

    test('Fallback to "Paciente" when patient ID is not found in patients table', async () => {
      const apt = await appointmentRepository.create(
        {
          patient_id: 'pat-nonexistent',
          date: '2026-03-15',
          start_time: '14:00',
          end_time: '15:00',
        },
        mockDb
      );

      assert.equal(apt.patient_name, 'Paciente');
      assert.equal(apt.status, 'scheduled');
      assert.equal(apt.type, 'pilates_individual');
    });

    test('Boundary time intervals: supports earliest (00:00) and latest (23:59) appointment hours', async () => {
      const early = await appointmentRepository.create(
        {
          patient_id: 'pat-1',
          date: '2026-03-15',
          start_time: '00:00',
          end_time: '00:30',
        },
        mockDb
      );
      assert.equal(early.start_time, '00:00');
      assert.equal(early.end_time, '00:30');

      const late = await appointmentRepository.create(
        {
          patient_id: 'pat-2',
          date: '2026-03-15',
          start_time: '23:30',
          end_time: '23:59',
        },
        mockDb
      );
      assert.equal(late.start_time, '23:30');
      assert.equal(late.end_time, '23:59');
    });

    test('Finds appointment by ID, updates notes, and deletes cleanly', async () => {
      const apt = await appointmentRepository.create(
        {
          patient_id: 'pat-1',
          date: '2026-03-15',
          start_time: '10:00',
          end_time: '11:00',
          notes: 'Observação inicial',
        },
        mockDb
      );

      const found = await appointmentRepository.findById(apt.id, mockDb);
      assert.ok(found);
      assert.equal(found.notes, 'Observação inicial');

      const updated = await appointmentRepository.update(
        apt.id,
        { notes: 'Observação alterada' },
        mockDb
      );
      assert.equal(updated.notes, 'Observação alterada');

      const deleted = await appointmentRepository.delete(apt.id, mockDb);
      assert.equal(deleted, true);

      const notFound = await appointmentRepository.findById(apt.id, mockDb);
      assert.equal(notFound, null);
    });
  });

  // ============================================================================
  // 3. Schedule Conflict & Overlap Detection
  // ============================================================================
  describe('3. Schedule Conflict & Overlap Detection', () => {
    beforeEach(async () => {
      // Base existing appointment: 09:00 - 10:00
      await appointmentRepository.create(
        {
          patient_id: 'pat-1',
          date: '2026-03-20',
          start_time: '09:00',
          end_time: '10:00',
          status: 'scheduled',
        },
        mockDb
      );
    });

    test('Identifies exact time slot conflict (09:00 - 10:00)', async () => {
      const hasConflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '09:00',
        '10:00',
        undefined,
        mockDb
      );
      assert.equal(hasConflict, true);

      const conflicts = await appointmentRepository.findConflicts(
        '2026-03-20',
        '09:00',
        '10:00',
        undefined,
        mockDb
      );
      assert.equal(conflicts.length, 1);
    });

    test('Identifies enclosed interval conflict (09:15 - 09:45 within 09:00 - 10:00)', async () => {
      const hasConflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '09:15',
        '09:45',
        undefined,
        mockDb
      );
      assert.equal(hasConflict, true);
    });

    test('Identifies enclosing interval conflict (08:30 - 10:30 enclosing 09:00 - 10:00)', async () => {
      const hasConflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '08:30',
        '10:30',
        undefined,
        mockDb
      );
      assert.equal(hasConflict, true);
    });

    test('Identifies partial left overlap (08:30 - 09:30)', async () => {
      const hasConflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '08:30',
        '09:30',
        undefined,
        mockDb
      );
      assert.equal(hasConflict, true);
    });

    test('Identifies partial right overlap (09:30 - 10:30)', async () => {
      const hasConflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '09:30',
        '10:30',
        undefined,
        mockDb
      );
      assert.equal(hasConflict, true);
    });

    test('Boundary: Contiguous / adjacent time slots do NOT conflict (08:00 - 09:00 and 10:00 - 11:00)', async () => {
      const precedingConflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '08:00',
        '09:00',
        undefined,
        mockDb
      );
      assert.equal(precedingConflict, false, 'Preceding adjacent appointment ending at 09:00 should not conflict with 09:00-10:00');

      const subsequentConflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '10:00',
        '11:00',
        undefined,
        mockDb
      );
      assert.equal(subsequentConflict, false, 'Subsequent adjacent appointment starting at 10:00 should not conflict with 09:00-10:00');
    });

    test('Overlap with cancelled appointment is NOT treated as a conflict', async () => {
      // Create cancelled appointment at 14:00 - 15:00
      await appointmentRepository.create(
        {
          patient_id: 'pat-2',
          date: '2026-03-20',
          start_time: '14:00',
          end_time: '15:00',
          status: 'cancelled',
        },
        mockDb
      );

      const conflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '14:00',
        '15:00',
        undefined,
        mockDb
      );
      assert.equal(conflict, false);
    });

    test('Excludes self appointment ID when checking conflict during updates', async () => {
      const dayList = await appointmentRepository.listByDate('2026-03-20', mockDb);
      const existingId = dayList[0].id;

      // Checking same time slot but excluding existingId should return false
      const conflict = await appointmentRepository.hasConflict(
        '2026-03-20',
        '09:00',
        '10:00',
        existingId,
        mockDb
      );
      assert.equal(conflict, false);
    });

    test('Different dates do NOT conflict', async () => {
      const conflict = await appointmentRepository.hasConflict(
        '2026-03-21',
        '09:00',
        '10:00',
        undefined,
        mockDb
      );
      assert.equal(conflict, false);
    });
  });

  // ============================================================================
  // 4. Status Transitions & Attendance Metrics
  // ============================================================================
  describe('4. Status Transitions & Attendance Metrics', () => {
    test('Transitions status from scheduled -> attended, absent, cancelled, rescheduled', async () => {
      const apt = await appointmentRepository.create(
        {
          patient_id: 'pat-1',
          date: '2026-03-10',
          start_time: '08:00',
          end_time: '09:00',
        },
        mockDb
      );

      // Scheduled -> Attended
      let updated = await appointmentRepository.updateStatus(apt.id, 'attended', mockDb);
      assert.equal(updated.status, 'attended');

      // Attended -> Absent
      updated = await appointmentRepository.updateStatus(apt.id, 'absent', mockDb);
      assert.equal(updated.status, 'absent');

      // Absent -> Cancelled
      updated = await appointmentRepository.updateStatus(apt.id, 'cancelled', mockDb);
      assert.equal(updated.status, 'cancelled');

      // Cancelled -> Rescheduled
      updated = await appointmentRepository.updateStatus(apt.id, 'rescheduled', mockDb);
      assert.equal(updated.status, 'rescheduled');
    });

    test('getAttendanceStats correctly calculates metrics and attendance rate percentage', async () => {
      // 3 attended, 1 absent, 2 cancelled for pat-1
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-01', start_time: '08:00', end_time: '09:00', status: 'attended' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-03', start_time: '08:00', end_time: '09:00', status: 'attended' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-05', start_time: '08:00', end_time: '09:00', status: 'attended' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-07', start_time: '08:00', end_time: '09:00', status: 'absent' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-09', start_time: '08:00', end_time: '09:00', status: 'cancelled' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-11', start_time: '08:00', end_time: '09:00', status: 'cancelled' }, mockDb);

      const stats = await appointmentRepository.getAttendanceStats('pat-1', mockDb);
      assert.equal(stats.total, 6);
      assert.equal(stats.attended, 3);
      assert.equal(stats.absent, 1);
      assert.equal(stats.cancelled, 2);
      // Effective total = attended + absent = 4. Attendance rate = (3 / 4) * 100 = 75%
      assert.equal(stats.attendanceRate, 75);
    });

    test('getAttendanceStats boundary conditions: 0 appointments, only absent, only cancelled', async () => {
      // 0 appointments -> 100% default
      const emptyStats = await appointmentRepository.getAttendanceStats('pat-no-appts', mockDb);
      assert.equal(emptyStats.total, 0);
      assert.equal(emptyStats.attendanceRate, 100);

      // Only cancelled -> 100% (cancelled excluded from effective total)
      await appointmentRepository.create({ patient_id: 'pat-2', date: '2026-03-01', start_time: '08:00', end_time: '09:00', status: 'cancelled' }, mockDb);
      const cancelledStats = await appointmentRepository.getAttendanceStats('pat-2', mockDb);
      assert.equal(cancelledStats.cancelled, 1);
      assert.equal(cancelledStats.attendanceRate, 100);

      // Only absent -> 0%
      await appointmentRepository.create({ patient_id: 'pat-3', date: '2026-03-01', start_time: '08:00', end_time: '09:00', status: 'absent' }, mockDb);
      const absentStats = await appointmentRepository.getAttendanceStats('pat-3', mockDb);
      assert.equal(absentStats.absent, 1);
      assert.equal(absentStats.attendanceRate, 0);
    });
  });

  // ============================================================================
  // 5. Daily & Monthly Agenda Lookups
  // ============================================================================
  describe('5. Daily & Monthly Agenda Lookups', () => {
    test('listByDate retrieves appointments ordered strictly by start_time ASC', async () => {
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-15', start_time: '14:00', end_time: '15:00' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-2', date: '2026-03-15', start_time: '08:00', end_time: '09:00' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-15', start_time: '10:00', end_time: '11:00' }, mockDb);

      const dayList = await appointmentRepository.listByDate('2026-03-15', mockDb);
      assert.equal(dayList.length, 3);
      assert.equal(dayList[0].start_time, '08:00');
      assert.equal(dayList[1].start_time, '10:00');
      assert.equal(dayList[2].start_time, '14:00');
    });

    test('listByMonth retrieves month appointments chronologically', async () => {
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-20', start_time: '10:00', end_time: '11:00' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-2', date: '2026-03-05', start_time: '08:00', end_time: '09:00' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-04-01', start_time: '08:00', end_time: '09:00' }, mockDb);

      const marchList = await appointmentRepository.listByMonth('2026-03', mockDb);
      assert.equal(marchList.length, 2);
      assert.equal(marchList[0].date, '2026-03-05');
      assert.equal(marchList[1].date, '2026-03-20');
    });

    test('getMonthSummary aggregates total and attended appointments per date, excluding cancelled', async () => {
      const a1 = await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-10', start_time: '08:00', end_time: '09:00' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-2', date: '2026-03-10', start_time: '09:00', end_time: '10:00' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-3', date: '2026-03-10', start_time: '11:00', end_time: '12:00', status: 'cancelled' }, mockDb);
      await appointmentRepository.create({ patient_id: 'pat-1', date: '2026-03-11', start_time: '14:00', end_time: '15:00' }, mockDb);

      await appointmentRepository.updateStatus(a1.id, 'attended', mockDb);

      const summary = await appointmentRepository.getMonthSummary('2026-03', mockDb);
      assert.equal(summary.length, 2);

      const day10 = summary.find((s) => s.date === '2026-03-10');
      assert.ok(day10);
      assert.equal(day10.count, 2, 'Cancelled appointment must be excluded from summary count');
      assert.equal(day10.attendedCount, 1);

      const day11 = summary.find((s) => s.date === '2026-03-11');
      assert.ok(day11);
      assert.equal(day11.count, 1);
      assert.equal(day11.attendedCount, 0);
    });
  });

  // ============================================================================
  // 6. Current & Next Appointment Matching (System Time)
  // ============================================================================
  describe('6. Current & Immediate Next Calculation (getCurrentAndNext)', () => {
    let apt8to9, apt9to10, apt1030to1130;

    beforeEach(async () => {
      // 08:00 - 09:00
      apt8to9 = await appointmentRepository.create(
        { patient_id: 'pat-1', date: '2026-03-15', start_time: '08:00', end_time: '09:00' },
        mockDb
      );
      // 09:00 - 10:00
      apt9to10 = await appointmentRepository.create(
        { patient_id: 'pat-2', date: '2026-03-15', start_time: '09:00', end_time: '10:00' },
        mockDb
      );
      // 10:30 - 11:30
      apt1030to1130 = await appointmentRepository.create(
        { patient_id: 'pat-3', date: '2026-03-15', start_time: '10:30', end_time: '11:30' },
        mockDb
      );
    });

    test('Before day start (07:30): current is null, next is 08:00 appointment', async () => {
      const res = await appointmentRepository.getCurrentAndNext('07:30', '2026-03-15', mockDb);
      assert.equal(res.current, null);
      assert.ok(res.next);
      assert.equal(res.next.id, apt8to9.id);
    });

    test('Exactly at appointment start time (08:00): current is 08:00 appointment, next is 09:00', async () => {
      const res = await appointmentRepository.getCurrentAndNext('08:00', '2026-03-15', mockDb);
      assert.ok(res.current);
      assert.equal(res.current.id, apt8to9.id);
      assert.ok(res.next);
      assert.equal(res.next.id, apt9to10.id);
    });

    test('During appointment (09:15): current is 09:00 appointment, next is 10:30 appointment', async () => {
      const res = await appointmentRepository.getCurrentAndNext('09:15', '2026-03-15', mockDb);
      assert.ok(res.current);
      assert.equal(res.current.id, apt9to10.id);
      assert.ok(res.next);
      assert.equal(res.next.id, apt1030to1130.id);
    });

    test('In interval between appointments (10:15): current is null, next is 10:30 appointment', async () => {
      const res = await appointmentRepository.getCurrentAndNext('10:15', '2026-03-15', mockDb);
      assert.equal(res.current, null);
      assert.ok(res.next);
      assert.equal(res.next.id, apt1030to1130.id);
    });

    test('After day end (18:00): current is null, next is null', async () => {
      const res = await appointmentRepository.getCurrentAndNext('18:00', '2026-03-15', mockDb);
      assert.equal(res.current, null);
      assert.equal(res.next, null);
    });

    test('Cancelled and rescheduled appointments are strictly ignored by getCurrentAndNext', async () => {
      await appointmentRepository.updateStatus(apt9to10.id, 'cancelled', mockDb);

      // At 09:15, the cancelled appointment must not be returned as current
      const res = await appointmentRepository.getCurrentAndNext('09:15', '2026-03-15', mockDb);
      assert.equal(res.current, null);
      assert.ok(res.next);
      assert.equal(res.next.id, apt1030to1130.id);
    });
  });

  // ============================================================================
  // 7. WhatsApp Integration & Safe URL Formatting
  // ============================================================================
  describe('7. WhatsApp Integration & Safe URL Formatting', () => {
    test('cleanDigits strips formatting characters and handles null/undefined', () => {
      assert.equal(cleanDigits('(22) 99947-4304'), '22999474304');
      assert.equal(cleanDigits('+55 (21) 98765-4321'), '5521987654321');
      assert.equal(cleanDigits('abc123def'), '123');
      assert.equal(cleanDigits(''), '');
      assert.equal(cleanDigits(null), '');
      assert.equal(cleanDigits(undefined), '');
    });

    test('formatPhone formats 10-digit landline and 11-digit mobile correctly', () => {
      assert.equal(formatPhone('22999474304'), '(22) 99947-4304');
      assert.equal(formatPhone('2227601234'), '(22) 2760-1234');
      assert.equal(formatPhone(''), '');
      assert.equal(formatPhone(null), '');
    });

    test('formatWhatsAppUrl formats valid web URL with country code 55 without duplicating', () => {
      // Local number without 55
      const url1 = formatWhatsAppUrl('(22) 99947-4304', 'Olá!');
      assert.equal(url1, 'https://wa.me/5522999474304?text=Ol%C3%A1!');

      // Number already with 55 prefix
      const url2 = formatWhatsAppUrl('5522999474304', 'Olá!');
      assert.equal(url2, 'https://wa.me/5522999474304?text=Ol%C3%A1!');

      // Without message parameter
      const urlNoMsg = formatWhatsAppUrl('22999474304');
      assert.equal(urlNoMsg, 'https://wa.me/5522999474304');
    });

    test('formatWhatsAppDeepLink creates safe deep link and protects against parameter/CRLF injection', () => {
      const malicious = 'Normal text&another_param=injected\r\nHost: evil.com';
      const link = formatWhatsAppDeepLink('(22) 99947-4304', malicious);

      assert.ok(link.startsWith('whatsapp://send?phone=5522999474304&text='));

      const paramsPart = link.split('whatsapp://send?')[1];
      const parsedParams = new URLSearchParams(paramsPart);

      assert.equal(parsedParams.get('phone'), '5522999474304');
      assert.equal(parsedParams.get('another_param'), null, 'Parameter injection must be prevented');
      assert.equal(parsedParams.get('text'), malicious);
    });

    test('formatAppointmentConfirmationWhatsApp formats complete message with valid Brazilian encoding', () => {
      const result = formatAppointmentConfirmationWhatsApp(
        'Dra. Rogéria Collares',
        '18/03/2026',
        '09:00',
        '(22) 99947-4304'
      );

      assert.ok(result.deepLink.startsWith('whatsapp://send?phone=5522999474304'));
      assert.ok(result.webUrl.startsWith('https://wa.me/5522999474304'));

      const decoded = decodeURIComponent(result.deepLink);
      assert.ok(decoded.includes('Dra. Rogéria Collares'));
      assert.ok(decoded.includes('18/03/2026'));
      assert.ok(decoded.includes('09:00'));
      assert.ok(decoded.includes('Pilates Espaço Mulher'));
    });
  });
});
