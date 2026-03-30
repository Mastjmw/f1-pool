// Fetch F1 race results from Ergast/Jolpica API
import { getRacePoints, getSprintPoints, getFastestLapBonus } from "./f1-points";

const API_BASE = "https://api.jolpi.ca/ergast/f1";

interface ErgastResult {
  Driver: { driverId: string; code: string; givenName: string; familyName: string };
  Constructor: { constructorId: string; name: string };
  position: string;
  points: string;
  FastestLap?: { rank: string };
  status: string;
}

interface ParsedResult {
  driverCode: string;
  driverExternalId: string;
  position: number | null;
  racePoints: number;
  sprintPoints: number;
  fastestLap: boolean;
  totalPoints: number;
}

export async function fetchRaceResults(season: number, round: number): Promise<ParsedResult[]> {
  const url = `${API_BASE}/${season}/${round}/results.json`;
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) {
    throw new Error(`Failed to fetch race results: ${res.status}`);
  }

  const data = await res.json();
  const results: ErgastResult[] = data?.MRData?.RaceTable?.Races?.[0]?.Results || [];

  if (results.length === 0) {
    throw new Error(`No results found for ${season} Round ${round}`);
  }

  return results.map((r) => {
    const pos = r.status === "Finished" || r.status.includes("Lap")
      ? parseInt(r.position)
      : null; // DNF/DNS/DSQ
    const hasFastestLap = r.FastestLap?.rank === "1";

    return {
      driverCode: r.Driver.code,
      driverExternalId: r.Driver.driverId,
      position: pos,
      racePoints: getRacePoints(pos),
      sprintPoints: 0, // filled separately
      fastestLap: hasFastestLap,
      totalPoints: getRacePoints(pos) + getFastestLapBonus(pos, hasFastestLap),
    };
  });
}

export async function fetchSprintResults(season: number, round: number): Promise<ParsedResult[]> {
  const url = `${API_BASE}/${season}/${round}/sprint.json`;
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) return []; // No sprint for this round

  const data = await res.json();
  const results: ErgastResult[] = data?.MRData?.RaceTable?.Races?.[0]?.SprintResults || [];

  return results.map((r) => {
    const pos = r.status === "Finished" || r.status.includes("Lap")
      ? parseInt(r.position)
      : null;

    return {
      driverCode: r.Driver.code,
      driverExternalId: r.Driver.driverId,
      position: pos,
      racePoints: 0,
      sprintPoints: getSprintPoints(pos),
      fastestLap: false,
      totalPoints: getSprintPoints(pos),
    };
  });
}

// Get current season driver standings
export async function fetchDriverStandings(season: number) {
  const url = `${API_BASE}/${season}/driverStandings.json`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  return data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
}
