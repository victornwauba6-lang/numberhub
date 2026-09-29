import { NextResponse } from "next/server";
import { verifyPasswordResetCode } from "@/lib/auth/password-reset-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.code !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required" },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const code = body.code.trim();

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

    const verified = await verifyPasswordResetCode(email, code);

    if (!verified) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired verification code",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code confirmed",
    });
  } catch (error: unknown) {
    console.error("Verify password reset code error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
