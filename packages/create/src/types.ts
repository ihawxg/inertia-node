export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";
export type PresetName =
  | "minimal"
  | "fullstack"
  | "laravel-like"
  | "saas"
  | "admin"
  | "api-backed"
  | "custom";

export interface CreateAppConfig {
  meta: ProjectMeta;
  preset: PresetConfig;
  runtime: RuntimeConfig;
  server: ServerConfig;
  client: ClientConfig;
  inertia: InertiaConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  ui: UiConfig;
  features: FeatureConfig;
  quality: QualityConfig;
  testing: TestingConfig;
  deployment: DeploymentConfig;
  automation: AutomationConfig;
  generation: GenerationConfig;
}

export interface ProjectMeta {
  name: string;
  directory: string;
  packageManager: PackageManager;
  nodeVersion: "20" | "22" | "24";
  moduleFormat: "esm";
  srcDir: boolean;
  importAlias: string;
}

export interface PresetConfig {
  name: PresetName;
}

export interface RuntimeConfig {
  runtime: "node";
  packageManager: PackageManager;
}

export interface ServerConfig {
  framework: "express" | "fastify" | "nestjs";
  routerStyle: "controllers" | "route-files" | "single-server-file";
  validation: "zod" | "valibot" | "arktype" | "none";
  sessions: "file" | "redis" | "database" | "memory" | "none";
  csrf: boolean;
  rateLimit: boolean;
  compression: boolean;
  requestLogging: "none" | "pino" | "morgan";
  fileUploads: "none" | "multer" | "busboy";
  mail: "none" | "resend" | "nodemailer";
  jobs: "none" | "bullmq";
  cache: "none" | "redis" | "memory";
}

export interface ClientConfig {
  adapter: "react" | "vue" | "svelte";
  bundler: "vite";
  language: "typescript";
  forms:
    | "inertia-form"
    | "react-hook-form"
    | "vee-validate"
    | "svelte-forms"
    | "none";
  state: "none" | "tanstack-query" | "zustand" | "pinia";
  icons: "lucide" | "heroicons" | "none";
}

export interface InertiaConfig {
  ssr: boolean;
  deferredProps: boolean;
  mergeProps: boolean;
  flash: boolean;
  validationErrors: boolean;
  typedPageProps: boolean;
  typedRoutes: boolean;
  historyEncryption: boolean;
}

export interface DatabaseConfig {
  orm: "drizzle" | "prisma" | "kysely" | "none";
  driver:
    | "sqlite"
    | "postgres"
    | "mysql"
    | "turso"
    | "neon"
    | "planetscale"
    | "supabase"
    | "none";
  migrations: boolean;
  seed: boolean;
  studio: boolean;
  dockerService: boolean;
}

export interface AuthConfig {
  mode:
    | "none"
    | "password"
    | "password-reset"
    | "email-verification"
    | "oauth"
    | "passkeys"
    | "teams";
  hashing: "bcryptjs" | "argon2";
  roles: boolean;
  permissions: boolean;
  twoFactor: boolean;
  providers: Array<"github" | "google" | "discord" | "microsoft" | "apple">;
}

export interface UiConfig {
  styling: "css" | "tailwind" | "tailwind-shadcn";
  theme: "neutral" | "slate" | "zinc";
  darkMode: "class" | "media" | "none";
  layout: "sidebar" | "header" | "minimal";
  authLayout: "simple" | "card" | "split";
  componentSet: "none" | "shadcn" | "daisyui";
  installComponents: string[];
}

export interface FeatureConfig {
  dashboard: boolean;
  userCrud: boolean;
  profileSettings: boolean;
  passwordSettings: boolean;
  appearanceSettings: boolean;
  teams: boolean;
  auditLog: boolean;
  notifications: boolean;
  i18n: boolean;
  billingPlaceholder: boolean;
}

export interface QualityConfig {
  eslint: boolean;
  prettier: boolean;
  biome: boolean;
  strictTs: boolean;
  husky: boolean;
  lintStaged: boolean;
  changesets: boolean;
}

export interface TestingConfig {
  unit: "vitest" | "none";
  e2e: "playwright" | "none";
  api: "supertest" | "none";
  coverage: boolean;
  sampleTests: boolean;
}

export interface DeploymentConfig {
  target:
    | "node"
    | "docker"
    | "railway"
    | "render"
    | "fly"
    | "vercel"
    | "netlify";
  dockerfile: boolean;
  dockerCompose: boolean;
  githubActions: boolean;
  envExample: boolean;
  healthcheck: boolean;
}

export interface AutomationConfig {
  dependencyUpdates: "none" | "renovate" | "dependabot";
  ci: boolean;
}

export interface GenerationConfig {
  install: boolean;
  git: boolean;
  force: boolean;
  dryRun: boolean;
  verbose: boolean;
  skipPrompts: boolean;
}

export interface CreateAppInput {
  name?: string;
  directory?: string;
  packageManager?: PackageManager;
  preset?: PresetName;
  nodeVersion?: ProjectMeta["nodeVersion"];
  orm?: DatabaseConfig["orm"];
  db?: DatabaseConfig["driver"];
  ui?: "css" | "tailwind" | "shadcn" | "tailwind-shadcn";
  auth?: AuthConfig["mode"];
  ssr?: boolean;
  teams?: boolean;
  roles?: boolean;
  permissions?: boolean;
  docker?: boolean;
  githubActions?: boolean;
  playwright?: boolean;
  eslint?: boolean;
  prettier?: boolean;
  install?: boolean;
  git?: boolean;
  force?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

export interface GeneratedFile {
  path: string;
  contents: string;
}

export interface GenerateResult {
  config: CreateAppConfig;
  files: GeneratedFile[];
  directory: string;
  nextSteps: string[];
  warnings: string[];
}
