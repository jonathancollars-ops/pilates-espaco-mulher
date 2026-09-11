/// <reference types="node" />
import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  CLINIC_IDENTITY,
  openClinicWhatsApp,
  ClinicIdentityHeader,
  ClinicIdentityFooter,
  ClinicIdentity,
} from '../../src/design-system/ClinicIdentity';
import React from 'react';

describe('Professional Clinic Identity — Dra. Rogéria Collares Specifications', () => {
  test('Exact Professional Credential Strings in CLINIC_IDENTITY', () => {
    // Professional Name
    assert.strictEqual(
      CLINIC_IDENTITY.professionalName,
      'Dra. Rogéria Collares',
      'professionalName must be Dra. Rogéria Collares'
    );

    // Licensure Credential
    assert.strictEqual(
      CLINIC_IDENTITY.crefito,
      'CREFITO 23093-F',
      'crefito must be CREFITO 23093-F'
    );

    // Location & Municipality
    assert.ok(
      CLINIC_IDENTITY.location.includes('Costa Azul') &&
      CLINIC_IDENTITY.location.includes('Rio das Ostras'),
      'location must include Costa Azul and Rio das Ostras'
    );
    assert.strictEqual(CLINIC_IDENTITY.city, 'Rio das Ostras');
    assert.strictEqual(CLINIC_IDENTITY.neighborhood, 'Costa Azul');
    assert.strictEqual(CLINIC_IDENTITY.state, 'RJ');

    // Phone / WhatsApp
    assert.strictEqual(
      CLINIC_IDENTITY.phone,
      '(22) 99947-4304',
      'phone must be (22) 99947-4304'
    );
    assert.strictEqual(
      CLINIC_IDENTITY.phoneDigitsOnly,
      '5522999474304',
      'phoneDigitsOnly must be 5522999474304'
    );

    // URLs
    assert.strictEqual(
      CLINIC_IDENTITY.whatsAppUrl,
      'https://wa.me/5522999474304'
    );
    assert.strictEqual(
      CLINIC_IDENTITY.whatsAppDeepLink,
      'whatsapp://send?phone=5522999474304'
    );
  });

  test('openClinicWhatsApp URL generation and execution', async () => {
    // Test without message
    await assert.doesNotReject(async () => {
      await openClinicWhatsApp();
    });

    // Test with custom encoded message
    await assert.doesNotReject(async () => {
      await openClinicWhatsApp('Mensagem de teste para avaliação');
    });
  });

  test('ClinicIdentity component variations render without crashing', () => {
    // Header variant
    const headerEl = React.createElement(ClinicIdentityHeader, { variant: 'full', showSubtitle: true });
    assert.ok(React.isValidElement(headerEl));

    // Compact variant
    const compactEl = React.createElement(ClinicIdentityHeader, { variant: 'compact', showSubtitle: false });
    assert.ok(React.isValidElement(compactEl));

    // Footer variant
    const footerEl = React.createElement(ClinicIdentityFooter, { showWhatsAppAction: true });
    assert.ok(React.isValidElement(footerEl));

    // Unified wrapper variants
    const unifiedHeader = React.createElement(ClinicIdentity, { variant: 'header' });
    assert.ok(React.isValidElement(unifiedHeader));

    const unifiedFooter = React.createElement(ClinicIdentity, { variant: 'footer' });
    assert.ok(React.isValidElement(unifiedFooter));

    const unifiedCompact = React.createElement(ClinicIdentity, { variant: 'compact' });
    assert.ok(React.isValidElement(unifiedCompact));
  });
});
