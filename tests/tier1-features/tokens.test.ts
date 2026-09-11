/// <reference types="node" />
import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Layout,
} from '../../src/design-system/tokens';

describe('Design System Tokens — Exact Specifications & HIG Compliance', () => {
  test('Exact Official Brand Hex Values', () => {
    // 1. Primária Lilás / Roxo
    assert.strictEqual(
      Colors.primary.toUpperCase(),
      '#9B6CBA',
      'Primary color must match #9B6CBA exactly'
    );
    assert.strictEqual(
      Colors.primaryDark.toUpperCase(),
      '#7A4F94',
      'PrimaryDark color must match #7A4F94 exactly'
    );

    // 2. Superfície / Fundo Agrupado
    assert.strictEqual(
      Colors.surface.toUpperCase(),
      '#FAF8F5',
      'Surface color must match #FAF8F5 exactly'
    );
    assert.strictEqual(
      Colors.surfaceSecondary.toUpperCase(),
      '#F4EEF7',
      'SurfaceSecondary color must match #F4EEF7 exactly'
    );

    // 3. Acento / Alertas / Destrutivo (Vinho Bordô)
    assert.strictEqual(
      Colors.accent.toUpperCase(),
      '#6A1B15',
      'Accent color must match #6A1B15 exactly'
    );
    assert.strictEqual(
      Colors.accentAlert.toUpperCase(),
      '#6A1B15',
      'AccentAlert alias must match #6A1B15'
    );
    assert.strictEqual(
      Colors.destructive.toUpperCase(),
      '#6A1B15',
      'Destructive color must match #6A1B15 exactly'
    );

    // 4. Sucesso / Parâmetros Saudáveis (Verde Floresta)
    assert.strictEqual(
      Colors.success.toUpperCase(),
      '#1B5235',
      'Success color must match #1B5235 exactly'
    );
    assert.strictEqual(
      Colors.accentSuccess.toUpperCase(),
      '#1B5235',
      'AccentSuccess alias must match #1B5235'
    );
  });

  test('Apple SF Pro 11-Step Typography Scale', () => {
    const expectedScale = {
      largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
      title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
      title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
      title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
      headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
      body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
      callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
      subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
      footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
      caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
      caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
    } as const;

    for (const [key, expected] of Object.entries(expectedScale)) {
      const actual = Typography[key as keyof typeof expectedScale];
      assert.ok(actual, `Typography scale must define ${key}`);
      assert.strictEqual(
        actual.fontSize,
        expected.fontSize,
        `Typography.${key}.fontSize must be ${expected.fontSize}`
      );
      assert.strictEqual(
        actual.lineHeight,
        expected.lineHeight,
        `Typography.${key}.lineHeight must be ${expected.lineHeight}`
      );
      assert.strictEqual(
        actual.fontWeight,
        expected.fontWeight,
        `Typography.${key}.fontWeight must be ${expected.fontWeight}`
      );
    }
  });

  test('Apple HIG Layout & Touch Targets', () => {
    assert.strictEqual(
      Layout.minTouchTarget,
      44,
      'Apple HIG minimum touch target must be 44pt'
    );
    assert.strictEqual(
      Layout.rowMinHeight,
      48,
      'Apple HIG list row minimum height must be 48pt'
    );
    assert.strictEqual(
      Radii.card,
      14,
      'Apple HIG continuous corner squircle card radius must be 14pt'
    );
    assert.strictEqual(
      Layout.separatorIndentWithIcon,
      58,
      'Separator indent with icon must be 58pt'
    );
    assert.strictEqual(
      Layout.separatorIndentWithoutIcon,
      16,
      'Separator indent without icon must be 16pt'
    );
  });

  test('Spacing and Radii Hierarchy Completeness', () => {
    assert.strictEqual(Spacing.base, 16);
    assert.strictEqual(Spacing.sm, 8);
    assert.strictEqual(Spacing.md, 12);
    assert.strictEqual(Spacing.lg, 20);
    assert.strictEqual(Spacing.xl, 24);

    assert.strictEqual(Radii.pill, 9999);
    assert.strictEqual(Radii.modal, 20);
    assert.strictEqual(Radii.sm, 8);
  });
});
