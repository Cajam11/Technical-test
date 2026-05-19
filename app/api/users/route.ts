import { NextResponse } from "next/server";
import { createUser, getAllUsers } from "@/app/lib/users";
import type { User } from "@/app/types/user";

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users failed:", error);
    return NextResponse.json(
      { error: "Failed to load users from database" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Omit<User, "uid"> & { uid?: string };
    const uid = body.uid ?? crypto.randomUUID();

    const user: User = {
      uid,
      name: body.name,
      birth_date: body.birth_date,
      hobbies: body.hobbies ?? [],
      country: body.country,
      address: body.address,
    };

    const created = await createUser(user);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/users failed:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
