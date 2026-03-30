import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  const memberships = await prisma.poolMember.findMany({
    where: { userId: user.id },
    include: {
      pool: {
        include: {
          members: { include: { user: true } },
          picks: { where: { userId: user.id } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">🏎️ F1 Pool</h1>
            <p className="text-gray-400">Welcome back, {user.name}</p>
          </div>
          <Link
            href="/api/auth/signout"
            className="text-gray-400 hover:text-white transition"
          >
            Sign Out
          </Link>
        </div>

        {/* Pool List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Pools</h2>
            <div className="space-x-3">
              <Link
                href="/pool/join"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
              >
                Join Pool
              </Link>
              <Link
                href="/pool/create"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
              >
                Create Pool
              </Link>
            </div>
          </div>

          {memberships.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-lg mb-4">
                You haven&apos;t joined any pools yet.
              </p>
              <p className="text-gray-500">
                Create a pool or join one with an invite code.
              </p>
            </div>
          ) : (
            memberships.map((m) => (
              <Link
                key={m.pool.id}
                href={`/pool/${m.pool.id}`}
                className="block bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{m.pool.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {m.pool.season} Season · {m.pool.members.length} members ·{" "}
                      {m.pool.picks.length} picks made
                    </p>
                  </div>
                  <span className="text-gray-500 text-sm">{m.role}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
