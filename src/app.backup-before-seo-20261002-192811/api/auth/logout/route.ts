import { NextResponse } from "next/server";
import { logoutCurrentUser } from "@/lib/auth/logout";

export async function POST() {
  try {
    await logoutCurrentUser();

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Logout failed";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
