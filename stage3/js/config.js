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

// Every new gameplay number lives here so it can be hand-tuned in one place.
export const TUNING = {
  cargo: {
    hookRange: 80, // px, hook grabs a waiting load
    magnetRange: 160, // px, hook range while Magnet Hook is on
    sloshOmega: 1.35, // rad/s that spills hot-tub water
    sloshPerSec: 0.35, // water fraction lost per second while sloshing
    cakeOmega: 1.55, // rad/s that knocks a wedding-cake tier off
    cakeTierGap: 0.5, // seconds between tier losses
    cakeTiers: 5, // tiers on a fresh cake
    pinballOmega: 1.9, // rad/s very hard swing that TILTs the pinball
    dougBonus: 400, // extra points if Doug is delivered still on the couch
    mayorYell: 2.6, // seconds between the mayor's shouts
    fallSpeed: 50, // px/s, umbrella descent
    pieces: {
      cake: { mass: 0.68, drag: 0.93, points: 1000, w: 40, h: 56 },
      potty: { mass: 1.25, drag: 0.74, points: 1400, w: 36, h: 52 },
      pinball: { mass: 1.82, drag: 0.54, points: 1700, w: 40, h: 56 },
      mailman: { mass: 0.84, drag: 0.88, points: 1100, w: 40, h: 48 },
      tuba: { mass: 1.18, drag: 0.76, points: 1350, w: 40, h: 52 },
      mime: { mass: 0.25, drag: 0.99, points: 120, w: 32, h: 48 },
      mattress: { mass: 0.8, drag: 0.9, points: 1050, w: 64, h: 32 },
      statue: { mass: 2.45, drag: 0.4, points: 2100, w: 36, h: 64 },
      bassboat: { mass: 2.6, drag: 0.38, points: 4600, w: 80, h: 36 },
    },
  },
  pickups: {
    dropChance: 0.28, // chance an enemy kill drops a pickup
    life: 12, // seconds a pickup floats before it vanishes
    bubbleHits: 3, // hits a bubble blocks
    hornSeconds: 3, // air-horn stun, and how long geese stay gone starts after this
    magnetSeconds: 15, // magnet hook duration
    coffeeSeconds: 10, // coffee duration
    coffeeFly: 1.35, // fly speed multiplier
    coffeeReel: 1.55, // winch reel / drop speed multiplier
    wrenchArmor: 1, // armor restored by a wrench
    rocketBox: 5, // rockets in a box
    crateSpacing: 900, // px between floating crates
    // Weighted drop table. POW stays the most common so a gun can still climb.
    table: [
      { id: 'pow', w: 34 },
      { id: 'wrench', w: 14 },
      { id: 'rockets', w: 14 },
      { id: 'bubble', w: 10 },
      { id: 'horn', w: 10 },
      { id: 'magnet', w: 9 },
      { id: 'coffee', w: 9 },
    ],
  },
  enemies: {
    droneLatch: 30, // px, drone grabs carried cargo
    dronePull: 1.1, // rad/s added per second while a drone is latched
    droneTug: 46, // px/s the latch drags the chopper
    droneSteal: 2.5, // seconds latched before the cargo is snatched
    droneShake: 1.75, // rad/s swing that shakes a drone off
    gooseFlock: 4, // geese per spawn
    gooseReturn: 8, // seconds before a scared flock comes back
    gooseTurn: 1.3, // rad/s a goose can turn while chasing (lower = easier to dodge)
    gooseChase: 8, // seconds a flock chases before it gets bored and flies off
    goosePass: 2.2, // seconds a goose flies on past after ramming you
    flareSpeed: 280, // px/s, jet-ski flares
    fridgeArc: 290, // upward px/s of a lobbed fridge
    fridgeGravity: 430, // px/s^2 on a fridge
    rivalMirror: 2.6, // how fast the rival matches your height
    thumbEvery: 3.4, // seconds between thumbs-down
    stats: {
      duster: { hp: 3, w: 80, h: 28, points: 150, shot: 0.9, speed: 90 },
      balloon: { hp: 2, w: 40, h: 56, points: 200, shot: 1.6, speed: 18 },
      truck: { hp: 4, w: 64, h: 36, points: 180, shot: 1.3, speed: 40 },
      drone: { hp: 3, w: 40, h: 28, points: 260, shot: 0, speed: 125 },
      goose: { hp: 99, w: 32, h: 24, points: 0, shot: 0, speed: 155 },
      jetski: { hp: 3, w: 52, h: 24, points: 220, shot: 1.25, speed: 70 },
      rival: { hp: 8, w: 78, h: 30, points: 480, shot: 0.9, speed: 60 },
      catapult: { hp: 5, w: 64, h: 40, points: 300, shot: 2.05, speed: 16 },
    },
  },
  bosses: {
    blimpPodHp: 8, // HP of one propeller pod
    blimpGondolaHp: 14, // HP of the gondola once the pods are gone
    blimpShotEvery: 1.6, // seconds between blimp shots
    magnetPull: 90, // px/s the crane magnet tugs the chopper
    magnetRadius: 250, // px, pull fades out at this distance
    magnetCabHp: 16, // truck cab HP
    magnetCraneHp: 12, // crane arm HP
    magnetHeadHp: 20, // magnet head HP
    magnetBullet: 0.35, // scale applied to bullet-sized hits
    magnetShort: 34, // damage when carried cargo hits the magnet
    magnetSplash: 8, // extra short-out damage on the other parts
    magnetStun: 3.2, // seconds the truck is dead after a short
    magnetShotEvery: 2.2, // seconds between truck shots
    twisterJunk: 6, // swirling pieces around the twister
    twisterCargo: 3, // of those pieces that the hook can snag
    twisterCoreHp: 28, // core HP
    twisterPlateHp: 6, // one shootable junk plate
    twisterSpin: 1.7, // rad/s of the swirl
    twisterSpeed: 42, // px/s the funnel drifts
    twisterSnag: 250, // bonus points for hooking swirl cargo
    vulturePhaseHp: 32, // HP for each brother (total is twice this)
    vultureShotEvery: 1.5, // phase-1 shot gap
    vultureShotSpeed: 200, // phase-1 bullet speed, px/s
    vultureShotEvery2: 1.25, // phase-2 shot gap (3-way spread)
    vultureSpread2: 0.5, // radians between phase-2 spread shots (wider = easier to slip between)
    vultureShotSpeed2: 200, // phase-2 bullet speed, px/s
    vultureSpeed: 34, // phase-1 sway, px/s
    vultureSpeed2: 70, // phase-2 sway, px/s
    partPoints: 80, // points for a broken boss part
    miniPoints: 700, // points for an endless mini-boss
  },
  endless: {
    accelPerMin: 0.12, // difficulty added each minute (spawn gap shrinks)
    miniBossEvery: 180, // seconds between mini-bosses
    spawnEvery: 2.6, // starting seconds between enemy spawns
    spawnEveryMin: 0.65, // fastest spawn gap
    cargoEvery: 14, // seconds between cargo drops
    hpPerLevel: 0.2, // extra enemy HP fraction per minute
    rareWeight: 0.15, // weight of a rare cargo versus 1
    segment: 1200, // px scrolled back when the world recycles
    worldW: 2600, // width of the looping stretch
    miniHp: 0.5, // mini-boss HP scale
    miniScale: 0.62, // mini-boss sprite scale
    gooseWeight: 0.35, // chance a joined goose roll stays a goose
    mix: ['duster', 'balloon', 'truck', 'drone', 'jetski', 'catapult', 'rival', 'goose'],
    mixAt: [0, 0, 0.35, 0.7, 1.1, 1.5, 2.1, 2.8], // minutes until that enemy joins
  },
  audio: {
    musicGain: 0.1, // music bus, kept under the effects bus
    noteGain: 0.22, // each chiptune blip into the music bus
    titleBpm: 112, // title-loop tempo
    flyBpm: 144, // flying-loop tempo
    bossBpm: 168, // boss-loop tempo
  },
  bucks: {
    perScore: 0.02, // salvage bucks per point scored this sortie
    perCargo: 25, // bucks per cargo delivered this sortie
    perMinute: 15, // endless bucks per full minute survived
    rank: { S: 100, A: 60, B: 30, C: 10 }, // story rank bonus (endless uses time instead)
  },
  upgrades: {
    // costs[i] buys the next level and is never more than double costs[i - 1].
    armor: {
      name: 'Armor Plating',
      desc: 'Extra dents before the river.',
      max: 3, // base 3 hits, then 4, 5, 6
      costs: [100, 180, 320],
      hits: 1, // hits added per level
    },
    winch: {
      name: 'Winch Motor',
      desc: 'The reel stops dawdling.',
      max: 3,
      costs: [80, 140, 260],
      reel: 0.25, // fraction of reel speed added per level
    },
    rope: {
      name: 'Longer Rope',
      desc: 'Longer reach. Wider swing.',
      max: 3,
      costs: [90, 160, 300],
      extra: 40, // px of rope added per level
      swing: 0.07, // radians of swing limit added per level
    },
    gun: {
      name: 'Starting Gun',
      desc: 'You leave the pad already loud.',
      max: 2, // 1 starts on Twin, 2 starts on Spread
      costs: [150, 280],
    },
    rockets: {
      name: 'Rocket Rack',
      desc: 'Five more rockets in the rack.',
      max: 3,
      costs: [60, 100, 180],
      per: 5, // starting rockets added per level
    },
    shocks: {
      name: 'Shock Absorbers',
      desc: 'Cargo swings less. Doug approves.',
      max: 3,
      costs: [70, 120, 220],
      damp: 0.4, // extra swing damping per level
    },
    lucky: {
      name: 'Lucky Hook',
      desc: 'Rare loads turn up more often.',
      max: 3,
      costs: [110, 200, 360],
      rare: 0.25, // rare-cargo weight added per level
    },
  },
  achievements: {
    brenda: 10, // lifetime Brenda deliveries for Moo-ving Day
    wrecks: 5, // wrecking-ball kills in one sortie
    longSec: 600, // endless seconds for Long Rain
    tubWater: 0.999, // hot-tub water that still counts as no spill
  },
  fx: {
    reduceBurst: 2, // particles in one burst while Reduce Effects is on
    shakeMs: 180,
    shakeHit: 0.0045,
    shakeBoom: 0.009,
    flashMs: 70,
    popMs: 420,
    popFrom: 0.55,
    popScale: 1.4,
    popRise: 28,
    popFont: 28,
    jingle: [523, 659, 784, 1046],
    jingleStep: 0.12,
    jingleDur: 0.2,
    jingleGain: 0.08,
    phoneMaxScale: 0.75, // phone layout when 1 game px is under this many CSS px
    phoneHitCss: 44,
    phoneHitGame: 84,
    phoneBody: 20,
    phoneGap: 12,
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
