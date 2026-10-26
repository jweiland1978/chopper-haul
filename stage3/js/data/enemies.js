import { TUNING } from '../config.js?v=2';

const S = TUNING.enemies.stats;

function stat(id, extra) {
  const t = S[id];
  return Object.assign({
    id,
    hp: t.hp,
    w: t.w,
    h: t.h,
    points: t.points,
    shot: t.shot,
    speed: t.speed,
    tex: extra.tex,
  }, extra);
}

export const ENEMIES = {
  duster: stat('duster', {
    name: 'Crop Duster',
    tex: 'enemy-duster',
    banner: 'BUZZARD BROS. WE HAUL. YOU CRY.',
    kind: 'air',
  }),
  balloon: stat('balloon', {
    name: 'Weather Balloon Turret',
    tex: 'enemy-balloon',
    kind: 'air',
    pop: true,
  }),
  truck: stat('truck', {
    name: 'Flak Truck',
    tex: 'enemy-truck',
    kind: 'ground',
  }),
  drone: stat('drone', {
    name: 'Hook Drone',
    tex: 'enemy-drone',
    kind: 'air',
    drone: true,
  }),
  goose: stat('goose', {
    name: 'Angry Goose',
    tex: 'enemy-goose',
    kind: 'air',
    immortal: true,
    flock: TUNING.enemies.gooseFlock,
  }),
  jetski: stat('jetski', {
    name: 'Jet Ski Gang',
    tex: 'enemy-jetski',
    kind: 'water',
  }),
  rival: stat('rival', {
    name: 'Rival Chopper',
    tex: 'enemy-rival',
    kind: 'air',
    rival: true,
  }),
  catapult: stat('catapult', {
    name: 'Junk Catapult',
    tex: 'enemy-catapult',
    kind: 'ground',
    catapult: true,
  }),
};

export const ENEMY_ALIAS = {
  duster: 'duster',
  cropduster: 'duster',
  crop: 'duster',
  balloon: 'balloon',
  turret: 'balloon',
  weatherballoon: 'balloon',
  truck: 'truck',
  flak: 'truck',
  flaktruck: 'truck',
  drone: 'drone',
  hookdrone: 'drone',
  hook: 'drone',
  goose: 'goose',
  geese: 'goose',
  angrygeese: 'goose',
  jetski: 'jetski',
  jet: 'jetski',
  ski: 'jetski',
  rival: 'rival',
  chopper: 'rival',
  rivalchopper: 'rival',
  catapult: 'catapult',
  junk: 'catapult',
  junkcatapult: 'catapult',
};
