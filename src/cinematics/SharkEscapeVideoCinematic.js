// src/cinematics/SharkEscapeVideoCinematic.js
// Premium micro-cinematic: optional local video background + CSS overlays.
//
// MODE A — local video (assets/videos/shark-trexo-chase.webm|mp4) loads:
//   the video covers the scene and all overlays/FX sit on top of it.
// MODE B — no video / load fails:
//   transparently falls back to the CSS cinematic (SharkEscapeCinematic).
//
// It extends SharkEscapeCinematic, so EVERY existing reaction still works
// (distance bar, message bubble, booster FX, timer states). Those FX layers
// (.cine-fx z6, .cine-overlay z7, .cine-bubble z8) already render ABOVE the
// video (z5), so they double as "overlays over the video" for free.
// Public API is unchanged — callers (LevelScene / DangerEventPanel) don't change.

import { SharkEscapeCinematic } from './SharkEscapeCinematic.js';
import { GameConfig } from '../config/gameConfig.js';

const VIDEO_BASE = 'assets/videos/shark-trexo-chase';

export class SharkEscapeVideoCinematic extends SharkEscapeCinematic {
  constructor() {
    super();
    this.videoActive = false;
    this._video = null;
    this._loadTimer = null;
    this._forced = false;
  }

  createIn(container) {
    // Build the full CSS scene first — this is the always-present fallback.
    super.createIn(container);
    if (!this.element) return;
    this.element.classList.add('shark-video-cinematic');

    const scene = this._q('#cine-scene');
    if (!scene) return;

    // Video layer (z5) + premium overlays. Hidden until the video confirms load.
    const wrap = document.createElement('div');
    wrap.className = 'shark-video-layer';
    wrap.innerHTML = `
      <video class="shark-cinematic-video" autoplay loop muted playsinline preload="auto">
        <source src="${VIDEO_BASE}.webm" type="video/webm">
        <source src="${VIDEO_BASE}.mp4" type="video/mp4">
      </video>
      <div class="shark-video-overlay" id="sv-overlay"></div>
      <div class="shark-video-fx-layer" id="sv-fx"></div>`;
    scene.appendChild(wrap);

    this._video = wrap.querySelector('video');
    this._bindVideo();

    if (GameConfig?.debug?.DEBUG_FORCE_VIDEO_CINEMATIC) this._forceVideo();
  }

  /* ── Video load / fallback handling (never throws, never breaks the game) ── */
  _bindVideo() {
    const v = this._video;
    if (!v) return;
    const ok   = () => this._activateVideo();
    const fail = () => this._fallback();
    v.addEventListener('loadeddata', ok,   { once: true });
    v.addEventListener('canplay',    ok,   { once: true });
    v.addEventListener('error',      fail, { once: true });
    // <source> failures don't reliably bubble to the video element — guard with a timeout.
    this._loadTimer = setTimeout(() => { if (!this.videoActive) this._fallback(); }, 1600);
    try { v.load(); } catch (_) { /* ignore */ }
  }

  _activateVideo() {
    if (this.videoActive || !this.element || !this._video) return;
    if (this._video.readyState < 2 && !this._forced) return; // no real data yet
    this.videoActive = true;
    clearTimeout(this._loadTimer);
    this.element.classList.add('has-video');
    this._video.play?.().catch(() => {}); // autoplay may be deferred; that's fine
  }

  _forceVideo() {
    this._forced = true;
    this.element?.classList.add('has-video');
    this._video?.play?.().catch(() => {});
  }

  _fallback() {
    if (this._forced) return;            // debug force keeps the layer on
    this.videoActive = false;
    this.element?.classList.remove('has-video'); // CSS scene shows through
  }

  /* ── Full-panel premium FX over the video ── */
  _videoFx(cls, ms = 700) {
    const host = this._q('#sv-fx');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `shark-video-fx ${cls}`;
    host.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  /* ── Booster reactions: keep parent behaviour, add cinematic video overlay ── */
  onColorBomb() { super.onColorBomb(); this._videoFx('shark-video-rainbow-fx', 820); }
  onBomb()      { super.onBomb();      this._videoFx('shark-video-bomb-fx',    720); }
  onRocket()    { super.onRocket();    this._videoFx('shark-video-rocket-fx',  620); }
  onPtero()     { super.onPtero();     this._videoFx('shark-video-flying-fx',  820); }
  onMegaCombo() { super.onMegaCombo(); this._videoFx('shark-video-combo-fx',   720); }

  /* ── Timer states: drive the video ambient overlay (parent already shakes scene) ── */
  onTimePressure(pct) {
    super.onTimePressure(pct);
    if (this._q('#cine-overlay')?.classList.contains('cine-overlay--win')) return;
    const st = pct > 0.6 ? 'safe' : pct > 0.3 ? 'warning' : pct > 0.15 ? 'danger' : 'critical';
    const o = this._q('#sv-overlay');
    if (o) o.className = `shark-video-overlay cinematic-${st}`;
  }

  debugState(state) {
    super.debugState(state);
    // Refresh the video ambient overlay for fixed-state previews.
    const map = { safe: 0.8, warning: 0.45, danger: 0.22, critical: 0.1 };
    if (state in map) this.onTimePressure(map[state]);
  }

  destroy() {
    clearTimeout(this._loadTimer);
    try { this._video?.pause?.(); } catch (_) { /* ignore */ }
    this._video = null;
    super.destroy();
  }
}
