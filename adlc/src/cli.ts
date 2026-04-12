#!/usr/bin/env node

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import pc from "picocolors";

import { run } from "./workflow/orchestrator.ts";

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        "dry-run": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false }
    }
});

if (values.help || positionals.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`
  ${pc.bold(pc.cyan("adlc"))} ${pc.dim("— Agent-Driven Lifecycle CLI")}

  ${pc.bold("Usage:")}
    ${pc.dim("$")} adlc ${pc.dim("[options]")} ${pc.green("<feature-description>")}

  ${pc.bold("Options:")}
    ${pc.yellow("--dry-run")}           Show wave schedule without executing
    ${pc.yellow("-h, --help")}          Show this help message

  ${pc.bold("Example:")}
    ${pc.dim("$")} adlc "Add user authentication with OAuth2"
`);
    process.exit(values.help ? 0 : 1);
}

const featureDescription = positionals.join(" ");
const cwd = resolve(process.cwd());

try {
    await run(featureDescription, {
        cwd,
        dryRun: values["dry-run"]
    });
} catch {
    process.exitCode = 1;
}
