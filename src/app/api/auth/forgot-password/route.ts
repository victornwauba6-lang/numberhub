import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createPasswordResetCode } from "@/lib/auth/password-reset-service";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body.email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required" },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    const reset = await createPasswordResetCode(email);

    // Keep the response generic so we don't reveal whether an email
    // belongs to a NumberHub account.
    if (!reset) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists for that email, a verification code has been sent.",
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json(
        { success: false, error: "Email service is not configured" },
        { status: 500 },
      );
    }

    const { data, error } = await resend.emails.send({
      from: "NumberHub <onboarding@resend.dev>",
      to: [reset.email],
      subject: "Your NumberHub verification code",
      text: `Your NumberHub verification code is ${reset.code}.

This code expires in 10 minutes.

If you did not request a password reset, you can ignore this email.`,
    });

    console.log("Resend password-reset result:", {
      data,
      error,
      recipient: reset.email,
    });

    if (error) {
      console.error("Password reset email failed:", error);

      return NextResponse.json(
        { success: false, error: "Unable to send verification email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a verification code has been sent.",
    });
  } catch (error: unknown) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
