// src/effects/EffectsManager.js
// Reusable DOM-based visual effects. All methods static — no instantiation needed.

const C_RAINBOW = ['#ff4455','#ff8800','#ffdd00','#44ff88','#44aaff','#aa44ff','#ff44cc'];
const C_BOMB    = ['#ff6622','#ff9900','#ffcc00','#ff4400','#ffe0a0','#ffffff'];
const C_DEBRIS  = ['#8b5e3c','#c08040','#d4a060','#6b3a1e','#a07030','#c8a060'];
const C_LIANA   = ['#44cc44','#88ff66','#aaffaa','#22aa22','#66ee44','#99ff77'];
const C_EGG     = ['#ffe080','#ffd040','#c0a020','#e8c060','#fff0b0','#ffe8a0'];
const C_SPARKS  = ['#ffd60a','#ff9900','#ffffff','#ffee66'];

export class FX {

  static _gc(el, ms) { setTimeout(() => el?.remove(), ms); }

  // Mobile: reduce particle counts on small/low-power screens
  static get _M() { return window.screen.width < 768; }
  static _n(n)    { return this._M ? Math.max(3, Math.floor(n * 0.55)) : n; }

  // ── Core primitives ──────────────────────────────────────────

  // Generic particle burst at (cx, cy) within host element
  static burst(host, cx, cy, {
    count  = 8,
    colors = C_RAINBOW,
    minR   = 22,
    maxR   = 50,
    minSz  = 5,
    maxSz  = 9,
    dur    = 520,
  } = {}) {
    const c = this._n(count);
    for (let i = 0; i < c; i++) {
      const p = document.createElement('div');
      p.className = 'fx-particle';
      const a = (i / c) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const r = minR + Math.random() * (maxR - minR);
      const s = minSz + Math.floor(Math.random() * (maxSz - minSz + 1));
      p.style.cssText = [
        `left:${cx}px`, `top:${cy}px`,
        `width:${s}px`, `height:${s}px`,
        `background:${colors[i % colors.length]}`,
        `--tx:${(Math.cos(a)*r).toFixed(1)}px`,
        `--ty:${(Math.sin(a)*r).toFixed(1)}px`,
        `animation-delay:${i*11}ms`,
        `animation-duration:${dur}ms`,
      ].join(';');
      host.appendChild(p);
      this._gc(p, dur + i * 11 + 80);
    }
  }

  // Fire sparks flying outward
  static sparks(host, cx, cy, {
    count = 10,
    colors = C_SPARKS,
    dur   = 400,
  } = {}) {
    const c = this._n(count);
    for (let i = 0; i < c; i++) {
      const el = document.createElement('div');
      el.className = 'fx-spark';
      const a = (i / c) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const r = 22 + Math.random() * 50;
      el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--tx:${(Math.cos(a)*r).toFixed(1)}px;--ty:${(Math.sin(a)*r).toFixed(1)}px;--sa:${(a*180/Math.PI).toFixed(0)}deg;animation-delay:${i*9}ms;animation-duration:${dur}ms`;
      host.appendChild(el);
      this._gc(el, dur + i * 9 + 60);
    }
  }

  // Smoke puffs rising from position
  static smoke(host, cx, cy, {
    count = 5,
    dur   = 700,
    color = 'rgba(180,160,140,0.6)',
  } = {}) {
    const c = this._n(count);
    for (let i = 0; i < c; i++) {
      const el = document.createElement('div');
      el.className = 'fx-smoke';
      const dx  = (Math.random() - 0.5) * 28;
      const dy  = -(18 + Math.random() * 28);
      const sz  = 10 + Math.floor(Math.random() * 14);
      el.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;background:${color};--tx:${dx.toFixed(1)}px;--ty:${dy.toFixed(1)}px;animation-delay:${i*48}ms;animation-duration:${dur}ms`;
      host.appendChild(el);
      this._gc(el, dur + i * 48 + 80);
    }
  }

  // Leaf particles (for lianas / ptero)
  static leaves(host, cx, cy, {
    count  = 7,
    colors = C_LIANA,
    dur    = 550,
  } = {}) {
    const c = this._n(count);
    for (let i = 0; i < c; i++) {
      const el = document.createElement('div');
      el.className = 'fx-leaf';
      const a   = (i / c) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const r   = 16 + Math.random() * 38;
      const rot = Math.floor(Math.random() * 360);
      el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--tx:${(Math.cos(a)*r).toFixed(1)}px;--ty:${(Math.sin(a)*r).toFixed(1)}px;--lrot:${rot}deg;animation-delay:${i*28}ms;animation-duration:${dur}ms`;
      host.appendChild(el);
      this._gc(el, dur + i * 28 + 80);
    }
  }

  // Debris burst from a tile element
  static debris(host, tileEl, { count = 7, colors = C_DEBRIS, dur = 450 } = {}) {
    if (!host || !tileEl) return;
    const hR = host.getBoundingClientRect();
    const tR = tileEl.getBoundingClientRect();
    this.burst(host,
      tR.left + tR.width  / 2 - hR.left,
      tR.top  + tR.height / 2 - hR.top,
      { count, colors, minR: 12, maxR: 30, minSz: 4, maxSz: 8, dur }
    );
  }

  // ── Specialized effects ──────────────────────────────────────

  // Orbiting particles around (cx, cy) — returns elements for manual cleanup
  static spawnOrbiters(host, cx, cy, {
    count  = 3,
    radius = 30,
    dur    = 350,
    colors = ['#ff88cc','#88ffcc','#88aaff'],
  } = {}) {
    const els = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'fx-orbiter';
      const phase = (i / count * 360).toFixed(0);
      el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};color:${colors[i%colors.length]};--phase:${phase}deg;--orb-r:${radius}px;animation-duration:${dur}ms`;
      host.appendChild(el);
      els.push(el);
    }
    return els;
  }

  // Pulsing danger ring (pre-bomb warning)
  static warningRing(host, cx, cy, { dur = 400 } = {}) {
    const el = document.createElement('div');
    el.className = 'fx-warning-ring';
    el.style.cssText = `left:${cx}px;top:${cy}px;animation-duration:${dur}ms`;
    host.appendChild(el);
    this._gc(el, dur + 60);
  }

  // Expanding multi-ring shockwave
  static multiRing(host, cx, cy, {
    rings = 2,
    color = 'rgba(255,140,0,1)',
    dur   = 640,
  } = {}) {
    for (let i = 0; i < rings; i++) {
      const el = document.createElement('div');
      el.className = 'fx-multi-ring';
      el.style.cssText = `left:${cx}px;top:${cy}px;--mr-color:${color};animation-duration:${dur}ms;animation-delay:${i * 90}ms`;
      host.appendChild(el);
      this._gc(el, dur + i * 90 + 80);
    }
  }

  // Glowing beam across row (isH=true) or column
  static rocketBeam(host, tileEl, isH, { color = '#ffd60a', dur = 260 } = {}) {
    if (!host || !tileEl) return;
    const hR = host.getBoundingClientRect();
    const tR = tileEl.getBoundingClientRect();
    const cx = tR.left + tR.width  / 2 - hR.left;
    const cy = tR.top  + tR.height / 2 - hR.top;
    const el = document.createElement('div');
    el.className = isH ? 'fx-rocket-beam-h' : 'fx-rocket-beam-v';
    const span = (isH ? hR.width : hR.height).toFixed(0);
    el.style.cssText = `left:${cx}px;top:${cy}px;--span:${span}px;--rc:${color};animation-duration:${dur}ms`;
    host.appendChild(el);
    this._gc(el, dur + 80);
  }

  // Moving rocket head/projectile crossing the row/column
  static rocketHead(host, fromEl, isH, { color = '#ffffff', dur = 200 } = {}) {
    if (!host || !fromEl) return;
    const hR = host.getBoundingClientRect();
    const fR = fromEl.getBoundingClientRect();
    const cx = fR.left + fR.width  / 2 - hR.left;
    const cy = fR.top  + fR.height / 2 - hR.top;
    // Two heads: one going each direction
    for (const dir of [1, -1]) {
      const el = document.createElement('div');
      el.className = isH ? 'fx-rocket-head-h' : 'fx-rocket-head-v';
      el.style.cssText = `left:${cx}px;top:${cy}px;--rc:${color};--rdir:${dir};animation-duration:${dur}ms`;
      host.appendChild(el);
      this._gc(el, dur + 60);
    }
  }

  // Animated ptero emoji flying from fromEl to toEl
  static pteroFlight(host, fromEl, toEl, { emoji = '🦅', dur = 300 } = {}) {
    if (!host || !fromEl || !toEl) return;
    const hR = host.getBoundingClientRect();
    const fR = fromEl.getBoundingClientRect();
    const tR = toEl.getBoundingClientRect();
    const fx = fR.left + fR.width  / 2 - hR.left;
    const fy = fR.top  + fR.height / 2 - hR.top;
    const el = document.createElement('div');
    el.className = 'fx-ptero-flight';
    el.textContent = emoji;
    el.style.cssText = `left:${fx}px;top:${fy}px;--tx:${(tR.left+tR.width/2-hR.left-fx).toFixed(1)}px;--ty:${(tR.top+tR.height/2-hR.top-fy).toFixed(1)}px;animation-duration:${dur}ms`;
    host.appendChild(el);
    this._gc(el, dur + 80);
  }

  // Shake+flash a tile (obstacle hit, not destroyed)
  static tileHit(el) {
    if (!el) return;
    el.classList.remove('fx-tile-hit');
    void el.offsetWidth;
    el.classList.add('fx-tile-hit');
    setTimeout(() => el?.classList.remove('fx-tile-hit'), 340);
  }

  // Full-board combo flash overlay
  static comboFlash(host, { color = 'rgba(255,200,80,0.45)', dur = 260 } = {}) {
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'fx-combo-flash';
    el.style.cssText = `background:radial-gradient(ellipse at center,${color} 0%,transparent 72%);animation-duration:${dur}ms`;
    host.appendChild(el);
    this._gc(el, dur + 60);
  }

  // Mini icon flies from tileEl to HUD counter (fixed positioning on body)
  static objectiveFly(tileEl, icon, hudId, { dur = 480 } = {}) {
    const toEl = document.getElementById(hudId);
    if (!tileEl || !toEl) return;
    const fR = tileEl.getBoundingClientRect();
    const tR = toEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'fx-objective-fly';
    el.textContent = icon;
    el.style.cssText = `left:${fR.left+fR.width/2}px;top:${fR.top+fR.height/2}px;--tx:${(tR.left+tR.width/2-fR.left-fR.width/2).toFixed(0)}px;--ty:${(tR.top+tR.height/2-fR.top-fR.height/2).toFixed(0)}px;animation-duration:${dur}ms`;
    document.body.appendChild(el);
    this._gc(el, dur + 60);
    setTimeout(() => this.hudBounce(toEl), dur - 40);
  }

  // HUD counter bounce after objective completes
  static hudBounce(el) {
    if (!el) return;
    el.classList.remove('fx-hud-bounce');
    void el.offsetWidth;
    el.classList.add('fx-hud-bounce');
    setTimeout(() => el?.classList.remove('fx-hud-bounce'), 400);
  }

  // ── v4 premium layers ────────────────────────────────────────

  // Bright central bloom flash (impacts / combos)
  static flash(host, cx, cy, { color = '#ffd60a', dur = 360, size = 1 } = {}) {
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'fx-flash';
    el.style.cssText = `left:${cx}px;top:${cy}px;width:${(24*size)|0}px;height:${(24*size)|0}px;--fc:${color};--dur:${dur}ms`;
    host.appendChild(el);
    this._gc(el, dur + 60);
  }

  // Large rotating multicolour charge aura (rainbow pre-blast)
  static aura(host, cx, cy, { dur = 440, size = 1 } = {}) {
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'fx-aura';
    el.style.cssText = `left:${cx}px;top:${cy}px;width:${(44*size)|0}px;height:${(44*size)|0}px;--dur:${dur}ms`;
    host.appendChild(el);
    this._gc(el, dur + 60);
  }

  // Sequential pre-vanish glow over a set of tile elements
  static glowTiles(tileEls, { stagger = 22, dur = 340 } = {}) {
    tileEls.forEach((el, i) => {
      if (!el) return;
      el.style.setProperty('--g-delay', `${i * stagger}ms`);
      el.classList.remove('fx-target-glow');
      void el.offsetWidth;
      el.classList.add('fx-target-glow');
      setTimeout(() => el?.classList.remove('fx-target-glow'), dur + i * stagger + 40);
    });
  }

  // Board shake helper — level: 'soft' | 'strong'
  static shake(gridEl, level = 'soft') {
    if (!gridEl) return;
    const cls = level === 'strong' ? 'board-shake-strong' : 'board-shake';
    gridEl.classList.remove(cls);
    void gridEl.offsetWidth;
    gridEl.classList.add(cls);
    setTimeout(() => gridEl?.classList.remove(cls), level === 'strong' ? 460 : 380);
  }

  // Palette accessors (used by LevelScene)
  static get C_RAINBOW() { return C_RAINBOW; }
  static get C_BOMB()    { return C_BOMB;    }
  static get C_DEBRIS()  { return C_DEBRIS;  }
  static get C_LIANA()   { return C_LIANA;   }
  static get C_EGG()     { return C_EGG;     }
  static get C_SPARKS()  { return C_SPARKS;  }
}
