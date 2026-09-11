/// <reference types="node" />
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { Button } from '../../src/design-system/Button';
import { Card } from '../../src/design-system/Card';
import { Badge } from '../../src/design-system/Badge';
import {
  LargeTitleHero,
  LargeTitleNavBar,
} from '../../src/design-system/LargeTitleHeader';
import { Colors, Radii, Layout } from '../../src/design-system/tokens';
// @ts-ignore
import { hapticsHistory } from '../mocks/expo-haptics.cjs';
// @ts-ignore
import { Animated } from '../mocks/react-native.cjs';

describe('Adversarial Stress Testing — Button, Card, Badge, LargeTitle', () => {
  beforeEach(() => {
    hapticsHistory.length = 0;
  });

  test('Button: Loading state suppresses onPress and haptics', () => {
    let pressed = false;
    const rendered = Button({
      title: 'Salvar Prontuário',
      loading: true,
      onPress: () => {
        pressed = true;
      },
    });

    // Attempt press on loading button
    rendered.props.onPress();
    assert.strictEqual(pressed, false, 'Loading button must suppress onPress callback');
    assert.strictEqual(hapticsHistory.length, 0, 'Loading button must NOT trigger haptics');
  });

  test('Button: Disabled state suppresses onPress and haptics', () => {
    let pressed = false;
    const rendered = Button({
      title: 'Excluir Paciente',
      disabled: true,
      variant: 'destructive',
      onPress: () => {
        pressed = true;
      },
    });

    rendered.props.onPress();
    assert.strictEqual(pressed, false, 'Disabled button must suppress onPress callback');
    assert.strictEqual(hapticsHistory.length, 0, 'Disabled button must NOT trigger haptics');
  });

  test('Button: Small size touch ergonomics applies hitSlop', () => {
    const rendered = Button({
      title: 'Adicionar',
      size: 'small',
      onPress: () => {},
    });

    assert.deepStrictEqual(
      rendered.props.hitSlop,
      { top: 6, bottom: 6, left: 6, right: 6 },
      'Small button must have hitSlop to comply with HIG touch targets'
    );
  });

  test('Button: Destructive variant triggers warning haptics by default', () => {
    let pressed = false;
    const rendered = Button({
      title: 'Excluir',
      variant: 'destructive',
      onPress: () => {
        pressed = true;
      },
    });

    rendered.props.onPress();
    assert.strictEqual(pressed, true);
    assert.strictEqual(hapticsHistory[0].value, 'warning');
  });

  test('Card: Resilient to missing headers and footers', () => {
    const rendered = Card({
      children: React.createElement('Text', {}, 'Card Body Content'),
    });

    assert.ok(rendered !== null);
    // Body is children[1] when hasHeader is false
    assert.ok(rendered.props.children !== null);
  });

  test('Card: Elevated, outlined, and filled variant styles', () => {
    const elevated = Card({ children: null, variant: 'elevated' });
    assert.ok(elevated !== null);

    const outlined = Card({ children: null, variant: 'outlined' });
    assert.ok(outlined !== null);

    const filled = Card({ children: null, variant: 'filled' });
    assert.ok(filled !== null);
  });

  test('Badge: Variant themes and style types', () => {
    const variants = ['primary', 'secondary', 'success', 'alert', 'warning', 'neutral'] as const;
    const styleTypes = ['filled', 'subtle', 'outline'] as const;

    for (const v of variants) {
      for (const st of styleTypes) {
        const rendered = Badge({
          label: `Status ${v}`,
          variant: v,
          styleType: st,
          dot: true,
        });
        assert.ok(rendered !== null, `Badge(${v}, ${st}) must render safely`);
      }
    }
  });

  test('Badge: Pressable badge includes accessibilityRole="button"', () => {
    let pressed = false;
    const rendered = Badge({
      label: 'Toque Aqui',
      onPress: () => {
        pressed = true;
      },
    });

    assert.ok(rendered !== null);
    assert.strictEqual(rendered.props.accessibilityRole, 'button');
    rendered.props.onPress();
    assert.strictEqual(pressed, true);
  });

  test('LargeTitle: Hero and NavBar animated components handle extreme offsets', () => {
    const scrollY: any = new Animated.Value(0);

    // Initial state: offset 0
    const heroAt0 = LargeTitleHero({
      title: 'Pacientes',
      subtitle: 'Clínica',
      scrollY,
    });
    assert.ok(heroAt0 !== null);

    const navBarAt0 = LargeTitleNavBar({
      title: 'Pacientes',
      scrollY,
    });
    assert.ok(navBarAt0 !== null);

    // Negative rubber-band offset (pull to refresh)
    scrollY.setValue(-150);
    const heroAtNegative = LargeTitleHero({
      title: 'Pacientes',
      scrollY,
    });
    assert.ok(heroAtNegative !== null);

    // High scroll offset (collapsed navbar state)
    scrollY.setValue(500);
    const navBarAt500 = LargeTitleNavBar({
      title: 'Pacientes',
      scrollY,
    });
    assert.ok(navBarAt500 !== null);
  });
});
