#!/usr/bin/env node

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import pc from "picocolors";

import type { PipelineInput } from "./workflow/orchestrator.ts";
import { run } from "./workflow/orchestrator.ts";

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        "dry-run": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        issue: { type: "string" },
        pr: { type: "string" }
    }
});

const subcommand = positionals[0];

if (values.help || positionals.length === 0 || (subcommand !== "feat" && subcommand !== "fix")) {
    // eslint-disable-next-line no-console
    console.log(`
  ${pc.bold(pc.cyan("adlc"))} ${pc.dim("— Agent-Driven Lifecycle CLI")}

  ${pc.bold("Commands:")}
    ${pc.cyan("feat")} ${pc.green("<description>")}       Plan and implement a new feature from text
    ${pc.cyan("feat")} ${pc.yellow("--issue")} ${pc.green("<N>")}        Plan and implement a feature from a GitHub issue
    ${pc.cyan("fix")}  ${pc.green("<description>")}        Fix an issue from text
    ${pc.cyan("fix")}  ${pc.yellow("--pr")} ${pc.green("<N>")}           Fix issues on an existing PR from GitHub

  ${pc.bold("Options:")}
    ${pc.yellow("--dry-run")}           Show wave schedule without executing
    ${pc.yellow("-h, --help")}          Show this help message

  ${pc.bold("Examples:")}
    ${pc.dim("$")} adlc feat "Add user authentication with OAuth2"
    ${pc.dim("$")} adlc feat --issue 52
    ${pc.dim("$")} adlc feat --dry-run --issue 52
    ${pc.dim("$")} adlc fix "Fix the broken color picker on the settings page"
    ${pc.dim("$")} adlc fix --pr 42
`);
    process.exit(values.help ? 0 : 1);
}

const cwd = resolve(process.cwd());

try {
    let input: PipelineInput;

    if (subcommand === "fix") {
        if (values.issue) {
            // eslint-disable-next-line no-console
            console.error(`${pc.red("Error:")} --issue is only valid with the feat command`);
            process.exit(1);
        }

        if (values.pr) {
            const prNumber = parseInt(values.pr, 10);
            if (Number.isNaN(prNumber) || prNumber <= 0) {
                // eslint-disable-next-line no-console
                console.error(`${pc.red("Error:")} --pr requires a positive number (e.g. adlc fix --pr 42)`);
                process.exit(1);
            }
            if (positionals.length > 1) {
                // eslint-disable-next-line no-console
                console.error(`${pc.red("Error:")} cannot combine --pr with positional arguments`);
                process.exit(1);
            }
            input = { type: "fix-pr", prNumber };
        } else {
            const description = positionals.slice(1).join(" ");
            if (!description) {
                // eslint-disable-next-line no-console
                console.error(
                    `${pc.red("Error:")} adlc fix requires a description (e.g. adlc fix "Fix the broken color picker" or adlc fix --pr 42)`
                );
                process.exit(1);
            }
            input = { type: "fix-text", description };
        }
    } else {
        if (values.pr) {
            // eslint-disable-next-line no-console
            console.error(`${pc.red("Error:")} --pr is only valid with the fix command`);
            process.exit(1);
        }

        if (values.issue) {
            const issueNumber = parseInt(values.issue, 10);
            if (Number.isNaN(issueNumber) || issueNumber <= 0) {
                // eslint-disable-next-line no-console
                console.error(`${pc.red("Error:")} --issue requires a positive number (e.g. adlc feat --issue 52)`);
                process.exit(1);
            }
            if (positionals.length > 1) {
                // eslint-disable-next-line no-console
                console.error(`${pc.red("Error:")} cannot combine --issue with positional arguments`);
                process.exit(1);
            }
            input = { type: "feat-issue", issueNumber };
        } else {
            const featureDescription = positionals.slice(1).join(" ");
            if (!featureDescription) {
                // eslint-disable-next-line no-console
                console.error(`${pc.red("Error:")} adlc feat requires a description (e.g. adlc feat "Add plants" or adlc feat --issue 52)`);
                process.exit(1);
            }
            input = { type: "feat-text", description: featureDescription };
        }
    }

    await run({
        cwd,
        dryRun: values["dry-run"],
        input
    });
} catch {
    process.exitCode = 1;
}
