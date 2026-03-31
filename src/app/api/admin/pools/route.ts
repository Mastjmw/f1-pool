import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// List all pools
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pools = await prisma.pool.findMany({
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { picks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pools);
}

// Delete a pool
export async function DELETE(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const poolId = searchParams.get("poolId");

  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  // Delete all related data
  await prisma.pick.deleteMany({ where: { poolId } });
  await prisma.poolMember.deleteMany({ where: { poolId } });
  await prisma.pool.delete({ where: { id: poolId } });

  return NextResponse.json({ deleted: true });
}

// Update pool (transfer admin, rename, etc.)
export async function PATCH(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { poolId, name, midReset, resetAfter, newAdminUserId } = await req.json();

  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  // Update pool settings
  if (name || midReset !== undefined || resetAfter !== undefined) {
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        ...(name && { name }),
        ...(midReset !== undefined && { midReset }),
        ...(resetAfter !== undefined && { resetAfter }),
      },
    });
  }

  // Transfer pool admin
  if (newAdminUserId) {
    // Demote current admins
    await prisma.poolMember.updateMany({
      where: { poolId, role: "admin" },
      data: { role: "member" },
    });
    // Promote new admin
    await prisma.poolMember.update({
      where: { userId_poolId: { userId: newAdminUserId, poolId } },
      data: { role: "admin" },
    });
  }

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json(pool);
}
