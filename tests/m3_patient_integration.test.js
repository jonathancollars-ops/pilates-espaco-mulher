/**
 * Test Suite: tests/m3_patient_integration.test.js
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Milestone 3: Patient Management, Real-Time Search, Form Validation,
 * Reactive State Provider, and Zero-Login Startup Integration Tests.
 */

require('./mock-rn.cjs');
require('tsx/cjs');

const path = require('node:path');
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const projectRoot = path.resolve(__dirname, '..');

const {
  patientRepository,
} = require(path.join(projectRoot, 'src', 'database', 'repositories', 'patientRepository.ts'));
const {
  formatPhone,
  cleanDigits,
  formatDateBR,
  parseBRDateToISO,
  calculateAge,
} = require(path.join(projectRoot, 'src', 'utils', 'formatters.ts'));
const { CLINIC_IDENTITY } = require(path.join(projectRoot, 'src', 'design-system', 'ClinicIdentity.tsx'));

// In-Memory Mock Database for isolated testing
function createMockDatabase() {
  const patientsTable = new Map();
  const childEvaluations = new Map();

  return {
    patientsTable,
    childEvaluations,
    async execAsync() {},
    async withTransactionAsync(task) {
      await task();
    },
    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT INTO PATIENTS')) {
        const [
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at,
        ] = params;
        patientsTable.set(id, {
          id, name, birthdate, age, phone, address, neighborhood,
          city_state, email, insurance, status, created_at, updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      if (trimmed.startsWith('UPDATE PATIENTS')) {
        const id = params[params.length - 1];
        const existing = patientsTable.get(id);
        if (existing) {
          const [
            name, birthdate, age, phone, address, neighborhood,
            city_state, email, insurance, status, updated_at,
          ] = params;
          patientsTable.set(id, {
            ...existing,
            name, birthdate, age, phone, address, neighborhood,
            city_state, email, insurance, status, updated_at,
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      if (trimmed.startsWith('DELETE FROM PATIENTS')) {
        const [id] = params;
        const existed = patientsTable.delete(id);
        // Cascade delete mock
        childEvaluations.delete(id);
        return { lastInsertRowId: 0, changes: existed ? 1 : 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },
    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT * FROM PATIENTS WHERE ID = ?')) {
        const [id] = params;
        return patientsTable.get(id) || null;
      }
      if (trimmed.startsWith('SELECT COUNT(*)')) {
        const status = params[0];
        let count = 0;
        for (const p of patientsTable.values()) {
          if (!status || p.status === status) count++;
        }
        return { count };
      }
      return null;
    },
    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      let list = Array.from(patientsTable.values());

      if (trimmed.includes('STATUS = ?')) {
        const status = params[0];
        list = list.filter((p) => p.status === status);
      }

      if (trimmed.includes('NAME LIKE ? OR PHONE LIKE ?')) {
        const term = String(params[0] || '').replace(/%/g, '').toLowerCase();
        const digits = cleanDigits(term);
        list = list.filter((p) => {
          const matchName = p.name.toLowerCase().includes(term);
          const matchPhone = p.phone.toLowerCase().includes(term);
          const matchDigits = digits.length > 0 ? cleanDigits(p.phone).includes(digits) : false;
          return matchName || matchPhone || matchDigits;
        });
      }

      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      return list;
    },
  };
}

describe('Milestone 3 — App Startup, Navigation & Reactive Patient Integration', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockDatabase();
  });

  describe('1. Zero-Login Startup & Clinical Identity', () => {
    test('Official clinic identity constants are present and verified', () => {
      assert.strictEqual(CLINIC_IDENTITY.professionalName, 'Dra. Rogéria Collares');
      assert.strictEqual(CLINIC_IDENTITY.crefito, 'CREFITO 23093-F');
      assert.strictEqual(CLINIC_IDENTITY.clinicName, 'Pilates Espaço Mulher');
      assert.strictEqual(CLINIC_IDENTITY.phone, '(22) 99947-4304');
      assert.strictEqual(CLINIC_IDENTITY.location, 'Costa Azul, Rio das Ostras - RJ');
    });

    test('Zero login screens: Navigation mounts directly on Pacientes tab as root initialRoute', () => {
      const navSource = fs.readFileSync(path.join(projectRoot, 'src', 'navigation', 'index.tsx'), 'utf8');
      assert.ok(navSource.includes('initialRouteName="Pacientes"'), 'RootNavigator must define initialRouteName="Pacientes"');
      assert.ok(!navSource.includes('LoginScreen'), 'Must not contain any LoginScreen');
      assert.ok(!navSource.includes('AuthNavigator'), 'Must not contain AuthNavigator');
    });

    test('App.tsx lifecycle: initializes getDatabase(), displays AppLoadingSplash and mounts PatientProvider', () => {
      const appSource = fs.readFileSync(path.join(projectRoot, 'App.tsx'), 'utf8');
      assert.ok(appSource.includes('getDatabase()'), 'App.tsx must call getDatabase()');
      assert.ok(appSource.includes('AppLoadingSplash'), 'App.tsx must render AppLoadingSplash');
      assert.ok(appSource.includes('PatientProvider'), 'App.tsx must wrap navigation in PatientProvider');
      assert.ok(!appSource.includes('SignIn'), 'App.tsx must have zero authentication');
    });
  });

  describe('2. Patient Intake Form Validation & Clinical Rules', () => {
    test('Creates patient with mandatory name and phone, defaulting city_state to Rio das Ostras - RJ', async () => {
      const created = await patientRepository.create(
        {
          name: 'Mariana Silva',
          phone: '(22) 99947-4304',
        },
        mockDb
      );

      assert.ok(created.id);
      assert.strictEqual(created.name, 'Mariana Silva');
      assert.strictEqual(created.phone, '(22) 99947-4304');
      assert.strictEqual(created.city_state, 'Rio das Ostras - RJ');
      assert.strictEqual(created.status, 'active');
    });

    test('Strictly EXCLUDES CPF, Estado Civil, and CEP from schema and input', async () => {
      const rawInput = {
        name: 'Camila Santos',
        phone: '(22) 98888-7777',
        cpf: '123.456.789-00', // Unauthorized field
        estado_civil: 'Casada', // Unauthorized field
        cep: '28890-000', // Unauthorized field
      };

      const created = await patientRepository.create(rawInput, mockDb);
      assert.strictEqual(created.cpf, undefined, 'CPF must not exist on Patient entity');
      assert.strictEqual(created.estado_civil, undefined, 'Estado civil must not exist on Patient entity');
      assert.strictEqual(created.cep, undefined, 'CEP must not exist on Patient entity');
    });

    test('Calculates age automatically when birthdate is provided (DD/MM/YYYY to ISO)', () => {
      const birthdateBR = '15/08/1990';
      const isoDate = parseBRDateToISO(birthdateBR);
      assert.strictEqual(isoDate, '1990-08-15');

      const age = calculateAge(isoDate);
      assert.ok(typeof age === 'number');
      assert.ok(age >= 30 && age <= 40);
    });

    test('Formats phone input interactively with mask: (XX) XXXXX-XXXX', () => {
      assert.strictEqual(formatPhone('22999474304'), '(22) 99947-4304');
      assert.strictEqual(formatPhone('2227641234'), '(22) 2764-1234');
      assert.strictEqual(cleanDigits('(22) 99947-4304'), '22999474304');
    });
  });

  describe('3. Reactive CRUD Operations', () => {
    test('Create -> Update -> Delete reactive lifecycle', async () => {
      // 1. Create
      const patient = await patientRepository.create(
        {
          name: 'Beatriz Costa',
          phone: '(22) 99111-2222',
          neighborhood: 'Costa Azul',
          insurance: 'Unimed',
        },
        mockDb
      );
      assert.strictEqual(patient.name, 'Beatriz Costa');

      // 2. Update
      const updated = await patientRepository.update(
        patient.id,
        {
          insurance: 'Particular',
          status: 'discharged',
        },
        mockDb
      );
      assert.strictEqual(updated?.insurance, 'Particular');
      assert.strictEqual(updated?.status, 'discharged');

      // 3. Delete
      const deleted = await patientRepository.delete(patient.id, mockDb);
      assert.strictEqual(deleted, true);

      // Verify deletion
      const found = await patientRepository.findById(patient.id, mockDb);
      assert.strictEqual(found, null);
    });
  });

  describe('4. Real-Time Search & Status Filtering', () => {
    beforeEach(async () => {
      await patientRepository.create(
        { name: 'Mariana Silva', phone: '(22) 99947-4304', status: 'active' },
        mockDb
      );
      await patientRepository.create(
        { name: 'Beatriz Costa', phone: '(22) 99888-1111', status: 'active' },
        mockDb
      );
      await patientRepository.create(
        { name: 'Camila Santos', phone: '(21) 98765-4321', status: 'discharged' },
        mockDb
      );
    });

    test('Instant search filters patients by name case-insensitively', async () => {
      const results = await patientRepository.search('mariana', {}, mockDb);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Mariana Silva');
    });

    test('Instant search filters patients by phone number digits', async () => {
      const results = await patientRepository.search('99947', {}, mockDb);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Mariana Silva');
    });

    test('Filters patients by clinical status (active vs discharged)', async () => {
      const activePatients = await patientRepository.listAll({ status: 'active' }, mockDb);
      assert.strictEqual(activePatients.length, 2);

      const dischargedPatients = await patientRepository.listAll({ status: 'discharged' }, mockDb);
      assert.strictEqual(dischargedPatients.length, 1);
      assert.strictEqual(dischargedPatients[0].name, 'Camila Santos');
    });

    test('Returns empty array when search query does not match any patient', async () => {
      const results = await patientRepository.search('NonExistentNameXYZ', {}, mockDb);
      assert.strictEqual(results.length, 0);
    });
  });

  describe('5. Boundary Cases & Search Resilience', () => {
    beforeEach(async () => {
      await patientRepository.create(
        { name: 'Ana Flávia Souza', phone: '(22) 99777-1111', status: 'active' },
        mockDb
      );
      await patientRepository.create(
        { name: 'Cláudia Ramos', phone: '(22) 99888-2222', status: 'active' },
        mockDb
      );
    });

    test('Search handles regex special characters without crashing: ( ) [ ] * + ?', async () => {
      // User types parentheses like "(22)"
      const results1 = await patientRepository.search('(22)', {}, mockDb);
      assert.ok(results1.length >= 1);

      // User types regex metacharacters
      const results2 = await patientRepository.search('[test]*+?', {}, mockDb);
      assert.strictEqual(results2.length, 0);
    });

    test('Search trims leading and trailing whitespace', async () => {
      const results = await patientRepository.search('   Ana   ', {}, mockDb);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Ana Flávia Souza');
    });

    test('Date parsing rejects invalid dates (month > 12, day > 31, malformed)', () => {
      assert.strictEqual(parseBRDateToISO('32/01/2000'), null);
      assert.strictEqual(parseBRDateToISO('15/13/2000'), null);
      assert.strictEqual(parseBRDateToISO('invalid-date'), null);
      assert.strictEqual(parseBRDateToISO(''), null);
    });
  });

  describe('6. Reactive Patient State Management Simulation', () => {
    test('Simulates instant reactive updates: create inserts and sorts alphabetically', () => {
      let state = [
        { id: '1', name: 'Bruna Lima', phone: '(22) 99999-1111', city_state: 'Rio das Ostras - RJ', status: 'active' },
        { id: '2', name: 'Zélia Prado', phone: '(22) 99999-2222', city_state: 'Rio das Ostras - RJ', status: 'active' },
      ];

      // Simulate create action in PatientContext
      const newPatient = {
        id: '3',
        name: 'Aline Castro',
        phone: '(22) 99999-3333',
        city_state: 'Rio das Ostras - RJ',
        status: 'active',
      };

      state = [newPatient, ...state].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      assert.strictEqual(state.length, 3);
      assert.strictEqual(state[0].name, 'Aline Castro');
      assert.strictEqual(state[1].name, 'Bruna Lima');
      assert.strictEqual(state[2].name, 'Zélia Prado');
    });

    test('Simulates instant reactive update: update patient modifies target without affecting peers', () => {
      let state = [
        { id: '1', name: 'Bruna Lima', phone: '(22) 99999-1111', insurance: 'Particular' },
        { id: '2', name: 'Zélia Prado', phone: '(22) 99999-2222', insurance: 'Unimed' },
      ];

      // Simulate update action
      const updatedId = '1';
      state = state.map((p) => (p.id === updatedId ? { ...p, insurance: 'Bradesco Saúde' } : p));

      assert.strictEqual(state.find((p) => p.id === '1').insurance, 'Bradesco Saúde');
      assert.strictEqual(state.find((p) => p.id === '2').insurance, 'Unimed');
    });

    test('Simulates instant reactive deletion: delete patient removes target instantly', () => {
      let state = [
        { id: '1', name: 'Bruna Lima' },
        { id: '2', name: 'Zélia Prado' },
      ];

      // Simulate delete action
      const deleteId = '1';
      state = state.filter((p) => p.id !== deleteId);

      assert.strictEqual(state.length, 1);
      assert.strictEqual(state[0].id, '2');
    });
  });
});
