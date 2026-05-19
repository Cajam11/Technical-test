import type { RowDataPacket } from "mysql2";
import type { User } from "../types/user";
import { pool } from "./db";

const FEED_URL = "https://test.qvamp.eu/feed";

interface UserRow extends RowDataPacket {
  uid: string;
  name: string;
  birth_date: string | null;
  hobbies: string | string[];
  country: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  locally_modified: number;
}

function parseHobbies(hobbies: string | string[]): string[] {
  if (Array.isArray(hobbies)) {
    return hobbies;
  }
  if (typeof hobbies === "string") {
    return JSON.parse(hobbies) as string[];
  }
  return [];
}

function rowToUser(row: UserRow): User {
  return {
    uid: row.uid,
    name: row.name,
    birth_date: row.birth_date ?? "",
    hobbies: parseHobbies(row.hobbies),
    country: row.country ?? "",
    address: {
      street: row.street ?? "",
      city: row.city ?? "",
      postal_code: row.postal_code ?? "",
    },
  };
}

export async function getAllUsers(): Promise<User[]> {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT uid, name, birth_date, hobbies, country, street, city, postal_code
     FROM users
     ORDER BY name ASC`,
  );
  return rows.map(rowToUser);
}

export async function createUser(user: User): Promise<User> {
  await pool.execute(
    `INSERT INTO users (
      uid, name, birth_date, hobbies, country, street, city, postal_code, locally_modified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      user.uid,
      user.name,
      user.birth_date || null,
      JSON.stringify(user.hobbies),
      user.country || null,
      user.address.street || null,
      user.address.city || null,
      user.address.postal_code || null,
    ],
  );
  return user;
}

export async function updateUser(user: User): Promise<User> {
  const [result] = await pool.execute(
    `UPDATE users SET
      name = ?,
      birth_date = ?,
      hobbies = ?,
      country = ?,
      street = ?,
      city = ?,
      postal_code = ?,
      locally_modified = 1
     WHERE uid = ?`,
    [
      user.name,
      user.birth_date || null,
      JSON.stringify(user.hobbies),
      user.country || null,
      user.address.street || null,
      user.address.city || null,
      user.address.postal_code || null,
      user.uid,
    ],
  );

  const affected = (result as { affectedRows: number }).affectedRows;
  if (affected === 0) {
    throw new Error("User not found");
  }

  return user;
}

async function upsertFromFeed(user: User): Promise<void> {
  await pool.execute(
    `INSERT INTO users (
      uid, name, birth_date, hobbies, country, street, city, postal_code, locally_modified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON DUPLICATE KEY UPDATE
      name = IF(locally_modified = 0, VALUES(name), name),
      birth_date = IF(locally_modified = 0, VALUES(birth_date), birth_date),
      hobbies = IF(locally_modified = 0, VALUES(hobbies), hobbies),
      country = IF(locally_modified = 0, VALUES(country), country),
      street = IF(locally_modified = 0, VALUES(street), street),
      city = IF(locally_modified = 0, VALUES(city), city),
      postal_code = IF(locally_modified = 0, VALUES(postal_code), postal_code)`,
    [
      user.uid,
      user.name,
      user.birth_date || null,
      JSON.stringify(user.hobbies),
      user.country || null,
      user.address.street || null,
      user.address.city || null,
      user.address.postal_code || null,
    ],
  );
}

export async function syncUsersFromFeed(): Promise<User[]> {
  const response = await fetch(FEED_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch feed");
  }

  const feedUsers = (await response.json()) as User[];

  for (const user of feedUsers) {
    await upsertFromFeed(user);
  }

  return getAllUsers();
}
