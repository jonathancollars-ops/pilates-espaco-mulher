/**
 * Test Suite: tests/m9_frontend_ui_enhancements.test.js
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Milestone 9: Frontend UI & Apple HIG Enhancements QA Suite
 * 
 * Verifies:
 * 1. BioimpedanceReferenceModal (4 clinical reference tables, gender switcher, Apple HIG sheet)
 * 2. PatientConditionPhotosModal (categories, camera/gallery picker, repository CRUD, fullscreen preview)
 * 3. PatientFormModal (88x88 avatar picker, profession, activity time, marital status, insurance)
 * 4. PatientCard & AgendaScreen (avatar rendering with initials fallback)
 * 5. EvaluationWizardScreen (Histórico Clínico, Gestação, Aborto, Hip Alignment, Age Comparison, Modals)
 */

require('./mock-rn.cjs');
require('tsx/cjs');

const path = require('node:path');
const fs = require('node:fs');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const projectRoot = path.resolve(__dirname, '..');

describe('M9 Frontend UI & Apple HIG Enhancements QA Suite', () => {

  // ===========================================================================
  // 1. BioimpedanceReferenceModal Component Verification
  // ===========================================================================
  describe('1. BioimpedanceReferenceModal Clinical Sheet', () => {
    const modalPath = path.join(projectRoot, 'src', 'features', 'evaluation', 'BioimpedanceReferenceModal.tsx');

    test('Source file exists and is cleanly exported', () => {
      assert.ok(fs.existsSync(modalPath), 'BioimpedanceReferenceModal.tsx must exist');
      const barrelPath = path.join(projectRoot, 'src', 'features', 'evaluation', 'index.ts');
      const barrelSrc = fs.readFileSync(barrelPath, 'utf8');
      assert.ok(barrelSrc.includes('BioimpedanceReferenceModal'), 'Must be exported in evaluation barrel');
    });

    test('Contains the 4 mandatory clinical reference tables', () => {
      const src = fs.readFileSync(modalPath, 'utf8');
      assert.ok(src.includes('Índice de Massa Corporal (IMC)'), 'Must include IMC table');
      assert.ok(src.includes('Circunferência Abdominal'), 'Must include Abdominal Circumference table');
      assert.ok(src.includes('% de Gordura Corporal'), 'Must include Body Fat table');
      assert.ok(src.includes('Gordura Visceral'), 'Must include Visceral Fat table');
    });

    test('Features gender switcher toggle (Feminino / Masculino)', () => {
      const src = fs.readFileSync(modalPath, 'utf8');
      assert.ok(src.includes('Feminino'), 'Must include Feminino option');
      assert.ok(src.includes('Masculino'), 'Must include Masculino option');
      assert.ok(src.includes('SegmentedControl'), 'Must have SegmentedControl gender switcher');
    });

    test('Follows Apple HIG modal sheet presentation with Haptics and close action', () => {
      const src = fs.readFileSync(modalPath, 'utf8');
      assert.ok(src.includes('Haptics.'), 'Must trigger haptic feedback');
      assert.ok(src.includes('Modal'), 'Must use Modal component');
      assert.ok(src.includes('onClose'), 'Must accept onClose callback');
      assert.ok(src.includes('navBar') && src.includes('navTitle'), 'Must have styled modal navigation bar');
    });
  });

  // ===========================================================================
  // 2. PatientConditionPhotosModal Clinical Gallery
  // ===========================================================================
  describe('2. PatientConditionPhotosModal Clinical Gallery', () => {
    const modalPath = path.join(projectRoot, 'src', 'features', 'evaluation', 'PatientConditionPhotosModal.tsx');

    test('Source file exists and is cleanly exported', () => {
      assert.ok(fs.existsSync(modalPath), 'PatientConditionPhotosModal.tsx must exist');
      const barrelPath = path.join(projectRoot, 'src', 'features', 'evaluation', 'index.ts');
      const barrelSrc = fs.readFileSync(barrelPath, 'utf8');
      assert.ok(barrelSrc.includes('PatientConditionPhotosModal'), 'Must be exported in evaluation barrel');
    });

    test('Supports clinical photographic categories', () => {
      const src = fs.readFileSync(modalPath, 'utf8');
      assert.ok(src.includes("'Postura'"), 'Must support Postura category');
      assert.ok(src.includes("'Escoliose'"), 'Must support Escoliose category');
      assert.ok(src.includes("'Cicatriz / Cirurgia'"), 'Must support Cicatriz category');
      assert.ok(src.includes("'Diástase Abdominal'"), 'Must support Diástase category');
      assert.ok(src.includes("'Outro'"), 'Must support Outro category');
    });

    test('Integrates ImagePicker with camera and gallery actions', () => {
      const src = fs.readFileSync(modalPath, 'utf8');
      assert.ok(src.includes('launchCameraAsync'), 'Must support camera capture');
      assert.ok(src.includes('launchImageLibraryAsync'), 'Must support gallery pick');
    });

    test('Integrates conditionPhotoRepository', () => {
      const src = fs.readFileSync(modalPath, 'utf8');
      assert.ok(src.includes('conditionPhotoRepository'), 'Must use conditionPhotoRepository');
    });

    test('Implements fullscreen photo inspection and deletion confirmation', () => {
      const src = fs.readFileSync(modalPath, 'utf8');
      assert.ok(src.includes('activePhoto'), 'Must provide fullscreen preview via activePhoto');
      assert.ok(src.includes('Alert.alert') && src.includes('Excluir'), 'Must confirm photo deletion');
    });
  });

  // ===========================================================================
  // 3. PatientFormModal Avatar & Demographic Enhancements
  // ===========================================================================
  describe('3. PatientFormModal Avatar & Demographic Enhancements', () => {
    const formPath = path.join(projectRoot, 'src', 'features', 'patients', 'PatientFormModal.tsx');
    const formSrc = fs.readFileSync(formPath, 'utf8');

    test('Has 88x88 circular avatar picker with initials fallback', () => {
      assert.ok(formSrc.includes('avatarPickerContainer') || formSrc.includes('avatarCircleButton'), 'Must have avatar button');
      assert.ok(formSrc.includes('88'), 'Must enforce 88x88 avatar dimensions');
      assert.ok(formSrc.includes('avatarUri'), 'Must bind avatar uri state');
      assert.ok(formSrc.includes('avatarInitialsText') || formSrc.includes('initials'), 'Must show initials fallback');
    });

    test('Contains new clinical demographic fields (profession, activity_time, marital status)', () => {
      assert.ok(formSrc.includes('profession'), 'Must include profession state');
      assert.ok(formSrc.includes('activityTime'), 'Must include activity time state');
      assert.ok(formSrc.includes('maritalStatus'), 'Must include marital status state');
      assert.ok(formSrc.includes('Status Conjugal'), 'Must label marital status as Status Conjugal');
    });

    test('Updates insurance options with IBNJ and Outros sub-input', () => {
      assert.ok(formSrc.includes("'IBNJ'"), 'Insurance options must include IBNJ');
      assert.ok(formSrc.includes("'Particular'"), 'Insurance options must include Particular');
      assert.ok(formSrc.includes("'Totalpass'"), 'Insurance options must include Totalpass');
      assert.ok(formSrc.includes("'Gympass'"), 'Insurance options must include Gympass');
      assert.ok(formSrc.includes("'Outros'"), 'Insurance options must include Outros');
      assert.ok(formSrc.includes('insuranceOther'), 'Must have custom insurance sub-input');
    });

    test('STRICT PRIVACY: Strictly excludes CPF, CEP, and Estado Civil in non-comment code', () => {
      const codeLines = formSrc
        .split('\n')
        .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*'))
        .filter((l) => !l.includes('sem CEP') && !l.includes('SEM CEP'))
        .join('\n');
      assert.equal(codeLines.match(/estado[\s_]?civil/i), null, 'Forbidden: estado civil');
      assert.equal(codeLines.match(/\bcpf\b/i), null, 'Forbidden: CPF');
      assert.equal(codeLines.match(/\bcep\b/i), null, 'Forbidden: CEP');
    });
  });

  // ===========================================================================
  // 4. PatientCard & AgendaScreen Avatar Integrations
  // ===========================================================================
  describe('4. PatientCard & AgendaScreen Avatar Integrations', () => {
    test('PatientCard renders 48x48 avatar image with initials fallback', () => {
      const cardPath = path.join(projectRoot, 'src', 'features', 'patients', 'PatientCard.tsx');
      const cardSrc = fs.readFileSync(cardPath, 'utf8');
      assert.ok(cardSrc.includes('patient.avatar_uri'), 'PatientCard must check patient.avatar_uri');
      assert.ok(cardSrc.includes('Image'), 'PatientCard must import Image from react-native');
      assert.ok(cardSrc.includes('avatarImage'), 'PatientCard must define avatarImage style');
      assert.ok(cardSrc.includes('48'), 'Avatar dimensions must be 48x48');
    });

    test('AgendaScreen renders avatars in Atendimento Agora and A Seguir cards', () => {
      const agendaPath = path.join(projectRoot, 'src', 'features', 'agenda', 'AgendaScreen.tsx');
      const agendaSrc = fs.readFileSync(agendaPath, 'utf8');
      assert.ok(agendaSrc.includes('currentPatient'), 'AgendaScreen must look up currentPatient');
      assert.ok(agendaSrc.includes('nextPatient'), 'AgendaScreen must look up nextPatient');
      assert.ok(agendaSrc.includes('avatarImage') || agendaSrc.includes('avatar_uri'), 'AgendaScreen must render avatar images');
    });
  });

  // ===========================================================================
  // 5. EvaluationWizardScreen Clinical Enhancements
  // ===========================================================================
  describe('5. EvaluationWizardScreen Clinical Enhancements', () => {
    const evalPath = path.join(projectRoot, 'src', 'features', 'evaluation', 'EvaluationWizardScreen.tsx');
    const evalSrc = fs.readFileSync(evalPath, 'utf8');

    test('Anamnese features multiline Histórico Clínico with minHeight >= 100', () => {
      assert.ok(evalSrc.includes('clinicalHistory'), 'Must bind clinicalHistory state');
      assert.ok(evalSrc.includes('Histórico Clínico do Paciente') || evalSrc.includes('Histórico Clínico'), 'Must label Histórico Clínico');
      assert.ok(evalSrc.includes('minHeight: 100'), 'Must enforce minimum 100px height');
    });

    test('Anamnese features Gestação and delivery type options (Normal, Cesárea, Ambos)', () => {
      assert.ok(evalSrc.includes("'Gestação'"), 'Label must be Gestação without prévias');
      assert.ok(evalSrc.includes("'Normal'"), 'Must include Normal');
      assert.ok(evalSrc.includes("'Cesárea'"), 'Must include Cesárea');
      assert.ok(evalSrc.includes("'Ambos'"), 'Must include Ambos');
      assert.ok(evalSrc.includes('lastPregnancyTime'), 'Must include lastPregnancyTime state and input');
    });

    test('Anamnese features Aborto with quantity, gestational age, and notes', () => {
      assert.ok(evalSrc.includes("'Aborto'"), 'Label must be Aborto');
      assert.ok(evalSrc.includes('abortionCount'), 'Must include abortionCount input');
      assert.ok(evalSrc.includes('abortionAge'), 'Must include abortionAge input');
      assert.ok(evalSrc.includes('abortionNotes'), 'Must include abortionNotes input');
    });

    test('Postural evaluation features Hip Alignment and Condition Photos trigger', () => {
      assert.ok(evalSrc.includes('Alinhamento de Quadril'), 'Must include Alinhamento de Quadril selector');
      assert.ok(evalSrc.includes("'Nivelado'"), 'Must include Nivelado');
      assert.ok(evalSrc.includes("'Anteversão'"), 'Must include Anteversão');
      assert.ok(evalSrc.includes("'Retroversão'"), 'Must include Retroversão');
      assert.ok(evalSrc.includes('Fotos de Condição Clínica'), 'Must have button to open condition photos modal');
      assert.ok(evalSrc.includes('setConditionPhotosVisible(true)'), 'Must toggle condition photos visibility');
    });

    test('Bioimpedance features Idade Cronológica, Idade Corporal, and real-time comparison badge', () => {
      assert.ok(evalSrc.includes('bioChronologicalAge'), 'Must bind bioChronologicalAge state');
      assert.ok(evalSrc.includes('bioBodyAge'), 'Must bind bioBodyAge state');
      assert.ok(evalSrc.includes('ageComparison'), 'Must calculate ageComparison');
      assert.ok(evalSrc.includes('Rejuvenescimento'), 'Must provide Rejuvenescimento assessment');
      assert.ok(evalSrc.includes('Idade Aumentada'), 'Must provide Idade Aumentada assessment');
      assert.ok(evalSrc.includes('Tabela de Referência Clínica'), 'Must have button to open clinical reference modal');
      assert.ok(evalSrc.includes('setReferenceModalVisible(true)'), 'Must toggle reference modal visibility');
    });

    test('Mounts BioimpedanceReferenceModal and PatientConditionPhotosModal', () => {
      assert.ok(evalSrc.includes('<BioimpedanceReferenceModal'), 'Must mount BioimpedanceReferenceModal in JSX');
      assert.ok(evalSrc.includes('<PatientConditionPhotosModal'), 'Must mount PatientConditionPhotosModal in JSX');
    });
  });

});
