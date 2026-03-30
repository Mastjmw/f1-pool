import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Manual result entry for admins (backup when API is slow)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const isAdmin = await prisma.poolMember.findFirst({
    where: { userId: user.id, role: "admin" },
  });
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { raceId, results } = await req.json();
  // results = [{ driverId, position, racePoints, sprintPoints, fastestLap }]

  if (!raceId || !results || !Array.isArray(results)) {
    return NextResponse.json({ error: "raceId and results array required" }, { status: 400 });
  }

  let saved = 0;
  for (const r of results) {
    const totalPoints =
      (r.racePoints || 0) +
      (r.sprintPoints || 0) +
      (r.fastestLap && r.position && r.position <= 10 ? 1 : 0);

    await prisma.raceResult.upsert({
      where: {
        raceId_driverId: { raceId, driverId: r.driverId },
      },
      update: {
        position: r.position ?? null,
        racePoints: r.racePoints || 0,
        sprintPoints: r.sprintPoints || 0,
        fastestLap: r.fastestLap || false,
        totalPoints,
      },
      create: {
        raceId,
        driverId: r.driverId,
        position: r.position ?? null,
        racePoints: r.racePoints || 0,
        sprintPoints: r.sprintPoints || 0,
        fastestLap: r.fastestLap || false,
        totalPoints,
      },
    });
    saved++;
  }

  return NextResponse.json({ message: `Saved ${saved} results`, saved });
}
