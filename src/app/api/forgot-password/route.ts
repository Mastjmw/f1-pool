import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEmailToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    try {
      const token = await createEmailToken(email, "reset");
      await sendPasswordResetEmail(email, user.name || "Racer", token);
    } catch (e) {
      console.error("Failed to send reset email:", e);
    }
  }

  return NextResponse.json({
    message: "If an account exists with that email, a reset link has been sent.",
  });
}
