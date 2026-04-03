/**
 * DRIVER METADATA — Headshots and team info from OpenF1
 * =====================================================
 * Static map of driver code → headshot URL and team color.
 * Updated for 2026 season. Headshots hosted by formula1.com.
 *
 * Team order follows approximate 2026 constructor standings for display grouping.
 */

export interface DriverMeta {
  headshot: string;
  teamColor: string;
  teamOrder: number; // Lower = higher in constructor standings (for sorting)
}

// Team ordering (approximate 2026 constructor standings)
const TEAM_ORDER: Record<string, number> = {
  "McLaren": 1,
  "Ferrari": 2,
  "Red Bull Racing": 3,
  "Red Bull": 3,
  "Mercedes": 4,
  "Aston Martin": 5,
  "Alpine": 6,
  "Williams": 7,
  "Racing Bulls": 8,
  "RB": 8,
  "Haas F1 Team": 9,
  "Haas": 9,
  "Audi": 10,
  "Kick Sauber": 10,
  "Cadillac": 11,
};

const BASE = "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers";

export const DRIVER_META: Record<string, DriverMeta> = {
  NOR: { headshot: `${BASE}/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png`, teamColor: "#F47600", teamOrder: 1 },
  PIA: { headshot: `${BASE}/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/1col/image.png`, teamColor: "#F47600", teamOrder: 1 },
  LEC: { headshot: `${BASE}/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png`, teamColor: "#ED1131", teamOrder: 2 },
  HAM: { headshot: `${BASE}/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png`, teamColor: "#ED1131", teamOrder: 2 },
  VER: { headshot: `${BASE}/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png`, teamColor: "#4781D7", teamOrder: 3 },
  HAD: { headshot: `${BASE}/I/ISAHAD01_Isack_Hadjar/isahad01.png.transform/1col/image.png`, teamColor: "#4781D7", teamOrder: 3 },
  RUS: { headshot: `${BASE}/G/GEORUS01_George_Russell/georus01.png.transform/1col/image.png`, teamColor: "#00D7B6", teamOrder: 4 },
  ANT: { headshot: `${BASE}/K/ANDANT01_Kimi_Antonelli/andant01.png.transform/1col/image.png`, teamColor: "#00D7B6", teamOrder: 4 },
  ALO: { headshot: `${BASE}/F/FERALO01_Fernando_Alonso/feralo01.png.transform/1col/image.png`, teamColor: "#229971", teamOrder: 5 },
  STR: { headshot: `${BASE}/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/1col/image.png`, teamColor: "#229971", teamOrder: 5 },
  GAS: { headshot: `${BASE}/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/1col/image.png`, teamColor: "#00A1E8", teamOrder: 6 },
  COL: { headshot: `${BASE}/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/1col/image.png`, teamColor: "#00A1E8", teamOrder: 6 },
  ALB: { headshot: `${BASE}/A/ALEALB01_Alexander_Albon/alealb01.png.transform/1col/image.png`, teamColor: "#1868DB", teamOrder: 7 },
  SAI: { headshot: `${BASE}/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/1col/image.png`, teamColor: "#1868DB", teamOrder: 7 },
  LAW: { headshot: `${BASE}/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/1col/image.png`, teamColor: "#6C98FF", teamOrder: 8 },
  LIN: { headshot: `${BASE}/A/ARVLIN01_Arvid_Lindblad/arvlin01.png.transform/1col/image.png`, teamColor: "#6C98FF", teamOrder: 8 },
  OCO: { headshot: `${BASE}/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/1col/image.png`, teamColor: "#9C9FA2", teamOrder: 9 },
  BEA: { headshot: `${BASE}/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/1col/image.png`, teamColor: "#9C9FA2", teamOrder: 9 },
  HUL: { headshot: `${BASE}/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png`, teamColor: "#F50537", teamOrder: 10 },
  BOR: { headshot: `${BASE}/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png.transform/1col/image.png`, teamColor: "#F50537", teamOrder: 10 },
  PER: { headshot: `${BASE}/S/SERPER01_Sergio_Perez/serper01.png.transform/1col/image.png`, teamColor: "#909090", teamOrder: 11 },
  BOT: { headshot: `${BASE}/V/VALBOT01_Valtteri_Bottas/valbot01.png.transform/1col/image.png`, teamColor: "#909090", teamOrder: 11 },
};

/**
 * Get team order for sorting. Falls back to 99 for unknown teams.
 */
export function getTeamOrder(team: string): number {
  return TEAM_ORDER[team] ?? 99;
}
