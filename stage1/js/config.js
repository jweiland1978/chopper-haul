export const VERSION = 1;

export const CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  SAVE_KEY: 'choppah_v1_save',
  SETTINGS_KEY: 'choppah_v1_settings',
  SCORES_KEY: 'choppah_v1_scores',
  SAVE_VERSION: 1,

  TITLE: "CHOPPER HAUL '84",
  STUDIO: "Pete's Air Rescue",
  COUNTY: 'Mudflat County',
  ZONE1: 'Gravel Falls Farmland',
  RIVER: 'Muddy Fork River',
  AI_CREDIT: 'Made with AI: Grok Build. Design and tuning by Jeff (BlueWater78).',

  ARMOR: 3,
  ROCKETS_START: 5,
  ROCKET_INTERVAL: 1.2,
  INVULN: 1.4,
  COMBO_WINDOW: 2,
  COMBO_MAX: 8,
  TYPE_MS: 70,
  GUN_LEVELS: 4,
  HOOK_RANGE: 56,
  ROPE_MIN: 70,
  ROPE_MAX: 210,
  FIRE_RATE: 0.11,
  BEAM_RANGE: 168,
  BEAM_WIDTH: 70,
  BEAM_DPS: 22,
  BULLET_SPEED: 620,
  ROCKET_SPEED: 400,
  PLAYER_SPEED: 310,
  PLAYER_ACCEL: 980,
  WATER_Y: 575,
  GROUND_Y: 548,
  HUD_TOP: 8,

  TOUCH_FIRE_DIA: 128,
  TOUCH_WINCH_DIA: 128,

  COLORS: {
    skyTop: 0x2a1848,
    skyMid: 0xe07030,
    skyLow: 0xffc060,
    water: 0x0c3048,
    waterHi: 0x1a6a7a,
    ink: 0x081018,
    panel: 0x121c28,
    orange: 0xffb020,
    yellow: 0xffe14a,
    red: 0xe23b3b,
    good: 0x6adf6a,
    text: '#f4efe0',
    muted: '#9aa6b4',
    orangeCss: '#ffb020',
    yellowCss: '#ffe14a',
    bad: '#e85d4c',
    goodCss: '#6adf6a',
  },

  FONTS: {
    pixel: 'ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace',
  },
};

export function rankFor(sortieIndex, score) {
  const table = globalThis.__CHOPPAH_PAR;
  const par = (table && table[sortieIndex]) || 2500;
  if (score >= par * 1.5) return 'S';
  if (score >= par) return 'A';
  if (score >= par * 0.6) return 'B';
  return 'C';
}
