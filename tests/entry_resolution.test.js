const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { resolveEntryPoint } = require('@expo/config/build/Paths');

const projectRoot = path.resolve(__dirname, '..');

describe('Expo Entry Point and Bundler Resolution', () => {
  test('Expo CLI can resolve project entry file without error', () => {
    assert.doesNotThrow(() => {
      resolveEntryPoint(projectRoot);
    }, /Cannot resolve entry file/);
  });
});
