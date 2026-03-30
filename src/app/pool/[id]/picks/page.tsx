import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AllPicks from "@/components/AllPicks";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PoolPicksPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  const membership = await prisma.poolMember.findUnique({
    where: { userId_poolId: { userId: user.id, poolId: id } },
  });
  if (!membership) redirect("/dashboard");

  const pool = await prisma.pool.findUnique({ where: { id } });
  if (!pool) redirect("/dashboard");

  const races = await prisma.race.findMany({
    where: { season: pool.season },
    orderBy: { round: "desc" },
    include: {
      results: true,
      picks: {
        where: { poolId: id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          driver: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/pool/${id}`} className="text-gray-400 hover:text-white text-sm">
          ← Back to {pool.name}
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-6">📊 All Picks — {pool.name}</h1>

        <div className="space-y-6">
          {races.map((race) => {
            const pickData = race.picks.map((p) => {
              const result = race.results.find((r) => r.driverId === p.driverId);
              return {
                userId: p.userId,
                userName: p.user.name || p.user.email,
                driverCode: p.driver.code,
                driverName: p.driver.name,
                team: p.driver.team,
                points: result?.totalPoints || 0,
              };
            });

            return (
              <AllPicks
                key={race.id}
                race={JSON.parse(JSON.stringify(race))}
                picks={pickData}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
