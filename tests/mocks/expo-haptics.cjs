const hapticsHistory = [];

module.exports = {
  hapticsHistory,
  selectionAsync: async () => {
    hapticsHistory.push({ type: 'selection' });
  },
  notificationAsync: async (type) => {
    hapticsHistory.push({ type: 'notification', value: type });
  },
  impactAsync: async (style) => {
    hapticsHistory.push({ type: 'impact', value: style });
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
};
