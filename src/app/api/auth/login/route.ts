import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth/auth-service";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { captureServerEvent } from "@/lib/analytics/posthog-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    const result = await loginUser({
      email: body.email,
      password: body.password,
    });

    await setSessionCookie(result.sessionToken, result.expiresAt);

    await captureServerEvent(result.userId, "numberhub_login", {
      role: result.role,
      has_full_name: Boolean(result.fullName),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.userId,
        email: result.email,
        fullName: result.fullName,
        role: result.role,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Login failed";

    return NextResponse.json(
      { success: false, error: message },
      { status: 401 },
    );
  }
}
