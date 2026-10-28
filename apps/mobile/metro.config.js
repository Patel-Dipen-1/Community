const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable walking up to parent directory node_modules (e.g. E:\1st\node_modules)
config.resolver.disableHierarchicalLookup = true;

// Explicitly use only mobile's own local node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Only watch this mobile directory
config.watchFolders = [__dirname];

module.exports = config;
