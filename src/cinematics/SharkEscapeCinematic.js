// src/cinematics/SharkEscapeCinematic.js
// Brand-new layered micro-cinematic of T-REXo escaping a shark.
// Self-contained: builds its own DOM + drives all visual states.
// Public API matches the old DangerEventPanel so callers don't change.

/* ── New cartoon characters (articulated SVG groups for CSS animation) ── */

const TREXO_SVG = `<svg viewBox="0 0 76 66" xmlns="http://www.w3.org/2000/svg" style="height:100%;width:auto;display:block">
  <g class="ce-tx-tail">
    <path d="M20 38 Q9 35 3 27 Q-1 20 4 16 Q9 15 11 21 Q14 30 19 35" fill="#2e9e57"/>
    <path d="M19 36 Q10 32 6 25" stroke="#3fc874" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.6"/>
  </g>
  <g class="ce-tx-legb">
    <path d="M30 47 Q27 56 28 62" stroke="#1f7a42" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M25 62 Q23 65 26 65 M28 62 L30 65 M31 62 L34 65" stroke="#1f7a42" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <ellipse cx="33" cy="38" rx="18" ry="13" fill="#2e9e57"/>
  <ellipse cx="31" cy="36" rx="15" ry="10.5" fill="#3fc874"/>
  <ellipse cx="27" cy="30" rx="8" ry="4.5" fill="rgba(150,255,180,0.45)"/>
  <g class="ce-tx-arm">
    <path d="M40 36 Q45 39 47 43" stroke="#1f7a42" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M47 43 L44 45 M47 43 L50 45" stroke="#1f7a42" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>
  <g class="ce-tx-legf">
    <path d="M40 48 Q43 57 48 62" stroke="#268c4c" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M45 62 Q43 65 46 65 M48 62 L49 65 M51 62 L54 65" stroke="#1f7a42" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <g class="ce-tx-head">
    <path d="M44 28 Q52 17 60 14" stroke="#2e9e57" stroke-width="17" fill="none" stroke-linecap="round"/>
    <path d="M44 28 Q52 17 60 14" stroke="#3fc874" stroke-width="11" fill="none" stroke-linecap="round"/>
    <ellipse cx="62" cy="15" rx="14" ry="12" fill="#2e9e57"/>
    <ellipse cx="61" cy="14" rx="12" ry="10" fill="#3fc874"/>
    <ellipse cx="56" cy="9" rx="6.5" ry="3.5" fill="rgba(160,255,190,0.4)"/>
    <path d="M68 17 Q76 21 73 28 Q67 31 63 26" fill="#2e9e57"/>
    <path d="M68 17 Q74 21 72 27 Q67 29 64 25" fill="#3fc874"/>
    <path class="ce-tx-jaw" d="M64 25 Q70 30 74 27 L74 30 Q69 33 64 29 Z" fill="#1d6e3c"/>
    <line x1="66" y1="26" x2="66.3" y2="29.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="69" y1="27" x2="69.2" y2="30.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="71.6" y1="26.5" x2="71.6" y2="29.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="62" cy="13.5" r="7" fill="#fff"/>
    <circle class="ce-eye" cx="63.6" cy="14" r="4.4" fill="#0e2417"/>
    <circle cx="65.4" cy="12.4" r="1.7" fill="#fff"/>
    <path d="M55 7 Q62 4 68 7" stroke="#0a160e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

const SHARK_SVG = `<svg viewBox="0 0 86 52" xmlns="http://www.w3.org/2000/svg" style="height:100%;width:auto;display:block">
  <g class="ce-sk-tail">
    <path d="M8 28 Q1 16 2 8 Q7 6 9 12 Q11 20 10 27" fill="#27477f"/>
    <path d="M8 28 Q1 40 2 48 Q7 50 9 44 Q11 36 10 29" fill="#27477f"/>
  </g>
  <ellipse cx="44" cy="30" rx="36" ry="15" fill="#2b5292"/>
  <ellipse cx="40" cy="24" rx="26" ry="8" fill="#3766ad" opacity="0.8"/>
  <ellipse cx="44" cy="35" rx="30" ry="9" fill="#e6f0fb"/>
  <path d="M34 16 Q38 4 45 1 Q49 5 50 16 Z" fill="#27477f"/>
  <path d="M58 30 Q70 39 64 28 Z" fill="#27477f"/>
  <path d="M66 22 Q86 26 86 30 Q86 35 66 40 Z" fill="#2b5292"/>
  <g class="ce-sk-jaw">
    <path d="M62 33 Q74 40 84 33 L84 40 Q74 46 62 40 Z" fill="#0b1426"/>
    <path d="M62 33 Q74 40 84 33" stroke="#16243e" stroke-width="2" fill="none"/>
    <polygon points="65,34 67,39 69,34" fill="#fff"/>
    <polygon points="71,35 73,40 75,35" fill="#fff"/>
    <polygon points="77,34 79,39 81,34" fill="#fff"/>
    <polygon points="66,40 68,36 70,40" fill="#f0f5fb"/>
    <polygon points="73,41 75,37 77,41" fill="#f0f5fb"/>
  </g>
  <circle cx="70" cy="25" r="5" fill="#fff"/>
  <circle cx="71.4" cy="25.4" r="3" fill="#05050c"/>
  <circle cx="72.6" cy="24.2" r="1.1" fill="#fff"/>
  <path d="M65 21 Q70 19 75 22" stroke="#0a0f1d" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M48 24 Q47 30 48 36" stroke="#1c3666" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M43 23 Q42 30 43 37" stroke="#1c3666" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;

const MSG = {
  safe:     '¡El tiburón me sigue!',
  warning:  '¡Un poco más!',
  danger:   '¡Corre T-REXo!',
  critical: '¡Me alcanza!',
  victory:  '¡Me salvaste! 🎉',
  lose:     '¡El tiburón me alcanzó…',
};

export class SharkEscapeCinematic {
  constructor() {
    this.element = null;
    this._dist   = 46;   // 0 = shark on top of T-REXo, 100 = safe/far
    this._state  = 'safe';
  }

  createIn(container) {
    this.element = document.createElement('div');
    this.element.className = 'cine';
    this.element.innerHTML = `
      <div class="cine-scene" id="cine-scene">
        <div class="cine-sky"></div>
        <div class="cine-jungle"></div>
        <div class="cine-sun"></div>
        <div class="cine-water">
          <div class="cine-wave cw1"></div>
          <div class="cine-wave cw2"></div>
          <div class="cine-wave cw3"></div>
          <div class="cine-surface"></div>
          <div class="cine-reflection"></div>
        </div>
        <div class="cine-foam"></div>
        <div class="cine-fx" id="cine-fx"></div>
        <div class="cine-shark" id="cine-shark">
          <div class="cine-shark-wake"></div>
          ${SHARK_SVG}
        </div>
        <div class="cine-trexo" id="cine-trexo">
          <div class="cine-trexo-trail"></div>
          <div class="cine-trexo-aura" id="cine-trexo-aura"></div>
          ${TREXO_SVG}
        </div>
        <div class="cine-overlay" id="cine-overlay"></div>
        <div class="cine-bubble cinematic-bubble" id="cine-bubble">${MSG.safe}</div>
      </div>
      <div class="cine-bar"><div class="cine-bar-fill" id="cine-bar"></div></div>
    `;
    container.appendChild(this.element);
    this._apply(false);
  }

  destroy() { this.element?.remove(); this.element = null; }

  _q(s) { return this.element?.querySelector(s); }

  /* ── Layout / positioning ── */
  _apply(animate, fx = false) {
    if (!this.element) return;
    const d = this._dist;
    const shark = this._q('#cine-shark');
    const trexo = this._q('#cine-trexo');
    const bar   = this._q('#cine-bar');
    if (shark) shark.style.left = `${3 + (100 - d) * 0.34}%`;
    if (trexo) {
      trexo.style.left = `${48 + d * 0.16}%`;
      if (animate) {
        const cls = fx === 'boost' ? 'cine-trexo--boost' : 'cine-trexo--hop';
        trexo.classList.add(cls);
        setTimeout(() => trexo?.classList.remove(cls), fx === 'boost' ? 520 : 360);
      }
    }
    if (bar) bar.style.width = `${d}%`;
    if (fx === 'boost') { this._spawnBubbles(5); this._spawnSpeedLines(1); }
    else if (fx === 'match') this._spawnSpeedLines(0.4);
  }

  _move(delta, msg, fx) {
    this._dist = Math.max(0, Math.min(100, this._dist + delta));
    this._apply(true, fx);
    this._setMsg(msg, fx === 'boost' ? 'boost' : false);
  }

  /* ── Speech bubble ── */
  _setMsg(msg, state = false) {
    const el = this._q('#cine-bubble');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('cinematic-bubble-pop', 'cinematic-bubble-danger', 'cinematic-bubble-boost');
    void el.offsetWidth;
    el.classList.add('cinematic-bubble-pop');
    if (state === 'danger') el.classList.add('cinematic-bubble-danger');
    else if (state === 'boost') el.classList.add('cinematic-bubble-boost');
    setTimeout(() => el?.classList.remove('cinematic-bubble-pop'), 420);
  }

  setMessage(msg, state = false) { this._setMsg(msg, state); }

  /* ── FX helpers (all self-cleaning) ── */
  _spawnBubbles(n = 5, originSel = '#cine-shark') {
    const host = this._q('#cine-fx');
    const src  = this._q(originSel);
    if (!host || !src) return;
    const isMobile = window.screen.width < 768;
    const count = isMobile ? Math.max(2, Math.floor(n * 0.6)) : n;
    const bx = parseFloat(src.style.left || '20');
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div');
      b.className = 'cinematic-bubble-fx';
      b.style.left   = `${(bx + (Math.random() - 0.5) * 8).toFixed(1)}%`;
      b.style.bottom = `${(14 + Math.random() * 26).toFixed(0)}px`;
      const s = 3 + Math.floor(Math.random() * 5);
      b.style.width = b.style.height = `${s}px`;
      b.style.animationDelay = `${Math.floor(Math.random() * 120)}ms`;
      host.appendChild(b);
      setTimeout(() => b.remove(), 1500);
    }
  }

  _splash(originSel = '#cine-shark') {
    const host = this._q('#cine-fx');
    const src  = this._q(originSel);
    if (!host || !src) return;
    const sp = document.createElement('div');
    sp.className = 'cinematic-splash';
    sp.style.left = `${parseFloat(src.style.left || '20')}%`;
    host.appendChild(sp);
    setTimeout(() => sp.remove(), 600);
    this._spawnBubbles(6, originSel);
  }

  _spawnSpeedLines(intensity = 1) {
    const host  = this._q('#cine-fx');
    const trexo = this._q('#cine-trexo');
    if (!host || !trexo) return;
    const bx = parseFloat(trexo.style.left || '55');
    const count = Math.round(2 + intensity * 3);
    for (let i = 0; i < count; i++) {
      const sl = document.createElement('div');
      sl.className = 'cinematic-speedline';
      sl.style.top  = `${(30 + Math.random() * 40).toFixed(0)}%`;
      sl.style.left = `${(bx - 5 - Math.random() * 14).toFixed(1)}%`;
      sl.style.setProperty('--sl-len', `${Math.round(16 + Math.random() * 26 * intensity)}px`);
      sl.style.animationDelay = `${Math.floor(Math.random() * 80)}ms`;
      host.appendChild(sl);
      setTimeout(() => sl.remove(), 440);
    }
  }

  _spawnLeaves() {
    const host = this._q('#cine-fx');
    if (!host) return;
    for (let i = 0; i < 5; i++) {
      const lf = document.createElement('div');
      lf.className = 'cinematic-leaf';
      lf.textContent = '🍃';
      lf.style.left = `${(10 + Math.random() * 30).toFixed(0)}%`;
      lf.style.animationDelay = `${i * 70}ms`;
      host.appendChild(lf);
      setTimeout(() => lf.remove(), 900);
    }
  }

  _aura() {
    const a = this._q('#cine-trexo-aura');
    if (!a) return;
    a.classList.remove('cine-aura--on');
    void a.offsetWidth;
    a.classList.add('cine-aura--on');
    setTimeout(() => a?.classList.remove('cine-aura--on'), 800);
  }

  _stun() {
    const sk = this._q('#cine-shark');
    if (!sk) return;
    sk.classList.add('cinematic-shark-stunned');
    setTimeout(() => sk?.classList.remove('cinematic-shark-stunned'), 950);
  }

  _bombWave() {
    const sk = this._q('#cine-shark');
    if (sk) { sk.classList.add('cinematic-shark-recoil'); setTimeout(() => sk?.classList.remove('cinematic-shark-recoil'), 620); }
    this._splash('#cine-shark');
  }

  _flash() {
    const o = this._q('#cine-overlay');
    if (!o) return;
    o.classList.add('cine-overlay--flash');
    setTimeout(() => o?.classList.remove('cine-overlay--flash'), 420);
  }

  _rainbowFlash() {
    const o = this._q('#cine-overlay');
    if (!o) return;
    o.classList.remove('cine-overlay--rainbow');
    void o.offsetWidth;
    o.classList.add('cine-overlay--rainbow');
    setTimeout(() => o?.classList.remove('cine-overlay--rainbow'), 700);
  }

  _cameraShake(level = 'soft') {
    const sc = this._q('#cine-scene');
    if (!sc) return;
    const cls = level === 'strong' ? 'cine-cam--strong' : 'cine-cam--soft';
    sc.classList.remove(cls);
    void sc.offsetWidth;
    sc.classList.add(cls);
    setTimeout(() => sc?.classList.remove(cls), level === 'strong' ? 460 : 380);
  }

  /* ── Public reactions (same names as old panel) ── */
  onMatch()    { this._move(+7,  MSG.safe, 'match'); }
  onBooster()  { this._move(+16, '¡Qué potencia!', 'boost'); }
  onLowMoves() { this._setMsg('¡Pocos movimientos!', 'danger'); }

  onRocket()    { this._spawnSpeedLines(1.3); this._move(+22, '¡Velocidad Rex! 🚀', 'boost'); }
  onBomb()      { this._bombWave(); this._move(+15, '¡Boom jurásico! 💥', 'boost'); }
  onColorBomb() { this._aura(); this._rainbowFlash(); this._stun(); this._move(+18, '¡Energía Rex Arcoíris! 🌈', 'boost'); }
  onPtero()     { this._spawnLeaves(); this._move(+14, '¡Ataque aéreo! 🦅', 'boost'); }
  onMegaCombo() { this._bombWave(); this._flash(); this._cameraShake('strong'); this._move(+30, '¡Súper combo Rex! 🔥', 'boost'); }

  onJurassicTotal() { this._aura(); this._rainbowFlash(); this._stun(); this._cameraShake('strong'); this._move(+40, '¡Poder jurásico total! 🌈', 'boost'); }
  onRainbowBomb()   { this._aura(); this._bombWave(); this._flash(); this._move(+26, '¡Lluvia explosiva Rex! 💥🌈', 'boost'); }
  onRainbowRocket() { this._aura(); this._spawnSpeedLines(1.4); this._move(+28, '¡Lluvia de cohetes Rex! 🚀🌈', 'boost'); }
  onBandada()       { this._spawnLeaves(); this._aura(); this._move(+26, '¡Bandada Rex! 🦅', 'boost'); }

  onWin()  { this._dist = 100; this._apply(true, 'boost'); this._q('#cine-trexo')?.classList.add('cine-trexo--win'); this._setOverlay('win'); this._setMsg(MSG.victory, 'boost'); }
  onLose() { this._dist = 0;   this._apply(true); this._setOverlay('danger'); this._setMsg(MSG.lose, 'danger'); }

  onTimePressure(pct) {
    if (!this.element) return;
    if (pct < 0.5) {
      const delta = pct < 0.15 ? -2.4 : pct < 0.3 ? -1.0 : -0.4;
      this._dist = Math.max(0, this._dist + delta);
      this._apply(false);
    }
    const overlay = this._q('#cine-overlay');
    if (overlay?.classList.contains('cine-overlay--win')) return;
    const st = pct > 0.6 ? 'safe' : pct > 0.3 ? 'warning' : pct > 0.15 ? 'danger' : 'critical';
    this._state = st;
    const sc = this._q('#cine-scene');
    const sk = this._q('#cine-shark');
    if (sc) {
      sc.classList.toggle('cine--warning',  st === 'warning');
      sc.classList.toggle('cine--danger',   st === 'danger');
      sc.classList.toggle('cine--critical', st === 'critical');
    }
    sk?.classList.toggle('cinematic-shark-attack', st === 'danger' || st === 'critical' || this._dist < 22);
    if (st === 'warning') this._spawnBubbles(3);
  }

  _setOverlay(state) {
    const o  = this._q('#cine-overlay');
    const sc = this._q('#cine-scene');
    if (!o) return;
    o.classList.remove('cine-overlay--danger', 'cine-overlay--win');
    sc?.classList.remove('cine--warning', 'cine--danger', 'cine--critical');
    if (state === 'win')    o.classList.add('cine-overlay--win');
    if (state === 'danger') o.classList.add('cine-overlay--danger');
  }

  reactToBooster(type) {
    switch (type) {
      case 'color-bomb': case 'rainbow':              return this.onColorBomb();
      case 'bomb':                                    return this.onBomb();
      case 'rocket-h': case 'rocket-v': case 'rocket':return this.onRocket();
      case 'ptero': case 'flying': case 'eagle':      return this.onPtero();
      case 'combo': case 'mega':                      return this.onMegaCombo();
      default:                                        return this.onBooster();
    }
  }

  // Force a fixed visual state for quick testing (debug only)
  debugState(state) {
    if (!this.element) return;
    const m = {
      safe:     () => { this._dist = 60; this._apply(false); this.onTimePressure(0.8); this._setMsg(MSG.safe); },
      warning:  () => { this._dist = 38; this._apply(false); this.onTimePressure(0.45); this._setMsg(MSG.warning, 'danger'); },
      danger:   () => { this._dist = 22; this._apply(false); this.onTimePressure(0.22); this._setMsg(MSG.danger, 'danger'); },
      critical: () => { this._dist = 10; this._apply(false); this.onTimePressure(0.1); this._cameraShake('soft'); this._setMsg(MSG.critical, 'danger'); },
      rainbow:  () => this.onColorBomb(),
      bomb:     () => this.onBomb(),
      rocket:   () => this.onRocket(),
      flying:   () => this.onPtero(),
      combo:    () => this.onMegaCombo(),
      victory:  () => this.onWin(),
    };
    (m[state] || m.safe)();
  }
}
