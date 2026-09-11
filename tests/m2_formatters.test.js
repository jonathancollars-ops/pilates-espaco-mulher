require('./mock-rn.cjs');
require('tsx/cjs');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  formatPhone,
  cleanDigits,
  formatWhatsAppUrl,
  formatDateBR,
  parseBRDateToISO,
  maskDateInput,
  calculateAge,
  formatWeight,
  formatHeight,
  formatEnergy,
  formatPercent,
  formatDecimalBR,
  parseDecimalBR,
} = require('../src/utils/formatters.ts');

describe('M2 Locale Formatters & Input Masks Tests', () => {

  describe('1. Phone and WhatsApp Formatters', () => {
    test('Formats 11-digit mobile phone with mask: (XX) XXXXX-XXXX', () => {
      assert.equal(formatPhone('22999474304'), '(22) 99947-4304');
      assert.equal(formatPhone('21987654321'), '(21) 98765-4321');
    });

    test('Formats 10-digit landline phone with mask: (XX) XXXX-XXXX', () => {
      assert.equal(formatPhone('2227601234'), '(22) 2760-1234');
      assert.equal(formatPhone('2125409988'), '(21) 2540-9988');
    });

    test('Formats partial typing input incrementally', () => {
      assert.equal(formatPhone('2'), '(2');
      assert.equal(formatPhone('22'), '(22');
      assert.equal(formatPhone('229'), '(22) 9');
      assert.equal(formatPhone('229994'), '(22) 9994');
      assert.equal(formatPhone('22999474'), '(22) 9994-74');
    });

    test('Handles null, undefined, or empty string gracefully', () => {
      assert.equal(formatPhone(null), '');
      assert.equal(formatPhone(undefined), '');
      assert.equal(formatPhone(''), '');
    });

    test('cleanDigits removes all non-numeric characters', () => {
      assert.equal(cleanDigits('(22) 99947-4304'), '22999474304');
      assert.equal(cleanDigits('+55 (22) 99947-4304'), '5522999474304');
      assert.equal(cleanDigits('abc123def456'), '123456');
    });

    test('formatWhatsAppUrl generates correct link with country code 55 and URL encoded message', () => {
      const urlSimple = formatWhatsAppUrl('(22) 99947-4304');
      assert.equal(urlSimple, 'https://wa.me/5522999474304');

      const urlWithMessage = formatWhatsAppUrl('22999474304', 'Olá Dra. Rogéria!');
      assert.equal(urlWithMessage, 'https://wa.me/5522999474304?text=Ol%C3%A1%20Dra.%20Rog%C3%A9ria!');
    });
  });

  describe('2. Brazilian Date Formatting & Timezone Offset Guard', () => {
    test('formatDateBR converts ISO YYYY-MM-DD to DD/MM/YYYY without day-decrement bug', () => {
      // Critical test for Brazilian timezone (UTC-3)
      assert.equal(formatDateBR('2026-09-11'), '11/09/2026');
      assert.equal(formatDateBR('2026-01-01'), '01/01/2026');
      assert.equal(formatDateBR('2026-12-31'), '31/12/2026');
    });

    test('formatDateBR handles Date object in UTC cleanly', () => {
      const d = new Date(Date.UTC(2026, 8, 11)); // Sept 11, 2026 UTC
      assert.equal(formatDateBR(d), '11/09/2026');
    });

    test('formatDateBR returns empty string on invalid dates or null', () => {
      assert.equal(formatDateBR(null), '');
      assert.equal(formatDateBR(''), '');
      assert.equal(formatDateBR('not-a-date'), '');
    });

    test('parseBRDateToISO converts DD/MM/YYYY to YYYY-MM-DD', () => {
      assert.equal(parseBRDateToISO('11/09/2026'), '2026-09-11');
      assert.equal(parseBRDateToISO('05/01/1990'), '1990-01-05');
      assert.equal(parseBRDateToISO('31/12/2025'), '2025-12-31');
    });

    test('parseBRDateToISO returns null for invalid formats or out-of-range dates', () => {
      assert.equal(parseBRDateToISO('32/01/2026'), null);
      assert.equal(parseBRDateToISO('15/13/2026'), null);
      assert.equal(parseBRDateToISO('2026-09-11'), null);
      assert.equal(parseBRDateToISO(''), null);
    });

    test('maskDateInput formats incremental user input', () => {
      assert.equal(maskDateInput('11'), '11');
      assert.equal(maskDateInput('1109'), '11/09');
      assert.equal(maskDateInput('11092026'), '11/09/2026');
      assert.equal(maskDateInput('11092026999'), '11/09/2026'); // capped at 8 digits
    });

    test('calculateAge calculates completed years correctly', () => {
      // If born on 1990-01-01, today (2026-09-11) is 36
      const age = calculateAge('1990-01-01');
      assert.equal(age, 36);

      const invalidAge = calculateAge(null);
      assert.equal(invalidAge, null);
    });
  });

  describe('3. Numeric & Decimal Formatters (pt-BR)', () => {
    test('formatWeight formats kilograms with comma decimal', () => {
      assert.equal(formatWeight(65.5), '65,5 kg');
      assert.equal(formatWeight(70), '70,0 kg');
      assert.equal(formatWeight(null), '—');
    });

    test('formatHeight formats centimeters with round integer', () => {
      assert.equal(formatHeight(165.4), '165 cm');
      assert.equal(formatHeight(null), '—');
    });

    test('formatEnergy formats kcal', () => {
      assert.equal(formatEnergy(1450.6), '1.451 kcal');
      assert.equal(formatEnergy(null), '—');
    });

    test('formatPercent formats percentage with comma', () => {
      assert.equal(formatPercent(24.5), '24,5%');
      assert.equal(formatPercent(null), '—');
    });

    test('formatDecimalBR and parseDecimalBR round-trip numbers', () => {
      assert.equal(formatDecimalBR(12.34, 2), '12,34');
      assert.equal(parseDecimalBR('12,34'), 12.34);
      assert.equal(parseDecimalBR('1.250,50'), 1250.5);
      assert.equal(parseDecimalBR(''), null);
    });
  });
});
