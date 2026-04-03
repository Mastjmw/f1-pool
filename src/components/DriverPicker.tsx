"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DRIVER_META, getTeamOrder } from "@/lib/driver-meta";

interface Driver {
  id: string;
  code: string;
  name: string;
  team: string;
  number: number;
}

interface Race {
  id: string;
  round: number;
  name: string;
  raceDate: string;
  pickDeadline: string;
}

interface Props {
  race: Race;
  drivers: Driver[];
  usedDriverIds: string[];
  poolId: string;
  currentPick: string | null;
}

export default function DriverPicker({ race, drivers, usedDriverIds, poolId, currentPick }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(currentPick);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const deadline = new Date(race.pickDeadline);
  const isLocked = new Date() > deadline;

  // Sort drivers by team (constructor standings order), then by driver number within team
  const sortedDrivers = [...drivers].sort((a, b) => {
    const teamA = getTeamOrder(a.team);
    const teamB = getTeamOrder(b.team);
    if (teamA !== teamB) return teamA - teamB;
    return a.number - b.number;
  });

  // Group drivers by team for display
  const teams = new Map<string, Driver[]>();
  for (const d of sortedDrivers) {
    const list = teams.get(d.team) || [];
    list.push(d);
    teams.set(d.team, list);
  }

  async function submitPick() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poolId, raceId: race.id, driverId: selected }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to submit pick");
    } else {
      setSuccess("Pick submitted! 🏁");
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">Round {race.round}: {race.name}</h2>
          <p className="text-gray-400 text-sm">
            Race: {new Date(race.raceDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${isLocked ? "text-red-400" : "text-green-400"}`}>
            {isLocked ? "🔒 Picks Locked" : "🟢 Picks Open"}
          </p>
          <p className="text-gray-500 text-xs">
            Deadline: {deadline.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {!isLocked && (
        <>
          <div className="space-y-4 mb-4">
            {[...teams.entries()].map(([teamName, teamDrivers]) => {
              const meta = DRIVER_META[teamDrivers[0]?.code];
              const teamColor = meta?.teamColor || "#666";

              return (
                <div key={teamName}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: teamColor }}
                    />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {teamName}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamDrivers.map((driver) => {
                      const isUsed = usedDriverIds.includes(driver.id) && driver.id !== currentPick;
                      const isSelected = selected === driver.id;
                      const driverMeta = DRIVER_META[driver.code];
                      const headshot = driverMeta?.headshot;
                      const color = driverMeta?.teamColor || "#666";

                      return (
                        <button
                          key={driver.id}
                          disabled={isUsed}
                          onClick={() => setSelected(driver.id)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border-2 text-left transition
                            ${isUsed
                              ? "opacity-30 cursor-not-allowed border-gray-700 bg-gray-800"
                              : isSelected
                              ? "bg-gray-800 ring-2 ring-white"
                              : "bg-gray-800 hover:bg-gray-700"
                            }
                          `}
                          style={{
                            borderColor: isUsed ? undefined : color,
                          }}
                        >
                          {headshot && (
                            <img
                              src={headshot}
                              alt={driver.name}
                              className="w-12 h-12 rounded-full object-cover bg-gray-700 flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {driver.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {driver.code} · #{driver.number}
                            </div>
                            {isUsed && <div className="text-xs text-red-400 mt-0.5">Already used ✗</div>}
                          </div>
                          {isSelected && (
                            <div className="ml-auto text-green-400 text-lg flex-shrink-0">✓</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-3">{success}</p>}

          <button
            onClick={submitPick}
            disabled={!selected || submitting}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : currentPick
              ? "Change Pick"
              : "Lock In Pick"}
          </button>
        </>
      )}
    </div>
  );
}
