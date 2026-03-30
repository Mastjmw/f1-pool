// F1 Championship Points Systems

export const RACE_POINTS: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
  6: 8,  7: 6,  8: 4,  9: 2,  10: 1,
};

export const SPRINT_POINTS: Record<number, number> = {
  1: 8, 2: 7, 3: 6, 4: 5, 5: 4,
  6: 3, 7: 2, 8: 1,
};

export function getRacePoints(position: number | null): number {
  if (position === null) return 0; // DNF/DNS
  return RACE_POINTS[position] ?? 0;
}

export function getSprintPoints(position: number | null): number {
  if (position === null) return 0;
  return SPRINT_POINTS[position] ?? 0;
}

export function getFastestLapBonus(position: number | null, hasFastestLap: boolean): number {
  if (!hasFastestLap || position === null || position > 10) return 0;
  return 1;
}

export function calculateTotalPoints(
  racePosition: number | null,
  sprintPosition: number | null,
  hasFastestLap: boolean
): number {
  return (
    getRacePoints(racePosition) +
    getSprintPoints(sprintPosition) +
    getFastestLapBonus(racePosition, hasFastestLap)
  );
}
