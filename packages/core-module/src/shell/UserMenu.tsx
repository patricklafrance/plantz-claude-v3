import { useQueryClient } from "@tanstack/react-query";
import { LogOutIcon, UserPenIcon } from "lucide-react";
import { useNavigate } from "react-router";

import { Button, Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger, Separator } from "@packages/components";

import { useSession } from "../SessionContext.tsx";
import { ColorModeToggle } from "./ColorModeToggle.tsx";

function getInitials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .map(part => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function UserMenu() {
    const session = useSession();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    if (!session) {
        return null;
    }

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            queryClient.clear();
            navigate("/login");
        }
    }

    return (
        <Popover>
            <PopoverTrigger
                className="bg-botanical text-botanical-foreground hover:ring-botanical/20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition-all hover:ring-2"
                aria-label="User menu"
            >
                {getInitials(session.name)}
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom">
                <PopoverHeader>
                    <PopoverTitle>{session.name}</PopoverTitle>
                    <PopoverDescription>{session.email}</PopoverDescription>
                </PopoverHeader>
                <Separator />
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate("/profile")}>
                    <UserPenIcon data-icon="inline-start" />
                    Edit profile
                </Button>
                <Separator />
                <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground px-1 text-xs font-medium">Appearance</p>
                    <ColorModeToggle />
                </div>
                <Separator />
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
                    <LogOutIcon data-icon="inline-start" />
                    Log out
                </Button>
            </PopoverContent>
        </Popover>
    );
}
