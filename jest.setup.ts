// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Minimal mock for react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    SafeAreaProvider: ({children}: any) => React.createElement(View, null, children),
    SafeAreaView: ({children}: any) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
    initialWindowMetrics: {
      frame: {x: 0, y: 0, width: 0, height: 0},
      insets: {top: 0, right: 0, bottom: 0, left: 0},
    },
  };
});

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => {
  const mock = {
    pickSingle: jest.fn(() => Promise.reject(Object.assign(new Error('No file in test'), {code: 'DOCUMENT_PICKER_CANCELED'}))),
  };
  const types = { allFiles: '*/*' };
  const isCancel = (e: any) => e?.code === 'DOCUMENT_PICKER_CANCELED';
  return {
    __esModule: true,
    default: mock,
    types,
    isCancel,
  };
});
