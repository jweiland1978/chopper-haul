export class SpritePool {
  constructor(scene, key, max, depth) {
    this.scene = scene;
    this.key = key;
    this.max = max;
    this.depth = depth || 40;
    this.free = [];
    this.live = [];
    for (let i = 0; i < Math.min(16, max); i += 1) this.free.push(this._make());
  }

  _make() {
    const s = this.scene.add.image(-99, -99, this.key).setVisible(false).setActive(false).setDepth(this.depth);
    s._pool = this;
    return s;
  }

  spawn(x, y) {
    if (this.live.length >= this.max) return null;
    const s = this.free.pop() || this._make();
    s.setPosition(x, y).setVisible(true).setActive(true).setAlpha(1).setScale(1).setRotation(0).setTint(0xffffff);
    this.live.push(s);
    return s;
  }

  release(s) {
    const i = this.live.indexOf(s);
    if (i >= 0) this.live.splice(i, 1);
    s.setVisible(false).setActive(false).setPosition(-99, -99);
    this.free.push(s);
  }

  forEach(fn) {
    for (let i = this.live.length - 1; i >= 0; i -= 1) fn(this.live[i], i);
  }

  clear() {
    while (this.live.length) this.release(this.live[this.live.length - 1]);
  }
}

export class ParticlePool {
  constructor(max) {
    this.max = max;
    this.free = [];
    this.live = [];
  }

  spawn() {
    if (this.live.length >= this.max) return null;
    const p = this.free.pop() || {
      x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: 0xffffff, grav: 0, spin: 0, rot: 0,
    };
    this.live.push(p);
    return p;
  }

  update(dt, onLive) {
    for (let i = this.live.length - 1; i >= 0; i -= 1) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.live.splice(i, 1);
        this.free.push(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
      p.rot += p.spin * dt;
      onLive(p);
    }
  }
}
