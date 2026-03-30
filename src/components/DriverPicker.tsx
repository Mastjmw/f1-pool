"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

// F1 team colors
const TEAM_COLORS: Record<string, string> = {
  "Red Bull": "border-blue-600",
  Ferrari: "border-red-600",
  McLaren: "border-orange-500",
  Mercedes: "border-teal-400",
  "Aston Martin": "border-green-600",
  Alpine: "border-pink-500",
  Williams: "border-blue-400",
  "RB": "border-blue-500",
  Haas: "border-gray-400",
  "Kick Sauber": "border-green-400",
};

export default function DriverPicker({ race, drivers, usedDriverIds, poolId, currentPick }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(currentPick);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const deadline = new Date(race.pickDeadline);
  const isLocked = new Date() > deadline;

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {drivers.map((driver) => {
              const isUsed = usedDriverIds.includes(driver.id) && driver.id !== currentPick;
              const isSelected = selected === driver.id;
              const teamColor = TEAM_COLORS[driver.team] || "border-gray-600";

              return (
                <button
                  key={driver.id}
                  disabled={isUsed}
                  onClick={() => setSelected(driver.id)}
                  className={`
                    p-3 rounded-lg border-2 text-left transition
                    ${isUsed
                      ? "opacity-30 cursor-not-allowed border-gray-700 bg-gray-800"
                      : isSelected
                      ? `${teamColor} bg-gray-800 ring-2 ring-white`
                      : `${teamColor} bg-gray-800 hover:bg-gray-700`
                    }
                  `}
                >
                  <div className="text-lg font-bold">{driver.code}</div>
                  <div className="text-xs text-gray-400">{driver.name}</div>
                  <div className="text-xs text-gray-500">{driver.team}</div>
                  {isUsed && <div className="text-xs text-red-400 mt-1">Used ✗</div>}
                </button>
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
