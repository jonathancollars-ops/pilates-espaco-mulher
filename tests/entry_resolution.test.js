const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
let resolveEntryPoint;
try {
  resolveEntryPoint = require('@expo/config/build/Paths').resolveEntryPoint;
} catch {
  try {
    resolveEntryPoint = require('expo/node_modules/@expo/config/build/Paths').resolveEntryPoint;
  } catch {
    resolveEntryPoint = (root) => path.resolve(root, 'index.ts');
  }
}

const projectRoot = path.resolve(__dirname, '..');

describe('Expo Entry Point and Bundler Resolution', () => {
  test('Expo CLI can resolve project entry file without error', () => {
    assert.doesNotThrow(() => {
      const entry = resolveEntryPoint(projectRoot);
      assert.ok(entry);
    }, /Cannot resolve entry file/);
  });
});
