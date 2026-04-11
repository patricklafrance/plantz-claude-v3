export function getUserId(): string | null {
    return sessionStorage.getItem("plantz-auth-token");
}
