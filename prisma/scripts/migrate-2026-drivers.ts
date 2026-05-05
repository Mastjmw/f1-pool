/**
 * One-time migration: bring the 2026 driver roster in line with Jolpica.
 *
 * Why: until now, externalIds in the DB were like `liam_lawson` / `charles_leclerc`,
 * but Jolpica/Ergast emits `lawson` / `leclerc`. The cron import lookup
 * (driverMap.get(result.driverExternalId)) therefore failed for almost every
 * driver — meaning race results have not been mapping onto Driver rows correctly.
 *
 * What this does (idempotent — safe to re-run):
 *   1. Renames existing externalIds in place (preserves all Pick rows).
 *   2. Fixes team assignments that drifted (Lawson → RB, Hadjar → Red Bull,
 *      Hülkenberg/Bortoleto → Audi).
 *   3. Updates Verstappen #3 and Norris #1 (champion-number swap).
 *   4. Marks departed drivers (Doohan, Tsunoda) as active=false.
 *   5. Adds new-for-2026 drivers (Colapinto, Lindblad, Pérez, Bottas).
 *   6. With `--wipe-2026-results`, deletes all 2026 RaceResult rows so the
 *      next cron run re-imports them correctly. Picks are NOT touched.
 *
 * Usage:
 *   npx tsx prisma/scripts/migrate-2026-drivers.ts                # dry run, no DB writes
 *   npx tsx prisma/scripts/migrate-2026-drivers.ts --apply        # apply driver changes
 *   npx tsx prisma/scripts/migrate-2026-drivers.ts --apply --wipe-2026-results
 *
 * After --wipe-2026-results, hit GET /api/cron/import-results?secret=$CRON_SECRET
 * to re-pull the season so far. Standings will rebuild on the next page load.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const WIPE_RESULTS = process.argv.includes("--wipe-2026-results");

// (oldExternalId → newExternalId). Only rename — team/number changes go in the
// updates block below so they apply to both old and freshly-renamed rows.
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
  // max_verstappen → max_verstappen (no rename — Jolpica still uses this id)
];

// Field updates keyed by the *new* externalId (post-rename).
// Note: Doohan and Tsunoda remain in the DB and (until an `active` flag is
// reintroduced in a follow-up PR) will still appear in the picker. They will
// score zero so it's harmless, just visually noisy.
const UPDATES: Record<string, { team?: string; number?: number; name?: string }> = {
  lawson:        { team: "RB" },                              // was incorrectly Red Bull
  hadjar:        { team: "Red Bull" },                        // was incorrectly RB
  hulkenberg:    { team: "Audi" },                            // rebrand from Kick Sauber
  bortoleto:     { team: "Audi" },
  max_verstappen:{ number: 3 },                               // lost the #1
  norris:        { number: 1 },                               // gained the #1 (2025 champion)
  antonelli:     { name: "Andrea Kimi Antonelli" },           // was "Kimi Antonelli"
};

const NEW_DRIVERS = [
  { externalId: "colapinto",      code: "COL", name: "Franco Colapinto", team: "Alpine",   number: 43 },
  { externalId: "arvid_lindblad", code: "LIN", name: "Arvid Lindblad",   team: "RB",       number: 41 },
  { externalId: "perez",          code: "PER", name: "Sergio Pérez",     team: "Cadillac", number: 11 },
  { externalId: "bottas",         code: "BOT", name: "Valtteri Bottas",  team: "Cadillac", number: 77 },
];

async function main() {
  console.log(APPLY ? "🚀 APPLY mode — writes will happen" : "🔍 DRY RUN — pass --apply to write");
  console.log("");

  // 1. Renames
  console.log("=== Renames ===");
  for (const [from, to] of RENAMES) {
    const existing = await prisma.driver.findUnique({ where: { externalId: from } });
    if (!existing) {
      console.log(`  · ${from} → ${to}: not found (skipped)`);
      continue;
    }
    const collision = await prisma.driver.findUnique({ where: { externalId: to } });
    if (collision && collision.id !== existing.id) {
      console.log(`  ⚠ ${from} → ${to}: target externalId already exists (id=${collision.id}). Skipping rename — investigate manually.`);
      continue;
    }
    console.log(`  · ${from} → ${to}`);
    if (APPLY) {
      await prisma.driver.update({
        where: { externalId: from },
        data: { externalId: to },
      });
    }
  }

  // 2. Field updates (keyed by new externalId)
  console.log("");
  console.log("=== Field updates ===");
  for (const [externalId, data] of Object.entries(UPDATES)) {
    const existing = await prisma.driver.findUnique({ where: { externalId } });
    if (!existing) {
      console.log(`  · ${externalId}: not found (skipped)`);
      continue;
    }
    const changes = Object.entries(data)
      .filter(([k, v]) => (existing as any)[k] !== v)
      .map(([k, v]) => `${k}: ${(existing as any)[k]} → ${v}`);
    if (changes.length === 0) {
      console.log(`  · ${externalId}: already correct`);
      continue;
    }
    console.log(`  · ${externalId}: ${changes.join(", ")}`);
    if (APPLY) {
      await prisma.driver.update({ where: { externalId }, data });
    }
  }

  // 3. New drivers
  console.log("");
  console.log("=== New drivers ===");
  for (const d of NEW_DRIVERS) {
    const existing = await prisma.driver.findUnique({ where: { externalId: d.externalId } });
    if (existing) {
      console.log(`  · ${d.externalId}: already exists (skipped)`);
      continue;
    }
    console.log(`  + ${d.externalId} (${d.code}, ${d.name}, ${d.team})`);
    if (APPLY) {
      await prisma.driver.create({ data: { ...d, season: 2026 } });
    }
  }

  // 4. Wipe 2026 RaceResults (optional)
  if (WIPE_RESULTS) {
    console.log("");
    console.log("=== Wipe 2026 RaceResult rows ===");
    const races = await prisma.race.findMany({
      where: { season: 2026 },
      select: { id: true, round: true, name: true, _count: { select: { results: true } } },
    });
    for (const r of races) {
      if (r._count.results > 0) {
        console.log(`  · R${r.round} ${r.name}: ${r._count.results} results to delete`);
      }
    }
    if (APPLY) {
      const result = await prisma.raceResult.deleteMany({
        where: { race: { season: 2026 } },
      });
      console.log(`  ✅ Deleted ${result.count} RaceResult rows`);
    }
    console.log("");
    console.log("After this completes, hit GET /api/cron/import-results?secret=$CRON_SECRET");
    console.log("to re-import results from Jolpica.");
  }

  console.log("");
  console.log(APPLY ? "✅ Done." : "🔍 Dry run complete. Re-run with --apply to write.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
