import { describe, expect, it } from "vitest";

import { killDevServers } from "../../../../src/hooks/post-agent-validation/coder/kill-dev-servers.js";

describe("kill-dev-servers", () => {
    it("should not throw for a valid directory", () => {
        expect(() => killDevServers("/tmp/test-worktree")).not.toThrow();
    });

    it("should not throw for a nonexistent directory", () => {
        expect(() => killDevServers("/tmp/nonexistent-dir-12345")).not.toThrow();
    });
});
