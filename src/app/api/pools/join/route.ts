import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { inviteCode } = await req.json();

  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const pool = await prisma.pool.findUnique({
    where: { inviteCode },
  });

  if (!pool) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.poolMember.findUnique({
    where: { userId_poolId: { userId: user.id, poolId: pool.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "Already a member", poolId: pool.id }, { status: 409 });
  }

  await prisma.poolMember.create({
    data: { userId: user.id, poolId: pool.id },
  });

  return NextResponse.json({ poolId: pool.id, name: pool.name }, { status: 200 });
}
