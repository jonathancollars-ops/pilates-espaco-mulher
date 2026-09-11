const React = require('react');

class MockAnimatedValue {
  constructor(val) {
    this._value = val;
  }
  setValue(val) {
    this._value = val;
  }
  interpolate(config) {
    return `interpolated(${this._value})`;
  }
}

const View = React.forwardRef((props, ref) => React.createElement('View', { ...props, ref }));
const Text = React.forwardRef((props, ref) => React.createElement('Text', { ...props, ref }));
const ScrollView = React.forwardRef((props, ref) => React.createElement('ScrollView', { ...props, ref }));
const Pressable = React.forwardRef((props, ref) => {
  const children = typeof props.children === 'function' ? props.children({ pressed: false }) : props.children;
  return React.createElement('Pressable', { ...props, ref }, children);
});
const TouchableOpacity = React.forwardRef((props, ref) => React.createElement('TouchableOpacity', { ...props, ref }));
const TextInput = React.forwardRef((props, ref) => React.createElement('TextInput', { ...props, ref }));
const ActivityIndicator = React.forwardRef((props, ref) => React.createElement('ActivityIndicator', { ...props, ref }));

const StyleSheet = {
  create: (styles) => styles,
  hairlineWidth: 0.5,
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
};

const Platform = {
  OS: 'ios',
  select: (obj) => (obj && obj.ios !== undefined ? obj.ios : obj && obj.default !== undefined ? obj.default : undefined),
};

const Linking = {
  canOpenURL: async (url) => true,
  openURL: async (url) => true,
};

const Alert = {
  alert: (title, message, buttons) => {},
};

const Animated = {
  Value: MockAnimatedValue,
  spring: (val, config) => ({
    start: (cb) => {
      val.setValue(config.toValue);
      if (cb) cb({ finished: true });
    },
  }),
  timing: (val, config) => ({
    start: (cb) => {
      val.setValue(config.toValue);
      if (cb) cb({ finished: true });
    },
  }),
  event: () => () => {},
  View: React.forwardRef((props, ref) => React.createElement('Animated.View', { ...props, ref })),
  ScrollView: React.forwardRef((props, ref) => React.createElement('Animated.ScrollView', { ...props, ref })),
};

module.exports = {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  Animated,
};
