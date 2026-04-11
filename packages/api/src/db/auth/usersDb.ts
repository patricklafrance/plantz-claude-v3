import type { User } from "../../entities/auth/types.ts";

class UsersDb {
    #users: User[] = [
        { id: "user-alice", name: "Alice", email: "alice@example.com", password: "password" },
        { id: "user-bob", name: "Bob", email: "bob@example.com", password: "password" }
    ];

    getByEmail(email: string): User | undefined {
        return this.#users.find(u => u.email === email);
    }

    getById(id: string): User | undefined {
        return this.#users.find(u => u.id === id);
    }

    updateName(id: string, name: string): User | undefined {
        const user = this.getById(id);

        if (user) {
            user.name = name;
        }

        return user;
    }
}

export const usersDb = new UsersDb();
