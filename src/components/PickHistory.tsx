"use client";

interface Pick {
  id: string;
  raceId: string;
  driverId: string;
  driver: { code: string; name: string; team: string };
  race: { round: number; name: string };
}

interface Race {
  id: string;
  round: number;
  name: string;
  raceDate: string;
}

interface Props {
  picks: Pick[];
  races: Race[];
}

export default function PickHistory({ picks, races }: Props) {
  const pastRaces = races.filter((r) => new Date(r.raceDate) < new Date());

  if (pastRaces.length === 0 && picks.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">📋 Your Picks</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-sm border-b border-gray-800">
              <th className="pb-2 pr-4">Round</th>
              <th className="pb-2 pr-4">Race</th>
              <th className="pb-2 pr-4">Driver</th>
              <th className="pb-2">Team</th>
            </tr>
          </thead>
          <tbody>
            {races.map((race) => {
              const pick = picks.find((p) => p.raceId === race.id);
              const isPast = new Date(race.raceDate) < new Date();

              return (
                <tr key={race.id} className="border-b border-gray-800/50">
                  <td className="py-2 pr-4 text-gray-400">{race.round}</td>
                  <td className="py-2 pr-4">
                    <span className={isPast ? "text-gray-400" : "text-white"}>
                      {race.name}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {pick ? (
                      <span className="font-semibold text-white">{pick.driver.code}</span>
                    ) : (
                      <span className="text-gray-500 italic">
                        {isPast ? "Missed" : "—"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-gray-400 text-sm">
                    {pick?.driver.team || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
