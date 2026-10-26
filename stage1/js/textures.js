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
}

export { drawPixelText, canvas, add };
