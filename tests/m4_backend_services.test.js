require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  generateClinicalReportHtml,
  calculateBmi,
  calculateBmr,
  getBmiClassification,
  formatDateBR,
  formatDateTimeBR,
  escapeHtml,
  parseSafeJson,
  CLINIC_REPORT_IDENTITY,
} = require('../src/services/reportGenerator.ts');

const {
  generateClinicalReportPdf,
  shareReportPdf,
  printReportDirectAsync,
} = require('../src/services/pdfService.ts');

const {
  checkForUpdates,
  checkForUpdatesInBackground,
  compareSemVer,
  normalizeVersion,
  checkExpoUpdatesAsync,
  checkGitHubReleaseAsync,
} = require('../src/services/updateService.ts');

const {
  exerciseRepository,
  routineRepository,
} = require('../src/database/repositories/index.ts');

const mockExpoPrint = require('./mocks/expo-print.cjs');
const mockExpoUpdates = require('./mocks/expo-updates.cjs');
const mockExpoConstants = require('./mocks/expo-constants.cjs');

// Mock SQLite Database for repository testing
function createMockDb() {
  const exercises = new Map();
  const routines = new Map();
  const routine_items = new Map();
  let transactionCount = 0;

  return {
    tables: { exercises, routines, routine_items },
    getTransactionCount: () => transactionCount,
    async withTransactionAsync(task) {
      transactionCount++;
      await task();
    },
    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      // INSERT EXERCISE
      if (trimmed.startsWith('INSERT INTO EXERCISES')) {
        const [
          id, name, apparatus, description, default_springs,
          default_reps, default_sets, level, postural_focus,
          contraindications, is_custom, created_at, updated_at
        ] = params;
        exercises.set(id, {
          id, name, apparatus, description, default_springs,
          default_reps, default_sets, level, postural_focus,
          contraindications, is_custom, created_at, updated_at
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // INSERT ROUTINE
      if (trimmed.startsWith('INSERT INTO ROUTINES')) {
        const [id, patient_id, name, notes, status, created_at, updated_at] = params;
        routines.set(id, { id, patient_id, name, notes, status, created_at, updated_at });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE ROUTINES
      if (trimmed.startsWith('UPDATE ROUTINES SET')) {
        const id = params[params.length - 1];
        const existing = routines.get(id);
        if (existing) {
          const [name, notes, status, updated_at] = params;
          routines.set(id, { ...existing, name, notes, status, updated_at });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // DELETE ROUTINES
      if (trimmed.startsWith('DELETE FROM ROUTINES WHERE ID = ?')) {
        const [id] = params;
        const had = routines.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      // INSERT ROUTINE_ITEMS
      if (trimmed.startsWith('INSERT INTO ROUTINE_ITEMS')) {
        const [
          id, routine_id, exercise_id, sets, reps, springs_resistance,
          postural_notes, sort_order, created_at, updated_at
        ] = params;
        routine_items.set(id, {
          id, routine_id, exercise_id, sets, reps, springs_resistance,
          postural_notes, sort_order, created_at, updated_at
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // DELETE ROUTINE_ITEMS by routine_id
      if (trimmed.startsWith('DELETE FROM ROUTINE_ITEMS WHERE ROUTINE_ID = ?')) {
        const [routine_id] = params;
        let count = 0;
        for (const [key, item] of routine_items.entries()) {
          if (item.routine_id === routine_id) {
            routine_items.delete(key);
            count++;
          }
        }
        return { lastInsertRowId: 0, changes: count };
      }

      // DELETE ROUTINE_ITEMS by id
      if (trimmed.startsWith('DELETE FROM ROUTINE_ITEMS WHERE ID = ?')) {
        const [id] = params;
        const had = routine_items.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      // UPDATE ROUTINE_ITEMS
      if (trimmed.startsWith('UPDATE ROUTINE_ITEMS SET')) {
        const id = params[params.length - 1];
        const existing = routine_items.get(id);
        if (existing) {
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },
    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT * FROM ROUTINES WHERE ID = ?')) {
        return routines.get(params[0]) || null;
      }
      if (trimmed.startsWith('SELECT * FROM EXERCISES WHERE ID = ?')) {
        return exercises.get(params[0]) || null;
      }
      if (trimmed.includes('MAX(SORT_ORDER)')) {
        let max = -1;
        for (const item of routine_items.values()) {
          if (item.routine_id === params[0] && item.sort_order > max) {
            max = item.sort_order;
          }
        }
        return { maxOrder: max };
      }
      return null;
    },
    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.includes('FROM ROUTINE_ITEMS RI')) {
        const routine_id = params[0];
        const result = [];
        for (const item of routine_items.values()) {
          if (item.routine_id === routine_id) {
            const ex = exercises.get(item.exercise_id);
            result.push({
              ...item,
              ex_name: ex?.name,
              ex_apparatus: ex?.apparatus,
              ex_description: ex?.description,
              ex_default_springs: ex?.default_springs,
              ex_default_reps: ex?.default_reps,
              ex_default_sets: ex?.default_sets,
              ex_level: ex?.level,
              ex_postural_focus: ex?.postural_focus,
              ex_contraindications: ex?.contraindications,
              ex_is_custom: ex?.is_custom,
              ex_created_at: ex?.created_at,
              ex_updated_at: ex?.updated_at,
            });
          }
        }
        return result.sort((a, b) => a.sort_order - b.sort_order);
      }
      return [];
    }
  };
}

describe('M4 Backend Services & Logic Suite', () => {

  describe('1. Clinical Report & PDF Service (reportGenerator & pdfService)', () => {
    const mockPatient = {
      id: 'patient-uuid-123',
      name: 'Maria Antônia da Silva',
      birthdate: '1985-06-20',
      age: 39,
      phone: '(22) 99887-6655',
      address: 'Rua das Gaivotas, 100',
      neighborhood: 'Costa Azul',
      city_state: 'Rio das Ostras - RJ',
      email: 'maria.antonia@email.com',
      insurance: 'Unimed',
      status: 'active',
      created_at: '2025-01-10T10:00:00.000Z',
      updated_at: '2025-01-10T10:00:00.000Z',
    };

    const mockAnamnesis = {
      id: 'anamnesis-uuid-1',
      patient_id: 'patient-uuid-123',
      medications: 'Losartana 50mg, Levotiroxina 25mcg',
      allergies: 'Dipirona e Frutos do Mar',
      surgeries: 'Apendicectomia laparoscópica (2018)',
      fractures: JSON.stringify({
        has: 'sim',
        location: 'Rádio distal esquerdo',
        immobilization: 'Gesso por 4 semanas',
        physiotherapy: '15 sessões',
      }),
      luxations: JSON.stringify({
        has: 'nao',
      }),
      pregnancies: JSON.stringify({
        has: 'sim',
        quantity: 2,
        delivery_type: 'Cesariana',
        complications: 'Diástase abdominal de 2.5cm',
      }),
      abortions: JSON.stringify({
        has: 'nao',
      }),
      physical_activity: 'Caminhada 2x por semana',
      pain_complaints: JSON.stringify([
        {
          location: 'Coluna Lombar L4-L5',
          eva_intensity: 8,
          characteristics: 'Dor em queimação e pontada ao sentar',
          aggravating_factors: 'Permanecer sentada por mais de 30 minutos',
        },
        {
          location: 'Cintura Escapular Direita',
          eva_intensity: 4,
          characteristics: 'Sensação de peso e tensão',
          aggravating_factors: 'Uso prolongado de computador',
        },
      ]),
      pain_intensity: 8,
      imaging_exams: 'Ressonância Magnética de Coluna Lombar: Protrusão discal póstero-central L4-L5 sem compressão foraminal.',
      lab_tests: 'Hemograma completo e perfil glicêmico normais (Jan/2025).',
      clinical_notes: 'Paciente cooperativa, bom potencial cinético, foco em fortalecimento de core e descompressão discal.',
      created_at: '2025-01-10T11:00:00.000Z',
      updated_at: '2025-01-10T11:00:00.000Z',
    };

    const mockPostural = {
      id: 'postural-uuid-1',
      patient_id: 'patient-uuid-123',
      evaluation_date: '2025-01-12',
      head: 'D',
      shoulders: 'D',
      thales_triangle: 'D',
      knees: 'Valgos',
      feet: 'Pé plano bilateral flexível, leve hálux valgo à E',
      cervical: 'Retificada',
      lateral_shoulders: 'Protrusao',
      abdomen: 'Protuso',
      dorsal: 'Hipercifose',
      lumbar: 'Hiperlordose',
      pelvis: 'Anteversao',
      arch: 'Nao',
      scapula: 'Alada D',
      scoliosis: 'Leve escoliose lombar dextroconvexa no teste de Adams',
      posterior_pelvis: 'D',
      gluteal_line: 'D',
      popliteal_line: 'D',
      musculature: 'Hipotrofia de glúteos e transverso do abdômen; hipertonia de trapézio superior e eretores espinhais.',
      notes: 'Iniciar cinesioterapia de reequilíbrio lombo-pélvico com ênfase em Mat e Cadillac.',
      created_at: '2025-01-12T09:00:00.000Z',
      updated_at: '2025-01-12T09:00:00.000Z',
    };

    const mockBioimpedanceList = [
      {
        id: 'bio-1',
        patient_id: 'patient-uuid-123',
        evaluation_date: '2025-01-12',
        weight: 68.5,
        height: 165,
        abdominal_circ: 84,
        bmi: 25.2,
        body_age: 42,
        metabolic_age: 41,
        bmr: 1420,
        body_fat_percent: 32.5,
        visceral_fat: 6,
        muscle_mass_kg: 23.4,
        body_water_pct: 49.5,
        ideal_weight: 60.0,
        target_weight: 62.0,
        fat_arm_r: 28.5,
        fat_arm_l: 28.0,
        fat_trunk: 34.0,
        fat_leg_r: 31.0,
        fat_leg_l: 31.2,
        clinical_opinion: 'Sobrepeso leve com distribuição de gordura predominantemente androide.',
        created_at: '2025-01-12T09:30:00.000Z',
        updated_at: '2025-01-12T09:30:00.000Z',
      },
      {
        id: 'bio-2',
        patient_id: 'patient-uuid-123',
        evaluation_date: '2025-02-28',
        weight: 65.0,
        height: 165,
        abdominal_circ: 80,
        bmi: 23.9,
        body_age: 38,
        metabolic_age: 38,
        bmr: 1400,
        body_fat_percent: 29.8,
        visceral_fat: 5,
        muscle_mass_kg: 24.2,
        body_water_pct: 51.5,
        ideal_weight: 60.0,
        target_weight: 62.0,
        fat_arm_r: 26.5,
        fat_arm_l: 26.0,
        fat_trunk: 30.5,
        fat_leg_r: 29.0,
        fat_leg_l: 29.0,
        clinical_opinion: 'Evolução notável: redução de 3.5kg ponderal e 2.7% de gordura corporal, ganho de 800g de massa magra.',
        created_at: '2025-02-28T09:30:00.000Z',
        updated_at: '2025-02-28T09:30:00.000Z',
      },
    ];

    test('Header contains official clinic identity and Dra. Rogéria Collares credentials', () => {
      const html = generateClinicalReportHtml(mockPatient, mockAnamnesis, mockPostural, mockBioimpedanceList);

      assert.ok(html.includes('Dra. Rogéria Collares'), 'Must contain professional name');
      assert.ok(html.includes('CREFITO 23093-F'), 'Must contain CREFITO');
      assert.ok(html.includes('Pilates Espaço Mulher'), 'Must contain clinic name');
      assert.ok(html.includes('Costa Azul, Rio das Ostras'), 'Must contain clinic location');
      assert.ok(html.includes('(22) 99947-4304'), 'Must contain official WhatsApp phone');
    });

    test('STRICT NEGATIVE CONSTRAINT: Absolutely NO CPF, NO CEP, and NO Estado Civil in HTML', () => {
      const html = generateClinicalReportHtml(mockPatient, mockAnamnesis, mockPostural, mockBioimpedanceList);

      // Check regex for forbidden clinical fields
      assert.strictEqual(/\bCPF\b/i.test(html), false, 'CPF label must be completely absent');
      assert.strictEqual(/\bCEP\b/i.test(html), false, 'CEP label must be completely absent');
      assert.strictEqual(/Estado\s+Civil/i.test(html), false, 'Estado Civil must be completely absent');
    });

    test('Paleta oficial de cores aplicadas no template (#9B6CBA, #FAF8F5, #6A1B15, #1B5235)', () => {
      const html = generateClinicalReportHtml(mockPatient, mockAnamnesis, mockPostural, mockBioimpedanceList);

      assert.ok(html.includes('#9B6CBA') || html.includes('#7A4F94'), 'Must use lilac brand primaries');
      assert.ok(html.includes('#FAF8F5'), 'Must use warm surface neutral');
      assert.ok(html.includes('#6A1B15'), 'Must use wine red for alerts/severe pain');
      assert.ok(html.includes('#1B5235'), 'Must use forest green for healthy parameters');
    });

    test('Anamnese Clínica completa: queixas de dor EVA, medicações, cirurgias, fraturas, gestações', () => {
      const html = generateClinicalReportHtml(mockPatient, mockAnamnesis, mockPostural, mockBioimpedanceList);

      assert.ok(html.includes('Coluna Lombar L4-L5'), 'Must include lumbar pain complaint');
      assert.ok(html.includes('EVA 8/10'), 'Must include EVA 8 intensity badge');
      assert.ok(html.includes('Dipirona e Frutos do Mar'), 'Must include allergies');
      assert.ok(html.includes('Apendicectomia laparoscópica'), 'Must include surgical history');
      assert.ok(html.includes('Rádio distal esquerdo'), 'Must include fracture location');
      assert.ok(html.includes('Gestações: 2'), 'Must include obstetrics count');
      assert.ok(html.includes('Diástase abdominal de 2.5cm'), 'Must include diastasis details');
      assert.ok(html.includes('Protrusão discal póstero-central L4-L5'), 'Must include imaging exam notes');
    });

    test('Avaliação Postural detalhada: Frontal, Lateral, Posterior e Musculatura', () => {
      const html = generateClinicalReportHtml(mockPatient, mockAnamnesis, mockPostural, mockBioimpedanceList);

      assert.ok(html.includes('Vista Frontal'), 'Must include frontal view title');
      assert.ok(html.includes('Valgos'), 'Must include knee posture valgos');
      assert.ok(html.includes('Vista Lateral'), 'Must include lateral view title');
      assert.ok(html.includes('Retificada'), 'Must include cervical retificada');
      assert.ok(html.includes('Hipercifose'), 'Must include dorsal hipercifose');
      assert.ok(html.includes('Anteversao'), 'Must include pelvis anteversao');
      assert.ok(html.includes('Vista Posterior'), 'Must include posterior view title');
      assert.ok(html.includes('Alada D'), 'Must include winged scapula');
      assert.ok(html.includes('Hipotrofia de glúteos e transverso do abdômen'), 'Must include musculature assessment');
    });

    test('Tabela Evolutiva de Bioimpedância com cálculo de IMC, TMB e Gordura Segmentar', () => {
      const html = generateClinicalReportHtml(mockPatient, mockAnamnesis, mockPostural, mockBioimpedanceList);

      assert.ok(html.includes('Monitoramento Evolutivo da Bioimpedância'), 'Must contain bioimpedance section title');
      assert.ok(html.includes('68.5 kg') && html.includes('65.0 kg'), 'Must include both weight evaluations');
      assert.ok(html.includes('25.2') && html.includes('Sobrepeso'), 'Must evaluate BMI 25.2 as Sobrepeso');
      assert.ok(html.includes('23.9') && html.includes('Eutrófico'), 'Must evaluate BMI 23.9 as Eutrófico');
      assert.ok(html.includes('1420') && html.includes('1400'), 'Must include TMB / BMR kcal');
      assert.ok(html.includes('Braços: 28.5% D / 28% E') || html.includes('Braços: 28.5% D / 28.0% E'), 'Must include arm segmental fat');
      assert.ok(html.includes('Tronco: 34%') || html.includes('Tronco: 34.0%'), 'Must include trunk segmental fat');
      assert.ok(html.includes('Pernas: 31% D / 31.2% E') || html.includes('Pernas: 31.0% D / 31.2% E'), 'Must include leg segmental fat');
      assert.ok(html.includes('Evolução notável'), 'Must include clinician clinical opinion in evolution table');
    });

    test('Rodapé formal de assinatura com CREFITO e identificação da clínica', () => {
      const html = generateClinicalReportHtml(mockPatient, mockAnamnesis, mockPostural, mockBioimpedanceList);

      assert.ok(html.includes('signature-line'), 'Must include formal signature separator line');
      assert.ok(html.includes('Dra. Rogéria Collares'), 'Must sign as Dra. Rogéria Collares');
      assert.ok(html.includes('CREFITO 23093-F'), 'Must include CREFITO in signature');
    });

    test('Calculadoras matemáticas: calculateBmi, calculateBmr, e getBmiClassification', () => {
      // Normal weight
      const bmiNormal = calculateBmi(60, 165);
      assert.strictEqual(bmiNormal, 22.0);
      const classNormal = getBmiClassification(bmiNormal);
      assert.strictEqual(classNormal.label, 'Eutrófico (Normal)');
      assert.strictEqual(classNormal.color, '#1B5235');

      // Overweight
      const bmiOver = calculateBmi(75, 165);
      assert.strictEqual(bmiOver, 27.5);
      const classOver = getBmiClassification(bmiOver);
      assert.strictEqual(classOver.label, 'Sobrepeso');
      assert.strictEqual(classOver.color, '#C27803');

      // Underweight
      const bmiUnder = calculateBmi(45, 165);
      assert.strictEqual(bmiUnder, 16.5);
      const classUnder = getBmiClassification(bmiUnder);
      assert.strictEqual(classUnder.label, 'Abaixo do peso');

      // Obese class I
      const bmiObese = calculateBmi(85, 165);
      assert.strictEqual(bmiObese, 31.2);
      const classObese = getBmiClassification(bmiObese);
      assert.strictEqual(classObese.label, 'Obesidade Grau I');
      assert.strictEqual(classObese.color, '#6A1B15');

      // BMR calculation (Mifflin-St Jeor for females)
      // 10 * 60 + 6.25 * 165 - 5 * 35 - 161 = 600 + 1031.25 - 175 - 161 = 1295.25 -> 1295
      const bmr = calculateBmr(60, 165, 35);
      assert.strictEqual(bmr, 1295);
    });

    test('generateClinicalReportPdf generates PDF via expo-print and triggers expo-sharing', async () => {
      mockExpoPrint.reset();
      const result = await generateClinicalReportPdf(
        mockPatient,
        mockAnamnesis,
        mockPostural,
        mockBioimpedanceList,
        { share: true }
      );

      assert.ok(result.uri.startsWith('file://'), 'URI must point to generated file');
      assert.strictEqual(result.numberOfPages, 2, 'Must return number of pages');
      assert.ok(result.html.length > 500, 'HTML content must be generated');
      assert.ok(result.html.includes('Dra. Rogéria Collares'), 'HTML must contain clinic header');
    });

    test('Supports empty / null anamnesis, postural and bioimpedance gracefully', () => {
      const html = generateClinicalReportHtml(mockPatient, null, null, []);
      assert.ok(html.includes('Nenhuma anamnese clínica registrada'), 'Handles null anamnesis');
      assert.ok(html.includes('Nenhuma avaliação postural biomecânica registrada'), 'Handles null postural');
      assert.ok(html.includes('Nenhuma avaliação de bioimpedância registrada'), 'Handles empty bioimpedance');
      assert.ok(!html.includes('undefined'), 'Must not leak undefined into HTML output');
    });
  });

  describe('2. Update Detection Service (updateService)', () => {
    beforeEach(() => {
      mockExpoUpdates.__reset();
      mockExpoConstants.__reset();
    });

    test('Semantic version parsing and comparison (compareSemVer)', () => {
      assert.strictEqual(compareSemVer('1.0.1', '1.0.0'), 1, '1.0.1 is newer than 1.0.0');
      assert.strictEqual(compareSemVer('v1.2.0', '1.0.0'), 1, 'v1.2.0 is newer than 1.0.0');
      assert.strictEqual(compareSemVer('1.0.0', '1.0.0'), 0, 'Versions are identical');
      assert.strictEqual(compareSemVer('1.0.0', '1.0.1'), -1, '1.0.0 is older than 1.0.1');
      assert.strictEqual(compareSemVer('v2.0.0', '1.9.9'), 1, 'Major upgrade is newer');
      assert.strictEqual(compareSemVer('1.0.0-beta', '1.0.0'), 0, 'Prerelease prefix handled');
      assert.strictEqual(normalizeVersion('v1.5.3'), '1.5.3');
    });

    test('Primary check: detects OTA update via expo-updates when available', async () => {
      mockExpoUpdates.__setMockState({
        isEnabled: true,
        isAvailable: true,
        manifest: { id: 'ota-update-uuid' },
      });

      const result = await checkForUpdates();
      assert.strictEqual(result.isAvailable, true);
      assert.strictEqual(result.source, 'expo-updates');
      assert.strictEqual(result.currentVersion, '1.0.0');
    });

    test('Fallback check: detects update via GitHub Releases when expo-updates has no update', async () => {
      mockExpoUpdates.__setMockState({
        isEnabled: false, // E.g. dev build or expo updates disabled
        isAvailable: false,
      });

      // Mock global fetch for GitHub Releases API
      const origFetch = global.fetch;
      global.fetch = async (url) => {
        if (url.includes('/releases/latest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              tag_name: 'v1.2.0',
              name: 'Versão 1.2.0 — Avaliação Postural Aprimorada',
              body: 'Novos filtros e gráficos de evolução de bioimpedância.',
              html_url: 'https://github.com/pilates-espaco-mulher/releases/tag/v1.2.0',
              published_at: '2025-03-01T12:00:00Z',
              assets: [
                {
                  name: 'pilates-espaco-mulher-v1.2.0.apk',
                  browser_download_url: 'https://github.com/pilates-espaco-mulher/releases/download/v1.2.0/app.apk',
                  size: 45000000,
                  content_type: 'application/vnd.android.package-archive',
                },
              ],
            }),
          };
        }
        return origFetch(url);
      };

      try {
        const result = await checkForUpdates({ githubOwner: 'pilates-espaco-mulher', githubRepo: 'app' });
        assert.strictEqual(result.isAvailable, true);
        assert.strictEqual(result.source, 'github-release');
        assert.strictEqual(result.latestVersion, '1.2.0');
        assert.strictEqual(result.downloadUrl, 'https://github.com/pilates-espaco-mulher/releases/download/v1.2.0/app.apk');
        assert.ok(result.releaseNotes?.includes('Novos filtros'));
      } finally {
        global.fetch = origFetch;
      }
    });

    test('Graceful degradation: offline device or API failure never throws and returns isAvailable: false', async () => {
      mockExpoUpdates.__setMockState({
        isEnabled: true,
        checkError: new Error('Network request failed: device is offline'),
      });

      const origFetch = global.fetch;
      global.fetch = async () => {
        throw new Error('TypeError: Failed to fetch (Offline)');
      };

      try {
        const result = await checkForUpdates();
        assert.strictEqual(result.isAvailable, false);
        assert.strictEqual(result.source, 'none');
        assert.strictEqual(result.currentVersion, '1.0.0');
      } finally {
        global.fetch = origFetch;
      }
    });

    test('Non-blocking background update check (checkForUpdatesInBackground)', (t, done) => {
      mockExpoUpdates.__setMockState({
        isEnabled: false,
      });

      checkForUpdatesInBackground((result) => {
        assert.ok(result);
        assert.strictEqual(typeof result.isAvailable, 'boolean');
        done();
      });
    });
  });

  describe('3. Dynamic Exercises & Routines Repositories', () => {
    test('exerciseRepository.createCustomExercise saves strictly with is_custom = 1', async () => {
      const mockDb = createMockDb();

      const created = await exerciseRepository.createCustomExercise(
        {
          name: 'Ponte Unilateral com Bola no Reformer',
          apparatus: 'Reformer',
          description: 'Elevação pélvica unilateral com apoio dos pés sobre a bola suíça.',
          default_springs: '1 Vermelha',
          default_reps: '12',
          default_sets: 3,
          level: 'intermediário',
          postural_focus: 'Ativação de glúteo máximo e isquiotibiais',
          contraindications: 'Lombalgia aguda',
        },
        mockDb
      );

      assert.ok(created.id, 'Exercise must have an ID');
      assert.strictEqual(created.is_custom, 1, 'Custom exercise must have is_custom = 1');
      assert.strictEqual(created.name, 'Ponte Unilateral com Bola no Reformer');

      const saved = mockDb.tables.exercises.get(created.id);
      assert.strictEqual(saved.is_custom, 1, 'Saved record in SQLite must have is_custom = 1');
    });

    test('routineRepository.create runs inside an atomic transaction (withTransactionAsync)', async () => {
      const mockDb = createMockDb();
      const patientId = 'patient-test-1';

      const beforeTx = mockDb.getTransactionCount();

      const routine = await routineRepository.create(
        patientId,
        {
          name: 'Treino A — Fortalecimento e Reeducação Postural',
          notes: 'Foco em extensão torácica e mobilidade de quadril',
          items: [
            {
              exercise_id: 'ex-1',
              sets: 3,
              reps: '10',
              springs_resistance: '1 Vermelha + 1 Azul',
              postural_notes: 'Cuidado com hiperextensão lombar',
            },
            {
              exercise_id: 'ex-2',
              sets: 2,
              reps: '12',
              springs_resistance: 'Amarela',
            },
          ],
        },
        mockDb
      );

      const afterTx = mockDb.getTransactionCount();
      assert.ok(afterTx > beforeTx, 'create must execute inside withTransactionAsync');
      assert.strictEqual(routine.name, 'Treino A — Fortalecimento e Reeducação Postural');
      assert.strictEqual(routine.items.length, 2, 'Must hydrate 2 routine items');
    });

    test('routineRepository.update runs atomically and replaces items within transaction if provided', async () => {
      const mockDb = createMockDb();
      const patientId = 'patient-test-2';

      const initial = await routineRepository.create(
        patientId,
        {
          name: 'Treino B',
          items: [
            { exercise_id: 'ex-old', sets: 1, reps: '10' }
          ]
        },
        mockDb
      );

      const beforeTx = mockDb.getTransactionCount();

      const updated = await routineRepository.update(
        initial.id,
        {
          name: 'Treino B Atualizado',
          notes: 'Notas atualizadas',
          items: [
            { exercise_id: 'ex-new-1', sets: 3, reps: '12' },
            { exercise_id: 'ex-new-2', sets: 4, reps: '8' },
          ],
        },
        mockDb
      );

      const afterTx = mockDb.getTransactionCount();
      assert.ok(afterTx > beforeTx, 'update must execute inside withTransactionAsync');
      assert.strictEqual(updated?.name, 'Treino B Atualizado');
      assert.strictEqual(updated?.items.length, 2);
      assert.strictEqual(updated?.items[0].exercise_id, 'ex-new-1');
      assert.strictEqual(updated?.items[1].exercise_id, 'ex-new-2');
    });

    test('routineRepository.delete executes atomically via withTransactionAsync deleting items and routine', async () => {
      const mockDb = createMockDb();
      const patientId = 'patient-test-3';

      const routine = await routineRepository.create(
        patientId,
        {
          name: 'Treino para Deletar',
          items: [{ exercise_id: 'ex-del', sets: 1, reps: '10' }],
        },
        mockDb
      );

      assert.ok(mockDb.tables.routines.has(routine.id));
      assert.strictEqual(mockDb.tables.routine_items.size, 1);

      const beforeTx = mockDb.getTransactionCount();
      const deleted = await routineRepository.delete(routine.id, mockDb);
      const afterTx = mockDb.getTransactionCount();

      assert.strictEqual(deleted, true);
      assert.ok(afterTx > beforeTx, 'delete must execute inside withTransactionAsync');
      assert.strictEqual(mockDb.tables.routines.has(routine.id), false, 'Routine must be removed');
      assert.strictEqual(mockDb.tables.routine_items.size, 0, 'Routine items must be removed');
    });

    test('routineRepository.addItem and removeItem execute atomically', async () => {
      const mockDb = createMockDb();
      const patientId = 'patient-test-4';

      const routine = await routineRepository.create(
        patientId,
        { name: 'Treino C' },
        mockDb
      );

      // addItem
      const beforeAdd = mockDb.getTransactionCount();
      const item = await routineRepository.addItem(
        routine.id,
        { exercise_id: 'ex-add', sets: 3, reps: '15' },
        mockDb
      );
      const afterAdd = mockDb.getTransactionCount();
      assert.ok(afterAdd > beforeAdd, 'addItem must use withTransactionAsync');
      assert.strictEqual(item.exercise_id, 'ex-add');

      // removeItem
      const beforeRemove = mockDb.getTransactionCount();
      const removed = await routineRepository.removeItem(item.id, mockDb);
      const afterRemove = mockDb.getTransactionCount();
      assert.ok(afterRemove > beforeRemove, 'removeItem must use withTransactionAsync');
      assert.strictEqual(removed, true);
    });
  });
});
