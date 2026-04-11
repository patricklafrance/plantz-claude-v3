import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@packages/components";

import { useColorMode } from "./useColorMode.ts";

const modes = [
    { value: "light" as const, icon: SunIcon, label: "Light" },
    { value: "dark" as const, icon: MoonIcon, label: "Dark" },
    { value: "system" as const, icon: MonitorIcon, label: "System" }
];

export function ColorModeToggle() {
    const [mode, setMode] = useColorMode();

    return (
        <div className="border-border/50 flex items-center gap-0.5 rounded-xl border p-0.5">
            {modes.map(({ value, icon: Icon, label }) => (
                <Button
                    key={value}
                    variant={mode === value ? "secondary" : "ghost"}
                    size="icon-xs"
                    onClick={() => setMode(value)}
                    aria-label={label}
                    aria-pressed={mode === value}
                    title={label}
                >
                    <Icon />
                </Button>
            ))}
        </div>
    );
}
