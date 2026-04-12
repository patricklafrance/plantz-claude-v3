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

// ── Spinner frames ───────────────────────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

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

export function formatTokens(count: number): string {
    if (count < 1000) {
        return String(count);
    }
    if (count < 1_000_000) {
        return `${(count / 1000).toFixed(1)}k`;
    }

    return `${(count / 1_000_000).toFixed(1)}m`;
}

// ── Progress reporter ────────────────────────────────────
//
// The spinner lives on its own line at the bottom of the output.
// When other output needs to be written, the spinner line is erased,
// the output is printed, and the spinner redraws below it.
// This allows log/agent/tool lines to appear without killing the spinner.

const TOTAL_STEPS = 7;

export class Progress {
    private readonly isTTY = process.stdout.isTTY ?? false;
    private readonly startTime = Date.now();
    private spinning = false;
    private spinnerTimer: ReturnType<typeof setInterval> | null = null;
    private spinnerFrame = 0;

    // ── Spinner ──────────────────────────────────────────

    /** Start the persistent spinner on its own line. Idempotent if already spinning. */
    private startSpinner(): void {
        if (this.spinning || !this.isTTY) {
            return;
        }
        this.spinning = true;
        this.spinnerFrame = 0;
        this.drawSpinner();
        this.spinnerTimer = setInterval(() => this.drawSpinner(), SPINNER_INTERVAL_MS);
    }

    private drawSpinner(): void {
        const elapsed = pc.dim(`(total duration: ${formatDuration(Date.now() - this.startTime)})`);
        process.stdout.write(`\r\x1b[2K    ${pc.cyan(SPINNER_FRAMES[this.spinnerFrame])}  ${elapsed}`);
        this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
    }

    /** Resume the spinner after writing a status line during a wait (e.g. "thinking..."). */
    resumeSpinner(): void {
        this.startSpinner();
    }

    /** Stop the spinner and erase its line. */
    clearSpinner(): void {
        if (!this.spinning) {
            return;
        }
        this.spinning = false;
        if (this.spinnerTimer) {
            clearInterval(this.spinnerTimer);
            this.spinnerTimer = null;
        }
        if (this.isTTY) {
            process.stdout.write("\r\x1b[2K");
        }
    }

    /**
     * Write a line of output, preserving the spinner if active.
     * Erases the spinner, writes the line, then redraws the spinner below.
     */
    private output(text: string): void {
        if (this.spinning && this.isTTY) {
            process.stdout.write(`\r\x1b[2K${text}\n`);
            this.drawSpinner();
        } else {
            console.log(text);
        }
    }

    // ── Output methods ───────────────────────────────────

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

    /** Start the initialization phase. Returns a `done()` callback that prints readiness with elapsed time. */
    init(): () => void {
        const startTime = Date.now();
        console.log(`  ${pc.cyan(S.bullet)} ${pc.bold("Initializing")}`);

        return () => {
            this.clearSpinner();
            const elapsed = formatDuration(Date.now() - startTime);
            console.log(`  ${pc.green(S.check)} Ready ${pc.dim(`(${elapsed})`)}`);
        };
    }

    /**
     * Start a major pipeline step.
     * Starts a persistent spinner that animates until agent streaming begins.
     * Returns a `done()` callback that prints the completion line with elapsed time.
     */
    step(number: number, name: string): () => void {
        const startTime = Date.now();

        console.log(`\n  ${pc.cyan(S.bullet)} ${pc.bold(`Step ${number}/${TOTAL_STEPS}`)} ${pc.dim("—")} ${name}`);
        this.startSpinner();

        return () => {
            this.clearSpinner();
            const elapsed = formatDuration(Date.now() - startTime);
            console.log(`  ${pc.green(S.check)} ${name} ${pc.dim(`(${elapsed})`)}`);
        };
    }

    /** Log a status line within the current phase. Preserves spinner. */
    log(_phase: string, message: string): void {
        this.output(`    ${pc.dim(S.hook)} ${message}`);
    }

    /** Start a timed sub-operation with spinner. Returns a `done()` callback. */
    start(_phase: string, message: string): () => void {
        const startTime = Date.now();
        this.output(`    ${pc.dim(S.hook)} ${message}`);
        this.startSpinner();

        return () => {
            this.clearSpinner();
            const elapsed = formatDuration(Date.now() - startTime);
            console.log(`    ${pc.green(S.check)} ${message} ${pc.dim(`(${elapsed})`)}`);
        };
    }

    /** Wave header for parallel slice execution. */
    wave(index: number, sliceCount: number, parallel: number): void {
        const label = sliceCount === 1 ? "1 slice" : `${sliceCount} slices ${pc.dim(`(parallel: ${parallel})`)}`;

        this.output(`\n    ${pc.bold(pc.blue(`Wave ${index}`))} ${pc.dim("—")} ${label}`);
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

        this.output(`      ${name} ${agentTag} ${formatted}`);
    }

    /** Log an agent lifecycle event and keep spinner alive for the wait. */
    agent(name: string, event: "spawn" | "resume", prompt: string): void {
        const tag = event === "spawn" ? pc.cyan("spawn") : pc.yellow("resume");
        const firstLine = prompt.split("\n")[0];

        this.output(`    ${pc.dim(S.arrow)} ${tag} ${pc.bold(name)} ${pc.dim(firstLine)}`);
        this.startSpinner();
    }

    /** Log an error within a phase. */
    error(_phase: string, message: string): void {
        this.clearSpinner();
        console.error(`\n  ${pc.red(S.cross)} ${pc.bold(pc.red("Error:"))} ${message}`);
    }

    /** Final success message with total elapsed time. */
    done(): void {
        this.clearSpinner();
        const elapsed = formatDuration(Date.now() - this.startTime);
        console.log(`\n  ${pc.green(S.check)} ${pc.bold(pc.green("Feature complete"))} ${pc.dim(`in ${elapsed}`)}\n`);
    }

    /** Final failure message. */
    fatal(message: string): void {
        this.clearSpinner();
        console.error(`\n  ${pc.red(S.cross)} ${pc.bold(pc.red("Pipeline failed:"))} ${message}\n`);
    }
}
