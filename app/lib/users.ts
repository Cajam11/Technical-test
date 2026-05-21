import type { RowDataPacket } from "mysql2";
import type { User } from "../types/user";
import { pool } from "./db";

const FEED_URL = "https://test.qvamp.eu/feed";
const HOBBY_SEPARATOR = "||";

type DbConnection = Awaited<ReturnType<typeof pool.getConnection>>;

interface UserRow extends RowDataPacket {
  uid: string;
  name: string;
  birth_date: string | null;
  hobbies: string | null;
  country: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  locally_modified: number;
}

interface HobbyRow extends RowDataPacket {
  id: number;
  name: string;
}

interface HobbyCountRow extends RowDataPacket {
  hobby: string;
  count: number | string;
}

function sanitizeHobbies(hobbies: string[]): string[] {
  return Array.from(
    new Set(
      hobbies
        .map((hobby) => hobby.trim())
        .filter((hobby) => hobby.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function parseHobbies(hobbies: string | null): string[] {
  if (!hobbies) {
    return [];
  }

  return hobbies
    .split(HOBBY_SEPARATOR)
    .map((hobby) => hobby.trim())
    .filter((hobby) => hobby.length > 0);
}

function normalizeDate(value: string): string | null {
  if (!value) {
    return null;
  }

  return value.includes("T") ? value.split("T")[0] : value;
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
    locally_modified: row.locally_modified === 1,
  };
}

async function withTransaction<T>(operation: (connection: DbConnection) => Promise<T>): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();

      const isDeadlock =
        error instanceof Error &&
        ((error as { code?: string }).code === "ER_LOCK_DEADLOCK");

      if (isDeadlock && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
        continue;
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  throw new Error("Transaction failed after retries");
}

async function ensureHobbyCatalog(
  executor: Pick<DbConnection, "execute">,
  hobbies: string[],
): Promise<void> {
  const normalizedHobbies = sanitizeHobbies(hobbies);

  if (normalizedHobbies.length === 0) {
    return;
  }

  const insertPlaceholders = normalizedHobbies.map(() => "(?)").join(", ");
  await executor.execute(
    `INSERT IGNORE INTO hobbies (name) VALUES ${insertPlaceholders}`,
    normalizedHobbies,
  );
}

async function replaceUserHobbies(
  connection: DbConnection,
  uid: string,
  hobbies: string[],
): Promise<void> {
  const normalizedHobbies = sanitizeHobbies(hobbies);

  await connection.execute(`DELETE FROM user_hobbies WHERE user_uid = ?`, [uid]);

  if (normalizedHobbies.length === 0) {
    return;
  }

  const selectPlaceholders = normalizedHobbies.map(() => "?").join(", ");
  const [rows] = await connection.query<HobbyRow[]>(
    `SELECT id, name FROM hobbies WHERE name IN (${selectPlaceholders})`,
    normalizedHobbies,
  );

  const hobbyIdByName = new Map(rows.map((row) => [row.name, row.id]));
  const linkValues = normalizedHobbies
    .map((hobby) => hobbyIdByName.get(hobby))
    .filter((id): id is number => typeof id === "number")
    .flatMap((hobbyId) => [uid, hobbyId]);

  if (linkValues.length === 0) {
    return;
  }

  const linkPlaceholders = normalizedHobbies.map(() => "(?, ?)").join(", ");
  await connection.execute(
    `INSERT IGNORE INTO user_hobbies (user_uid, hobby_id) VALUES ${linkPlaceholders}`,
    linkValues,
  );
}

export async function getAllUsers(): Promise<User[]> {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT
      u.uid,
      u.name,
      u.birth_date,
      COALESCE(GROUP_CONCAT(DISTINCT h.name ORDER BY h.name SEPARATOR '${HOBBY_SEPARATOR}'), '') AS hobbies,
      u.country,
      u.street,
      u.city,
      u.postal_code,
      u.locally_modified
     FROM users u
     LEFT JOIN user_hobbies uh ON uh.user_uid = u.uid
     LEFT JOIN hobbies h ON h.id = uh.hobby_id
     GROUP BY
      u.uid,
      u.name,
      u.birth_date,
      u.country,
      u.street,
      u.city,
      u.postal_code,
      u.locally_modified
     ORDER BY u.name ASC`,
  );
  return rows.map(rowToUser);
}

export async function getHobbyCounts(): Promise<Array<{ hobby: string; count: number }>> {
  const [rows] = await pool.query<HobbyCountRow[]>(
    `SELECT
      h.name AS hobby,
      COUNT(*) AS count
     FROM user_hobbies uh
     INNER JOIN hobbies h ON h.id = uh.hobby_id
     GROUP BY h.name
     ORDER BY h.name ASC`,
  );

  return rows.map((row) => ({
    hobby: row.hobby,
    count: Number(row.count),
  }));
}

export async function createUser(user: User): Promise<User> {
  const storedUser: User = {
    ...user,
    birth_date: normalizeDate(user.birth_date) ?? "",
    hobbies: sanitizeHobbies(user.hobbies),
  };

  await withTransaction(async (connection) => {
    await ensureHobbyCatalog(connection, storedUser.hobbies);

    await connection.execute(
      `INSERT INTO users (
        uid, name, birth_date, country, street, city, postal_code, locally_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        storedUser.uid,
        storedUser.name,
        normalizeDate(storedUser.birth_date),
        storedUser.country || null,
        storedUser.address.street || null,
        storedUser.address.city || null,
        storedUser.address.postal_code || null,
      ],
    );

    await replaceUserHobbies(connection, storedUser.uid, storedUser.hobbies);
  });

  return storedUser;
}

export async function updateUser(user: User): Promise<User> {
  const storedUser: User = {
    ...user,
    birth_date: normalizeDate(user.birth_date) ?? "",
    hobbies: sanitizeHobbies(user.hobbies),
  };

  await withTransaction(async (connection) => {
    await ensureHobbyCatalog(connection, storedUser.hobbies);

    const [result] = await connection.execute(
      `UPDATE users SET
        name = ?,
        birth_date = ?,
        country = ?,
        street = ?,
        city = ?,
        postal_code = ?,
        locally_modified = 1
       WHERE uid = ?`,
      [
        storedUser.name,
        normalizeDate(storedUser.birth_date),
        storedUser.country || null,
        storedUser.address.street || null,
        storedUser.address.city || null,
        storedUser.address.postal_code || null,
        storedUser.uid,
      ],
    );

    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      throw new Error("User not found");
    }

    await replaceUserHobbies(connection, storedUser.uid, storedUser.hobbies);
  });

  return storedUser;
}

export async function deleteUser(uid: string): Promise<void> {
  const [result] = await pool.execute(
    `DELETE FROM users WHERE uid = ?`,
    [uid],
  );

  const affected = (result as { affectedRows: number }).affectedRows;
  if (affected === 0) {
    throw new Error("User not found");
  }
}

async function upsertFromFeed(user: User): Promise<void> {
  const feedUser: User = {
    ...user,
    birth_date: normalizeDate(user.birth_date) ?? "",
    hobbies: sanitizeHobbies(user.hobbies),
  };

  await withTransaction(async (connection) => {
    const [existingRows] = await connection.query<Array<{ locally_modified: number } & RowDataPacket>>(
      `SELECT locally_modified FROM users WHERE uid = ? FOR UPDATE`,
      [feedUser.uid],
    );

    if (existingRows.length === 0) {
      await connection.execute(
        `INSERT INTO users (
          uid, name, birth_date, country, street, city, postal_code, locally_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          feedUser.uid,
          feedUser.name,
          normalizeDate(feedUser.birth_date),
          feedUser.country || null,
          feedUser.address.street || null,
          feedUser.address.city || null,
          feedUser.address.postal_code || null,
        ],
      );

      await replaceUserHobbies(connection, feedUser.uid, feedUser.hobbies);
      return;
    }

    if (existingRows[0].locally_modified !== 0) {
      return;
    }

    await connection.execute(
      `UPDATE users SET
        name = ?,
        birth_date = ?,
        country = ?,
        street = ?,
        city = ?,
        postal_code = ?
       WHERE uid = ?`,
      [
        feedUser.name,
        normalizeDate(feedUser.birth_date),
        feedUser.country || null,
        feedUser.address.street || null,
        feedUser.address.city || null,
        feedUser.address.postal_code || null,
        feedUser.uid,
      ],
    );

    await replaceUserHobbies(connection, feedUser.uid, feedUser.hobbies);
  });
}

async function deleteMissingFeedUsers(feedUids: string[]): Promise<void> {
  if (feedUids.length === 0) {
    await pool.execute(
      `DELETE FROM users WHERE locally_modified = 0`,
    );
    return;
  }

  const placeholders = feedUids.map(() => "?").join(", ");
  await pool.execute(
    `DELETE FROM users
     WHERE locally_modified = 0
       AND uid NOT IN (${placeholders})`,
    feedUids,
  );
}

export async function syncUsersFromFeed(): Promise<User[]> {
  const response = await fetch(FEED_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch feed");
  }

  const feedUsers = (await response.json()) as User[];
  const feedUids = feedUsers.map((user) => user.uid);

  await ensureHobbyCatalog(pool, feedUsers.flatMap((user) => user.hobbies));

  await Promise.all(feedUsers.map((user) => upsertFromFeed(user)));
  await deleteMissingFeedUsers(feedUids);

  return getAllUsers();
}
