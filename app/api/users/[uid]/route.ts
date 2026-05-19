import { NextResponse } from "next/server";
import { updateUser } from "@/app/lib/users";
import type { User } from "@/app/types/user";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { uid } = await context.params;
    const body = (await request.json()) as Omit<User, "uid">;

    const user: User = {
      uid,
      name: body.name,
      birth_date: body.birth_date,
      hobbies: body.hobbies ?? [],
      country: body.country,
      address: body.address,
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
