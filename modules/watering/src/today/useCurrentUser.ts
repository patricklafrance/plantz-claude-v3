export function useCurrentUserId(): string | null {
    // The auth token in session storage is the user ID in this MSW-based app
    if (typeof sessionStorage === "undefined") {
        return null;
    }

    return sessionStorage.getItem("plantz-auth-token");
}
