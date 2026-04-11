import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Progress, formatDuration } from "../src/progress.js";

describe("formatDuration", () => {
    it("should format sub-second durations as milliseconds", () => {
        expect(formatDuration(0)).toBe("0ms");
        expect(formatDuration(1)).toBe("1ms");
        expect(formatDuration(500)).toBe("500ms");
        expect(formatDuration(999)).toBe("999ms");
    });

    it("should format durations under a minute as seconds", () => {
        expect(formatDuration(1000)).toBe("1s");
        expect(formatDuration(1500)).toBe("1s");
        expect(formatDuration(30_000)).toBe("30s");
        expect(formatDuration(59_999)).toBe("59s");
    });

    it("should format durations of a minute or more as minutes and seconds", () => {
        expect(formatDuration(60_000)).toBe("1m 00s");
        expect(formatDuration(61_000)).toBe("1m 01s");
        expect(formatDuration(90_000)).toBe("1m 30s");
        expect(formatDuration(125_000)).toBe("2m 05s");
        expect(formatDuration(3_600_000)).toBe("60m 00s");
    });
});

describe("Progress", () => {
    let logSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("log", () => {
        it("should output a timestamped status line", () => {
            const progress = new Progress();
            progress.log("plan", "Starting planning phase...");

            expect(logSpy).toHaveBeenCalledOnce();
            const output = logSpy.mock.calls[0][0] as string;
            expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}( [AP]M)?\] \[plan\] Starting planning phase\.\.\.$/);
        });

        it("should include the phase and message", () => {
            const progress = new Progress();
            progress.log("exec", "Running slices");

            const output = logSpy.mock.calls[0][0] as string;
            expect(output).toContain("[exec]");
            expect(output).toContain("Running slices");
        });
    });

    describe("start", () => {
        it("should log immediately when starting", () => {
            const progress = new Progress();
            progress.start("plan", "Analyzing codebase");

            expect(logSpy).toHaveBeenCalledOnce();
            const output = logSpy.mock.calls[0][0] as string;
            expect(output).toContain("[plan]");
            expect(output).toContain("Analyzing codebase...");
        });

        it("should log elapsed time when the returned function is called", () => {
            vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(3500);

            const progress = new Progress();
            const done = progress.start("plan", "Analyzing codebase");
            done();

            expect(logSpy).toHaveBeenCalledTimes(2);
            const output = logSpy.mock.calls[1][0] as string;
            expect(output).toContain("Analyzing codebase... done (2s)");
        });

        it("should measure sub-second durations in milliseconds", () => {
            vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1250);

            const progress = new Progress();
            const done = progress.start("exec", "Quick task");
            done();

            const output = logSpy.mock.calls[1][0] as string;
            expect(output).toContain("done (250ms)");
        });
    });

    describe("wave", () => {
        it("should log singular form for a single slice", () => {
            const progress = new Progress();
            progress.wave(0, 1, 5);

            const output = logSpy.mock.calls[0][0] as string;
            expect(output).toContain("[wave-0]");
            expect(output).toContain("1 slice");
            expect(output).not.toContain("parallel");
        });

        it("should log parallel info for multiple slices", () => {
            const progress = new Progress();
            progress.wave(1, 3, 5);

            const output = logSpy.mock.calls[0][0] as string;
            expect(output).toContain("[wave-1]");
            expect(output).toContain("3 slices in parallel (max 5)");
        });
    });

    describe("slice", () => {
        it("should output indented slice-level event with agent", () => {
            const progress = new Progress();
            progress.slice("03-share-plants", "coder", "Starting draft");

            expect(logSpy).toHaveBeenCalledOnce();
            const output = logSpy.mock.calls[0][0] as string;
            expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}( [AP]M)?\]\s+\[03-share-plants\] \[coder\] Starting draft$/);
        });

        it("should include slice name, agent, and message", () => {
            const progress = new Progress();
            progress.slice("01-household", "reviewer", "Review complete");

            const output = logSpy.mock.calls[0][0] as string;
            expect(output).toContain("[01-household]");
            expect(output).toContain("[reviewer]");
            expect(output).toContain("Review complete");
        });
    });

    describe("error", () => {
        it("should output to stderr with ERROR prefix", () => {
            const progress = new Progress();
            progress.error("fatal", "Something went wrong");

            expect(errorSpy).toHaveBeenCalledOnce();
            const output = errorSpy.mock.calls[0][0] as string;
            expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}( [AP]M)?\] \[fatal\] ERROR: Something went wrong$/);
        });

        it("should include phase and message", () => {
            const progress = new Progress();
            progress.error("exec", "Slice failed");

            const output = errorSpy.mock.calls[0][0] as string;
            expect(output).toContain("[exec]");
            expect(output).toContain("ERROR: Slice failed");
        });
    });
});
