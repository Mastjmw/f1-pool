import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { fetchRaceResults, fetchSprintResults } from "@/lib/f1-api";
import { getRacePoints, getSprintPoints, getFastestLapBonus } from "@/lib/f1-points";

// One-shot 2026 repair: rename driver externalIds to match Jolpica, fix team
// drift, add Cadillac/Lindblad/Colapinto, wipe stale 2026 RaceResult rows, and
// re-import results for every past race. Same logic as
// prisma/scripts/migrate-2026-drivers.ts but callable in-browser by a superadmin.
//
// Picks are NEVER touched.

const RENAMES: Array<[string, string]> = [
  ["liam_lawson", "lawson"],
  ["isack_hadjar", "hadjar"],
  ["charles_leclerc", "leclerc"],
  ["lewis_hamilton", "hamilton"],
  ["lando_norris", "norris"],
  ["oscar_piastri", "piastri"],
  ["george_russell", "russell"],
  ["kimi_antonelli", "antonelli"],
  ["fernando_alonso", "alonso"],
  ["lance_stroll", "stroll"],
  ["pierre_gasly", "gasly"],
  ["alex_albon", "albon"],
  ["carlos_sainz", "sainz"],
  ["oliver_bearman", "bearman"],
  ["esteban_ocon", "ocon"],
  ["nico_hulkenberg", "hulkenberg"],
  ["gabriel_bortoleto", "bortoleto"],
];

const UPDATES: Record<string, { team?: string; number?: number; name?: string }> = {
  lawson:        { team: "RB" },
  hadjar:        { team: "Red Bull" },
  hulkenberg:    { team: "Audi" },
  bortoleto:     { team: "Audi" },
  max_verstappen:{ number: 3 },
  norris:        { number: 1 },
  antonelli:     { name: "Andrea Kimi Antonelli" },
};

const NEW_DRIVERS = [
  { externalId: "colapinto",      code: "COL", name: "Franco Colapinto", team: "Alpine",   number: 43 },
  { externalId: "arvid_lindblad", code: "LIN", name: "Arvid Lindblad",   team: "RB",       number: 41 },
  { externalId: "perez",          code: "PER", name: "Sergio Pérez",     team: "Cadillac", number: 11 },
  { externalId: "bottas",         code: "BOT", name: "Valtteri Bottas",  team: "Cadillac", number: 77 },
];

export async function POST() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const log: string[] = [];

  // 1. Rename externalIds in place (preserves Pick rows)
  for (const [from, to] of RENAMES) {
    const existing = await prisma.driver.findUnique({ where: { externalId: from } });
    if (!existing) {
      log.push(`rename ${from} → ${to}: source not found, skipped`);
      continue;
    }
    const collision = await prisma.driver.findUnique({ where: { externalId: to } });
    if (collision && collision.id !== existing.id) {
      log.push(`rename ${from} → ${to}: target already exists, skipped`);
      continue;
    }
    await prisma.driver.update({ where: { externalId: from }, data: { externalId: to } });
    log.push(`renamed ${from} → ${to}`);
  }

  // 2. Field updates by post-rename externalId
  for (const [externalId, data] of Object.entries(UPDATES)) {
    const existing = await prisma.driver.findUnique({ where: { externalId } });
    if (!existing) {
      log.push(`update ${externalId}: not found, skipped`);
      continue;
    }
    await prisma.driver.update({ where: { externalId }, data });
    log.push(`updated ${externalId}: ${Object.entries(data).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  // 3. Add new drivers
  for (const d of NEW_DRIVERS) {
    const existing = await prisma.driver.findUnique({ where: { externalId: d.externalId } });
    if (existing) {
      log.push(`new ${d.externalId}: already exists, skipped`);
      continue;
    }
    await prisma.driver.create({ data: { ...d, season: 2026 } });
    log.push(`created ${d.externalId} (${d.code}, ${d.team})`);
  }

  // 4. Wipe stale 2026 RaceResult rows (broken externalId mapping made them
  // either empty or wrong). Picks reference Driver, not RaceResult, so safe.
  const wiped = await prisma.raceResult.deleteMany({ where: { race: { season: 2026 } } });
  log.push(`wiped ${wiped.count} stale 2026 RaceResult rows`);

  // 5. Re-import results for every past 2026 race using corrected externalIds
  const now = new Date();
  const pastRaces = await prisma.race.findMany({
    where: { season: 2026, raceDate: { lt: now } },
    orderBy: { round: "asc" },
  });

  const drivers = await prisma.driver.findMany({ where: { season: 2026 } });
  const driverMap = new Map(drivers.map((d) => [d.externalId, d]));

  let importedCount = 0;
  const importErrors: string[] = [];

  for (const race of pastRaces) {
    try {
      const raceResults = await fetchRaceResults(2026, race.round);
      const sprintResults = await fetchSprintResults(2026, race.round);

      let count = 0;
      for (const result of raceResults) {
        const driver = driverMap.get(result.driverExternalId);
        if (!driver) {
          importErrors.push(`R${race.round}: no driver for ${result.driverExternalId}`);
          continue;
        }

        const sprint = sprintResults.find((s) => s.driverExternalId === result.driverExternalId);
        const sprintPts = sprint?.sprintPoints ?? 0;
        const flBonus = getFastestLapBonus(result.position, result.fastestLap);
        const totalPts = result.racePoints + sprintPts + flBonus;

        await prisma.raceResult.upsert({
          where: { raceId_driverId: { raceId: race.id, driverId: driver.id } },
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
      log.push(`R${race.round} ${race.name}: imported ${count} results`);
      importedCount += count;
    } catch (e: any) {
      // Jolpica may legitimately not have data yet — that's OK
      log.push(`R${race.round} ${race.name}: ${e.message}`);
    }
  }

  // unused but kept for clarity in case we want to surface them later
  void getRacePoints; void getSprintPoints;

  return NextResponse.json({
    ok: true,
    summary: {
      renames: RENAMES.length,
      newDrivers: NEW_DRIVERS.length,
      raceResultsWiped: wiped.count,
      raceResultsImported: importedCount,
      racesProcessed: pastRaces.length,
    },
    log,
    importErrors,
  });
}
