import { User } from "../types/user";

export async function fetchUsers():
    Promise<User[]> {
    const response = await fetch("/api/feed");
    if (response.ok) {
        const data = await response.json();
        return data as User[];
    } else {
        throw new Error("Failed to fetch user data");
    }
}