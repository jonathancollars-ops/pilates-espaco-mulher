const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { getConfig } = require('@expo/config');

const projectRoot = path.resolve(__dirname, '..');

describe('Expo Configuration & Plugins Validity', () => {
  test('getConfig loads without plugin errors', () => {
    assert.doesNotThrow(() => {
      getConfig(projectRoot, { skipSDKVersionRequirement: true });
    }, /PluginError/);
  });
});
