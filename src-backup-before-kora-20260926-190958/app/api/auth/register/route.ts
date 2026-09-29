import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth/auth-service";
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

    const result = await registerUser({
      email: body.email,
      password: body.password,
      fullName:
        typeof body.fullName === "string" ? body.fullName : undefined,
      termsVersion: "1.0",
      privacyVersion: "1.0",
    });

    await setSessionCookie(result.sessionToken, result.expiresAt);

    await captureServerEvent(result.userId, "numberhub_signup", {
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
      error instanceof Error ? error.message : "Registration failed";

    const status =
      message === "An account with this email already exists" ? 409 : 400;

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
