const Phaser = globalThis.Phaser;

if (!Phaser) {
  throw new Error('Phaser 3 failed to load from lib/phaser.min.js');
}

export default Phaser;
