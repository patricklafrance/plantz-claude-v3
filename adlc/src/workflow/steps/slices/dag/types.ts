export interface SliceNode {
    /** Slice filename, e.g. "01-plant-list.md" */
    filename: string;
    /** Slice number extracted from filename */
    number: number;
    /** Slice name extracted from filename (e.g. "plant-list") */
    name: string;
    /** Slice numbers this slice depends on */
    dependsOn: number[];
}

export interface Wave {
    /** Wave index (0-based) */
    index: number;
    /** Slices in this wave (can run in parallel) */
    slices: SliceNode[];
}

export interface DAG {
    nodes: SliceNode[];
    waves: Wave[];
}
