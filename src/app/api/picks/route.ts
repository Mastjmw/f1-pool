import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Submit a pick
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { poolId, raceId, driverId } = await req.json();

  if (!poolId || !raceId || !driverId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify membership
  const member = await prisma.poolMember.findUnique({
    where: { userId_poolId: { userId: user.id, poolId } },
  });
  if (!member) {
    return NextResponse.json({ error: "Not a pool member" }, { status: 403 });
  }

  // Check pick deadline
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }
  if (new Date() > race.pickDeadline) {
    return NextResponse.json({ error: "Pick deadline has passed" }, { status: 400 });
  }

  // Check if driver already used in this pool (elimination rule)
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  const usedPicks = await prisma.pick.findMany({
    where: { userId: user.id, poolId },
    include: { race: true },
  });

  // If mid-season reset, only check picks after the reset point
  const relevantPicks = pool?.midReset && pool.resetAfter
    ? usedPicks.filter((p) => {
        // If current race is after reset, only check post-reset picks
        if (race.round > pool.resetAfter!) {
          return p.race.round > pool.resetAfter!;
        }
        // If current race is before reset, only check pre-reset picks
        return p.race.round <= pool.resetAfter!;
      })
    : usedPicks;

  const alreadyUsed = relevantPicks.some((p) => p.driverId === driverId);
  if (alreadyUsed) {
    return NextResponse.json(
      { error: "You already used this driver. Pick someone else!" },
      { status: 400 }
    );
  }

  // Upsert pick (allow changing pick before deadline)
  const pick = await prisma.pick.upsert({
    where: {
      userId_poolId_raceId: { userId: user.id, poolId, raceId },
    },
    update: { driverId },
    create: { userId: user.id, poolId, raceId, driverId },
  });

  return NextResponse.json(pick);
}

// Get user's picks for a pool
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const poolId = searchParams.get("poolId");

  if (!poolId) {
    return NextResponse.json({ error: "poolId required" }, { status: 400 });
  }

  const picks = await prisma.pick.findMany({
    where: { userId: user.id, poolId },
    include: { driver: true, race: true },
    orderBy: { race: { round: "asc" } },
  });

  return NextResponse.json(picks);
}
