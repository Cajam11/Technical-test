import { User } from "../types/user";

async function parseError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  const message =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
      ? body.error
      : fallback;
  throw new Error(message);
}

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch("/api/users");
  if (!response.ok) {
    await parseError(response, "Failed to load users");
  }
  return (await response.json()) as User[];
}

export async function fetchHobbyCounts(): Promise<Array<{ hobby: string; count: number }>> {
  const response = await fetch("/api/users/hobby-counts");
  if (!response.ok) {
    await parseError(response, "Failed to load hobby counts");
  }
  return (await response.json()) as Array<{ hobby: string; count: number }>;
}

export async function syncUsersFromFeed(): Promise<User[]> {
  const response = await fetch("/api/users/sync", { method: "POST" });
  if (!response.ok) {
    await parseError(response, "Failed to sync users from feed");
  }
  return (await response.json()) as User[];
}

export async function createUser(
  user: Omit<User, "uid">,
): Promise<User> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    await parseError(response, "Failed to create user");
  }
  return (await response.json()) as User;
}

export async function updateUser(user: User): Promise<User> {
  const response = await fetch(`/api/users/${encodeURIComponent(user.uid)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: user.name,
      birth_date: user.birth_date,
      hobbies: user.hobbies,
      country: user.country,
      address: user.address,
    }),
  });
  if (!response.ok) {
    await parseError(response, "Failed to update user");
  }
  return (await response.json()) as User;
}

export async function deleteUser(uid: string): Promise<void> {
  const response = await fetch(`/api/users/${encodeURIComponent(uid)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    await parseError(response, "Failed to delete user");
  }
}
