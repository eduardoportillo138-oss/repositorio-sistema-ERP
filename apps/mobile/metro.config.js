const path = require('path');
const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');
const rootNodeModules = path.join(workspaceRoot, 'node_modules');
const physicalWorkspaceRoot = path.resolve(
  fs.realpathSync(path.join(rootNodeModules, '@erp', 'api-client')),
  '../..',
);
const workspacePackages = ['api-client', 'config', 'constants', 'session', 'types', 'ui', 'validation'];

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [...new Set([workspaceRoot, physicalWorkspaceRoot])],
  resolver: {
    nodeModulesPaths: [...new Set([rootNodeModules, path.join(physicalWorkspaceRoot, 'node_modules'), path.join(__dirname, 'node_modules')])],
    extraNodeModules: {
      react: path.join(rootNodeModules, 'react'),
      'react-native': path.join(rootNodeModules, 'react-native'),
      ...Object.fromEntries(
        workspacePackages.map(name => [`@erp/${name}`, path.join(workspaceRoot, 'packages', name)]),
      ),
    },
  },
});
