const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Single project root — avoids duplicate graphs from nested watch folders.
config.watchFolders = [__dirname];

config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 10000,
  },
};

// One resolver graph; block nested duplicate installs if present.
const projectRoot = __dirname;
const parentNodeModules = path.resolve(projectRoot, "..", "node_modules");
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(projectRoot, "node_modules")],
  blockList: [
    ...(Array.isArray(config.resolver?.blockList)
      ? config.resolver.blockList
      : config.resolver?.blockList
        ? [config.resolver.blockList]
        : []),
    new RegExp(
      `${parentNodeModules.replace(/[/\\]/g, "[/\\\\]")}[/\\\\]`,
    ),
  ],
};

module.exports = config;
