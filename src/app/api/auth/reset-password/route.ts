import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth/password-reset-service";
import { loginUser } from "@/lib/auth/auth-service";
import { setSessionCookie } from "@/lib/auth/session-cookie";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.code !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, verification code, and new password are required",
        },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const code = body.code.trim();
    const password = body.password;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Enter the 6-digit verification code" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await resetPassword(email, code, password);

    const login = await loginUser({
      email,
      password,
    });

    await setSessionCookie(login.sessionToken, login.expiresAt);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      user: {
        id: login.userId,
        email: login.email,
        fullName: login.fullName,
        role: login.role,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to reset password";

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
