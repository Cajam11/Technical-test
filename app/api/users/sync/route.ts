import { NextResponse } from "next/server";
import { syncUsersFromFeed } from "@/app/lib/users";

export async function POST() {
  try {
    const users = await syncUsersFromFeed();
    return NextResponse.json(users);
  } catch (error) {
    console.error("POST /api/users/sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync users from feed" },
      { status: 500 },
    );
  }
}
