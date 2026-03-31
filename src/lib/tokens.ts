import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function createEmailToken(email: string, type: "verify" | "reset") {
  // Clean up old tokens for this email/type
  await prisma.emailToken.deleteMany({ where: { email, type } });

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.emailToken.create({
    data: { email, token, type, expires },
  });

  return token;
}

export async function verifyEmailToken(token: string, type: "verify" | "reset") {
  const record = await prisma.emailToken.findUnique({ where: { token } });

  if (!record || record.type !== type || record.expires < new Date()) {
    return null;
  }

  // Delete used token
  await prisma.emailToken.delete({ where: { id: record.id } });

  return record.email;
}
