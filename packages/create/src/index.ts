export { parseArgs, helpText, HelpRequested } from "./args.js";
export { buildGeneratedFiles } from "./files.js";
export { generateApp } from "./generate.js";
export { supportedManifest, validateCreateAppConfig } from "./manifest.js";
export { normalizePackageName, resolveCreateAppConfig } from "./presets.js";
export { applyAddonChoices } from "./prompts.js";
export type {
  AuthConfig,
  AutomationConfig,
  ClientConfig,
  CreateAppConfig,
  CreateAppInput,
  DatabaseConfig,
  DeploymentConfig,
  FeatureConfig,
  GeneratedFile,
  GenerateResult,
  GenerationConfig,
  InertiaConfig,
  PackageManager,
  PresetConfig,
  PresetName,
  ProjectMeta,
  QualityConfig,
  RuntimeConfig,
  ServerConfig,
  TestingConfig,
  UiConfig,
} from "./types.js";
