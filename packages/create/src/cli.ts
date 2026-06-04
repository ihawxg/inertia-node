#!/usr/bin/env node
import { generateApp } from "./generate.js";
import { HelpRequested, helpText, parseArgs } from "./args.js";
import { promptForConfig } from "./prompts.js";
import {
  CliCancelled,
  formatUnsupportedCombination,
  printDryRun,
  printNextSteps,
  printSuccess,
  printWarnings,
} from "./terminal.js";

async function main() {
  try {
    const parsed = parseArgs(process.argv.slice(2));
    const input = parsed.yes ? parsed : await promptForConfig(parsed);
    const result = await generateApp(input);

    printWarnings(result.warnings);

    if (result.config.generation.dryRun) {
      printDryRun(result);
    } else {
      printSuccess(result);
    }

    printNextSteps(result.nextSteps);
  } catch (error) {
    if (error instanceof HelpRequested) {
      console.log(helpText());
      return;
    }

    if (error instanceof CliCancelled) {
      console.log(error.message);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(
      message.includes("roadmap") || message.includes("not implemented")
        ? formatUnsupportedCombination(message)
        : message,
    );
    process.exitCode = 1;
  }
}

await main();
