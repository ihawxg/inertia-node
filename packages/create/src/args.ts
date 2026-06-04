import type {
  AuthConfig,
  CreateAppInput,
  DatabaseConfig,
  PackageManager,
  PresetName,
} from "./types.js";

export function parseArgs(argv: string[]): CreateAppInput {
  const input: CreateAppInput = {};
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;

    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.replace(/^--?/, "").split("=", 2);
    const key = rawKey ?? "";
    const value = inlineValue ?? argv[index + 1];
    const consumeValue =
      inlineValue === undefined && value && !value.startsWith("-");

    switch (key) {
      case "preset":
        input.preset = value as PresetName;
        if (consumeValue) index += 1;
        break;
      case "pm":
      case "package-manager":
        input.packageManager = value as PackageManager;
        if (consumeValue) index += 1;
        break;
      case "orm":
        input.orm = value as DatabaseConfig["orm"];
        if (consumeValue) index += 1;
        break;
      case "db":
      case "database":
        input.db = value as DatabaseConfig["driver"];
        if (consumeValue) index += 1;
        break;
      case "ui":
        input.ui = value as CreateAppInput["ui"];
        if (consumeValue) index += 1;
        break;
      case "auth":
        input.auth = value as AuthConfig["mode"];
        if (consumeValue) index += 1;
        break;
      case "node":
        input.nodeVersion = value as CreateAppInput["nodeVersion"];
        if (consumeValue) index += 1;
        break;
      case "yes":
      case "y":
        input.yes = true;
        break;
      case "dry-run":
        input.dryRun = true;
        input.install = false;
        input.git = false;
        break;
      case "force":
        input.force = true;
        break;
      case "install":
        input.install = true;
        break;
      case "no-install":
        input.install = false;
        break;
      case "git":
        input.git = true;
        break;
      case "no-git":
        input.git = false;
        break;
      case "ssr":
        input.ssr = true;
        break;
      case "no-ssr":
        input.ssr = false;
        break;
      case "teams":
        input.teams = true;
        break;
      case "roles":
        input.roles = true;
        break;
      case "permissions":
        input.permissions = true;
        break;
      case "docker":
        input.docker = true;
        break;
      case "github-actions":
        input.githubActions = true;
        break;
      case "no-github-actions":
        input.githubActions = false;
        break;
      case "playwright":
        input.playwright = true;
        break;
      case "eslint":
        input.eslint = true;
        break;
      case "no-eslint":
        input.eslint = false;
        break;
      case "prettier":
        input.prettier = true;
        break;
      case "no-prettier":
        input.prettier = false;
        break;
      case "verbose":
        input.verbose = true;
        break;
      case "help":
      case "h":
        throw new HelpRequested();
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }

  if (positionals[0]) {
    input.name = positionals[0];
    input.directory = positionals[0];
  }

  return input;
}

export class HelpRequested extends Error {
  constructor() {
    super("Help requested");
  }
}

export function helpText(): string {
  return `Usage:
  pnpm create @inertia-node
  pnpm create @inertia-node my-app --preset fullstack
  pnpm create @inertia-node my-app --preset laravel-like --db postgres --orm drizzle --ui shadcn
  pnpm create @inertia-node my-app --preset saas --teams --roles --docker --playwright
  pnpm create @inertia-node my-app --dry-run

Options:
  interactive              Run without --yes for polished prompts
  --preset <name>          minimal, fullstack, laravel-like, saas, admin, api-backed, custom
  --package-manager <pm>   pnpm, npm, yarn, bun
  --orm <orm>              drizzle, prisma, none
  --db <driver>            sqlite, postgres, mysql, none
  --ui <ui>                css, tailwind, shadcn
  --auth <mode>            password, none
  --ssr / --no-ssr
  --docker
  --playwright
  --github-actions / --no-github-actions
  --yes
  --dry-run               Prompt normally unless --yes is also passed; never writes files
  --force
  --no-install
  --no-git

Roadmap:
  Fastify, NestJS, Vue, and Svelte are planned but not generated yet.
`;
}
