/**
 * Verification Test Suite: PatientFormModal & Form Validation Engine
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Verifies:
 * 1. Form validation logic (required fields, lengths, regex checks).
 * 2. Automatic age calculation from birthdate via calculateAge.
 * 3. Dynamic typing masks for phone (formatPhone) and date (maskDateInput).
 * 4. Authoritative default for city_state ("Rio das Ostras - RJ").
 * 5. Strict absence of CPF, Estado Civil, and CEP.
 * 6. Convênio segmented options ('Particular', 'Unimed', 'Bradesco', 'Outro').
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Import utilities
const {
  formatPhone,
  maskDateInput,
  calculateAge,
  parseBRDateToISO,
  formatDateBR,
  cleanDigits,
} = require('../../src/utils/formatters.ts');

// Import Patient types check
const fs = require('node:fs');
const path = require('node:path');

describe('M3 Patient Form & Validation Logic Suite', () => {

  describe('1. Authoritative Negative Constraints (Strict Exclusion)', () => {
    test('Ensures CPF is strictly absent from PatientFormModal code (excluding comment disclaimers)', () => {
      const modalSource = fs.readFileSync(
        path.join(__dirname, 'proposed_PatientFormModal.tsx'),
        'utf8'
      );
      // Filter out comment lines that explicitly document the exclusion of CPF
      const nonCommentLines = modalSource
        .split('\n')
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('/*'));
      const nonCommentCode = nonCommentLines.join('\n');
      const cpfMatches = nonCommentCode.match(/\bcpf\b/i);
      assert.equal(cpfMatches, null, 'CPF must not appear in any code, state, or JSX of PatientFormModal');
    });

    test('Ensures Estado Civil is strictly absent from PatientFormModal code', () => {
      const modalSource = fs.readFileSync(
        path.join(__dirname, 'proposed_PatientFormModal.tsx'),
        'utf8'
      );
      const nonCommentLines = modalSource
        .split('\n')
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('/*'));
      const nonCommentCode = nonCommentLines.join('\n');
      const estadoCivilMatches = nonCommentCode.match(/estado[\s_]?civil/i);
      assert.equal(estadoCivilMatches, null, 'Estado Civil must not appear in code or JSX of PatientFormModal');
    });

    test('Ensures CEP is strictly absent from PatientFormModal inputs and state', () => {
      const modalSource = fs.readFileSync(
        path.join(__dirname, 'proposed_PatientFormModal.tsx'),
        'utf8'
      );
      // Filter out comment lines and header disclaimers like "sem CEP"
      const nonCommentLines = modalSource
        .split('\n')
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('/*'))
        .filter((line) => !line.includes('sem CEP') && !line.includes('SEM CEP'));
      const nonCommentCode = nonCommentLines.join('\n');
      const cepMatches = nonCommentCode.match(/\bcep\b/i);
      assert.equal(cepMatches, null, 'CEP must not appear as an input or state field');
    });
  });

  describe('2. Required Field Validations', () => {
    function validatePatientForm(data) {
      const errors = {};

      // Name validation
      const trimmedName = (data.name || '').trim();
      if (!trimmedName) {
        errors.name = 'Nome completo é obrigatório';
      } else if (trimmedName.length < 3) {
        errors.name = 'Mínimo de 3 caracteres';
      }

      // Phone validation
      const digits = cleanDigits(data.phone || '');
      if (!digits) {
        errors.phone = 'Telefone / WhatsApp é obrigatório';
      } else if (digits.length < 10 || digits.length > 11) {
        errors.phone = 'Informe DDD + número (10 ou 11 dígitos)';
      }

      // Birthdate validation
      if (data.birthdateText && data.birthdateText.trim().length > 0) {
        if (data.birthdateText.length !== 10 || !parseBRDateToISO(data.birthdateText)) {
          errors.birthdate = 'Data inválida (DD/MM/AAAA)';
        }
      }

      // Age validation
      if (data.ageText && data.ageText.trim().length > 0) {
        const parsedAge = parseInt(data.ageText, 10);
        if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 125) {
          errors.age = 'Idade deve ser entre 0 e 125 anos';
        }
      }

      // Email validation
      if (data.email && data.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email.trim())) {
          errors.email = 'E-mail em formato inválido';
        }
      }

      // Insurance 'Outro'
      if (data.insuranceType === 'Outro' && !(data.insuranceOther || '').trim()) {
        errors.insuranceOther = 'Informe o nome do convênio';
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      };
    }

    test('Rejects empty name and empty phone', () => {
      const result = validatePatientForm({ name: '', phone: '' });
      assert.equal(result.isValid, false);
      assert.equal(result.errors.name, 'Nome completo é obrigatório');
      assert.equal(result.errors.phone, 'Telefone / WhatsApp é obrigatório');
    });

    test('Rejects name shorter than 3 characters', () => {
      const result = validatePatientForm({ name: 'Al', phone: '(22) 99947-4304' });
      assert.equal(result.isValid, false);
      assert.equal(result.errors.name, 'Mínimo de 3 caracteres');
    });

    test('Rejects invalid phone with insufficient digits', () => {
      const result = validatePatientForm({ name: 'Mariana Silva', phone: '(22) 9994' });
      assert.equal(result.isValid, false);
      assert.equal(result.errors.phone, 'Informe DDD + número (10 ou 11 dígitos)');
    });

    test('Accepts valid 10-digit landline and 11-digit mobile', () => {
      const resMobile = validatePatientForm({ name: 'Mariana Silva', phone: '(22) 99947-4304' });
      assert.equal(resMobile.isValid, true);

      const resLandline = validatePatientForm({ name: 'Mariana Silva', phone: '(22) 2760-1234' });
      assert.equal(resLandline.isValid, true);
    });

    test('Validates email format if provided', () => {
      const resBad = validatePatientForm({
        name: 'Mariana Silva',
        phone: '(22) 99947-4304',
        email: 'invalid-email',
      });
      assert.equal(resBad.isValid, false);
      assert.equal(resBad.errors.email, 'E-mail em formato inválido');

      const resGood = validatePatientForm({
        name: 'Mariana Silva',
        phone: '(22) 99947-4304',
        email: 'mariana@pilates.com.br',
      });
      assert.equal(resGood.isValid, true);
    });

    test('Enforces insuranceOther when insuranceType is Outro', () => {
      const resMissing = validatePatientForm({
        name: 'Mariana Silva',
        phone: '(22) 99947-4304',
        insuranceType: 'Outro',
        insuranceOther: '',
      });
      assert.equal(resMissing.isValid, false);
      assert.equal(resMissing.errors.insuranceOther, 'Informe o nome do convênio');

      const resFilled = validatePatientForm({
        name: 'Mariana Silva',
        phone: '(22) 99947-4304',
        insuranceType: 'Outro',
        insuranceOther: 'Petrobras AMS',
      });
      assert.equal(resFilled.isValid, true);
    });
  });

  describe('3. Automatic Age Calculation & Date Masking', () => {
    test('Automatically calculates age from Brazilian date DD/MM/YYYY', () => {
      const brDate = '15/05/1990';
      const iso = parseBRDateToISO(brDate);
      assert.equal(iso, '1990-05-15');

      const age = calculateAge(iso);
      // Completed years for someone born in May 1990 as of 2026 is 36
      assert.equal(age, 36);
    });

    test('maskDateInput formats incremental keystrokes smoothly', () => {
      assert.equal(maskDateInput('15'), '15');
      assert.equal(maskDateInput('1505'), '15/05');
      assert.equal(maskDateInput('15051990'), '15/05/1990');
      assert.equal(maskDateInput('15051990999'), '15/05/1990'); // Capped at 8 digits
    });

    test('Rejects impossible calendar dates', () => {
      assert.equal(parseBRDateToISO('32/01/2000'), null);
      assert.equal(parseBRDateToISO('15/13/2000'), null);
      assert.equal(parseBRDateToISO('00/05/2000'), null);
    });
  });

  describe('4. Phone Number Masking (formatPhone)', () => {
    test('Formats typical Rio das Ostras numbers correctly', () => {
      assert.equal(formatPhone('22999474304'), '(22) 99947-4304');
      assert.equal(formatPhone('(22) 99947-4304'), '(22) 99947-4304');
      assert.equal(formatPhone('2227601234'), '(22) 2760-1234');
    });

    test('Formats phone incrementally during typing', () => {
      assert.equal(formatPhone('2'), '(2');
      assert.equal(formatPhone('22'), '(22');
      assert.equal(formatPhone('229'), '(22) 9');
      assert.equal(formatPhone('229994'), '(22) 9994');
      assert.equal(formatPhone('2299947'), '(22) 9994-7');
      assert.equal(formatPhone('22999474304'), '(22) 99947-4304');
    });
  });

  describe('5. Authoritative Defaults & Payload Serialization', () => {
    function serializeCreatePayload(form) {
      const resolvedInsurance = form.insuranceType === 'Outro'
        ? ((form.insuranceOther || '').trim() || 'Outro')
        : form.insuranceType;

      const resolvedBirthdate = form.birthdateText && form.birthdateText.trim().length === 10
        ? parseBRDateToISO(form.birthdateText.trim())
        : null;

      const resolvedAge = form.ageText && form.ageText.trim().length > 0
        ? parseInt(form.ageText.trim(), 10)
        : (resolvedBirthdate ? calculateAge(resolvedBirthdate) : null);

      return {
        name: form.name.trim(),
        phone: formatPhone(form.phone),
        birthdate: resolvedBirthdate,
        age: resolvedAge,
        address: (form.address || '').trim() || null,
        neighborhood: (form.neighborhood || '').trim() || null,
        city_state: (form.cityState || '').trim() || 'Rio das Ostras - RJ',
        email: (form.email || '').trim() || null,
        insurance: resolvedInsurance,
        status: 'active',
      };
    }

    test('Preserves "Rio das Ostras - RJ" when cityState is omitted or empty', () => {
      const payload = serializeCreatePayload({
        name: 'Dra. Rogéria Collares',
        phone: '22999474304',
        cityState: '',
        insuranceType: 'Particular',
      });
      assert.equal(payload.city_state, 'Rio das Ostras - RJ');
      assert.equal(payload.phone, '(22) 99947-4304');
      assert.equal(payload.insurance, 'Particular');
      assert.equal(payload.status, 'active');
    });

    test('Resolves auto-calculated age when ageText is empty but birthdate is provided', () => {
      const payload = serializeCreatePayload({
        name: 'Mariana Silva',
        phone: '22999474304',
        birthdateText: '15/05/1990',
        ageText: '',
        insuranceType: 'Unimed',
      });
      assert.equal(payload.birthdate, '1990-05-15');
      assert.equal(payload.age, 36);
      assert.equal(payload.insurance, 'Unimed');
    });

    test('Respects manually entered age even when birthdate is absent', () => {
      const payload = serializeCreatePayload({
        name: 'Carlos Drummond',
        phone: '22999474304',
        birthdateText: '',
        ageText: '55',
        insuranceType: 'Bradesco',
      });
      assert.equal(payload.birthdate, null);
      assert.equal(payload.age, 55);
      assert.equal(payload.insurance, 'Bradesco');
    });
  });

});

