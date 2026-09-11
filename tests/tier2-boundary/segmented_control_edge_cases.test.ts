/// <reference types="node" />
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { SegmentedControl } from '../../src/design-system/SegmentedControl';
// @ts-ignore
import { hapticsHistory } from '../mocks/expo-haptics.cjs';
// @ts-ignore
import { render, createRenderer } from '../render.cjs';

describe('SegmentedControl — Boundary Values & Adversarial Edge Cases', () => {
  beforeEach(() => {
    hapticsHistory.length = 0;
  });

  test('Edge Case 1: Empty Tabs array (values: [])', () => {
    let changed = false;
    const rendered = render(SegmentedControl, {
      values: [],
      selectedIndex: 0,
      onChange: () => {
        changed = true;
      },
    });

    assert.ok(rendered !== null, 'Empty SegmentedControl should return safe empty container');
    assert.strictEqual(changed, false, 'No changes should be fired');
  });

  test('Edge Case 2: Single Tab (values: ["Apenas Um"])', () => {
    let selectedIdx = -1;
    let selectedVal = '';

    const renderer = createRenderer();
    const rendered = renderer.render(SegmentedControl, {
      values: ['Apenas Um'],
      selectedIndex: 0,
      onChange: (index: number, val: string) => {
        selectedIdx = index;
        selectedVal = val;
      },
    });

    assert.ok(rendered !== null);
    assert.strictEqual(rendered.props.accessibilityRole, 'tablist');

    // Simulate onLayout measurement
    rendered.props.onLayout({ nativeEvent: { layout: { width: 300 } } });

    // Segments row should contain 1 tab
    const segmentsRow = rendered.props.children[1];
    assert.strictEqual(segmentsRow.props.children.length, 1);

    const singleTab = segmentsRow.props.children[0];
    assert.strictEqual(singleTab.props.accessibilityRole, 'tab');
    assert.strictEqual(singleTab.props.accessibilityState.selected, true);

    // Pressing already selected tab should be ignored
    singleTab.props.onPress();
    assert.strictEqual(selectedIdx, -1, 'Pressing already selected index should not fire onChange');
    assert.strictEqual(hapticsHistory.length, 0);
  });

  test('Edge Case 3: Long String Labels Truncation (numberOfLines = 1)', () => {
    const longLabel1 =
      'Avaliação Fisioterapêutica Postural Completa com Fotogrametria Computadorizada e Fio de Prumo';
    const longLabel2 =
      'Prescrição Individualizada de Rotina de Treino de Pilates no Reformer e Cadillac';

    const rendered = render(SegmentedControl, {
      values: [longLabel1, longLabel2],
      selectedIndex: 0,
      onChange: () => {},
    });

    const segmentsRow = rendered.props.children[1];
    const firstTab = segmentsRow.props.children[0];
    const textElement = firstTab.props.children[0];

    assert.strictEqual(
      textElement.props.numberOfLines,
      1,
      'Long labels must be restricted to 1 line with ellipsis'
    );
    assert.strictEqual(textElement.props.children, longLabel1);
  });

  test('Edge Case 4: Out of bounds selectedIndex (-1, 999)', () => {
    // Negative index
    const negRendered = render(SegmentedControl, {
      values: ['Tab 1', 'Tab 2'],
      selectedIndex: -1,
      onChange: () => {},
    });
    assert.ok(negRendered !== null, 'Negative selectedIndex should not throw');

    // High index
    const highRendered = render(SegmentedControl, {
      values: ['Tab 1', 'Tab 2'],
      selectedIndex: 999,
      onChange: () => {},
    });
    assert.ok(highRendered !== null, 'High selectedIndex should not throw');
  });

  test('Edge Case 5: Disabled state prevents press and haptics', () => {
    let triggered = false;
    const rendered = render(SegmentedControl, {
      values: ['Ativo', 'Pausado'],
      selectedIndex: 0,
      disabled: true,
      onChange: () => {
        triggered = true;
      },
    });

    const segmentsRow = rendered.props.children[1];
    const secondTab = segmentsRow.props.children[1];

    // Attempt press on disabled tab
    secondTab.props.onPress();

    assert.strictEqual(triggered, false, 'Disabled tab should not fire onChange');
    assert.strictEqual(hapticsHistory.length, 0, 'Disabled tab should not trigger haptics');
  });

  test('Edge Case 6: Numeric and String Badges Rendering', () => {
    const rendered = render(SegmentedControl, {
      values: ['Pacientes', 'Pendentes', 'Finalizados'],
      selectedIndex: 0,
      badges: {
        0: 12,
        1: 'Novo',
        2: 0,
      },
      onChange: () => {},
    });

    const segmentsRow = rendered.props.children[1];
    const tab0 = segmentsRow.props.children[0];
    const badge0 = tab0.props.children[1];
    assert.ok(badge0 !== null, 'Badge 0 should exist');
    assert.strictEqual(badge0.props.children.props.children, 12);

    const tab1 = segmentsRow.props.children[1];
    const badge1 = tab1.props.children[1];
    assert.strictEqual(badge1.props.children.props.children, 'Novo');

    const tab2 = segmentsRow.props.children[2];
    const badge2 = tab2.props.children[1];
    assert.strictEqual(badge2.props.children.props.children, 0, 'Badge with value 0 must be rendered');
  });

  test('Edge Case 7: Segment buttons have hitSlop for Apple HIG 44pt touch area compliance', () => {
    const rendered = render(SegmentedControl, {
      values: ['Opção 1', 'Opção 2'],
      selectedIndex: 0,
      onChange: () => {},
    });

    const segmentsRow = rendered.props.children[1];
    const tab0 = segmentsRow.props.children[0];
    assert.deepStrictEqual(tab0.props.hitSlop, { top: 4, bottom: 4, left: 4, right: 4 });
  });
});
