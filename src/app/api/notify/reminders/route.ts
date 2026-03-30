import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPickReminder } from "@/lib/email";

// Cron-callable endpoint: sends pick reminders 24h before deadline
// Protect with a secret in production: ?secret=YOUR_CRON_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find races with deadlines in the next 24 hours
  const upcomingRaces = await prisma.race.findMany({
    where: {
      pickDeadline: { gt: now, lt: in24h },
    },
  });

  if (upcomingRaces.length === 0) {
    return NextResponse.json({ message: "No races with upcoming deadlines", sent: 0 });
  }

  let sent = 0;

  for (const race of upcomingRaces) {
    // Get all pools for this season
    const pools = await prisma.pool.findMany({
      where: { season: race.season },
      include: {
        members: { include: { user: true } },
        picks: { where: { raceId: race.id } },
      },
    });

    for (const pool of pools) {
      // Find members who haven't picked yet
      const pickedUserIds = new Set(pool.picks.map((p) => p.userId));
      const unpicked = pool.members.filter((m) => !pickedUserIds.has(m.userId));

      for (const member of unpicked) {
        if (member.user.email) {
          await sendPickReminder(
            member.user.email,
            member.user.name || "Racer",
            race.name,
            race.round,
            race.pickDeadline,
            pool.name
          );
          sent++;
        }
      }
    }
  }

  return NextResponse.json({
    message: `Sent ${sent} pick reminders`,
    sent,
    races: upcomingRaces.map((r) => r.name),
  });
}
