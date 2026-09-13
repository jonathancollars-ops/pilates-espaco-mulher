module.exports = {
  documentDirectory: 'file:///data/user/0/com.espacomulher.pilates/files/',
  cacheDirectory: 'file:///data/user/0/com.espacomulher.pilates/cache/',
  writeAsStringAsync: async () => {},
  readAsStringAsync: async () => '',
  getInfoAsync: async (uri) => ({ exists: true, isDirectory: true, uri, size: 1024 }),
  makeDirectoryAsync: async (uri, options) => {},
  copyAsync: async ({ from, to }) => {},
  deleteAsync: async (uri, options) => {},
  EncodingType: { UTF8: 'utf8' },
};
