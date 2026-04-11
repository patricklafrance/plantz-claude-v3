export interface Ports {
    storybook: number;
    hostApp: number;
    browser: number;
}

/** Allocate non-overlapping ports for a slice running in position `index` within a wave. */
export function allocatePorts(index: number, base: Ports): Ports {
    return {
        storybook: base.storybook + index,
        hostApp: base.hostApp + index,
        browser: base.browser + index
    };
}
