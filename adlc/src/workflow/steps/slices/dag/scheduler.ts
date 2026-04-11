import { parseSliceDependencies } from "./parser.ts";
import type { DAG, SliceNode, Wave } from "./types.ts";

/**
 * Topological-sort slices into execution waves.
 *
 * Slices within the same wave have no mutual dependencies and can run in
 * parallel. Each successive wave depends only on slices from earlier waves.
 *
 * Throws if a dependency cycle is detected.
 */
export function scheduleWaves(nodes: SliceNode[]): Wave[] {
    // Map slice number → SliceNode for quick lookup
    const nodeByNumber = new Map<number, SliceNode>();
    for (const node of nodes) {
        nodeByNumber.set(node.number, node);
    }

    // Validate all dependency references exist
    for (const node of nodes) {
        for (const dep of node.dependsOn) {
            if (!nodeByNumber.has(dep)) {
                throw new Error(`Slice ${node.number} ("${node.name}") depends on Slice ${dep}, which does not exist`);
            }
        }
    }

    // In-degree: how many unresolved dependencies each slice still has
    const inDegree = new Map<number, number>();
    // Adjacency: slice number → list of slice numbers that depend on it
    const dependents = new Map<number, number[]>();

    for (const node of nodes) {
        inDegree.set(node.number, node.dependsOn.length);
        for (const dep of node.dependsOn) {
            if (!dependents.has(dep)) {
                dependents.set(dep, []);
            }
            dependents.get(dep)!.push(node.number);
        }
    }

    const waves: Wave[] = [];
    let scheduled = 0;

    while (scheduled < nodes.length) {
        // Collect slices whose in-degree is 0
        const ready: SliceNode[] = [];
        for (const node of nodes) {
            if (inDegree.get(node.number) === 0) {
                ready.push(node);
            }
        }

        if (ready.length === 0) {
            const remaining = nodes.filter(n => inDegree.get(n.number) !== undefined && inDegree.get(n.number)! > 0).map(n => n.filename);
            throw new Error(`Dependency cycle detected among slices: ${remaining.join(", ")}`);
        }

        // Sort by slice number for deterministic output
        ready.sort((a, b) => a.number - b.number);

        waves.push({ index: waves.length, slices: ready });
        scheduled += ready.length;

        // Remove scheduled slices and decrement dependents' in-degrees
        for (const node of ready) {
            inDegree.delete(node.number);
            const deps = dependents.get(node.number);
            if (deps) {
                for (const depNum of deps) {
                    const current = inDegree.get(depNum);
                    if (current !== undefined) {
                        inDegree.set(depNum, current - 1);
                    }
                }
            }
        }
    }

    return waves;
}

/**
 * Build a complete DAG from slice files on disk.
 */
export function buildDAG(slicesDir: string): DAG {
    const nodes = parseSliceDependencies(slicesDir);
    const waves = scheduleWaves(nodes);

    return { nodes, waves };
}
