const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from project node_modules and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force singletons for React and React Native pointing to workspace root node_modules
const rootNodeModules = path.resolve(workspaceRoot, 'node_modules');

config.resolver.extraNodeModules = {
  'react': path.resolve(rootNodeModules, 'react'),
  'react-native': path.resolve(rootNodeModules, 'react-native'),
  'react-redux': path.resolve(rootNodeModules, 'react-redux'),
  '@reduxjs/toolkit': path.resolve(rootNodeModules, '@reduxjs/toolkit'),
};

module.exports = config;
