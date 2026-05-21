import { NextResponse } from "next/server";
import { updateUser, deleteUser } from "@/app/lib/users";
import type { User } from "@/app/types/user";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { uid } = await context.params;
    const body = (await request.json()) as Omit<User, "uid">;

    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!Array.isArray(body.hobbies) || !body.hobbies.every((h) => typeof h === "string")) {
      return NextResponse.json({ error: "Hobbies must be an array of strings" }, { status: 400 });
    }

    const user: User = {
      uid,
      name: body.name,
      birth_date: body.birth_date,
      hobbies: body.hobbies ?? [],
      country: body.country,
      address: body.address,
      locally_modified: true,
    };

    const updated = await updateUser(user);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/users/[uid] failed:", error);
    const message =
      error instanceof Error && error.message === "User not found"
        ? "User not found"
        : "Failed to update user";
    const status =
      error instanceof Error && error.message === "User not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { uid } = await context.params;
    await deleteUser(uid);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/users/[uid] failed:", error);
    const message =
      error instanceof Error && error.message === "User not found"
        ? "User not found"
        : "Failed to delete user";
    const status =
      error instanceof Error && error.message === "User not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
