import { useCallback, useEffect, useSyncExternalStore } from "react";

type ColorMode = "light" | "dark" | "system";

const STORAGE_KEY = "plantz-color-mode";

function getStoredMode(): ColorMode {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
    }

    return "system";
}

function applyMode(mode: ColorMode) {
    const isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", isDark);
}

let currentMode = getStoredMode();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

function getSnapshot(): ColorMode {
    return currentMode;
}

function setMode(mode: ColorMode) {
    currentMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    applyMode(mode);

    for (const listener of listeners) {
        listener();
    }
}

// Apply on load.
applyMode(currentMode);

// Listen for OS preference changes (matters when mode is "system").
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentMode === "system") {
        applyMode("system");
    }
});

export function useColorMode() {
    const mode = useSyncExternalStore(subscribe, getSnapshot);

    useEffect(() => {
        applyMode(mode);
    }, [mode]);

    return [mode, useCallback((m: ColorMode) => setMode(m), [])] as const;
}
