const PAL = {
  ' ': null,
  '.': null,
  k: '#141018',
  K: '#2a2434',
  w: '#f4f0e0',
  y: '#f7d14a',
  Y: '#c99212',
  o: '#ff7a18',
  O: '#c44a10',
  r: '#e23b3b',
  R: '#8e1c1c',
  c: '#5ec8f0',
  b: '#3a6aa5',
  n: '#6b3f22',
  N: '#3d2414',
  s: '#f2c4a0',
  g: '#3d9e4a',
  G: '#245c2e',
  m: '#8a8f9c',
  M: '#4a5160',
  p: '#c46ad4',
  u: '#123848',
  t: '#2e8a9a',
  h: '#ffd6a0',
  a: '#6adf6a',
  d: '#1a1028',
  e: '#e07030',
  f: '#ffc060',
  i: '#0c3048',
  j: '#1a6a7a',
  x: '#7a2a10',
  z: '#ffe14a',
  q: '#203040',
  v: '#c8b090',
};

function canvas(w, h) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return el;
}

function add(scene, key, el) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, el);
}

function px(ctx, map, scale, ox = 0, oy = 0) {
  for (let y = 0; y < map.length; y += 1) {
    const row = map[y];
    for (let x = 0; x < row.length; x += 1) {
      const col = PAL[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

function fromMap(scene, key, map, scale = 3) {
  let w = 0;
  for (let i = 0; i < map.length; i += 1) if (map[i].length > w) w = map[i].length;
  const el = canvas(w * scale, map.length * scale);
  const ctx = el.getContext('2d');
  px(ctx, map, scale);
  add(scene, key, el);
  return el;
}

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01110', '10001', '10000', '01110', '00001', '10001', '01110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00100', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};

function drawGlyph(ctx, ch, x, y, color, scale) {
  const g = FONT[ch] || FONT[' '];
  ctx.fillStyle = color;
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      if (g[row][col] === '1') ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

function drawPixelText(ctx, text, x, y, color, scale) {
  let cx = x;
  for (let i = 0; i < text.length; i += 1) {
    drawGlyph(ctx, text[i], cx, y, color, scale);
    cx += 6 * scale;
  }
  return cx;
}

function makeLogo(scene) {
  const el = canvas(900, 220);
  const ctx = el.getContext('2d');
  drawPixelText(ctx, 'CHOPPER', 20, 20, '#3a2010', 8);
  drawPixelText(ctx, 'CHOPPER', 12, 12, '#ffb020', 8);
  drawPixelText(ctx, "HAUL '84", 20, 92, '#3a2010', 8);
  drawPixelText(ctx, "HAUL '84", 12, 84, '#ffe14a', 8);
  ctx.fillStyle = '#e23b3b';
  ctx.fillRect(12, 164, 420, 8);
  ctx.fillStyle = '#5ec8f0';
  ctx.fillRect(12, 176, 260, 6);
  add(scene, 'logo', el);
}

function makeScanlines(scene) {
  const el = canvas(4, 4);
  const ctx = el.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 4, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, 4, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(0, 2, 4, 1);
  add(scene, 'scanlines', el);
}

function makePixel(scene) {
  const el = canvas(4, 4);
  const ctx = el.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 4, 4);
  add(scene, 'px', el);
}

function makeSky(scene) {
  const el = canvas(256, 180);
  const ctx = el.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0, '#1a1030');
  g.addColorStop(0.35, '#6a2a58');
  g.addColorStop(0.62, '#e07030');
  g.addColorStop(1, '#ffc878');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 180);
  ctx.fillStyle = '#ffd080';
  ctx.fillRect(190, 28, 28, 28);
  ctx.fillStyle = '#ffe8a0';
  ctx.fillRect(196, 34, 16, 16);
  ctx.fillStyle = 'rgba(244,220,200,0.35)';
  for (let i = 0; i < 8; i += 1) {
    ctx.fillRect(10 + i * 30, 18 + (i % 3) * 10, 28, 8);
  }
  add(scene, 'bg-sky', el);
}

function makeFar(scene) {
  const el = canvas(512, 180);
  const ctx = el.getContext('2d');
  ctx.clearRect(0, 0, 512, 180);
  ctx.fillStyle = '#3a2840';
  ctx.fillRect(0, 110, 512, 70);
  const silos = [40, 160, 280, 400];
  for (let i = 0; i < silos.length; i += 1) {
    const x = silos[i];
    ctx.fillStyle = '#4a3a38';
    ctx.fillRect(x, 50, 28, 70);
    ctx.fillStyle = '#c45a2a';
    ctx.fillRect(x - 4, 42, 36, 12);
    ctx.fillStyle = '#2a3a28';
    ctx.fillRect(x + 40, 80, 48, 40);
    ctx.fillStyle = '#6a3020';
    ctx.fillRect(x + 36, 74, 56, 10);
  }
  ctx.fillStyle = '#245030';
  for (let x = 0; x < 512; x += 14) ctx.fillRect(x, 100, 8, 16);
  add(scene, 'bg-far', el);
}

function makeNear(scene) {
  const el = canvas(512, 160);
  const ctx = el.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, '#0c3048');
  g.addColorStop(0.4, '#145060');
  g.addColorStop(1, '#0a2030');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#2e8a9a';
  for (let x = 0; x < 512; x += 18) {
    ctx.fillRect(x, 8 + (x % 36 === 0 ? 4 : 0), 12, 3);
  }
  ctx.fillStyle = '#3d2414';
  ctx.fillRect(40, 4, 50, 10);
  ctx.fillRect(200, 10, 70, 8);
  ctx.fillStyle = '#6b3f22';
  ctx.fillRect(320, 6, 36, 12);
  add(scene, 'bg-near', el);
}

export function buildTextures(scene) {
  makeScanlines(scene);
  makePixel(scene);
  makeSky(scene);
  makeFar(scene);
  makeNear(scene);
  makeLogo(scene);

  fromMap(scene, 'chopper', [
    '            mmmm            ',
    '        mmmmmmmmmmmm        ',
    '     kkkkkyyyyyyyykkkkk     ',
    '    kccyyyyyyyyyyyyyycck    ',
    '   kcyyyyyrrrryyyyyyycck    ',
    '  kkyyyyyyyyyyyyyyyyyyykk   ',
    ' kkYyyyyyyyyyyyyyyyyyyYkk   ',
    'kMMkyyyyyyyyyyyyyyyyykMMk   ',
    '    nnkk        kkknnn      ',
    '    nn            nn        ',
  ], 3);

  fromMap(scene, 'rotor-a', [
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmm',
    '          mmmmmm            ',
  ], 3);

  fromMap(scene, 'rotor-b', [
    '            mmmmmm          ',
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmm',
  ], 3);

  fromMap(scene, 'hook', [
    '  mm  ',
    '  mm  ',
    ' mmmm ',
    'mm  mm',
    'mm  mm',
    ' mmm  ',
  ], 3);

  fromMap(scene, 'pow', [
    '  oooo  ',
    ' oooooo ',
    'oowwwwoo',
    'oowrrwoo',
    'oowwwwoo',
    ' oooooo ',
    '  oooo  ',
  ], 3);

  fromMap(scene, 'cargo-brenda', [
    '      wwwww       ',
    '     wkkwwkw      ',
    '     wwwwwww  nn  ',
    '   wwwwwwwwwwwnnn ',
    '  wwwwwwwwwwwwww  ',
    '  wwsswwwwwwwwww  ',
    '   wwwwwwwwwwww   ',
    '    nn      nn    ',
    '    nn      nn    ',
  ], 3);

  fromMap(scene, 'cargo-hottub', [
    '   s     w        ',
    '  sss   www       ',
    '  sss    w        ',
    ' nnnnnnnnnnnnnnn  ',
    'n ttttttttttttt n ',
    'n ttttttttttttt n ',
    'nntttttttttttttnn ',
    ' nnnnnnnnnnnnnnn  ',
  ], 3);

  fromMap(scene, 'cargo-doug', [
    '      sss         ',
    '     swws  www    ',
    '     ssss wwwww   ',
    '    bbbbbbbbbbbb  ',
    '   bnnnnnnnnnnbb  ',
    '   bnnnnnnnnnnbb  ',
    '   nnn      nnn   ',
    '   nnn      nnn   ',
  ], 3);

  fromMap(scene, 'cargo-grandma', [
    '     wwwww        ',
    '    wsssssw  ppp  ',
    '    wsssssw ppppp ',
    '    nnnnnnnnnnnn  ',
    '   nwwwwwwwwwwwn  ',
    '   nwwwwwwwwwwwn  ',
    '   nnn      nnn   ',
    '   nnn      nnn   ',
  ], 3);

  fromMap(scene, 'enemy-duster', [
    '        mmmmmmm           ',
    '   wwwwwwyyyyywwwwww      ',
    '  wwccyyyyyyyyyccccww     ',
    ' wwyyyyyyyyyyyyyyyyyww    ',
    'kkyyyyyrrryyyyyyyyyyykk   ',
    '  nnkk          kkknn     ',
  ], 3);

  fromMap(scene, 'enemy-balloon', [
    '   pppp   ',
    '  pppppp  ',
    ' pppppppp ',
    ' pppwwppp ',
    '  pppppp  ',
    '   pppp   ',
    '    mm    ',
    '    mm    ',
    '   mmmm   ',
    '  m KK m  ',
    '  m KK m  ',
    '   mmmm   ',
  ], 3);

  fromMap(scene, 'enemy-truck', [
    '      rrrr        ',
    '     rrrrrr       ',
    '  ggggggggggggg   ',
    ' ggkkkkkkkkkkggg  ',
    'gggkkkkkkkkkkgggg ',
    'ggyyyyyyyyyyygggg ',
    '  MM  MM  MM  MM  ',
    '  MM  MM  MM  MM  ',
  ], 3);

  fromMap(scene, 'pilot', [
    '  ss  ',
    ' ssss ',
    '  bb  ',
    ' bbbb ',
    '  bb  ',
    ' nn nn',
  ], 3);

  fromMap(scene, 'chute', [
    '  rrrrrr  ',
    ' rrwrrwrr ',
    'rrrrrrrrrr',
    '  m    m  ',
    '  m    m  ',
  ], 3);

  fromMap(scene, 'umbrella', [
    '   yyyyyy   ',
    '  yyyyyyyy  ',
    ' yyyyyyyyyy ',
    '     mm     ',
    '     mm     ',
    '     mm     ',
  ], 3);

  fromMap(scene, 'haystack', [
    '    yyyy    ',
    '  yyyyyyyy  ',
    ' yyyyyyyyyy ',
    'yyyyyyyyyyyy',
    ' YYYYYYYYYY ',
  ], 3);

  fromMap(scene, 'scrap', [
    ' mm ',
    'mYYm',
    ' mm ',
  ], 3);

  fromMap(scene, 'bullet', [
    'yy',
    'yy',
  ], 3);

  fromMap(scene, 'ebullet', [
    'rr',
    'rr',
  ], 3);

  fromMap(scene, 'rocket', [
    '  w ',
    ' www',
    'wryw',
    ' www',
    '  w ',
  ], 3);

  fromMap(scene, 'pad-church', [
    '        rr        ',
    '       rrrr       ',
    '      rrrrrr      ',
    '     wwwwwwww     ',
    '    wwwwwwwwww    ',
    '   wwkkwwkkwwww   ',
    '   wwkkwwkkwwww   ',
    '   wwwwwwwwwwww   ',
    ' nnnnnnnnnnnnnnnn ',
  ], 3);

  fromMap(scene, 'pad-barge', [
    '                  ',
    '  mmmmmmmmmmmmmm  ',
    ' mnnnnnnnnnnnnnnm ',
    'mnnnnnnnnnnnnnnnnm',
    ' nnnnnnnnnnnnnnn  ',
    '  tttttttttttttt  ',
  ], 3);

  fromMap(scene, 'pad-field', [
    '                  ',
    '  gggggggggggggg  ',
    ' gwwggwwggwwggwwg ',
    'gggggggggggggggggg',
    ' GGGGGGGGGGGGGGGG ',
    ' nnnnnnnnnnnnnnnn ',
  ], 3);

  fromMap(scene, 'barn', [
    '     rrrrrr     ',
    '    rrrrrrrr    ',
    '   rrrrrrrrrr   ',
    '  rrrrrrrrrrrr  ',
    ' nnnnnnnnnnnnnn ',
    ' nwwwnnnnnwwwnn ',
    ' nwwwnnnnnwwwnn ',
    ' nnnnnnnnknnnnn ',
    ' nnnnnnnnknnnnn ',
  ], 3);

  fromMap(scene, 'silo', [
    '  mmmm  ',
    ' mmwwmm ',
    ' mmwwmm ',
    ' mmmmmm ',
    ' mmwwmm ',
    ' mmwwmm ',
    ' mmmmmm ',
    ' nnnnnn ',
  ], 3);

  fromMap(scene, 'house', [
    '   nnnnnn   ',
    '  nnnnnnnn  ',
    ' nnnnnnnnnn ',
    ' vvvvvvvvvv ',
    ' vvwwvvwwvv ',
    ' vvwwvvwwvv ',
    ' vvvvvknvvv ',
    ' nnnnnnnnnn ',
  ], 3);

  fromMap(scene, 'bridge', [
    'nnnnnnnnnnnnnnnnnnnn',
    'nmmnnmmnnmmnnmmnnmmn',
    'n  nn  nn  nn  nn  n',
  ], 3);

  fromMap(scene, 'blimp', [
    '          mmmmmmmmmmmm          ',
    '       mmmmmmmmmmmmmmmmmm       ',
    '     mmmwwwwwwwwwwwwwwmmmmm     ',
    '    mmwwwwwwwwwwwwwwwwwwwmmm    ',
    '   mmwwwwrrrrwwwwwwwwwwwwwmm    ',
    '   mwwwwwrrrrwwwwwwwwwwwwwwm    ',
    '   mmwwwwwwwwwwwwwwwwwwwwwmm    ',
    '    mmwwwwwwwwwwwwwwwwwwwmm     ',
    '     mmmmmmmmmmmmmmmmmmmmm      ',
  ], 3);

  fromMap(scene, 'pod', [
    '  mmmm  ',
    ' myyyy m',
    'myyyyyym',
    ' myyyy m',
    '  mmmm  ',
    '   mm   ',
  ], 3);

  fromMap(scene, 'gondola', [
    '  mmmmmmmm  ',
    ' mmkkkkkkmm ',
    'mmkkwkkkwkmm',
    'mmkkkkkkkkmm',
    ' mmmmmmmmmm ',
  ], 3);

  fromMap(scene, 'smoke', [
    ' mm ',
    'mmmm',
    ' mm ',
  ], 3);

  fromMap(scene, 'fist', [
    ' ss ',
    'ssss',
    ' ss ',
  ], 3);

  fromMap(scene, 'beam', [
    'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
  ], 2);

  const btn = canvas(128, 128);
  const bctx = btn.getContext('2d');
  bctx.fillStyle = '#c44a10';
  bctx.beginPath();
  bctx.arc(64, 64, 62, 0, Math.PI * 2);
  bctx.fill();
  bctx.fillStyle = '#ff7a18';
  bctx.beginPath();
  bctx.arc(64, 60, 54, 0, Math.PI * 2);
  bctx.fill();
  bctx.fillStyle = '#ffe14a';
  bctx.beginPath();
  bctx.arc(64, 58, 46, 0, Math.PI * 2);
  bctx.fill();
  add(scene, 'btn-round', btn);

  const stick = canvas(160, 160);
  const sctx = stick.getContext('2d');
  sctx.fillStyle = 'rgba(20,24,36,0.35)';
  sctx.beginPath();
  sctx.arc(80, 80, 78, 0, Math.PI * 2);
  sctx.fill();
  sctx.strokeStyle = 'rgba(255,176,32,0.7)';
  sctx.lineWidth = 4;
  sctx.stroke();
  add(scene, 'stick-base', stick);

  const knob = canvas(72, 72);
  const kctx = knob.getContext('2d');
  kctx.fillStyle = '#ffb020';
  kctx.beginPath();
  kctx.arc(36, 36, 34, 0, Math.PI * 2);
  kctx.fill();
  kctx.fillStyle = '#ffe14a';
  kctx.beginPath();
  kctx.arc(36, 32, 20, 0, Math.PI * 2);
  kctx.fill();
  add(scene, 'stick-knob', knob);

  const pip = canvas(18, 18);
  const pctx = pip.getContext('2d');
  pctx.fillStyle = '#e23b3b';
  pctx.fillRect(0, 0, 18, 18);
  pctx.fillStyle = '#ff7a18';
  pctx.fillRect(3, 3, 12, 12);
  add(scene, 'armor', pip);

  const rocketIco = canvas(16, 24);
  const rctx = rocketIco.getContext('2d');
  rctx.fillStyle = '#f4f0e0';
  rctx.fillRect(6, 0, 4, 18);
  rctx.fillStyle = '#e23b3b';
  rctx.fillRect(4, 14, 8, 6);
  add(scene, 'rocket-ico', rocketIco);
  makeStage2(scene);
}

function makeZoneSet(scene, n, skyCols, farDraw, water) {
  const skyEl = canvas(256, 180);
  const ctx = skyEl.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0, skyCols[0]);
  g.addColorStop(0.5, skyCols[1]);
  g.addColorStop(1, skyCols[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 180);
  ctx.fillStyle = skyCols[3];
  ctx.fillRect(188, 22, 28, 28);
  add(scene, 'bg-sky-' + n, skyEl);

  const far = canvas(512, 180);
  const f = far.getContext('2d');
  f.clearRect(0, 0, 512, 180);
  farDraw(f);
  add(scene, 'bg-far-' + n, far);

  const near = canvas(512, 160);
  const nc = near.getContext('2d');
  const ng = nc.createLinearGradient(0, 0, 0, 160);
  ng.addColorStop(0, water[0]);
  ng.addColorStop(1, water[1]);
  nc.fillStyle = ng;
  nc.fillRect(0, 0, 512, 160);
  nc.fillStyle = water[2];
  for (let x = 0; x < 512; x += 18) nc.fillRect(x, 8 + (x % 36 === 0 ? 4 : 0), 12, 3);
  add(scene, 'bg-near-' + n, near);
}

function makeStage2(scene) {
  makeZoneSet(scene, 2, ['#142018', '#3a5030', '#c4a060', '#f0e0a0'], (f) => {
    f.fillStyle = '#243020';
    f.fillRect(0, 120, 512, 60);
    for (let i = 0; i < 7; i += 1) {
      const x = 20 + i * 70;
      f.fillStyle = '#6a5030';
      f.fillRect(x, 88, 52, 34);
      f.fillStyle = '#8a3030';
      f.fillRect(x - 2, 80, 56, 10);
      f.fillStyle = '#d8d0c0';
      f.fillRect(x + 8, 96, 10, 8);
    }
    f.fillStyle = '#5a5048';
    f.fillRect(460, 40, 8, 80);
    f.fillStyle = '#8a8070';
    f.beginPath();
    f.arc(464, 40, 14, 0, Math.PI * 2);
    f.fill();
  }, ['#1a3828', '#0c2418', '#6a9a55']);

  makeZoneSet(scene, 3, ['#101828', '#243858', '#e09060', '#ffe0a0'], (f) => {
    f.fillStyle = '#1a2030';
    f.fillRect(0, 100, 512, 80);
    const towers = [[30, 70, 90], [90, 40, 120], [150, 56, 80], [230, 36, 130], [290, 64, 100], [370, 48, 110], [440, 60, 86]];
    for (let i = 0; i < towers.length; i += 1) {
      const t = towers[i];
      f.fillStyle = i % 2 ? '#2a3448' : '#3a2a40';
      f.fillRect(t[0], 160 - t[2], t[1], t[2]);
      f.fillStyle = '#f0d080';
      for (let y = 160 - t[2] + 8; y < 150; y += 14) f.fillRect(t[0] + 6, y, 6, 6);
    }
  }, ['#102030', '#081420', '#3a6a90']);

  makeZoneSet(scene, 4, ['#1a2420', '#3a4038', '#a09070', '#d8d0c0'], (f) => {
    f.fillStyle = '#2a3028';
    f.fillRect(0, 90, 512, 90);
    f.fillStyle = '#4a5048';
    f.beginPath();
    f.moveTo(40, 150);
    f.lineTo(180, 48);
    f.lineTo(340, 48);
    f.lineTo(470, 150);
    f.fill();
    f.fillStyle = '#8ec8d0';
    f.fillRect(230, 70, 18, 80);
    f.fillRect(258, 86, 14, 64);
    f.fillStyle = '#6a6458';
    f.fillRect(80, 110, 40, 40);
  }, ['#243028', '#101810', '#7a8a70']);

  const maps = {
    'cargo-cake': [
      '    wwwwww    ',
      '   wwwwwwww   ',
      '    pppppp    ',
      '   pppppppp   ',
      '    yyyyyy    ',
      '   yyyyyyyy   ',
      '    cccccc    ',
      '   cccccccc   ',
      '    ssssss    ',
      '   ssssssss   ',
      '    nnnnnn    ',
    ],
    'cake-bit': [
      ' www ',
      'wwwww',
      ' www ',
    ],
    'cargo-potty': [
      '  bbbbbbbb  ',
      '  bwwwwwwb  ',
      '  bwwwwwwb  ',
      '  byyyyyyb  ',
      '  byywwyyb  ',
      '  byyyyyyb  ',
      '  bbbbbbbb  ',
      '  bb nn bb  ',
      '  bb nn bb  ',
    ],
    'cargo-pinball': [
      ' nnnnnnnnnn ',
      ' nyyyyyyynn ',
      ' nywwwwyynn ',
      ' nywrwwyynn ',
      ' nywwwwyynn ',
      ' nnyyyyyynn ',
      '  nnnnnnnn  ',
      '  nn    nn  ',
    ],
    'cargo-mailman': [
      '    ssss    ',
      '   swwwws   ',
      '   ssssbb   ',
      '   bbbbbb   ',
      '  bbyybbbb  ',
      '   bbbbbb   ',
      '   nn  nn   ',
      '  nnn  nnn  ',
    ],
    'cargo-tuba': [
      '    sss     ',
      '   swws  y  ',
      '   ssss yy  ',
      '   bbbbbyy  ',
      '    yyyyyy  ',
      '     yyyy   ',
      '   nn   nn  ',
      '   nn   nn  ',
    ],
    'cargo-mime': [
      '    ssss    ',
      '   wwwwww   ',
      '   wwwwkw   ',
      '   wwwwww   ',
      '   bbbbbb   ',
      '   bbwwbb   ',
      '   nn  nn   ',
      '  ww    ww  ',
    ],
    'cargo-mattress': [
      '  sss       ',
      ' swws wwww  ',
      ' ssssbbbbbb ',
      'wwwwwwwwwwww',
      'wrrwwrrwwrrw',
      'wwwwwwwwwwww',
      ' nnnnnnnnnn ',
    ],
    'cargo-statue': [
      '    mmmm    ',
      '   mwwwwm   ',
      '    mmmm    ',
      '   mmmmmm   ',
      '   mmMMmm   ',
      '   mmmmmm   ',
      '  mmmmmmmm  ',
      '   nnnnnn   ',
      '  nnnnnnnn  ',
    ],
    'cargo-bassboat': [
      '      sss y       ',
      '     swwsyy       ',
      '    wwwwwww       ',
      '   wwwwwwwww      ',
      ' nnnnnnnnnnnnnnnn ',
      '  tttttttttttttt  ',
      '   tt        tt   ',
    ],
    'enemy-drone': [
      '   mmmmmm   ',
      '  mmyyyymm  ',
      ' mmccccccmm ',
      '  mm kk mm  ',
      '   m    m   ',
      '   m mm m   ',
      '    m  m    ',
    ],
    'enemy-goose': [
      '    www     ',
      '   wwwww    ',
      '  wwwwww o  ',
      '   wwwwwoo  ',
      '    ww ww   ',
      '   oo   oo  ',
    ],
    'enemy-jetski': [
      '  kk    kk  ',
      '  ssssssss  ',
      '   ssbbss   ',
      ' cccccccccc ',
      'cccyyyyccccc',
      '  nn    nn  ',
    ],
    'enemy-rival': [
      '        mmmmmm        ',
      '     rrrrrrrrrrrr     ',
      '   rrryyyyrrryyrrr    ',
      '  rrrrrrrrrrrrrrrrr   ',
      '    kk        kk     ',
    ],
    'enemy-catapult': [
      '      nn        ',
      '     nnnn       ',
      '    nnnnnn      ',
      ' nnnnnnnnnnnnn  ',
      'nwwwwwwwwwwwwwn ',
      ' nnn      nnn   ',
      ' MM        MM   ',
    ],
    fridge: [
      ' wwwwwww ',
      ' wcccccw ',
      ' wcccccw ',
      ' wwwwwww ',
      ' wkkkkkw ',
      ' wkkkkkw ',
      ' wwwwwww ',
    ],
    'fridge-open': [
      ' wwwwwww ',
      ' wyyyyyw ',
      ' wyyyyyw ',
      ' wwwwwww ',
      ' wkkkkkw ',
      ' wkkkkkw ',
      ' wwwwwww ',
    ],
    'pickup-wrench': [
      '  mm    ',
      ' mmmm   ',
      '  mm    ',
      '  mm    ',
      '  mmmm  ',
      ' mmmmmm ',
    ],
    'pickup-rockets': [
      '  ww ww ',
      '  ww ww ',
      '  rr rr ',
      '  oo oo ',
      '  nn nn ',
    ],
    'pickup-bubble': [
      '  cccc  ',
      ' cwwwwc ',
      ' cwcwwc ',
      ' cwwwwc ',
      '  cccc  ',
    ],
    'pickup-horn': [
      ' y      ',
      ' yy     ',
      ' yyyy   ',
      ' yyyyyy ',
      '  yyyy  ',
    ],
    'pickup-magnet': [
      ' rr  rr ',
      ' rr  rr ',
      ' rr  rr ',
      ' rrrrrr ',
      '  rrrr  ',
    ],
    'pickup-coffee': [
      '  nnnn  ',
      ' nwwwwwn',
      ' nwnnwnn',
      ' nwwwwwn',
      '  nnnn  ',
      '   nn   ',
    ],
    crate: [
      ' nnnnnnnn ',
      ' nwwwwwwwn',
      ' nwnnnnwnn',
      ' nwwwwwwwn',
      ' nnnnnnnn ',
    ],
    'pad-trailer': [
      '  rrrrrrrrrrrrrr  ',
      ' rwwwwwwwwwwwwwwr ',
      ' rwwkkwwwwkkwwwr  ',
      ' nnnnnnnnnnnnnnnn ',
    ],
    'pad-bingo': [
      '   yyyyyyyyyyyy   ',
      '  ywwwwwwwwwwwwy  ',
      '  ywwywwwwwwywwy  ',
      ' nnnnnnnnnnnnnnnn ',
    ],
    'pad-dock': [
      ' nnnnnnnnnnnnnnnn ',
      ' n mm nn mm nn n ',
      ' nnnnnnnnnnnnnnnn ',
      '  tttttttttttttt  ',
    ],
    'pad-deck': [
      ' mmmmmmmmmmmmmmmm ',
      ' mkkmmkkmmkkmmkkm ',
      ' mmmmmmmmmmmmmmmm ',
      '  MMMM      MMMM  ',
    ],
    'pad-overpass': [
      ' mmmmmmmmmmmmmmmm ',
      ' myymmyymmyymmyym ',
      ' mmmmmmmmmmmmmmmm ',
      ' mm          mm   ',
    ],
    'pad-spill': [
      ' nnnnnnnnnnnnnnnn ',
      ' nttnnnttnnnttnnn ',
      ' cccccccccccccccc ',
      '  tttttttttttttt  ',
    ],
    'pad-tower': [
      '     mmmmmmmm     ',
      '    mwwwwwwwwm    ',
      '    mmmmmmmmmm    ',
      ' nnnnnnnnnnnnnnnn ',
    ],
    trailer: [
      '  rrrrrrrrrr  ',
      ' rwwwwwwwwwwr ',
      ' rwwkkwwwwwwr ',
      ' nnnnnnnnnnnn ',
      '  nn      nn  ',
    ],
    shack: [
      '   nnnnnnnn   ',
      '  nwwwwwwwwwn ',
      '  nwwkwwwwkwn ',
      '  nnnnnnnnnnn ',
    ],
    block: [
      ' mmmmmmmmmm ',
      ' mkkmkkmkkm ',
      ' mmmmmmmmmm ',
      ' mkkmkkmkkm ',
      ' mmmmmmmmmm ',
      ' nnnnnnnnnn ',
    ],
    towerb: [
      '   mmmm   ',
      '  mwwwwm  ',
      '  mmmmmm  ',
      '  mwwwwm  ',
      '  mmmmmm  ',
      ' nnnnnnnn ',
    ],
    damwall: [
      '     mmmmmm     ',
      '   mmmmmmmmmm   ',
      '  mmmmmmmmmmmm  ',
      ' mmccmmmmmmccmm ',
      ' nnnnnnnnnnnnnn ',
    ],
  };
  const keys = Object.keys(maps);
  for (let i = 0; i < keys.length; i += 1) fromMap(scene, keys[i], maps[keys[i]], 3);
  makeBossArt(scene);
}

function makeBossArt(scene) {
  const truck = canvas(96, 48);
  const t = truck.getContext('2d');
  t.fillStyle = '#c44a10';
  t.fillRect(8, 16, 80, 22);
  t.fillStyle = '#ff7a18';
  t.fillRect(14, 8, 28, 16);
  t.fillStyle = '#9ad8f0';
  t.fillRect(18, 11, 16, 8);
  t.fillStyle = '#1a1008';
  t.fillRect(6, 32, 16, 14);
  t.fillRect(74, 32, 16, 14);
  t.fillRect(30, 34, 14, 12);
  t.fillRect(52, 34, 14, 12);
  t.fillStyle = '#f4f0e0';
  t.fillRect(62, 18, 18, 6);
  add(scene, 'boss-truck', truck);

  const crane = canvas(64, 28);
  const c = crane.getContext('2d');
  c.fillStyle = '#ffe14a';
  c.fillRect(0, 12, 64, 6);
  c.fillRect(48, 0, 6, 28);
  c.fillStyle = '#c99212';
  c.fillRect(0, 18, 8, 8);
  add(scene, 'boss-crane', crane);

  const mag = canvas(36, 32);
  const m = mag.getContext('2d');
  m.fillStyle = '#e23b3b';
  m.fillRect(4, 4, 8, 24);
  m.fillRect(24, 4, 8, 24);
  m.fillRect(4, 4, 28, 8);
  m.fillStyle = '#ffd6a0';
  m.fillRect(12, 14, 12, 6);
  add(scene, 'boss-magnet', mag);

  const fun = canvas(48, 72);
  const f = fun.getContext('2d');
  f.fillStyle = '#8a8f9c';
  f.beginPath();
  f.moveTo(24, 4);
  f.lineTo(44, 68);
  f.lineTo(4, 68);
  f.fill();
  f.fillStyle = '#d8dce6';
  f.beginPath();
  f.moveTo(24, 12);
  f.lineTo(36, 60);
  f.lineTo(12, 60);
  f.fill();
  f.fillStyle = '#ffb020';
  f.fillRect(18, 28, 12, 12);
  add(scene, 'boss-twister', fun);

  const plate = canvas(24, 24);
  const p = plate.getContext('2d');
  p.fillStyle = '#6b3f22';
  p.fillRect(2, 2, 20, 20);
  p.fillStyle = '#c4a060';
  p.fillRect(6, 6, 12, 4);
  p.fillRect(6, 14, 12, 4);
  add(scene, 'boss-plate', plate);

  const vul = canvas(120, 48);
  const v = vul.getContext('2d');
  v.fillStyle = '#3a2a22';
  v.fillRect(10, 18, 100, 14);
  v.fillStyle = '#5a4034';
  v.fillRect(28, 8, 46, 14);
  v.fillStyle = '#e23b3b';
  v.fillRect(36, 12, 18, 6);
  v.fillStyle = '#1a1008';
  v.fillRect(0, 22, 16, 6);
  v.fillRect(104, 22, 16, 6);
  v.fillStyle = '#ffb020';
  v.fillRect(78, 20, 10, 8);
  add(scene, 'boss-vulture', vul);

  const gun = canvas(28, 16);
  const g = gun.getContext('2d');
  g.fillStyle = '#2a2418';
  g.fillRect(0, 4, 28, 8);
  g.fillStyle = '#e23b3b';
  g.fillRect(20, 2, 6, 12);
  add(scene, 'boss-vgun', gun);
}

export { drawPixelText, canvas, add };
