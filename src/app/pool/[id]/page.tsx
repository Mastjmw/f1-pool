import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DriverPicker from "@/components/DriverPicker";
import Leaderboard from "@/components/Leaderboard";
import PickHistory from "@/components/PickHistory";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PoolPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  // Verify membership
  const membership = await prisma.poolMember.findUnique({
    where: { userId_poolId: { userId: user.id, poolId: id } },
  });
  if (!membership) redirect("/dashboard");

  const pool = await prisma.pool.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!pool) redirect("/dashboard");

  // Get current/next race
  const now = new Date();
  const nextRace = await prisma.race.findFirst({
    where: { season: pool.season, pickDeadline: { gt: now } },
    orderBy: { round: "asc" },
  });

  // Get all races for the season
  const races = await prisma.race.findMany({
    where: { season: pool.season },
    orderBy: { round: "asc" },
  });

  // Get all drivers
  const drivers = await prisma.driver.findMany({
    where: { season: pool.season },
    orderBy: { name: "asc" },
  });

  // Get user's picks for this pool
  const myPicks = await prisma.pick.findMany({
    where: { userId: user.id, poolId: id },
    include: { driver: true, race: true },
  });

  // Get all picks for leaderboard
  const allPicks = await prisma.pick.findMany({
    where: { poolId: id },
    include: {
      driver: true,
      race: { include: { results: true } },
      user: { select: { id: true, name: true } },
    },
  });

  // Calculate leaderboard scores
  const scores: Record<string, { name: string; total: number; perRace: Record<number, number> }> = {};
  for (const member of pool.members) {
    scores[member.userId] = {
      name: member.user.name || member.user.email,
      total: 0,
      perRace: {},
    };
  }

  for (const pick of allPicks) {
    const result = pick.race.results.find((r) => r.driverId === pick.driverId);
    const points = result?.totalPoints || 0;
    if (scores[pick.userId]) {
      scores[pick.userId].total += points;
      scores[pick.userId].perRace[pick.race.round] = points;
    }
  }

  const leaderboard = Object.entries(scores)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.total - a.total);

  // Used driver IDs (for elimination logic)
  const usedDriverIds = myPicks.map((p) => p.driverId);

  const isAdmin = membership.role === "admin";

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">
              ← Dashboard
            </a>
            <h1 className="text-3xl font-bold mt-1">🏎️ {pool.name}</h1>
            <p className="text-gray-400">
              {pool.season} Season · {pool.members.length} members
              {pool.midReset && ` · Resets after Round ${pool.resetAfter}`}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={`/pool/${id}/picks`}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
            >
              📊 All Picks
            </a>
            {isAdmin && (
              <a
                href={`/pool/${id}/admin`}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
              >
                ⚙️ Admin
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Driver Picker */}
          <div className="lg:col-span-2">
            {nextRace ? (
              <DriverPicker
                race={JSON.parse(JSON.stringify(nextRace))}
                drivers={JSON.parse(JSON.stringify(drivers))}
                usedDriverIds={usedDriverIds}
                poolId={pool.id}
                currentPick={myPicks.find((p) => p.raceId === nextRace.id)?.driverId || null}
              />
            ) : (
              <div className="bg-gray-900 rounded-xl p-8 text-center">
                <p className="text-gray-400 text-lg">No upcoming races to pick for.</p>
              </div>
            )}

            {/* Pick History */}
            <PickHistory
              picks={JSON.parse(JSON.stringify(myPicks))}
              races={JSON.parse(JSON.stringify(races))}
            />
          </div>

          {/* Leaderboard */}
          <div>
            <Leaderboard
              entries={leaderboard}
              races={JSON.parse(JSON.stringify(races))}
              currentUserId={user.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
