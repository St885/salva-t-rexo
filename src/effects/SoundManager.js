// src/effects/SoundManager.js
// Web Audio API synthesizer — gracefully no-ops if audio is blocked or unavailable.
// Auto-arms on first user gesture.

export class SoundManager {
  static _ctx    = null;
  static _armed  = false;

  static arm() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === 'suspended') this._ctx.resume();
      this._armed = true;
    } catch { this._armed = false; }
  }

  // Oscillator with optional frequency glide
  static _osc(freq, durMs, { type = 'sine', g = 0.3, slide = null } = {}) {
    if (!this._armed || !this._ctx) return;
    try {
      const t   = this._ctx.currentTime;
      const dur = durMs / 1000;
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain); gain.connect(this._ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide != null) osc.frequency.linearRampToValueAtTime(slide, t + dur);
      gain.gain.setValueAtTime(g, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch {}
  }

  // White-noise burst
  static _noise(durMs, { g = 0.1 } = {}) {
    if (!this._armed || !this._ctx) return;
    try {
      const rate    = this._ctx.sampleRate;
      const n       = Math.ceil(rate * durMs / 1000);
      const buf     = this._ctx.createBuffer(1, n, rate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src     = this._ctx.createBufferSource();
      src.buffer    = buf;
      const gain    = this._ctx.createGain();
      src.connect(gain); gain.connect(this._ctx.destination);
      gain.gain.setValueAtTime(g, this._ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + durMs / 1000);
      src.start();
    } catch {}
  }

  // ── Named sounds ─────────────────────────────────────────────

  static rainbowCharge() {
    this._osc(220, 310, { slide: 660, type: 'triangle', g: 0.07 });
    this._osc(330, 310, { slide: 990, type: 'sine',     g: 0.05 });
    setTimeout(() => this._osc(440, 120, { slide: 880,  g: 0.04, type: 'triangle' }), 160);
  }

  static rainbowImpact() {
    [220, 330, 440, 660, 880].forEach((f, i) =>
      setTimeout(() => this._osc(f, 380, { g: 0.05, type: 'triangle' }), i * 16)
    );
    setTimeout(() => this._noise(80, { g: 0.04 }), 40);
  }

  static bombCharge() {
    this._osc(55,  200, { type: 'sawtooth', g: 0.13 });
    this._osc(80,  180, { type: 'square',   g: 0.06 });
  }

  static bombBlast() {
    this._noise(240, { g: 0.20 });
    this._osc(50,  180, { type: 'sawtooth', g: 0.15 });
    setTimeout(() => this._osc(80, 100, { type: 'square', g: 0.07 }), 60);
  }

  static megaBombBlast() {
    this._noise(320, { g: 0.26 });
    this._osc(40,  260, { type: 'sawtooth', g: 0.19 });
    setTimeout(() => this._noise(140, { g: 0.11 }), 90);
    setTimeout(() => this._osc(60, 80, { type: 'square', g: 0.08 }), 140);
  }

  static rocketLaunch() {
    this._osc(880, 160, { slide: 220, type: 'triangle', g: 0.09 });
    this._noise(180, { g: 0.08 });
  }

  static rocketSweep() {
    this._noise(270, { g: 0.10 });
    this._osc(440, 270, { slide: 200, type: 'sine', g: 0.05 });
  }

  static rocketCross() {
    this.rocketLaunch();
    setTimeout(() => this.rocketSweep(), 70);
  }

  static pteroLaunch() {
    this._osc(440, 130, { slide: 880, type: 'triangle', g: 0.07 });
    this._osc(330, 100, { slide: 660, type: 'sine',     g: 0.05 });
  }

  static pteroImpact() {
    this._noise(90, { g: 0.10 });
    this._osc(180, 90, { type: 'square', g: 0.07 });
  }

  static obstacleHit() {
    this._noise(70,  { g: 0.12 });
    this._osc(130, 70, { type: 'square', g: 0.07 });
  }

  static obstacleDestroy() {
    this._noise(120, { g: 0.15 });
    this._osc(160, 80, { slide: 80, type: 'sawtooth', g: 0.08 });
  }

  static megaCombo() {
    [220, 330, 440, 550, 660, 880].forEach((f, i) =>
      setTimeout(() => this._osc(f, 380, { g: 0.06, type: 'triangle' }), i * 26)
    );
    setTimeout(() => this._noise(130, { g: 0.09 }), 80);
  }

  static objectiveFly() {
    this._osc(880, 110, { g: 0.04, type: 'sine', slide: 1320 });
  }

  static matchPop() {
    this._osc(523, 60, { g: 0.04, type: 'sine' });
  }
}

// Auto-arm on first user touch/click — meets browser autoplay policy
document.addEventListener('pointerdown', () => SoundManager.arm(), { once: true, passive: true });
