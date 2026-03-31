import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import SuperAdminPanel from "@/components/SuperAdminPanel";

export default async function SuperAdminPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      poolMembers: {
        select: { pool: { select: { id: true, name: true } }, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pools = await prisma.pool.findMany({
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { picks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">
          ← Dashboard
        </a>
        <h1 className="text-3xl font-bold mt-2 mb-2">🔑 Super Admin</h1>
        <p className="text-gray-400 mb-8">Site-wide management — users, pools, and settings</p>

        <SuperAdminPanel
          users={JSON.parse(JSON.stringify(users))}
          pools={JSON.parse(JSON.stringify(pools))}
          currentUserId={admin.id}
        />
      </div>
    </div>
  );
}
