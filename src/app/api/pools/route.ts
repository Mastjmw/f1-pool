import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create a new pool
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { name, season, midReset, resetAfter } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Pool name is required" }, { status: 400 });
  }

  const pool = await prisma.pool.create({
    data: {
      name,
      season: season || 2026,
      midReset: midReset || false,
      resetAfter: resetAfter || null,
      members: {
        create: {
          userId: user.id,
          role: "admin",
        },
      },
    },
  });

  return NextResponse.json(pool, { status: 201 });
}
