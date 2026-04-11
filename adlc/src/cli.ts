#!/usr/bin/env node

import { resolve } from "node:path";
import { parseArgs } from "node:util";

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
    console.log(`Usage: adlc [options] <feature-description>

Options:
  --dry-run           Show wave schedule without executing
  -h, --help          Show this help message`);
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
