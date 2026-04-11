export class Progress {
    /** Log a timestamped status line. */
    log(phase: string, message: string): void {
        const time = new Date().toLocaleTimeString("en-US", { hour12: false });
        // eslint-disable-next-line no-console
        console.log(`[${time}] [${phase}] ${message}`);
    }

    /** Start a timed operation, returns a function to call when done. */
    start(phase: string, message: string): () => void {
        const startTime = Date.now();
        this.log(phase, `${message}...`);
        return () => {
            const elapsed = formatDuration(Date.now() - startTime);
            this.log(phase, `${message}... done (${elapsed})`);
        };
    }

    /** Log a wave header. */
    wave(index: number, sliceCount: number, parallel: number): void {
        if (sliceCount === 1) {
            this.log(`wave-${index}`, `1 slice`);
        } else {
            this.log(`wave-${index}`, `${sliceCount} slices in parallel (max ${parallel})`);
        }
    }

    /** Log a slice-level event. */
    slice(sliceName: string, agent: string, message: string): void {
        const time = new Date().toLocaleTimeString("en-US", { hour12: false });
        // eslint-disable-next-line no-console
        console.log(`[${time}]   [${sliceName}] [${agent}] ${message}`);
    }

    /** Log an error. */
    error(phase: string, message: string): void {
        const time = new Date().toLocaleTimeString("en-US", { hour12: false });
        // eslint-disable-next-line no-console
        console.error(`[${time}] [${phase}] ERROR: ${message}`);
    }
}

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
