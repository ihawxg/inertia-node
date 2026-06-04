import {
  generateApp,
  parseArgs,
  resolveCreateAppConfig,
  validateCreateAppConfig,
  type CreateAppConfig,
  type CreateAppInput,
} from "@inertia-node/create";

const input: CreateAppInput = {
  name: "consumer-app",
  preset: "saas",
  packageManager: "pnpm",
  orm: "drizzle",
  db: "postgres",
  auth: "password",
  ssr: true,
  docker: true,
  dryRun: true,
  install: false,
  git: false,
};

const config: CreateAppConfig = resolveCreateAppConfig(input);
const validation = validateCreateAppConfig(config);
const parsed = parseArgs(["demo", "--preset", "fullstack", "--yes"]);

void validation.ok;
void parsed.name;
void generateApp(input).then((result) => {
  const firstFile = result.files[0];

  if (firstFile) {
    void firstFile.path;
  }
});
