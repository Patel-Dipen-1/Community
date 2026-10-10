const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

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

// Force singletons for React-related packages and subpaths to use mobile's local node_modules
const forceLocalPrefixes = [
  'react',
  'react-dom',
  'react-native',
  'react-redux',
  '@reduxjs/toolkit',
  'react-native-safe-area-context',
  'react-native-screens',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const matchingPrefix = forceLocalPrefixes.find(
    (prefix) => moduleName === prefix || moduleName.startsWith(prefix + '/')
  );

  if (matchingPrefix) {
    const relativeSubpath = moduleName === matchingPrefix ? '' : moduleName.slice(matchingPrefix.length + 1);
    const localDir = path.resolve(projectRoot, 'node_modules', matchingPrefix);

    if (fs.existsSync(localDir)) {
      if (!relativeSubpath) {
        const pkgJsonPath = path.join(localDir, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          let mainFile = pkg.main || 'index.js';
          if (mainFile.endsWith('.d.ts')) mainFile = 'index.js';
          let targetPath = path.resolve(localDir, mainFile);
          if (!fs.existsSync(targetPath) && fs.existsSync(targetPath + '.js')) {
            targetPath = targetPath + '.js';
          }
          if (!fs.existsSync(targetPath)) {
            targetPath = path.join(localDir, 'index.js');
          }
          return {
            filePath: targetPath,
            type: 'sourceFile',
          };
        }
      } else {
        let targetPath = path.resolve(localDir, relativeSubpath);
        if (!fs.existsSync(targetPath) && fs.existsSync(targetPath + '.js')) {
          targetPath = targetPath + '.js';
        }
        if (!fs.existsSync(targetPath) && fs.existsSync(path.join(targetPath, 'index.js'))) {
          targetPath = path.join(targetPath, 'index.js');
        }
        if (fs.existsSync(targetPath)) {
          return {
            filePath: targetPath,
            type: 'sourceFile',
          };
        }
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
