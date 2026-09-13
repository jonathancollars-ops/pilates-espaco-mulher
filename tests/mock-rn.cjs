const Module = require('module');
const path = require('path');

const mockReactNativePath = path.resolve(__dirname, 'mocks', 'react-native.cjs');
const mockExpoHapticsPath = path.resolve(__dirname, 'mocks', 'expo-haptics.cjs');
const mockVectorIconsPath = path.resolve(__dirname, 'mocks', 'vector-icons.cjs');
const mockSafeAreaPath = path.resolve(__dirname, 'mocks', 'safe-area.cjs');
const mockStatusBarPath = path.resolve(__dirname, 'mocks', 'status-bar.cjs');
const mockFileSystemPath = path.resolve(__dirname, 'mocks', 'expo-file-system.cjs');
const mockSharingPath = path.resolve(__dirname, 'mocks', 'expo-sharing.cjs');
const mockSqlitePath = path.resolve(__dirname, 'mocks', 'expo-sqlite.cjs');
const mockPrintPath = path.resolve(__dirname, 'mocks', 'expo-print.cjs');
const mockUpdatesPath = path.resolve(__dirname, 'mocks', 'expo-updates.cjs');
const mockConstantsPath = path.resolve(__dirname, 'mocks', 'expo-constants.cjs');
const mockImagePickerPath = path.resolve(__dirname, 'mocks', 'expo-image-picker.cjs');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native') {
    return mockReactNativePath;
  }
  if (request === 'expo-haptics') {
    return mockExpoHapticsPath;
  }
  if (request === '@expo/vector-icons') {
    return mockVectorIconsPath;
  }
  if (request === 'react-native-safe-area-context') {
    return mockSafeAreaPath;
  }
  if (request === 'expo-status-bar') {
    return mockStatusBarPath;
  }
  if (request === 'expo-file-system' || request === 'expo-file-system/legacy') {
    return mockFileSystemPath;
  }
  if (request === 'expo-sharing') {
    return mockSharingPath;
  }
  if (request === 'expo-sqlite') {
    return mockSqlitePath;
  }
  if (request === 'expo-print') {
    return mockPrintPath;
  }
  if (request === 'expo-updates') {
    return mockUpdatesPath;
  }
  if (request === 'expo-constants') {
    return mockConstantsPath;
  }
  if (request === 'expo-image-picker') {
    return mockImagePickerPath;
  }
  return origResolve.call(this, request, parent, isMain, options);
};
