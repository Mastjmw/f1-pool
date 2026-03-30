import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResultsSummary } from "@/lib/email";

// Send result summary emails after results are imported
export async function POST(req: Request) {
  const { raceId } = await req.json();

  if (!raceId) {
    return NextResponse.json({ error: "raceId required" }, { status: 400 });
  }

  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: { results: { include: { driver: true } } },
  });

  if (!race || race.results.length === 0) {
    return NextResponse.json({ error: "No results found" }, { status: 404 });
  }

  // Get all pools for this season
  const pools = await prisma.pool.findMany({
    where: { season: race.season },
    include: {
      members: { include: { user: true } },
      picks: {
        where: { raceId },
        include: { driver: true },
      },
    },
  });

  let sent = 0;

  for (const pool of pools) {
    // Calculate current standings for ranking
    const allPicks = await prisma.pick.findMany({
      where: { poolId: pool.id },
      include: { race: { include: { results: true } } },
    });

    const totals: Record<string, number> = {};
    for (const member of pool.members) {
      totals[member.userId] = 0;
    }
    for (const pick of allPicks) {
      const result = pick.race.results.find((r) => r.driverId === pick.driverId);
      if (result) {
        totals[pick.userId] = (totals[pick.userId] || 0) + result.totalPoints;
      }
    }

    const ranked = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([userId], idx) => ({ userId, rank: idx + 1 }));

    for (const pick of pool.picks) {
      const member = pool.members.find((m) => m.userId === pick.userId);
      if (!member?.user.email) continue;

      const result = race.results.find((r) => r.driverId === pick.driverId);
      const points = result?.totalPoints || 0;
      const userRank = ranked.find((r) => r.userId === pick.userId)?.rank || 0;
      const userTotal = totals[pick.userId] || 0;

      await sendResultsSummary(
        member.user.email,
        member.user.name || "Racer",
        race.name,
        race.round,
        pick.driver.code,
        points,
        userTotal,
        userRank,
        pool.name
      );
      sent++;
    }
  }

  return NextResponse.json({ message: `Sent ${sent} result emails`, sent });
}
