"use client";

interface PickData {
  userId: string;
  userName: string;
  driverCode: string;
  driverName: string;
  team: string;
  points: number;
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
  picks: PickData[];
}

export default function AllPicks({ race, picks }: Props) {
  const deadline = new Date(race.pickDeadline);
  const isLocked = new Date() > deadline;

  if (!isLocked) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-2">
          Round {race.round}: {race.name}
        </h3>
        <p className="text-gray-400 text-sm">
          🔒 Picks are hidden until the deadline passes.
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {picks.length} player{picks.length !== 1 ? "s" : ""} have submitted picks
        </p>
      </div>
    );
  }

  const sorted = [...picks].sort((a, b) => b.points - a.points);

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-3">
        Round {race.round}: {race.name}
      </h3>
      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">No picks submitted.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((pick) => (
            <div
              key={pick.userId}
              className="flex justify-between items-center bg-gray-800 rounded-lg px-4 py-2"
            >
              <div>
                <span className="font-semibold text-white">{pick.userName}</span>
                <span className="text-gray-400 mx-2">→</span>
                <span className="text-red-400 font-mono">{pick.driverCode}</span>
                <span className="text-gray-500 text-sm ml-2">{pick.team}</span>
              </div>
              <span
                className={`font-bold text-lg ${
                  pick.points > 0 ? "text-green-400" : "text-gray-500"
                }`}
              >
                {pick.points} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
