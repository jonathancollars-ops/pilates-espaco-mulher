/// <reference types="node" />
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  Haptics,
  selectionAsync,
  notificationAsync,
  impactAsync,
} from '../../src/design-system/Haptics';
// @ts-ignore
import { hapticsHistory } from '../mocks/expo-haptics.cjs';
// @ts-ignore
import { Platform } from '../mocks/react-native.cjs';

describe('Haptic Feedback Engine — Safe Fallbacks & Native Taptic Triggers', () => {
  beforeEach(() => {
    hapticsHistory.length = 0;
    Platform.OS = 'ios';
  });

  test('Native iOS Taptic Triggers Dispatch Correct Types', async () => {
    await selectionAsync();
    assert.strictEqual(hapticsHistory.length, 1);
    assert.strictEqual(hapticsHistory[0].type, 'selection');

    await notificationAsync('success');
    assert.strictEqual(hapticsHistory[1].type, 'notification');
    assert.strictEqual(hapticsHistory[1].value, 'success');

    await notificationAsync('warning');
    assert.strictEqual(hapticsHistory[2].type, 'notification');
    assert.strictEqual(hapticsHistory[2].value, 'warning');

    await notificationAsync('error');
    assert.strictEqual(hapticsHistory[3].type, 'notification');
    assert.strictEqual(hapticsHistory[3].value, 'error');

    await impactAsync('light');
    assert.strictEqual(hapticsHistory[4].type, 'impact');
    assert.strictEqual(hapticsHistory[4].value, 'light');

    await impactAsync('medium');
    assert.strictEqual(hapticsHistory[5].type, 'impact');
    assert.strictEqual(hapticsHistory[5].value, 'medium');

    await impactAsync('heavy');
    assert.strictEqual(hapticsHistory[6].type, 'impact');
    assert.strictEqual(hapticsHistory[6].value, 'heavy');
  });

  test('Semantic Convenience Methods on Haptics Object', async () => {
    await Haptics.selection();
    assert.strictEqual(hapticsHistory[0].type, 'selection');

    await Haptics.success();
    assert.strictEqual(hapticsHistory[1].value, 'success');

    await Haptics.warning();
    assert.strictEqual(hapticsHistory[2].value, 'warning');

    await Haptics.error();
    assert.strictEqual(hapticsHistory[3].value, 'error');

    await Haptics.impactLight();
    assert.strictEqual(hapticsHistory[4].value, 'light');

    await Haptics.impactMedium();
    assert.strictEqual(hapticsHistory[5].value, 'medium');

    await Haptics.impactHeavy();
    assert.strictEqual(hapticsHistory[6].value, 'heavy');
  });

  test('Web Vibration Fallback Mechanics when Platform.OS is web', async () => {
    Platform.OS = 'web';
    const vibrationHistory: any[] = [];

    // Mock global window and navigator.vibrate
    (global as any).window = {
      navigator: {
        vibrate: (pattern: any) => {
          vibrationHistory.push(pattern);
          return true;
        },
      } as any,
    };

    try {
      await selectionAsync();
      assert.deepStrictEqual(vibrationHistory[0], 10);

      await notificationAsync('success');
      assert.deepStrictEqual(vibrationHistory[1], [20, 40, 20]);

      await notificationAsync('warning');
      assert.deepStrictEqual(vibrationHistory[2], [40, 60, 40]);

      await notificationAsync('error');
      assert.deepStrictEqual(vibrationHistory[3], [50, 50, 50, 50, 100]);

      await impactAsync('light');
      assert.deepStrictEqual(vibrationHistory[4], 15);

      await impactAsync('medium');
      assert.deepStrictEqual(vibrationHistory[5], 30);

      await impactAsync('heavy');
      assert.deepStrictEqual(vibrationHistory[6], 50);
    } finally {
      // @ts-ignore
      delete global.window;
      Platform.OS = 'ios';
    }
  });

  test('Silent Degradation when hardware or browser vibration is unavailable', async () => {
    // Platform web with no window object
    Platform.OS = 'web';
    await assert.doesNotReject(async () => {
      await selectionAsync();
      await notificationAsync('error');
      await impactAsync('heavy');
    });

    Platform.OS = 'ios';
  });
});
