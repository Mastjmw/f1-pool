import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchRaceResults, fetchSprintResults } from "@/lib/f1-api";

// Import results for a specific race round (admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { season, round } = await req.json();
  if (!season || !round) {
    return NextResponse.json({ error: "season and round required" }, { status: 400 });
  }

  // Verify user is admin of at least one pool
  const user = session.user as any;
  const isAdmin = await prisma.poolMember.findFirst({
    where: { userId: user.id, role: "admin" },
  });
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    // Fetch race results
    const raceResults = await fetchRaceResults(season, round);
    const sprintResults = await fetchSprintResults(season, round);

    // Get the race record
    const race = await prisma.race.findUnique({
      where: { season_round: { season, round } },
    });
    if (!race) {
      return NextResponse.json({ error: `Race not found: ${season} R${round}` }, { status: 404 });
    }

    // Get all drivers
    const drivers = await prisma.driver.findMany({ where: { season } });
    const driverMap = new Map(drivers.map((d) => [d.externalId, d]));

    let imported = 0;

    for (const result of raceResults) {
      const driver = driverMap.get(result.driverExternalId);
      if (!driver) continue;

      // Check for sprint points
      const sprint = sprintResults.find(
        (s) => s.driverExternalId === result.driverExternalId
      );
      const sprintPts = sprint?.sprintPoints || 0;
      const totalPts = result.racePoints + sprintPts + (result.fastestLap && result.position && result.position <= 10 ? 1 : 0);

      await prisma.raceResult.upsert({
        where: {
          raceId_driverId: { raceId: race.id, driverId: driver.id },
        },
        update: {
          position: result.position,
          racePoints: result.racePoints,
          sprintPoints: sprintPts,
          fastestLap: result.fastestLap,
          totalPoints: totalPts,
        },
        create: {
          raceId: race.id,
          driverId: driver.id,
          position: result.position,
          racePoints: result.racePoints,
          sprintPoints: sprintPts,
          fastestLap: result.fastestLap,
          totalPoints: totalPts,
        },
      });
      imported++;
    }

    return NextResponse.json({
      message: `Imported ${imported} results for Round ${round}`,
      round,
      imported,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
