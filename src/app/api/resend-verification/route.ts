import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEmailToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

// Resend the email-verification link. Always returns the same generic
// response so the endpoint can't be used to enumerate registered emails.
export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Only resend for unverified accounts that still have a password set.
  if (user && !user.emailVerified && user.password) {
    try {
      const token = await createEmailToken(email, "verify");
      await sendVerificationEmail(email, user.name || "Racer", token);
    } catch (e) {
      console.error("Failed to resend verification email:", e);
    }
  }

  return NextResponse.json({
    message: "If that account exists and is unverified, a new link has been sent.",
  });
}
