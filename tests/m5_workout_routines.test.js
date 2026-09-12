require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  exerciseRepository,
} = require('../src/database/repositories/exerciseRepository.ts');

const {
  routineRepository,
} = require('../src/database/repositories/routineRepository.ts');

/**
 * Creates an in-memory transactional mock database for exercises and workout routines.
 * Supports complete rollback on transaction failure, matching SQLite ACID semantics.
 */
function createWorkoutMockDb(initialExercises = []) {
  let tables = {
    exercises: new Map(initialExercises.map((e) => [e.id, { ...e }])),
    routines: new Map(),
    routine_items: new Map(),
  };

  let failNextInsert = null;

  return {
    get tables() {
      return tables;
    },
    setFailNextInsert(tableName) {
      failNextInsert = tableName;
    },

    async withTransactionAsync(task) {
      // Create deep snapshot for rollback
      const snapshot = {
        exercises: new Map(Array.from(tables.exercises.entries()).map(([k, v]) => [k, { ...v }])),
        routines: new Map(Array.from(tables.routines.entries()).map(([k, v]) => [k, { ...v }])),
        routine_items: new Map(Array.from(tables.routine_items.entries()).map(([k, v]) => [k, { ...v }])),
      };

      try {
        await task();
      } catch (err) {
        // Rollback on failure
        tables = snapshot;
        throw err;
      }
    },

    async runAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      // INSERT EXERCISE
      if (trimmed.startsWith('INSERT INTO EXERCISES')) {
        if (failNextInsert === 'exercises') {
          failNextInsert = null;
          throw new Error('Simulated SQLite Disk Error: cannot write to exercises table');
        }
        const [
          id, name, apparatus, description, default_springs,
          default_reps, default_sets, level, postural_focus,
          contraindications, is_custom, created_at, updated_at,
        ] = params;

        tables.exercises.set(id, {
          id,
          name,
          apparatus,
          description,
          default_springs,
          default_reps,
          default_sets,
          level,
          postural_focus,
          contraindications,
          is_custom,
          created_at,
          updated_at,
        });

        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE EXERCISES
      if (trimmed.startsWith('UPDATE EXERCISES SET')) {
        const id = params[params.length - 1];
        const existing = tables.exercises.get(id);
        if (existing) {
          const [
            name, apparatus, description, default_springs,
            default_reps, default_sets, level, postural_focus,
            contraindications, updated_at,
          ] = params;

          tables.exercises.set(id, {
            ...existing,
            name,
            apparatus,
            description,
            default_springs,
            default_reps,
            default_sets,
            level,
            postural_focus,
            contraindications,
            updated_at,
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // DELETE EXERCISES
      if (trimmed.startsWith('DELETE FROM EXERCISES WHERE ID = ?')) {
        const [id] = params;
        const had = tables.exercises.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      // INSERT ROUTINES
      if (trimmed.startsWith('INSERT INTO ROUTINES')) {
        if (failNextInsert === 'routines') {
          failNextInsert = null;
          throw new Error('Simulated SQLite Disk Error: cannot write to routines table');
        }
        const [id, patient_id, name, notes, status, created_at, updated_at] = params;
        tables.routines.set(id, {
          id,
          patient_id,
          name,
          notes,
          status,
          created_at,
          updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // UPDATE ROUTINES
      if (trimmed.startsWith('UPDATE ROUTINES SET')) {
        const id = params[params.length - 1];
        const existing = tables.routines.get(id);
        if (existing) {
          const [name, notes, status, updated_at] = params;
          tables.routines.set(id, {
            ...existing,
            name,
            notes,
            status,
            updated_at,
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      // DELETE ROUTINES
      if (trimmed.startsWith('DELETE FROM ROUTINES WHERE ID = ?')) {
        const [id] = params;
        const had = tables.routines.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      // INSERT ROUTINE_ITEMS
      if (trimmed.startsWith('INSERT INTO ROUTINE_ITEMS')) {
        if (failNextInsert === 'routine_items') {
          failNextInsert = null;
          throw new Error('Simulated SQLite Disk Error: foreign key or disk error writing routine_items');
        }
        const [
          id, routine_id, exercise_id, sets, reps, springs_resistance,
          postural_notes, sort_order, created_at, updated_at,
        ] = params;

        tables.routine_items.set(id, {
          id,
          routine_id,
          exercise_id,
          sets,
          reps,
          springs_resistance,
          postural_notes,
          sort_order,
          created_at,
          updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }

      // DELETE ROUTINE_ITEMS by routine_id
      if (trimmed.startsWith('DELETE FROM ROUTINE_ITEMS WHERE ROUTINE_ID = ?')) {
        const [routine_id] = params;
        let deletedCount = 0;
        for (const [k, item] of Array.from(tables.routine_items.entries())) {
          if (item.routine_id === routine_id) {
            tables.routine_items.delete(k);
            deletedCount++;
          }
        }
        return { lastInsertRowId: 0, changes: deletedCount };
      }

      // DELETE ROUTINE_ITEMS by id
      if (trimmed.startsWith('DELETE FROM ROUTINE_ITEMS WHERE ID = ?')) {
        const [id] = params;
        const had = tables.routine_items.delete(id);
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }

      // UPDATE ROUTINE_ITEMS
      if (trimmed.startsWith('UPDATE ROUTINE_ITEMS SET')) {
        if (trimmed.includes('WHERE ID = ? AND ROUTINE_ID = ?')) {
          const [sort_order, id, routine_id] = params;
          const existing = tables.routine_items.get(id);
          if (existing) {
            tables.routine_items.set(id, { ...existing, sort_order });
            return { lastInsertRowId: 1, changes: 1 };
          }
          return { lastInsertRowId: 0, changes: 0 };
        }

        const id = params[params.length - 1];
        const existing = tables.routine_items.get(id);
        if (existing) {
          if (trimmed.includes('SORT_ORDER = ?')) {
            const [sort_order, updated_at] = params;
            tables.routine_items.set(id, { ...existing, sort_order, updated_at });
          } else {
            const [sets, reps, springs_resistance, postural_notes, sort_order, updated_at] = params;
            tables.routine_items.set(id, {
              ...existing,
              sets,
              reps,
              springs_resistance,
              postural_notes,
              sort_order,
              updated_at,
            });
          }
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }

      return { lastInsertRowId: 0, changes: 0 };
    },

    async getFirstAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT * FROM EXERCISES WHERE ID = ?')) {
        return tables.exercises.get(params[0]) || null;
      }

      if (trimmed.startsWith('SELECT * FROM ROUTINES WHERE ID = ?')) {
        return tables.routines.get(params[0]) || null;
      }

      if (trimmed.startsWith('SELECT * FROM ROUTINE_ITEMS WHERE ID = ?')) {
        return tables.routine_items.get(params[0]) || null;
      }

      return null;
    },

    async getAllAsync(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();

      // Query routines by patient_id
      if (trimmed.startsWith('SELECT * FROM ROUTINES WHERE PATIENT_ID = ?')) {
        const [patientId] = params;
        return Array.from(tables.routines.values())
          .filter((r) => r.patient_id === patientId)
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      }

      // Query routine_items joined with exercises for findById
      if (trimmed.includes('FROM ROUTINE_ITEMS RI') && trimmed.includes('LEFT JOIN EXERCISES E')) {
        const [routineId] = params;
        const items = Array.from(tables.routine_items.values())
          .filter((item) => item.routine_id === routineId)
          .sort((a, b) => {
            const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
            if (orderDiff !== 0) return orderDiff;
            return (a.created_at || '').localeCompare(b.created_at || '');
          });

        return items.map((item) => {
          const ex = tables.exercises.get(item.exercise_id);
          return {
            id: item.id,
            routine_id: item.routine_id,
            exercise_id: item.exercise_id,
            sets: item.sets,
            reps: item.reps,
            springs_resistance: item.springs_resistance,
            postural_notes: item.postural_notes,
            sort_order: item.sort_order,
            created_at: item.created_at,
            updated_at: item.updated_at,
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
          };
        });
      }

      // Query exercises with filters
      if (trimmed.startsWith('SELECT * FROM EXERCISES WHERE 1=1')) {
        let results = Array.from(tables.exercises.values());

        // We filter based on SQL conditions and params
        let paramIdx = 0;
        if (trimmed.includes('APPARATUS = ?')) {
          const targetApparatus = params[paramIdx++];
          results = results.filter((e) => e.apparatus === targetApparatus);
        }
        if (trimmed.includes('LEVEL = ?')) {
          const targetLevel = params[paramIdx++];
          results = results.filter((e) => e.level === targetLevel);
        }
        if (trimmed.includes('IS_CUSTOM = 1')) {
          results = results.filter((e) => e.is_custom === 1);
        }
        if (trimmed.includes('IS_CUSTOM = ?')) {
          const targetIsCustom = params[paramIdx++];
          results = results.filter((e) => e.is_custom === targetIsCustom);
        }
        if (trimmed.includes('(NAME LIKE ? OR DESCRIPTION LIKE ? OR POSTURAL_FOCUS LIKE ?)')) {
          const likePattern = params[paramIdx++];
          paramIdx += 2; // skips the other two duplicate likes in param list
          const rawSearch = likePattern.replace(/%/g, '').toLowerCase();
          results = results.filter(
            (e) =>
              (e.name || '').toLowerCase().includes(rawSearch) ||
              (e.description || '').toLowerCase().includes(rawSearch) ||
              (e.postural_focus || '').toLowerCase().includes(rawSearch)
          );
        }

        // Sorting: apparatus ASC, name ASC
        results.sort((a, b) => {
          const appCmp = (a.apparatus || '').localeCompare(b.apparatus || '');
          if (appCmp !== 0) return appCmp;
          return (a.name || '').localeCompare(b.name || '');
        });

        return results;
      }

      return [];
    },
  };
}

describe('M5 Workout Prescription & Dynamic Exercise Routines Suite', () => {
  let mockDb;
  const PATIENT_ID = 'patient-regina-m5';

  // Seed classical exercises
  const classicalSeeds = [
    {
      id: 'ex-footwork-reformer',
      name: 'Footwork Series',
      apparatus: 'Reformer',
      description: 'Aquecimento dos membros inferiores e alinhamento de pelve.',
      default_springs: '3 Vermelhas + 1 Azul',
      default_reps: '10 cada posição',
      default_sets: 3,
      level: 'iniciante',
      postural_focus: 'Alinhamento patelar e estabilização de pelve neutra.',
      contraindications: 'Meniscopatia aguda com limitação de flexão acima de 90°.',
      is_custom: 0,
      created_at: '2026-01-01T08:00:00.000Z',
      updated_at: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'ex-hundred-reformer',
      name: 'The Hundred (Reformer)',
      apparatus: 'Reformer',
      description: 'Fortalecimento intenso do Powerhouse com bombeamento de braços.',
      default_springs: '2 Vermelhas',
      default_reps: '100 respirações (10 ciclos)',
      default_sets: 1,
      level: 'iniciante',
      postural_focus: 'Flexão torácica e ancoragem lombo-pélvica.',
      contraindications: 'Hérnia de disco lombar aguda em crise ou dor cervical intensa.',
      is_custom: 0,
      created_at: '2026-01-01T08:00:00.000Z',
      updated_at: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'ex-tower-cadillac',
      name: 'Tower / Articulação da Coluna',
      apparatus: 'Cadillac',
      description: 'Articulação vertebral segmentar com empuxo da barra torre.',
      default_springs: '1 Amarela inferior com correia de segurança',
      default_reps: '8 repetições lentas',
      default_sets: 2,
      level: 'intermediario',
      postural_focus: 'Mobilização lombar e descompressão axial.',
      contraindications: 'Espondilolistese de alto grau e osteoporose severa.',
      is_custom: 0,
      created_at: '2026-01-01T08:00:00.000Z',
      updated_at: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'ex-footwork-chair',
      name: 'Footwork na Cadeira',
      apparatus: 'Wunda Chair',
      description: 'Fortalecimento postural sentado com ênfase em controle eretor.',
      default_springs: '2 Pretas no meio (nível 2)',
      default_reps: '12 repetições',
      default_sets: 2,
      level: 'iniciante',
      postural_focus: 'Auto-crescimento axial e alinhamento isquiático.',
      contraindications: 'Instabilidade femoropatelar severa.',
      is_custom: 0,
      created_at: '2026-01-01T08:00:00.000Z',
      updated_at: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'ex-swan-barrel',
      name: 'Swan no Barril',
      apparatus: 'Ladder Barrel',
      description: 'Extensão torácica com apoio do arco do barril.',
      default_springs: 'Sem molas (peso corporal e gravidade)',
      default_reps: '6 repetições',
      default_sets: 2,
      level: 'avancado',
      postural_focus: 'Extensão torácica e abertura anterior dos peitorais.',
      contraindications: 'Estenose de canal vertebral e espondilólise.',
      is_custom: 0,
      created_at: '2026-01-01T08:00:00.000Z',
      updated_at: '2026-01-01T08:00:00.000Z',
    },
  ];

  beforeEach(() => {
    mockDb = createWorkoutMockDb(classicalSeeds);
  });

  // ============================================================================
  // 1. Dynamic Exercise Creation & Immediate Catalog Availability
  // ============================================================================
  describe('1. Dynamic Exercise Creation (is_custom = 1) & Catalog Immediate Availability', () => {
    test('createCustomExercise strictly sets is_custom = 1', async () => {
      const customEx = await exerciseRepository.createCustomExercise(
        {
          name: 'Ponte Unipodal com Bola no Reformer',
          apparatus: 'Reformer',
          description: 'Variação clínica prescrita pela Dra. Rogéria para ativação de glúteo médio.',
          default_springs: '1 Azul + 1 Amarela',
          default_reps: '12 cada membro',
          default_sets: 3,
          level: 'intermediario',
          postural_focus: 'Estabilização de pelve e controle de rotação externa.',
          contraindications: 'Tendinopatia glútea aguda em fase inflamatória.',
        },
        mockDb
      );

      assert.ok(customEx.id);
      assert.equal(customEx.is_custom, 1);
      assert.equal(customEx.name, 'Ponte Unipodal com Bola no Reformer');
      assert.equal(customEx.apparatus, 'Reformer');
      assert.equal(customEx.default_springs, '1 Azul + 1 Amarela');
    });

    test('exerciseRepository.create defaults is_custom to 1 if omitted', async () => {
      const created = await exerciseRepository.create(
        {
          name: 'Mobilização Escapular na Barra Torre',
          apparatus: 'Cadillac',
          level: 'iniciante',
        },
        mockDb
      );

      assert.equal(created.is_custom, 1);
    });

    test('Newly created custom exercise is immediately available in the catalog (listAll)', async () => {
      // Baseline check
      const initialList = await exerciseRepository.listAll({}, mockDb);
      assert.equal(initialList.length, 5);

      // Create new custom exercise
      const newEx = await exerciseRepository.createCustomExercise(
        {
          name: 'Alongamento de Isquiotibiais com Fita Elástica',
          apparatus: 'Mat',
          default_reps: '3 sustentações de 30s',
          default_sets: 1,
          level: 'iniciante',
          postural_focus: 'Descompressão lombar via cadeia posterior.',
        },
        mockDb
      );

      // Verify immediate query reflects the new exercise
      const updatedList = await exerciseRepository.listAll({}, mockDb);
      assert.equal(updatedList.length, 6);

      const found = updatedList.find((e) => e.id === newEx.id);
      assert.ok(found);
      assert.equal(found.name, 'Alongamento de Isquiotibiais com Fita Elástica');
      assert.equal(found.is_custom, 1);
    });

    test('listAll filters accurately by apparatus and isCustom flag', async () => {
      // Create one custom exercise for Reformer
      await exerciseRepository.createCustomExercise(
        {
          name: 'Stretches Clínicos do Quadríceps',
          apparatus: 'Reformer',
          level: 'iniciante',
        },
        mockDb
      );

      // Filter: Reformer only (2 classical + 1 custom = 3 total)
      const reformerExercises = await exerciseRepository.listAll({ apparatus: 'Reformer' }, mockDb);
      assert.equal(reformerExercises.length, 3);
      reformerExercises.forEach((e) => assert.equal(e.apparatus, 'Reformer'));

      // Filter: isCustomOnly = true only (should return 1)
      const customOnly = await exerciseRepository.listAll({ isCustomOnly: true }, mockDb);
      assert.equal(customOnly.length, 1);
      assert.equal(customOnly[0].is_custom, 1);
    });

    test('listAll instant search with adversarial query (special regex characters, whitespace, case-insensitive)', async () => {
      // Add custom exercise with special characters in title
      await exerciseRepository.createCustomExercise(
        {
          name: 'Alongamento em (C) Lateral [Spine]',
          apparatus: 'Spine Corrector',
          description: 'Trabalho de escoliose focado na concavidade torácica (+10°).',
          level: 'intermediario',
        },
        mockDb
      );

      // Search with parentheses and brackets that could break regex
      const resRegex = await exerciseRepository.listAll({ search: '(C)' }, mockDb);
      assert.ok(resRegex.length >= 1);
      assert.ok(resRegex.some((e) => e.name.includes('(C)')));

      // Search with extra surrounding whitespace
      const resWhitespace = await exerciseRepository.listAll({ search: '   hundred   ' }, mockDb);
      assert.ok(resWhitespace.length >= 1);
      assert.equal(resWhitespace[0].name, 'The Hundred (Reformer)');

      // Search matching postural focus
      const resFocus = await exerciseRepository.listAll({ search: 'descompressão' }, mockDb);
      assert.ok(resFocus.length >= 1);
      assert.ok(resFocus.some((e) => e.id === 'ex-tower-cadillac'));
    });

    test('Custom exercise update and deletion operations', async () => {
      const created = await exerciseRepository.createCustomExercise(
        {
          name: 'Exercício Temporário',
          apparatus: 'Mat',
          level: 'iniciante',
        },
        mockDb
      );

      // Update
      const updated = await exerciseRepository.update(
        created.id,
        {
          name: 'Exercício Atualizado e Consolidado',
          description: 'Descrição complementada.',
          default_springs: 'Nenhuma',
        },
        mockDb
      );
      assert.ok(updated);
      assert.equal(updated.name, 'Exercício Atualizado e Consolidado');

      // Delete
      const deleted = await exerciseRepository.delete(created.id, mockDb);
      assert.equal(deleted, true);

      const notFound = await exerciseRepository.findById(created.id, mockDb);
      assert.equal(notFound, null);
    });
  });

  // ============================================================================
  // 2. Workout Routines & Prescription Integrity in SQLite Transactions
  // ============================================================================
  describe('2. Workout Routines Integrity with Multiple Exercises & Spring Calibrations', () => {
    test('Creates routine with multiple exercises, sets, and springs in atomic transaction', async () => {
      const prescriptionData = {
        name: 'Prescrição Lombar & Escoliose - Fase 1',
        notes: 'Protocolo para fortalecimento do Powerhouse e descompressão axial (Dra. Rogéria Collares).',
        status: 'active',
        items: [
          {
            exercise_id: 'ex-footwork-reformer',
            sets: 3,
            reps: '10 paralelas / 10 V-Pilates / 10 calcanhares',
            springs_resistance: '3 Vermelhas + 1 Azul',
            postural_notes: 'Manter pelve neutra e sacro pesado no carrinho.',
            sort_order: 0,
          },
          {
            exercise_id: 'ex-hundred-reformer',
            sets: 1,
            reps: '100 bombeamentos',
            springs_resistance: '2 Vermelhas',
            postural_notes: 'Pernas a 60 graus para proteger lordose lombar.',
            sort_order: 1,
          },
          {
            exercise_id: 'ex-tower-cadillac',
            sets: 2,
            reps: '8 repetições lentas',
            springs_resistance: '1 Amarela inferior + Correia de segurança',
            postural_notes: 'Estimular abertura de cada espaço intervertebral.',
            sort_order: 2,
          },
        ],
      };

      const routine = await routineRepository.create(PATIENT_ID, prescriptionData, mockDb);

      assert.ok(routine.id);
      assert.equal(routine.patient_id, PATIENT_ID);
      assert.equal(routine.name, 'Prescrição Lombar & Escoliose - Fase 1');
      assert.equal(routine.status, 'active');
      assert.equal(routine.items.length, 3);

      // Verify eager-loaded exercise metadata and sort order
      assert.equal(routine.items[0].sort_order, 0);
      assert.equal(routine.items[0].exercise?.name, 'Footwork Series');
      assert.equal(routine.items[0].springs_resistance, '3 Vermelhas + 1 Azul');
      assert.equal(routine.items[0].sets, 3);

      assert.equal(routine.items[1].sort_order, 1);
      assert.equal(routine.items[1].exercise?.name, 'The Hundred (Reformer)');
      assert.equal(routine.items[1].springs_resistance, '2 Vermelhas');

      assert.equal(routine.items[2].sort_order, 2);
      assert.equal(routine.items[2].exercise?.name, 'Tower / Articulação da Coluna');
      assert.equal(routine.items[2].springs_resistance, '1 Amarela inferior + Correia de segurança');
    });

    test('TRANSACTION ROLLBACK ATOMICITY: Failure during routine item creation cancels entire routine', async () => {
      const preRoutinesCount = mockDb.tables.routines.size;
      const preItemsCount = mockDb.tables.routine_items.size;

      // Configure mock to fail specifically on routine_items insertion
      mockDb.setFailNextInsert('routine_items');

      const failedPrescription = {
        name: 'Treino Condenado ao Rollback',
        notes: 'Este treino deve falhar na inserção do item e não deixar resíduos no banco.',
        items: [
          {
            exercise_id: 'ex-footwork-reformer',
            sets: 2,
            reps: '10',
            springs_resistance: '2 Vermelhas',
          },
        ],
      };

      await assert.rejects(
        async () => {
          await routineRepository.create(PATIENT_ID, failedPrescription, mockDb);
        },
        /Simulated SQLite Disk Error/
      );

      // Verify that rollback restored tables exactly: zero new routines, zero orphan items
      assert.equal(mockDb.tables.routines.size, preRoutinesCount, 'No routine header should persist after failure');
      assert.equal(mockDb.tables.routine_items.size, preItemsCount, 'No orphan routine items should persist after failure');
    });

    test('findById performs eager join with exercises table and strictly respects sort_order ASC', async () => {
      const routine = await routineRepository.create(
        PATIENT_ID,
        {
          name: 'Rotina Mista de Aparelhos',
          items: [
            { exercise_id: 'ex-footwork-chair', sort_order: 10, sets: 2, reps: '10' },
            { exercise_id: 'ex-tower-cadillac', sort_order: 5, sets: 2, reps: '8' },
            { exercise_id: 'ex-footwork-reformer', sort_order: 1, sets: 3, reps: '10' },
          ],
        },
        mockDb
      );

      const fetched = await routineRepository.findById(routine.id, mockDb);
      assert.ok(fetched);
      assert.equal(fetched.items.length, 3);

      // Ordered by sort_order: 1, 5, 10
      assert.equal(fetched.items[0].sort_order, 1);
      assert.equal(fetched.items[0].exercise?.id, 'ex-footwork-reformer');
      assert.equal(fetched.items[1].sort_order, 5);
      assert.equal(fetched.items[1].exercise?.id, 'ex-tower-cadillac');
      assert.equal(fetched.items[2].sort_order, 10);
      assert.equal(fetched.items[2].exercise?.id, 'ex-footwork-chair');
    });

    test('Atomically updates routine metadata and replaces items in single transaction', async () => {
      const routine = await routineRepository.create(
        PATIENT_ID,
        {
          name: 'Versão Inicial',
          status: 'active',
          items: [
            { exercise_id: 'ex-footwork-reformer', sets: 2, reps: '10' },
          ],
        },
        mockDb
      );

      // Update with new name and new set of items
      const updated = await routineRepository.update(
        routine.id,
        {
          name: 'Versão Avançada Reavaliada',
          status: 'completed',
          notes: 'Paciente progrediu de nível com redução de queixas álgicas.',
          items: [
            { exercise_id: 'ex-tower-cadillac', sets: 3, reps: '10', springs_resistance: '2 Amarelas' },
            { exercise_id: 'ex-swan-barrel', sets: 2, reps: '6', springs_resistance: 'Sem molas' },
          ],
        },
        mockDb
      );

      assert.ok(updated);
      assert.equal(updated.name, 'Versão Avançada Reavaliada');
      assert.equal(updated.status, 'completed');
      assert.equal(updated.items.length, 2);
      assert.equal(updated.items[0].exercise?.id, 'ex-tower-cadillac');
      assert.equal(updated.items[1].exercise?.id, 'ex-swan-barrel');

      // Verify previous items were deleted and replaced (no accumulation)
      const allItemsForRoutine = Array.from(mockDb.tables.routine_items.values()).filter((i) => i.routine_id === routine.id);
      assert.equal(allItemsForRoutine.length, 2);
    });

    test('Granular item operations: addItem, removeItem, and reorderItems execute atomically', async () => {
      const routine = await routineRepository.create(
        PATIENT_ID,
        {
          name: 'Rotina Modular',
          items: [
            { exercise_id: 'ex-footwork-reformer', sets: 2, reps: '10', sort_order: 0 },
            { exercise_id: 'ex-hundred-reformer', sets: 1, reps: '100', sort_order: 1 },
          ],
        },
        mockDb
      );

      // Add third item
      const addedItem = await routineRepository.addItem(
        routine.id,
        {
          exercise_id: 'ex-tower-cadillac',
          sets: 2,
          reps: '8',
          springs_resistance: '1 Amarela',
          sort_order: 2,
        },
        mockDb
      );
      assert.ok(addedItem.id);

      let currentRoutine = await routineRepository.findById(routine.id, mockDb);
      assert.equal(currentRoutine.items.length, 3);

      // Remove middle item
      const removedSuccess = await routineRepository.removeItem(currentRoutine.items[1].id, mockDb);
      assert.equal(removedSuccess, true);

      currentRoutine = await routineRepository.findById(routine.id, mockDb);
      assert.equal(currentRoutine.items.length, 2);

      // Reorder items
      const newOrder = [currentRoutine.items[1].id, currentRoutine.items[0].id];
      await routineRepository.reorderItems(routine.id, newOrder, mockDb);
      const reorderedRoutine = await routineRepository.findById(routine.id, mockDb);
      assert.ok(reorderedRoutine);
      assert.equal(reorderedRoutine.items[0].id, newOrder[0]);
      assert.equal(reorderedRoutine.items[0].sort_order, 0);
      assert.equal(reorderedRoutine.items[1].id, newOrder[1]);
      assert.equal(reorderedRoutine.items[1].sort_order, 1);
    });

    test('Cascade deletion of routine completely purges all its routine items', async () => {
      const routine = await routineRepository.create(
        PATIENT_ID,
        {
          name: 'Rotina Para Descarte',
          items: [
            { exercise_id: 'ex-footwork-reformer', sets: 2, reps: '10' },
            { exercise_id: 'ex-tower-cadillac', sets: 2, reps: '8' },
          ],
        },
        mockDb
      );

      assert.equal(mockDb.tables.routines.has(routine.id), true);
      const itemsPre = Array.from(mockDb.tables.routine_items.values()).filter((i) => i.routine_id === routine.id);
      assert.equal(itemsPre.length, 2);

      // Delete routine
      const deleteResult = await routineRepository.delete(routine.id, mockDb);
      assert.equal(deleteResult, true);

      // Verify routine and items are gone
      assert.equal(mockDb.tables.routines.has(routine.id), false);
      const itemsPost = Array.from(mockDb.tables.routine_items.values()).filter((i) => i.routine_id === routine.id);
      assert.equal(itemsPost.length, 0, 'All routine items must be deleted with routine');
    });

    test('Edge case: routine with 0 items (empty prescription draft) persists cleanly', async () => {
      const emptyRoutine = await routineRepository.create(
        PATIENT_ID,
        {
          name: 'Rascunho de Avaliação de Treino',
          notes: 'Prescrição ainda em elaboração após análise da bioimpedância.',
          items: [],
        },
        mockDb
      );

      assert.ok(emptyRoutine.id);
      assert.equal(emptyRoutine.items.length, 0);

      const fetched = await routineRepository.findById(emptyRoutine.id, mockDb);
      assert.ok(fetched);
      assert.equal(fetched.items.length, 0);
    });
  });
});
