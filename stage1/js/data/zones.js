import { rankFor as rankFn } from '../config.js?v=1';

export const SORTIES = [
  {
    index: 0,
    id: 'gf-1',
    name: 'Barn Roof Run',
    duration: 70,
    par: 2800,
    pad: { type: 'church', x: 3480, y: 430, w: 180 },
    worldW: 4200,
    cargo: [
      { id: 'brenda', x: 980, y: 430 },
      { id: 'grandma', x: 1880, y: 418 },
    ],
    briefing: [
      'Big Rain busted the Gravel Falls dam. Mudflat County is a river now.',
      "Winch Brenda and Grandma to the church roof. Watch the Buzzard Bros.",
    ],
    waves: [
      { t: 4, type: 'duster', x: 1500, y: 160 },
      { t: 10, type: 'balloon', x: 1200, y: 480 },
      { t: 16, type: 'truck', x: 1600, y: 500 },
      { t: 22, type: 'duster', x: 2100, y: 140 },
      { t: 30, type: 'duster', x: 2600, y: 200 },
      { t: 38, type: 'balloon', x: 2400, y: 460 },
      { t: 46, type: 'truck', x: 3000, y: 500 },
      { t: 54, type: 'duster', x: 3400, y: 150 },
    ],
  },
  {
    index: 1,
    id: 'gf-2',
    name: 'Barge Lift',
    duration: 80,
    par: 3600,
    pad: { type: 'barge', x: 3600, y: 500, w: 200 },
    worldW: 4400,
    cargo: [
      { id: 'hottub', x: 1100, y: 428 },
      { id: 'doug', x: 2100, y: 422 },
    ],
    briefing: [
      'A man will not leave his couch. The tub still has a guy in it.',
      'Drop them on the salvage barge. Spill the tub and you lose the bonus.',
    ],
    waves: [
      { t: 3, type: 'duster', x: 1400, y: 150 },
      { t: 8, type: 'duster', x: 1700, y: 220 },
      { t: 14, type: 'truck', x: 1500, y: 500 },
      { t: 20, type: 'balloon', x: 1900, y: 470 },
      { t: 28, type: 'duster', x: 2400, y: 130 },
      { t: 36, type: 'truck', x: 2600, y: 500 },
      { t: 44, type: 'balloon', x: 2800, y: 440 },
      { t: 52, type: 'duster', x: 3200, y: 180 },
      { t: 60, type: 'duster', x: 3600, y: 140 },
      { t: 68, type: 'truck', x: 3400, y: 500 },
    ],
  },
  {
    index: 2,
    id: 'gf-3',
    name: 'Friday Night Flood',
    duration: 90,
    par: 5200,
    pad: { type: 'field', x: 3800, y: 430, w: 220 },
    worldW: 4600,
    cargo: [
      { id: 'brenda', x: 900, y: 430 },
      { id: 'hottub', x: 1700, y: 428 },
      { id: 'doug', x: 2500, y: 422 },
    ],
    briefing: [
      'Three loads. One football field still above water.',
      'Swing the couch if you have to. Buzzards hate upholstery.',
    ],
    waves: [
      { t: 3, type: 'duster', x: 1300, y: 150 },
      { t: 8, type: 'balloon', x: 1100, y: 470 },
      { t: 14, type: 'truck', x: 1500, y: 500 },
      { t: 20, type: 'duster', x: 2000, y: 120 },
      { t: 26, type: 'duster', x: 2200, y: 210 },
      { t: 34, type: 'truck', x: 2300, y: 500 },
      { t: 42, type: 'balloon', x: 2600, y: 450 },
      { t: 50, type: 'duster', x: 3000, y: 160 },
      { t: 58, type: 'truck', x: 3200, y: 500 },
      { t: 66, type: 'duster', x: 3600, y: 140 },
      { t: 74, type: 'balloon', x: 3500, y: 430 },
      { t: 82, type: 'duster', x: 4000, y: 180 },
    ],
  },
  {
    index: 3,
    id: 'gf-boss',
    name: 'THE BUZZARD BLIMP',
    duration: 90,
    par: 4500,
    boss: true,
    pad: { type: 'barge', x: 980, y: 500, w: 180 },
    worldW: 1600,
    cargo: [
      { id: 'grandma', x: 420, y: 430 },
    ],
    briefing: [
      "Loudspeaker on the horizon. That's the Buzzard Blimp.",
      'Shoot the three propeller pods, then the gondola. Cargo works too.',
    ],
    insults: [
      'Nice haircut, Pete!',
      'That chopper still smell like hay?',
      'Give it up, Air Rescue!',
      'We haul. You cry.',
      'Is that Grandma? Hi, Granny!',
    ],
    waves: [
      { t: 8, type: 'duster', x: 1400, y: 160 },
      { t: 22, type: 'duster', x: 1400, y: 200 },
      { t: 40, type: 'balloon', x: 1100, y: 460 },
      { t: 58, type: 'duster', x: 1400, y: 140 },
    ],
  },
];

globalThis.__CHOPPAH_PAR = SORTIES.map((s) => s.par);

export function getSortie(index) {
  return SORTIES[index] || SORTIES[0];
}

export function rankFor(sortieIndex, score) {
  return rankFn(sortieIndex, score);
}
