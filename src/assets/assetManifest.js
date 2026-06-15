// src/assets/assetManifest.js
// Prepared list of future graphic/audio assets. Nothing is loaded yet —
// effects today are pure CSS/DOM + Web Audio synthesis. This manifest is the
// migration target when real art/sound is added. Paths are relative to /src/assets.

export const AssetManifest = {
  boosters: {
    bomb:       'img/boosters/bomb.png',
    rocketH:    'img/boosters/rocket-h.png',
    rocketV:    'img/boosters/rocket-v.png',
    colorBomb:  'img/boosters/color-bomb.png',
    ptero:      'img/boosters/ptero.png',
  },

  particles: {
    fossilDust: 'img/particles/fossil-dust.png',
    goldSpark:  'img/particles/gold-spark.png',
    leaf:       'img/particles/leaf.png',
    smoke:      'img/particles/smoke.png',
  },

  obstacles: {
    egg:   'img/obstacles/fossil-egg.png',
    box:   'img/obstacles/dino-box.png',
    liana: 'img/obstacles/liana.png',
  },

  audio: {
    rainbowCharge:   'sfx/rainbow-charge.mp3',
    rainbowBlast:    'sfx/rainbow-blast.mp3',
    bombCharge:      'sfx/bomb-charge.mp3',
    bombExplosion:   'sfx/bomb-explosion.mp3',
    rocketLaunch:    'sfx/rocket-launch.mp3',
    rocketSweep:     'sfx/rocket-sweep.mp3',
    comboBig:        'sfx/combo-big.mp3',
    obstacleBreak:   'sfx/obstacle-break.mp3',
  },
};
