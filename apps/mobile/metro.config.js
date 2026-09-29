const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');
const rootNodeModules = path.join(workspaceRoot, 'node_modules');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [rootNodeModules, path.join(__dirname, 'node_modules')],
    extraNodeModules: {
      react: path.join(rootNodeModules, 'react'),
      'react-native': path.join(rootNodeModules, 'react-native'),
    },
  },
});
