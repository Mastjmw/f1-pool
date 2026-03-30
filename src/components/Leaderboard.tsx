"use client";

interface LeaderboardEntry {
  userId: string;
  name: string;
  total: number;
  perRace: Record<number, number>;
}

interface Race {
  id: string;
  round: number;
  name: string;
}

interface Props {
  entries: LeaderboardEntry[];
  races: Race[];
  currentUserId: string;
}

export default function Leaderboard({ entries, races, currentUserId }: Props) {
  const completedRaces = races.filter((r) =>
    entries.some((e) => e.perRace[r.round] !== undefined)
  );

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">🏆 Standings</h2>

      {entries.length === 0 ? (
        <p className="text-gray-400">No members yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const isMe = entry.userId === currentUserId;
            const position = idx + 1;
            const medal =
              position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : `${position}.`;

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isMe ? "bg-gray-800 ring-1 ring-red-500" : "bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8">{medal}</span>
                  <div>
                    <p className={`font-semibold ${isMe ? "text-red-400" : "text-white"}`}>
                      {entry.name}
                      {isMe && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                    </p>
                    {completedRaces.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {completedRaces.slice(-5).map((race) => {
                          const pts = entry.perRace[race.round];
                          return (
                            <span
                              key={race.round}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                pts === undefined
                                  ? "bg-gray-700 text-gray-500"
                                  : pts > 0
                                  ? "bg-green-900 text-green-300"
                                  : "bg-red-900 text-red-300"
                              }`}
                              title={`R${race.round}: ${pts ?? "—"} pts`}
                            >
                              R{race.round}: {pts ?? "—"}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{entry.total}</p>
                  <p className="text-xs text-gray-400">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
