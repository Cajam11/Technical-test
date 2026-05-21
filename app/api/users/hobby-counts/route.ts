import { NextResponse } from "next/server";
import { getHobbyCounts } from "@/app/lib/users";

export async function GET() {
  try {
    const hobbyCounts = await getHobbyCounts();
    return NextResponse.json(hobbyCounts);
  } catch (error) {
    console.error("GET /api/users/hobby-counts failed:", error);
    return NextResponse.json(
      { error: "Failed to load hobby counts" },
      { status: 500 },
    );
  }
}
