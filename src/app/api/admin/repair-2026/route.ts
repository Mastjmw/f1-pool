import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { fetchRaceResults, fetchSprintResults } from "@/lib/f1-api";
import { getFastestLapBonus } from "@/lib/f1-points";

// One-shot 2026 repair: rename driver externalIds to match Jolpica, fix team
// drift, add Cadillac/Lindblad/Colapinto, mark Doohan & Tsunoda inactive,
// re-seed race rows (names, sprintDates), wipe stale 2026 RaceResult rows,
// and re-import results for every past race.
//
// Picks are NEVER touched (they reference Driver.id, not externalId, and
// Race rows are updated by season+round key, preserving the id).
//
// Idempotent: safe to re-run.

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

const UPDATES: Record<string, { team?: string; number?: number; name?: string; active?: boolean }> = {
  lawson:        { team: "RB" },
  hadjar:        { team: "Red Bull" },
  hulkenberg:    { team: "Audi" },
  bortoleto:     { team: "Audi" },
  max_verstappen:{ number: 3 },
  norris:        { number: 1 },
  antonelli:     { name: "Andrea Kimi Antonelli" },
  // Departed
  jack_doohan:   { active: false },
  yuki_tsunoda:  { active: false },
};

const NEW_DRIVERS = [
  { externalId: "colapinto",      code: "COL", name: "Franco Colapinto", team: "Alpine",   number: 43 },
  { externalId: "arvid_lindblad", code: "LIN", name: "Arvid Lindblad",   team: "RB",       number: 41 },
  { externalId: "perez",          code: "PER", name: "Sergio Pérez",     team: "Cadillac", number: 11 },
  { externalId: "bottas",         code: "BOT", name: "Valtteri Bottas",  team: "Cadillac", number: 77 },
];

// 2026 calendar (verified against https://api.jolpi.ca/ergast/f1/2026.json).
// Used to update Race rows in place — picks reference raceId so name/circuit
// edits don't break history.
const RACES_2026 = [
  { round: 1,  name: "Australian Grand Prix",   circuit: "Albert Park",            country: "Australia",      raceDate: "2026-03-08T05:00:00Z", sprintDate: null as string | null,           pickDeadline: "2026-03-06T03:00:00Z" },
  { round: 2,  name: "Chinese Grand Prix",      circuit: "Shanghai International", country: "China",          raceDate: "2026-03-15T07:00:00Z", sprintDate: "2026-03-14T03:00:00Z",          pickDeadline: "2026-03-13T05:00:00Z" },
  { round: 3,  name: "Japanese Grand Prix",     circuit: "Suzuka",                 country: "Japan",          raceDate: "2026-03-29T05:00:00Z", sprintDate: null,                            pickDeadline: "2026-03-27T04:00:00Z" },
  { round: 4,  name: "Miami Grand Prix",        circuit: "Miami International",    country: "USA",            raceDate: "2026-05-03T20:00:00Z", sprintDate: "2026-05-02T16:00:00Z",          pickDeadline: "2026-05-01T17:00:00Z" },
  { round: 5,  name: "Canadian Grand Prix",     circuit: "Gilles Villeneuve",      country: "Canada",         raceDate: "2026-05-24T20:00:00Z", sprintDate: "2026-05-23T16:00:00Z",          pickDeadline: "2026-05-22T16:00:00Z" },
  { round: 6,  name: "Monaco Grand Prix",       circuit: "Circuit de Monaco",      country: "Monaco",         raceDate: "2026-06-07T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-06-05T11:00:00Z" },
  { round: 7,  name: "Spanish Grand Prix",      circuit: "Barcelona-Catalunya",    country: "Spain",          raceDate: "2026-06-14T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-06-12T11:00:00Z" },
  { round: 8,  name: "Austrian Grand Prix",     circuit: "Red Bull Ring",          country: "Austria",        raceDate: "2026-06-28T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-06-26T11:00:00Z" },
  { round: 9,  name: "British Grand Prix",      circuit: "Silverstone",            country: "United Kingdom", raceDate: "2026-07-05T14:00:00Z", sprintDate: "2026-07-04T11:00:00Z",          pickDeadline: "2026-07-03T12:00:00Z" },
  { round: 10, name: "Belgian Grand Prix",      circuit: "Spa-Francorchamps",      country: "Belgium",        raceDate: "2026-07-19T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-07-17T11:00:00Z" },
  { round: 11, name: "Hungarian Grand Prix",    circuit: "Hungaroring",            country: "Hungary",        raceDate: "2026-07-26T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-07-24T11:00:00Z" },
  { round: 12, name: "Dutch Grand Prix",        circuit: "Zandvoort",              country: "Netherlands",    raceDate: "2026-08-23T13:00:00Z", sprintDate: "2026-08-22T10:00:00Z",          pickDeadline: "2026-08-21T11:00:00Z" },
  { round: 13, name: "Italian Grand Prix",      circuit: "Monza",                  country: "Italy",          raceDate: "2026-09-06T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-09-04T11:00:00Z" },
  { round: 14, name: "Madrid Grand Prix",       circuit: "Madring",                country: "Spain",          raceDate: "2026-09-13T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-09-11T11:00:00Z" },
  { round: 15, name: "Azerbaijan Grand Prix",   circuit: "Baku City",              country: "Azerbaijan",     raceDate: "2026-09-26T11:00:00Z", sprintDate: null,                            pickDeadline: "2026-09-24T09:00:00Z" },
  { round: 16, name: "Singapore Grand Prix",    circuit: "Marina Bay",             country: "Singapore",      raceDate: "2026-10-11T12:00:00Z", sprintDate: "2026-10-10T11:30:00Z",          pickDeadline: "2026-10-09T10:00:00Z" },
  { round: 17, name: "United States Grand Prix",circuit: "COTA",                   country: "USA",            raceDate: "2026-10-25T19:00:00Z", sprintDate: null,                            pickDeadline: "2026-10-23T17:00:00Z" },
  { round: 18, name: "Mexico City Grand Prix",  circuit: "Hermanos Rodriguez",     country: "Mexico",         raceDate: "2026-11-01T20:00:00Z", sprintDate: null,                            pickDeadline: "2026-10-30T18:00:00Z" },
  { round: 19, name: "São Paulo Grand Prix",    circuit: "Interlagos",             country: "Brazil",         raceDate: "2026-11-08T17:00:00Z", sprintDate: null,                            pickDeadline: "2026-11-06T15:00:00Z" },
  { round: 20, name: "Las Vegas Grand Prix",    circuit: "Las Vegas Strip",        country: "USA",            raceDate: "2026-11-22T06:00:00Z", sprintDate: null,                            pickDeadline: "2026-11-20T04:00:00Z" },
  { round: 21, name: "Qatar Grand Prix",        circuit: "Lusail",                 country: "Qatar",          raceDate: "2026-11-29T14:00:00Z", sprintDate: null,                            pickDeadline: "2026-11-27T12:00:00Z" },
  { round: 22, name: "Abu Dhabi Grand Prix",    circuit: "Yas Marina",             country: "Abu Dhabi",      raceDate: "2026-12-06T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-12-04T11:00:00Z" },
];

export async function POST() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const log: string[] = [];

  // 0. Ensure Driver.active column exists BEFORE any Prisma Driver query.
  // The Prisma client is built from schema.prisma which now declares `active`,
  // so every Driver SELECT includes the column. If the prod DB doesn't have
  // it (no `prisma migrate deploy` was run), every Driver query 500s.
  // This idempotent ALTER lets us self-heal without needing local DB access.
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;'
    );
    log.push("ensured Driver.active column exists");
  } catch (e: any) {
    log.push(`column ensure failed: ${e.message}`);
  }

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

  // 2. Field updates by externalId (post-rename for the renamed ones)
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

  // 4. Re-seed races (in-place updates — preserves race.id and picks)
  for (const r of RACES_2026) {
    await prisma.race.upsert({
      where: { season_round: { season: 2026, round: r.round } },
      update: {
        name: r.name,
        circuit: r.circuit,
        country: r.country,
        raceDate: new Date(r.raceDate),
        sprintDate: r.sprintDate ? new Date(r.sprintDate) : null,
        pickDeadline: new Date(r.pickDeadline),
      },
      create: {
        season: 2026,
        round: r.round,
        name: r.name,
        circuit: r.circuit,
        country: r.country,
        raceDate: new Date(r.raceDate),
        sprintDate: r.sprintDate ? new Date(r.sprintDate) : null,
        pickDeadline: new Date(r.pickDeadline),
      },
    });
  }
  log.push(`upserted ${RACES_2026.length} races (names, sprint dates, Madrid R14)`);

  // 5. Wipe stale 2026 RaceResult rows (broken externalId mapping made them
  // either empty or wrong). Picks reference Driver, not RaceResult, so safe.
  const wiped = await prisma.raceResult.deleteMany({ where: { race: { season: 2026 } } });
  log.push(`wiped ${wiped.count} stale 2026 RaceResult rows`);

  // 6. Re-import results for every past 2026 race using corrected externalIds
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
      log.push(`R${race.round} ${race.name}: ${e.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      renames: RENAMES.length,
      newDrivers: NEW_DRIVERS.length,
      racesUpserted: RACES_2026.length,
      raceResultsWiped: wiped.count,
      raceResultsImported: importedCount,
      racesProcessed: pastRaces.length,
    },
    log,
    importErrors,
  });
}
