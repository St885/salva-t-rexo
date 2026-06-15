// src/effects/effectsConfig.js
// Single source of truth for VFX identity: timing, particle counts, shake,
// and the jurassic colour palettes. Future effects should read from here so
// they all share the same "Salva a T-REXo" visual language.
// NOTE: existing effects still hold their own values inline — migrate gradually.

export const EffectsConfig = {
  // ── Thematic palettes (jurassic identity) ──────────────────────
  palette: {
    rainbow: ['#ff4455','#ff8800','#ffdd00','#44ff88','#44aaff','#aa44ff','#ff44cc'], // energía arcoíris jurásica
    fossil:  ['#8b5e3c','#c08040','#d4a060','#6b3a1e','#a07030','#c8a060'],           // polvo fósil
    leaf:    ['#44cc44','#88ff66','#aaffaa','#22aa22','#66ee44','#99ff77'],           // hojas tropicales
    gold:    ['#ffd60a','#ff9900','#ffffff','#ffee66'],                               // chispas doradas
    egg:     ['#ffe080','#ffd040','#c0a020','#e8c060','#fff0b0','#ffe8a0'],           // cáscara fósil
    bomb:    ['#ff6622','#ff9900','#ffcc00','#ff4400','#ffe0a0','#ffffff'],           // explosión dino
    water:   ['#3aa0d0','#6cc6e8','#aee3f5','#2080b0','#88d0ec','#b8eaf8'],           // agua / tiburón
  },

  // ── Timing budgets (ms) — keep effects punchy, never block >1.5s ─
  timing: {
    rainbowTotal: 1200,  // carga + rayos + impacto
    bombTotal:    700,
    rocketTotal:  520,
    shockwave:    640,
    flash:        220,
    pop:          260,
    inputLockMax: 1500,
  },

  // ── Particle counts (desktop baseline) ─────────────────────────
  particles: {
    burst:  10,
    sparks: 10,
    smoke:  5,
    leaves: 7,
    debris: 7,
  },

  // ── Screen shake intensity (px) ────────────────────────────────
  shake: {
    soft:   4,
    medium: 7,
    strong: 11,  // mega combos — controlado
  },

  // ── Mobile reduction ───────────────────────────────────────────
  mobile: {
    breakpoint:    768,
    particleScale: 0.55,  // multiplica counts en pantallas pequeñas
    minParticles:  3,
  },
};

// Helper: reduce a particle count on small screens (matches FX._n logic)
export function mobileCount(n) {
  if (window.screen.width < EffectsConfig.mobile.breakpoint) {
    return Math.max(EffectsConfig.mobile.minParticles,
                    Math.floor(n * EffectsConfig.mobile.particleScale));
  }
  return n;
}
