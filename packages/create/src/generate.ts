import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { buildGeneratedFiles } from "./files.js";
import { validateCreateAppConfig } from "./manifest.js";
import { resolveCreateAppConfig } from "./presets.js";
import type { CreateAppInput, GenerateResult } from "./types.js";

export async function generateApp(
  input: CreateAppInput = {},
): Promise<GenerateResult> {
  const config = resolveCreateAppConfig(input);
  const validation = validateCreateAppConfig(config);

  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }

  const files = buildGeneratedFiles(config);
  const result: GenerateResult = {
    config,
    files,
    directory: config.meta.directory,
    nextSteps: nextSteps(config),
    warnings: validation.warnings,
  };

  if (config.generation.dryRun) {
    return result;
  }

  await assertWritableDirectory(config.meta.directory, config.generation.force);

  for (const generatedFile of files) {
    const target = join(config.meta.directory, generatedFile.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, generatedFile.contents, "utf8");
  }

  if (config.generation.install) {
    run(installCommand(config.meta.packageManager), config.meta.directory);
  }

  if (config.generation.git) {
    run(["git", "init"], config.meta.directory, true);
    run(["git", "add", "."], config.meta.directory, true);
    run(["git", "commit", "-m", "Initial commit"], config.meta.directory, true);
  }

  return result;
}

function nextSteps(config: GenerateResult["config"]): string[] {
  const steps: string[] = [];
  const relativeDirectory = relative(process.cwd(), config.meta.directory);

  if (relativeDirectory && relativeDirectory !== "") {
    steps.push(`cd ${relativeDirectory}`);
  }

  if (!config.generation.install) {
    steps.push(installCommand(config.meta.packageManager).join(" "));
  }

  if (config.database.seed) {
    steps.push(
      runScriptCommand(config.meta.packageManager, "db:seed").join(" "),
    );
  }

  steps.push(runScriptCommand(config.meta.packageManager, "dev").join(" "));

  return steps;
}

async function assertWritableDirectory(
  directory: string,
  force: boolean,
): Promise<void> {
  if (!existsSync(directory)) {
    await mkdir(directory, { recursive: true });
    return;
  }

  const existingFiles = await readdir(directory);

  if (existingFiles.length > 0 && !force) {
    throw new Error(
      `Target directory is not empty: ${directory}\nUse --force to write anyway.`,
    );
  }
}

function installCommand(packageManager: string): string[] {
  if (packageManager === "npm") {
    return ["npm", "install"];
  }

  if (packageManager === "yarn") {
    return ["yarn", "install"];
  }

  if (packageManager === "bun") {
    return ["bun", "install"];
  }

  return ["pnpm", "install"];
}

function runScriptCommand(packageManager: string, script: string): string[] {
  if (packageManager === "npm") {
    return ["npm", "run", script];
  }

  if (packageManager === "yarn") {
    return ["yarn", script];
  }

  if (packageManager === "bun") {
    return ["bun", "run", script];
  }

  return ["pnpm", script];
}

function run(command: string[], cwd: string, optional = false): void {
  const result = spawnSync(command[0]!, command.slice(1), {
    cwd,
    stdio: "inherit",
  });

  if (result.status !== 0 && !optional) {
    throw new Error(`Command failed: ${command.join(" ")}`);
  }
}
