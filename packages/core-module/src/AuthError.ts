export class AuthError extends Error {
    constructor(public status: number) {
        super(`Auth error: ${status}`);
    }
}
