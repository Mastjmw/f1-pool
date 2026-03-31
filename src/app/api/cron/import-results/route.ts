import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRaceResults, fetchSprintResults } from "@/lib/f1-api";
import { getRacePoints, getSprintPoints, getFastestLapBonus } from "@/lib/f1-points";

// Automated cron: checks for new race results and imports them
// Runs Sunday evenings + Monday mornings to catch all race finishes
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const season = now.getFullYear();

  // Find races that have happened but don't have results yet
  const racesNeedingResults = await prisma.race.findMany({
    where: {
      season,
      raceDate: { lt: now },
      results: { none: {} },
    },
    orderBy: { round: "asc" },
  });

  if (racesNeedingResults.length === 0) {
    return NextResponse.json({ message: "No races need results", imported: [] });
  }

  const imported: string[] = [];
  const errors: string[] = [];

  for (const race of racesNeedingResults) {
    try {
      // Try to fetch results from F1 API
      const raceResults = await fetchRaceResults(season, race.round);
      const sprintResults = await fetchSprintResults(season, race.round);

      const drivers = await prisma.driver.findMany({ where: { season } });
      const driverMap = new Map(drivers.map((d) => [d.externalId, d]));

      let count = 0;
      for (const result of raceResults) {
        const driver = driverMap.get(result.driverExternalId);
        if (!driver) continue;

        const sprint = sprintResults.find(
          (s) => s.driverExternalId === result.driverExternalId
        );
        const sprintPts = sprint?.sprintPoints || 0;
        const totalPts =
          result.racePoints +
          sprintPts +
          (result.fastestLap && result.position && result.position <= 10 ? 1 : 0);

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
        count++;
      }

      if (count > 0) {
        imported.push(`R${race.round} ${race.name}: ${count} results`);

        // Trigger result notification emails
        try {
          const baseUrl = process.env.NEXTAUTH_URL || "https://f1-pool.vercel.app";
          await fetch(`${baseUrl}/api/notify/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ raceId: race.id }),
          });
        } catch (e) {
          console.error("Failed to send result notifications:", e);
        }
      }
    } catch (e: any) {
      // API might not have results yet — that's fine, we'll try again next run
      errors.push(`R${race.round} ${race.name}: ${e.message}`);
    }
  }

  return NextResponse.json({
    message: `Processed ${racesNeedingResults.length} races`,
    imported,
    pending: errors,
    checkedAt: now.toISOString(),
  });
}
