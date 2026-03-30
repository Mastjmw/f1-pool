import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/AdminPanel";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PoolAdminPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  const membership = await prisma.poolMember.findUnique({
    where: { userId_poolId: { userId: user.id, poolId: id } },
  });
  if (!membership || membership.role !== "admin") redirect(`/pool/${id}`);

  const pool = await prisma.pool.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!pool) redirect("/dashboard");

  const races = await prisma.race.findMany({
    where: { season: pool.season },
    orderBy: { round: "asc" },
    include: { results: true },
  });

  const drivers = await prisma.driver.findMany({
    where: { season: pool.season },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/pool/${id}`} className="text-gray-400 hover:text-white text-sm">
          ← Back to {pool.name}
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-6">⚙️ Admin — {pool.name}</h1>

        <AdminPanel
          pool={JSON.parse(JSON.stringify(pool))}
          races={JSON.parse(JSON.stringify(races))}
          drivers={JSON.parse(JSON.stringify(drivers))}
        />
      </div>
    </div>
  );
}
