/* eslint-disable no-console */

import pc from "picocolors";

// ── Unicode symbols ──────────────────────────────────────

const S = {
    bullet: "●",
    check: "✓",
    cross: "✗",
    arrow: "→",
    hook: "↳",
    bar: "│",
    line: "─"
} as const;

// ── Helpers ──────────────────────────────────────────────

export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

// ── Progress reporter ────────────────────────────────────

const TOTAL_STEPS = 7;

export class Progress {
    /** Print startup banner with feature description and version. */
    banner(feature: string, version: string): void {
        const title = `${pc.bold(pc.cyan("adlc"))} ${pc.dim(`v${version}`)}`;
        const separator = pc.dim(S.line.repeat(44));

        console.log();
        console.log(`  ${title}`);
        console.log(`  ${separator}`);
        console.log(`  ${feature}`);
        console.log();
    }

    /**
     * Start a major pipeline step.
     * Returns a `done()` callback that prints the completion line with elapsed time.
     */
    step(number: number, name: string): () => void {
        const startTime = Date.now();

        console.log(`\n  ${pc.cyan(S.bullet)} ${pc.bold(`Step ${number}/${TOTAL_STEPS}`)} ${pc.dim("—")} ${name}`);

        return () => {
            const elapsed = formatDuration(Date.now() - startTime);
            console.log(`  ${pc.green(S.check)} ${name} ${pc.dim(`(${elapsed})`)}`);
        };
    }

    /** Log a status line within the current phase. */
    log(_phase: string, message: string): void {
        console.log(`    ${pc.dim(S.hook)} ${message}`);
    }

    /** Start a timed sub-operation. Returns a `done()` callback that prints completion with elapsed time. */
    start(_phase: string, message: string): () => void {
        const startTime = Date.now();
        console.log(`    ${pc.dim(S.hook)} ${message}${pc.dim("...")}`);

        return () => {
            const elapsed = formatDuration(Date.now() - startTime);
            console.log(`    ${pc.green(S.check)} ${message} ${pc.dim(`(${elapsed})`)}`);
        };
    }

    /** Wave header for parallel slice execution. */
    wave(index: number, sliceCount: number, parallel: number): void {
        const label = sliceCount === 1 ? "1 slice" : `${sliceCount} slices ${pc.dim(`(parallel: ${parallel})`)}`;

        console.log(`\n    ${pc.bold(pc.blue(`Wave ${index}`))} ${pc.dim("—")} ${label}`);
    }

    /** Slice-level event within wave execution. */
    slice(sliceName: string, agent: string, message: string): void {
        const name = pc.cyan(sliceName);
        const agentTag = pc.dim(`[${agent}]`);

        let formatted: string;
        if (message === "starting") {
            formatted = pc.dim("starting...");
        } else if (message === "passed") {
            formatted = pc.green(`${S.check} passed`);
        } else if (message === "conflicts resolved") {
            formatted = pc.green(`${S.check} conflicts resolved`);
        } else if (message.startsWith("failed")) {
            formatted = pc.yellow(`${S.cross} ${message}`);
        } else if (message.startsWith("merging")) {
            formatted = `${pc.dim(S.arrow)} ${message}`;
        } else if (message.startsWith("conflict")) {
            formatted = pc.yellow(message);
        } else if (message.startsWith("skipped")) {
            formatted = pc.yellow(message);
        } else {
            formatted = message;
        }

        console.log(`      ${name} ${agentTag} ${formatted}`);
    }

    /** Log an error within a phase. */
    error(_phase: string, message: string): void {
        console.error(`\n  ${pc.red(S.cross)} ${pc.bold(pc.red("Error:"))} ${message}`);
    }

    /** Final success message with total elapsed time. */
    done(elapsed: string): void {
        console.log(`\n  ${pc.green(S.check)} ${pc.bold(pc.green("Feature complete"))} ${pc.dim(`in ${elapsed}`)}\n`);
    }

    /** Final failure message. */
    fatal(message: string): void {
        console.error(`\n  ${pc.red(S.cross)} ${pc.bold(pc.red("Pipeline failed:"))} ${message}\n`);
    }
}
