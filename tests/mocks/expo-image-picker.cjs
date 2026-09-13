module.exports = {
  requestCameraPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  launchCameraAsync: async () => ({ canceled: true, assets: [] }),
  launchImageLibraryAsync: async () => ({ canceled: true, assets: [] }),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
};
