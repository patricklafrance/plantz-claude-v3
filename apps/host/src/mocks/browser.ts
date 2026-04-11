import type { RequestHandler } from "msw";
import { setupWorker } from "msw/browser";

export async function startMsw(handlers: RequestHandler[]) {
    const worker = setupWorker(...handlers);
    await worker.start({ onUnhandledRequest: "bypass" });
}
