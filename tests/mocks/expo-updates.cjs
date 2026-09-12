let mockIsEnabled = false;
let mockUpdateAvailable = false;
let mockManifest = null;
let mockCheckError = null;

module.exports = {
  get isEnabled() {
    return mockIsEnabled;
  },
  set isEnabled(val) {
    mockIsEnabled = val;
  },
  checkForUpdateAsync: async () => {
    if (mockCheckError) {
      throw mockCheckError;
    }
    return {
      isAvailable: mockUpdateAvailable,
      manifest: mockManifest,
    };
  },
  fetchUpdateAsync: async () => {
    return { isNew: true };
  },
  reloadAsync: async () => {},
  __setMockState: (opts) => {
    if (opts.isEnabled !== undefined) mockIsEnabled = opts.isEnabled;
    if (opts.isAvailable !== undefined) mockUpdateAvailable = opts.isAvailable;
    if (opts.manifest !== undefined) mockManifest = opts.manifest;
    if (opts.checkError !== undefined) mockCheckError = opts.checkError;
  },
  __reset: () => {
    mockIsEnabled = false;
    mockUpdateAvailable = false;
    mockManifest = null;
    mockCheckError = null;
  },
};
