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

const subcommand = positionals[0];

if (values.help || positionals.length === 0 || (subcommand !== "feat" && subcommand !== "fix")) {
    // eslint-disable-next-line no-console
    console.log(`
  ${pc.bold(pc.cyan("adlc"))} ${pc.dim("— Agent-Driven Lifecycle CLI")}

  ${pc.bold("Commands:")}
    ${pc.cyan("feat")} ${pc.green("<feature-description>")}            Plan and implement a new feature
    ${pc.cyan("fix")}  ${pc.green("<pr-number> <issues-description>")}  Fix issues flagged on an existing PR

  ${pc.bold("Options:")}
    ${pc.yellow("--dry-run")}           Show wave schedule without executing
    ${pc.yellow("-h, --help")}          Show this help message

  ${pc.bold("Examples:")}
    ${pc.dim("$")} adlc feat "Add user authentication with OAuth2"
    ${pc.dim("$")} adlc feat --dry-run "Add household feature"
    ${pc.dim("$")} adlc fix 42 "Issue #51: Fix color\\nLink: ...\\n\\nColor should be blue"
    ${pc.dim("$")} adlc fix 42 --dry-run "Fix color issue"
`);
    process.exit(values.help ? 0 : 1);
}

const cwd = resolve(process.cwd());

try {
    if (subcommand === "fix") {
        const prArg = positionals[1];
        if (!prArg || !/^\d+$/.test(prArg)) {
            // eslint-disable-next-line no-console
            console.error(`${pc.red("Error:")} adlc fix requires a PR number (e.g. adlc fix 42)`);
            process.exit(1);
        }

        const prNumber = parseInt(prArg, 10);
        const description = positionals.slice(2).join(" ");

        if (!description) {
            // eslint-disable-next-line no-console
            console.error(`${pc.red("Error:")} adlc fix requires an issues description (e.g. adlc fix 42 "Issue #51: Fix color...")`);
            process.exit(1);
        }

        await run(`Fix PR #${prNumber}`, {
            cwd,
            dryRun: values["dry-run"],
            fix: { prNumber, description }
        });
    } else {
        const featureDescription = positionals.slice(1).join(" ");

        if (!featureDescription) {
            // eslint-disable-next-line no-console
            console.error(`${pc.red("Error:")} adlc feat requires a feature description (e.g. adlc feat "Add plants")`);
            process.exit(1);
        }

        await run(featureDescription, {
            cwd,
            dryRun: values["dry-run"]
        });
    }
} catch {
    process.exitCode = 1;
}
