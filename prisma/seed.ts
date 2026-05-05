import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 2026 driver roster.
// `externalId` MUST match Jolpica/Ergast `Driver.driverId` so that result imports
// (src/lib/f1-api.ts → src/app/api/cron/import-results/route.ts) map results onto
// the right Driver row. Verified against
// https://api.jolpi.ca/ergast/f1/2026/3/results.json (Japanese GP, 2026-03-29).
const DRIVERS_2026 = [
  // Red Bull
  { externalId: "max_verstappen",  code: "VER", name: "Max Verstappen",        team: "Red Bull",     number: 3 },
  { externalId: "hadjar",          code: "HAD", name: "Isack Hadjar",          team: "Red Bull",     number: 6 },
  // Ferrari
  { externalId: "leclerc",         code: "LEC", name: "Charles Leclerc",       team: "Ferrari",      number: 16 },
  { externalId: "hamilton",        code: "HAM", name: "Lewis Hamilton",        team: "Ferrari",      number: 44 },
  // McLaren
  { externalId: "norris",          code: "NOR", name: "Lando Norris",          team: "McLaren",      number: 1 },
  { externalId: "piastri",         code: "PIA", name: "Oscar Piastri",         team: "McLaren",      number: 81 },
  // Mercedes
  { externalId: "russell",         code: "RUS", name: "George Russell",        team: "Mercedes",     number: 63 },
  { externalId: "antonelli",       code: "ANT", name: "Andrea Kimi Antonelli", team: "Mercedes",     number: 12 },
  // Aston Martin
  { externalId: "alonso",          code: "ALO", name: "Fernando Alonso",       team: "Aston Martin", number: 14 },
  { externalId: "stroll",          code: "STR", name: "Lance Stroll",          team: "Aston Martin", number: 18 },
  // Alpine
  { externalId: "gasly",           code: "GAS", name: "Pierre Gasly",          team: "Alpine",       number: 10 },
  { externalId: "colapinto",       code: "COL", name: "Franco Colapinto",      team: "Alpine",       number: 43 },
  // Williams
  { externalId: "albon",           code: "ALB", name: "Alexander Albon",       team: "Williams",     number: 23 },
  { externalId: "sainz",           code: "SAI", name: "Carlos Sainz",          team: "Williams",     number: 55 },
  // RB (Racing Bulls)
  { externalId: "lawson",          code: "LAW", name: "Liam Lawson",           team: "RB",           number: 30 },
  { externalId: "arvid_lindblad",  code: "LIN", name: "Arvid Lindblad",        team: "RB",           number: 41 },
  // Haas
  { externalId: "bearman",         code: "BEA", name: "Oliver Bearman",        team: "Haas",         number: 87 },
  { externalId: "ocon",            code: "OCO", name: "Esteban Ocon",          team: "Haas",         number: 31 },
  // Audi (formerly Kick Sauber)
  { externalId: "hulkenberg",      code: "HUL", name: "Nico Hülkenberg",       team: "Audi",         number: 27 },
  { externalId: "bortoleto",       code: "BOR", name: "Gabriel Bortoleto",     team: "Audi",         number: 5 },
  // Cadillac (new for 2026)
  { externalId: "perez",           code: "PER", name: "Sergio Pérez",          team: "Cadillac",     number: 11 },
  { externalId: "bottas",          code: "BOT", name: "Valtteri Bottas",       team: "Cadillac",     number: 77 },
];

// Official 2026 F1 calendar, verified against
// https://api.jolpi.ca/ergast/f1/2026.json
// Pick deadlines = Friday of race weekend, ~2h before sessions start.
// Sprint weekends in 2026: China, Miami, Canada, Britain, Netherlands, Singapore.
const RACES_2026 = [
  { round: 1,  name: "Australian Grand Prix",   circuit: "Albert Park",          country: "Australia",      raceDate: "2026-03-08T05:00:00Z", sprintDate: null,                            pickDeadline: "2026-03-06T03:00:00Z" },
  { round: 2,  name: "Chinese Grand Prix",      circuit: "Shanghai International", country: "China",        raceDate: "2026-03-15T07:00:00Z", sprintDate: "2026-03-14T03:00:00Z",          pickDeadline: "2026-03-13T05:00:00Z" },
  { round: 3,  name: "Japanese Grand Prix",     circuit: "Suzuka",               country: "Japan",          raceDate: "2026-03-29T05:00:00Z", sprintDate: null,                            pickDeadline: "2026-03-27T04:00:00Z" },
  { round: 4,  name: "Miami Grand Prix",        circuit: "Miami International",  country: "USA",            raceDate: "2026-05-03T20:00:00Z", sprintDate: "2026-05-02T16:00:00Z",          pickDeadline: "2026-05-01T17:00:00Z" },
  { round: 5,  name: "Canadian Grand Prix",     circuit: "Gilles Villeneuve",    country: "Canada",         raceDate: "2026-05-24T20:00:00Z", sprintDate: "2026-05-23T16:00:00Z",          pickDeadline: "2026-05-22T16:00:00Z" },
  { round: 6,  name: "Monaco Grand Prix",       circuit: "Circuit de Monaco",    country: "Monaco",         raceDate: "2026-06-07T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-06-05T11:00:00Z" },
  { round: 7,  name: "Spanish Grand Prix",      circuit: "Barcelona-Catalunya",  country: "Spain",          raceDate: "2026-06-14T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-06-12T11:00:00Z" },
  { round: 8,  name: "Austrian Grand Prix",     circuit: "Red Bull Ring",        country: "Austria",        raceDate: "2026-06-28T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-06-26T11:00:00Z" },
  { round: 9,  name: "British Grand Prix",      circuit: "Silverstone",          country: "United Kingdom", raceDate: "2026-07-05T14:00:00Z", sprintDate: "2026-07-04T11:00:00Z",          pickDeadline: "2026-07-03T12:00:00Z" },
  { round: 10, name: "Belgian Grand Prix",      circuit: "Spa-Francorchamps",    country: "Belgium",        raceDate: "2026-07-19T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-07-17T11:00:00Z" },
  { round: 11, name: "Hungarian Grand Prix",    circuit: "Hungaroring",          country: "Hungary",        raceDate: "2026-07-26T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-07-24T11:00:00Z" },
  { round: 12, name: "Dutch Grand Prix",        circuit: "Zandvoort",            country: "Netherlands",    raceDate: "2026-08-23T13:00:00Z", sprintDate: "2026-08-22T10:00:00Z",          pickDeadline: "2026-08-21T11:00:00Z" },
  { round: 13, name: "Italian Grand Prix",      circuit: "Monza",                country: "Italy",          raceDate: "2026-09-06T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-09-04T11:00:00Z" },
  { round: 14, name: "Madrid Grand Prix",       circuit: "Madring",              country: "Spain",          raceDate: "2026-09-13T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-09-11T11:00:00Z" },
  { round: 15, name: "Azerbaijan Grand Prix",   circuit: "Baku City",            country: "Azerbaijan",     raceDate: "2026-09-26T11:00:00Z", sprintDate: null,                            pickDeadline: "2026-09-24T09:00:00Z" },
  { round: 16, name: "Singapore Grand Prix",    circuit: "Marina Bay",           country: "Singapore",      raceDate: "2026-10-11T12:00:00Z", sprintDate: "2026-10-10T11:30:00Z",          pickDeadline: "2026-10-09T10:00:00Z" },
  { round: 17, name: "United States Grand Prix",circuit: "COTA",                 country: "USA",            raceDate: "2026-10-25T19:00:00Z", sprintDate: null,                            pickDeadline: "2026-10-23T17:00:00Z" },
  { round: 18, name: "Mexico City Grand Prix",  circuit: "Hermanos Rodriguez",   country: "Mexico",         raceDate: "2026-11-01T20:00:00Z", sprintDate: null,                            pickDeadline: "2026-10-30T18:00:00Z" },
  { round: 19, name: "São Paulo Grand Prix",    circuit: "Interlagos",           country: "Brazil",         raceDate: "2026-11-08T17:00:00Z", sprintDate: null,                            pickDeadline: "2026-11-06T15:00:00Z" },
  { round: 20, name: "Las Vegas Grand Prix",    circuit: "Las Vegas Strip",      country: "USA",            raceDate: "2026-11-22T06:00:00Z", sprintDate: null,                            pickDeadline: "2026-11-20T04:00:00Z" },
  { round: 21, name: "Qatar Grand Prix",        circuit: "Lusail",               country: "Qatar",          raceDate: "2026-11-29T14:00:00Z", sprintDate: null,                            pickDeadline: "2026-11-27T12:00:00Z" },
  { round: 22, name: "Abu Dhabi Grand Prix",    circuit: "Yas Marina",           country: "Abu Dhabi",      raceDate: "2026-12-06T13:00:00Z", sprintDate: null,                            pickDeadline: "2026-12-04T11:00:00Z" },
];

async function main() {
  console.log("Seeding drivers...");
  for (const driver of DRIVERS_2026) {
    await prisma.driver.upsert({
      where: { externalId: driver.externalId },
      update: { ...driver, season: 2026 },
      create: { ...driver, season: 2026 },
    });
  }
  console.log(`  ✅ ${DRIVERS_2026.length} drivers`);

  // Drop any seasons-future rounds that may linger from earlier seeds.
  await prisma.race.deleteMany({
    where: { season: 2026, round: { gt: 22 } },
  });
  console.log("  🗑️ Removed stale rounds > 22");

  console.log("Seeding races...");
  for (const race of RACES_2026) {
    await prisma.race.upsert({
      where: { season_round: { season: 2026, round: race.round } },
      update: {
        name: race.name,
        circuit: race.circuit,
        country: race.country,
        raceDate: new Date(race.raceDate),
        sprintDate: race.sprintDate ? new Date(race.sprintDate) : null,
        pickDeadline: new Date(race.pickDeadline),
      },
      create: {
        season: 2026,
        round: race.round,
        name: race.name,
        circuit: race.circuit,
        country: race.country,
        raceDate: new Date(race.raceDate),
        sprintDate: race.sprintDate ? new Date(race.sprintDate) : null,
        pickDeadline: new Date(race.pickDeadline),
      },
    });
  }
  console.log(`  ✅ ${RACES_2026.length} races`);

  console.log("✨ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
