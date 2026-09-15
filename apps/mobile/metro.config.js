const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enablePackageExports = true;
config.resolver.disableHierarchicalLookup = true;

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = originalResolveRequest ?? context.resolveRequest.bind(context);
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    const asTs = moduleName.replace(/\.js$/, ".ts");
    try {
      return resolve(context, asTs, platform);
    } catch {
      /* fall through to the original specifier */
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
