import { Board }           from '../match3/Board.js';
import { MatchDetector }   from '../match3/MatchDetector.js';
import { LevelObjectives } from '../match3/LevelObjectives.js';
import { TILE_COLORS }     from '../match3/Tile.js';
import { TRexo }           from '../characters/TRexo.js';
import { GameConfig }          from '../config/gameConfig.js';
import { DangerEventPanel }    from './DangerEventPanel.js';
import { addFragment }                    from '../utils/dinoStorage.js';
import { getInventory, saveInventory, addCoins } from '../utils/storage.js';
import { FX }           from '../effects/EffectsManager.js';
import { SoundManager } from '../effects/SoundManager.js';

const POINTS_PER_TILE = 10;
const TARGET_SCORE    = 1500;
const MAX_MOVES       = 30;
const EGG_COUNT       = 10;
const BOX_COUNT       = 8;
const LIANA_COUNT     = 6;
const SWAP_MS         = 140;
const POP_MS          = 220;
const FALL_MS         = 190;
const SHAKE_MS        = 240;
const DRAG_THRESHOLD  = 22;
const ROCKET_BONUS        = 60;
const BOMB_BONUS          = 80;
const DOUBLE_BOMB_BONUS   = 220;
const CROSS_BONUS         = 140;
const PTERO_BOMB_BONUS    = 120;
const DOUBLE_PTERO_BONUS  = 160;
const LEVEL_TIME         = GameConfig.gameplay?.levelTimeSeconds ?? 60;

export class LevelScene {
  constructor(container, onBack, onDinoPark = null) {
    this.container  = container;
    this.onBack     = onBack;
    this.onDinoPark = onDinoPark;
    this.element    = null;
    this.selected   = null;
    this.busy       = false;
    this._drag      = null;
  }

  // ── Lifecycle ─────────────────────────────────────

  create() {
    this.board          = new Board(8, 8);
    this.detector       = new MatchDetector(this.board);
    this.objectives     = new LevelObjectives({ targetScore: TARGET_SCORE, maxMoves: MAX_MOVES, eggsRequired: EGG_COUNT, boxesRequired: BOX_COUNT, lianaRequired: LIANA_COUNT });
    this._lianasBrokenThisTurn = [];
    this._rewardGiven  = false;
    this._wonBooster   = null;
    this.trexo          = new TRexo();
    this.selected       = null;
    this.busy           = false;
    this._drag          = null;
    this._lowMovesAlert = false;
    this._timeLeft      = LEVEL_TIME;
    this._timerInterval = null;
    this._gameEnded     = false;

    this.board.init();
    if (GameConfig.debug?.DEBUG_TEST_ALL_BOOSTERS)  this._injectBoosterPairs();
    else if (GameConfig.debug?.DEBUG_TEST_TWO_BOOSTERS) this._injectTwoBoosters();
    else if (GameConfig.debug?.startingBoosters)    this._injectStartingBoosters();
    this._injectFossilEggs();
    this._injectDinoCrates();
    this._injectLianas();
    this._injectPendingBoosters();

    this.element = document.createElement('div');
    this.element.className = 'scene scene-level';
    this.element.innerHTML = this._buildHTML();
    this.container.appendChild(this.element);

    this.trexo.createIn(this.element.querySelector('#trexo-container'));
    this.dangerPanel = new DangerEventPanel();
    this.dangerPanel.createIn(this.element.querySelector('#dep-container'));
    if (GameConfig.debug?.DEBUG_CINEMATIC)
      setTimeout(() => this.dangerPanel?.debugState?.(GameConfig.debug.DEBUG_CINEMATIC_STATE), 500);
    else if (GameConfig.debug?.DEBUG_DANGER_SCENE)
      setTimeout(() => this.dangerPanel?.debugState?.(GameConfig.debug.DEBUG_DANGER_STATE), 500);

    this._boundMouseMove = (e) => this._onDragMove(e);
    this._boundMouseUp   = (e) => this._onDragEnd(e);
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup',   this._boundMouseUp);

    this._bindEvents();
    this._renderBoard();
    this._updateHUD();
    setTimeout(() => this.trexo?.react('start'), 400);
    this._startTimer();
  }

  destroy() {
    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove);
      document.removeEventListener('mouseup',   this._boundMouseUp);
      this._boundMouseMove = null;
      this._boundMouseUp   = null;
    }
    clearInterval(this._timerInterval);
    this._timerInterval = null;
    this.dangerPanel?.destroy();
    this.dangerPanel = null;
    this.trexo?.destroy();
    this.element?.remove();
    this.element = null;
    this.trexo   = null;
    this._drag   = null;
  }

  // ── HTML ──────────────────────────────────────────

  _buildHTML() {
    return `
      <div class="hud-card">
        <div class="level-topbar">
          <div class="topbar-left">
            <div class="topbar-panel">
              <div class="topbar-panel-header">
                <button class="topbar-back-btn" id="btn-back-level" title="Menú">&#8592;</button>
                <span class="topbar-panel-title">Objetivo</span>
              </div>
              <div class="topbar-obj-row">
                <span class="topbar-obj-icon">🥚</span>
                <span id="egg-count" class="topbar-obj-count">0/${EGG_COUNT}</span>
              </div>
              <div class="topbar-obj-row">
                <span class="topbar-obj-icon">📦</span>
                <span id="box-count" class="topbar-obj-count">0/${BOX_COUNT}</span>
              </div>
              <div class="topbar-obj-row">
                <span class="topbar-obj-icon">🌿</span>
                <span id="liana-count" class="topbar-obj-count">0/${LIANA_COUNT}</span>
              </div>
            </div>
          </div>
          <div class="topbar-center" id="trexo-container"></div>
          <div class="topbar-right">
            <div class="topbar-panel topbar-panel--split">
              <div class="topbar-split-row">
                <span class="topbar-panel-title">Pasos</span>
                <span id="moves-value" class="topbar-moves-num">${MAX_MOVES}</span>
              </div>
              <div class="topbar-divider"></div>
              <div class="topbar-split-row">
                <span class="topbar-panel-title">&#9201;</span>
                <span id="time-value" class="topbar-time-num">${LEVEL_TIME}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="score-bar-wrapper">
          <div class="score-bar" id="score-bar" style="width:0%"></div>
        </div>
        <div id="dep-container"></div>
      </div>
      <div class="board-area">
        <div class="board-grid" id="board-grid"></div>
      </div>
      <div class="game-overlay hidden" id="game-overlay">
        <div class="overlay-box">
          <div class="overlay-emoji" id="overlay-emoji"></div>
          <p class="overlay-msg" id="overlay-msg"></p>
          <button class="btn-play" id="btn-overlay-menu">Volver al menú</button>
        </div>
      </div>
      <div class="victory-overlay hidden" id="victory-overlay">
        <div class="vc-confetti" id="vc-confetti"></div>
        <div class="vc-box">
          <div class="vc-hero">
            <span class="vc-trexo">🦖</span>
          </div>
          <div class="vc-title">¡Nivel superado!</div>
          <div class="vc-subtitle">¡Salvaste a T-REXo!</div>
          <div class="vc-stars">
            <span class="vc-star vc-star--dim" id="vc-star-1">★</span>
            <span class="vc-star vc-star--dim vc-star--center" id="vc-star-2">★</span>
            <span class="vc-star vc-star--dim" id="vc-star-3">★</span>
          </div>
          <div class="vc-rewards">
            <div class="vc-reward">
              <div class="vc-reward-icon">🦖</div>
              <div class="vc-reward-label">+1 Fragmento</div>
            </div>
            <div class="vc-reward">
              <div class="vc-reward-icon">🪙</div>
              <div class="vc-reward-label">+50 Monedas</div>
            </div>
            <div class="vc-reward">
              <div class="vc-reward-icon" id="vc-booster-icon">🚀</div>
              <div class="vc-reward-label">+1 <span id="vc-booster-name">Cohete</span></div>
            </div>
          </div>
          <div class="vc-buttons">
            <button class="btn-vc-park" id="btn-vc-park">🦕 Parque Dino</button>
            <button class="btn-vc-continue" id="btn-vc-continue">Continuar →</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Events ────────────────────────────────────────

  _bindEvents() {
    const grid = this.element.querySelector('#board-grid');
    grid.addEventListener('mousedown',   (e) => this._onDragStart(e));
    grid.addEventListener('touchstart',  (e) => this._onDragStart(e), { passive: true });
    grid.addEventListener('touchmove',   (e) => this._onDragMove(e),  { passive: true });
    grid.addEventListener('touchend',    (e) => this._onDragEnd(e));
    grid.addEventListener('touchcancel', ()  => this._cancelDrag());
    this.element.querySelector('#btn-back-level')
      .addEventListener('click', () => this.onBack());
    this.element.querySelector('#btn-overlay-menu')
      .addEventListener('click', () => this.onBack());
    this.element.querySelector('#btn-vc-continue')
      .addEventListener('click', () => this.onBack());
    this.element.querySelector('#btn-vc-park')
      .addEventListener('click', () => (this.onDinoPark ?? this.onBack)());
  }

  // ── Pointer ───────────────────────────────────────

  _getPointerCoords(e) {
    if (e.touches?.length > 0)        return { x: e.touches[0].clientX,        y: e.touches[0].clientY };
    if (e.changedTouches?.length > 0)  return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  // ── Drag / Swipe ──────────────────────────────────

  _onDragStart(e) {
    if (this.busy) return;
    if (e.type === 'mousedown' && e.button !== 0) return;
    const el = e.target.closest('.tile');
    if (!el) return;
    const { x, y } = this._getPointerCoords(e);
    this._drag = { col: parseInt(el.dataset.col, 10), row: parseInt(el.dataset.row, 10), startX: x, startY: y };
    el.classList.add('pressing');
  }

  _onDragMove(e) { /* reserved for live drag */ }

  _onDragEnd(e) {
    if (!this._drag) return;
    const { x, y } = this._getPointerCoords(e);
    const { col, row, startX, startY } = this._drag;
    this._getTileEl(col, row)?.classList.remove('pressing');
    this._drag = null;
    if (this.busy) return;

    const dx = x - startX, dy = y - startY;
    const dist = Math.hypot(dx, dy);
    if (dist < DRAG_THRESHOLD) { this._onTileClick(col, row); return; }

    this._clearSelection();
    let col2 = col, row2 = row;
    if (Math.abs(dx) >= Math.abs(dy)) col2 += dx > 0 ? 1 : -1;
    else                               row2 += dy > 0 ? 1 : -1;
    if (col2 < 0 || col2 >= this.board.cols || row2 < 0 || row2 >= this.board.rows) return;
    this._attemptSwap(col, row, col2, row2);
  }

  _cancelDrag() {
    if (!this._drag) return;
    this._getTileEl(this._drag.col, this._drag.row)?.classList.remove('pressing');
    this._drag = null;
  }

  // ── Tap-tap ───────────────────────────────────────

  _onTileClick(col, row) {
    if (this.board.getTile(col, row)?.obstacle?.startsWith('box'))   return;
    if (this.board.getTile(col, row)?.obstacle?.startsWith('liana')) return;
    if (!this.selected) {
      this.selected = { col, row };
      this._getTileEl(col, row)?.classList.add('selected');
      return;
    }
    const { col: sc, row: sr } = this.selected;
    if (sc === col && sr === row) { this._clearSelection(); return; }
    if (!this.board.isAdjacent(sc, sr, col, row)) {
      this._clearSelection();
      this.selected = { col, row };
      this._getTileEl(col, row)?.classList.add('selected');
      return;
    }
    this._clearSelection();
    this._attemptSwap(sc, sr, col, row);
  }

  _clearSelection() {
    if (this.selected) {
      this._getTileEl(this.selected.col, this.selected.row)?.classList.remove('selected');
      this.selected = null;
    }
  }

  // ── Rendering ─────────────────────────────────────

  _renderBoard() {
    const grid = this.element?.querySelector('#board-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const tile = this.board.getTile(c, r);
        const el   = document.createElement('div');
        el.className   = `tile tile-t${tile.type}`;
        el.dataset.col = c;
        el.dataset.row = r;

        if (tile.obstacle === 'liana-2') {
          el.classList.add('tile-liana', 'tile-liana-2');
          el.dataset.obstacle = 'liana-2';
          el.textContent = TILE_COLORS[tile.type].emoji;
        } else if (tile.obstacle === 'liana-1') {
          el.classList.add('tile-liana', 'tile-liana-1');
          el.dataset.obstacle = 'liana-1';
          el.textContent = TILE_COLORS[tile.type].emoji;
        } else if (tile.obstacle === 'egg') {
          el.classList.add('tile-egg');
          el.dataset.obstacle = 'egg';
          el.textContent = '🥚';
        } else if (tile.obstacle === 'box-3') {
          el.classList.add('tile-box', 'tile-box-3');
          el.dataset.obstacle = 'box-3';
          el.textContent = '🦖';
        } else if (tile.obstacle === 'box-2') {
          el.classList.add('tile-box', 'tile-box-2');
          el.dataset.obstacle = 'box-2';
          el.textContent = '🦕';
        } else if (tile.obstacle === 'box-1') {
          el.classList.add('tile-box', 'tile-box-1');
          el.dataset.obstacle = 'box-1';
          el.textContent = '🦎';
        } else if (tile.booster) {
          el.dataset.booster = tile.booster;
          if      (tile.booster === 'color-bomb') el.textContent = '🌈';
          else if (tile.booster === 'ptero')       el.textContent = '🦅';
          else if (tile.booster === 'bomb')        el.textContent = '💣';
          else if (tile.booster === 'rocket-h')    el.textContent = '🚀';
          else                                      el.textContent = '🛸';
        } else {
          el.textContent = TILE_COLORS[tile.type].emoji;
        }

        if (tile.isNew) { el.dataset.new = '1'; tile.isNew = false; }
        grid.appendChild(el);
      }
    }
    if (this._lianasBrokenThisTurn?.length) {
      for (const p of this._lianasBrokenThisTurn) {
        const el = this._getTileEl(p.col, p.row);
        if (el) el.classList.add('liana-break');
      }
      this._lianasBrokenThisTurn = [];
    }
  }

  _getTileEl(col, row) {
    return this.element?.querySelector(`[data-col="${col}"][data-row="${row}"]`);
  }

  _updateHUD() {
    const scoreEl = this.element?.querySelector('#score-value');
    const movesEl = this.element?.querySelector('#moves-value');
    const barEl   = this.element?.querySelector('#score-bar');
    if (scoreEl) scoreEl.textContent = `${this.objectives.score} / ${this.objectives.targetScore}`;
    const left = this.objectives.movesLeft;
    if (movesEl) {
      movesEl.textContent = left;
      if (left <= 5 && left > 0) {
        movesEl.classList.add('moves-warning');
        if (!this._lowMovesAlert) { this._lowMovesAlert = true; this.trexo?.react('lowMoves'); this.dangerPanel?.onLowMoves(); }
      } else { movesEl.classList.remove('moves-warning'); }
    }
    const eggEl = this.element?.querySelector('#egg-count');
    if (eggEl) {
      eggEl.textContent = `${this.objectives.eggsBroken} / ${this.objectives.eggsRequired}`;
      if (this.objectives.eggsBroken >= this.objectives.eggsRequired)
        eggEl.classList.add('obj-complete');
    }
    const boxEl = this.element?.querySelector('#box-count');
    if (boxEl) {
      boxEl.textContent = `${this.objectives.boxesBroken} / ${this.objectives.boxesRequired}`;
      if (this.objectives.boxesBroken >= this.objectives.boxesRequired)
        boxEl.classList.add('obj-complete');
    }
    const lianaEl = this.element?.querySelector('#liana-count');
    if (lianaEl) {
      lianaEl.textContent = `${this.objectives.lianasBroken} / ${this.objectives.lianaRequired}`;
      if (this.objectives.lianasBroken >= this.objectives.lianaRequired)
        lianaEl.classList.add('obj-complete');
    }
    if (barEl) {
      const pct = this.objectives.eggsRequired > 0
        ? Math.min(100, (this.objectives.eggsBroken / this.objectives.eggsRequired) * 100)
        : Math.min(100, (this.objectives.score     / this.objectives.targetScore)   * 100);
      barEl.style.width = `${pct}%`;
    }
  }

  _bumpScore() {
    const el = this.element?.querySelector('#score-value');
    if (!el) return;
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
    setTimeout(() => el?.classList.remove('score-pop'), 400);
  }

  // ── Swap animation ────────────────────────────────

  async _animateSwap(col1, row1, col2, row2) {
    const elA = this._getTileEl(col1, row1), elB = this._getTileEl(col2, row2);
    if (!elA || !elB) return;
    const rA = elA.getBoundingClientRect(), rB = elB.getBoundingClientRect();
    const dx = rB.left - rA.left, dy = rB.top - rA.top;
    const ease = `${SWAP_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    elA.style.transition = `transform ${ease}`; elA.style.transform = `translate(${dx}px,${dy}px)`;  elA.style.zIndex = '5';
    elB.style.transition = `transform ${ease}`; elB.style.transform = `translate(${-dx}px,${-dy}px)`; elB.style.zIndex = '5';
    await this._wait(SWAP_MS + 20);
  }

  // ── Booster dispatch ──────────────────────────────

  async _fireBooster(col, row, booster) {
    if (booster === 'bomb')       return this._fireBomb(col, row);
    if (booster === 'color-bomb') return; // combo not implemented — no-op
    if (booster === 'ptero')      return; // combo not implemented — no-op
    return this._fireRocket(col, row, booster);
  }

  // ── Rocket fire ───────────────────────────────────

  async _fireRocket(col, row, booster) {
    if (!this.element) return;
    const isH     = booster === 'rocket-h';
    const affected = isH
      ? Array.from({ length: this.board.cols }, (_, c) => ({ col: c, row }))
      : Array.from({ length: this.board.rows }, (_, r) => ({ col, row: r }));

    this.trexo?.react('rocket');
    this.trexo?.say('¡Velocidad Rex!', '🚀');
    this.dangerPanel?.onRocket();
    { const e = this._getTileEl(col, row);
      if (e) { e.classList.add('fx-rocket-charge'); setTimeout(() => e.classList.remove('fx-rocket-charge'), 180); } }
    this._getTileEl(col, row)?.classList.add('rocket-launch');
    await this._wait(160);
    if (!this.element) return;

    { const g = this._gridEl(), e = this._getTileEl(col, row);
      if (g && e) {
        FX.rocketBeam(g, e, isH); FX.rocketHead(g, e, isH);
        const hR = g.getBoundingClientRect(), eR = e.getBoundingClientRect();
        const cx = eR.left + eR.width/2 - hR.left, cy = eR.top + eR.height/2 - hR.top;
        FX.flash(g, cx, cy, { color: '#ffe680', dur: 300, size: 1.1 });
        FX.sparks(g, cx, cy, { count: 7 });
      } }
    SoundManager.rocketLaunch();

    SoundManager.rocketSweep();
    const STAGGER = 16;
    for (let i = 0; i < affected.length; i++) {
      const el = this._getTileEl(affected[i].col, affected[i].row);
      if (el) { el.style.setProperty('--sweep-delay', `${i * STAGGER}ms`); el.classList.add('rocket-sweep'); }
    }
    FX.glowTiles(affected.map(p => this._getTileEl(p.col, p.row)), { stagger: STAGGER });
    this.objectives.addScore(affected.length * POINTS_PER_TILE + ROCKET_BONUS);
    this._updateHUD();
    this._bumpScore();
    await this._wait((affected.length - 1) * STAGGER + 220);
    if (!this.element) return;

    for (const p of affected) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('rocket-sweep'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(affected));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
    // NOTE: hook for future sfx — AudioManager.play('rocket')
  }

  // ── Bomb fire ─────────────────────────────────────

  async _fireBomb(col, row) {
    if (!this.element) return;

    // 3×3 area around the bomb
    const affected = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < this.board.rows && c >= 0 && c < this.board.cols) affected.push({ col: c, row: r });
      }
    }

    this.trexo?.react('bomb');
    this.trexo?.say('¡Boom jurásico!', '💥');
    this.dangerPanel?.onBomb();

    // Phase 1 — buildup: bomb grows with intensifying glow
    this._getTileEl(col, row)?.classList.add('bomb-launch');
    SoundManager.bombCharge();
    { const g = this._gridEl(), e = this._getTileEl(col, row);
      if (g && e) { const hR = g.getBoundingClientRect(), eR = e.getBoundingClientRect();
        FX.warningRing(g, eR.left+eR.width/2-hR.left, eR.top+eR.height/2-hR.top, { dur: 220 }); } }
    await this._wait(220);
    if (!this.element) return;

    // Phase 2 — detonation: flash + shockwave + board shake
    const gridEl = this.element.querySelector('#board-grid');
    if (gridEl) {
      const flash = document.createElement('div');
      flash.className = 'bomb-flash';
      gridEl.appendChild(flash);
      setTimeout(() => flash.remove(), 240);

      const bombEl = this._getTileEl(col, row);
      if (bombEl) {
        const bRect = bombEl.getBoundingClientRect();
        const gRect = gridEl.getBoundingClientRect();
        const wave  = document.createElement('div');
        wave.className = 'bomb-shockwave';
        wave.style.left = `${bRect.left + bRect.width  / 2 - gRect.left}px`;
        wave.style.top  = `${bRect.top  + bRect.height / 2 - gRect.top}px`;
        gridEl.appendChild(wave);
        setTimeout(() => wave.remove(), 680);
        const bx = bRect.left + bRect.width  / 2 - gRect.left;
        const by = bRect.top  + bRect.height / 2 - gRect.top;
        SoundManager.bombBlast();
        FX.flash(gridEl, bx, by, { color: '#ff9900', dur: 340, size: 1.3 });
        FX.burst(gridEl, bx, by, { count: 10, colors: FX.C_BOMB, minR: 18, maxR: 44, dur: 480 });
        FX.multiRing(gridEl, bx, by, { rings: 2 });
        FX.sparks(gridEl, bx, by, { count: 8 });
        FX.smoke(gridEl, bx, by, { count: 5 });
        FX.comboFlash(gridEl, { color: 'rgba(255,140,0,0.40)', dur: 200 });
      }

      FX.glowTiles(affected.map(p => this._getTileEl(p.col, p.row)), { stagger: 14 });
      gridEl.classList.add('board-shake');
      setTimeout(() => gridEl.classList.remove('board-shake'), 380);
    }

    // Phase 3 — tiles explode outward with stagger by distance
    for (const p of affected) {
      const el = this._getTileEl(p.col, p.row);
      if (el) {
        const dx   = p.col - col;
        const dy   = p.row - row;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        el.style.setProperty('--ex', `${dx * 24}px`);
        el.style.setProperty('--ey', `${dy * 24}px`);
        el.style.setProperty('--bomb-delay', `${dist * 28}ms`);
        el.classList.add('bomb-explode');
      }
    }

    this.objectives.addScore(affected.length * POINTS_PER_TILE + BOMB_BONUS);
    this._updateHUD();
    this._bumpScore();
    await this._wait(360);
    if (!this.element) return;

    for (const p of affected) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('bomb-explode'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(affected));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
    // NOTE: hook for future sfx — AudioManager.play('bomb')
  }

  // ── Ptero fire ───────────────────────────────────

  async _firePtero(col, row) {
    if (!this.element) return;

    this.trexo?.react('ptero');
    this.dangerPanel?.onPtero();
    this._getTileEl(col, row)?.classList.add('ptero-launch');
    await this._wait(175);
    if (!this.element) return;

    // Pick a random normal tile (no booster)
    const candidates = [];
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        if (c === col && r === row) continue;
        const tile = this.board.getTile(c, r);
        if (tile && !tile.booster) candidates.push({ col: c, row: r });
      }
    }

    const toRemove = [{ col, row }];
    if (candidates.length > 0) {
      const target   = candidates[Math.floor(Math.random() * candidates.length)];
      const gridEl   = this._gridEl();
      const fromEl   = this._getTileEl(col, row);
      const targetEl = this._getTileEl(target.col, target.row);
      if (gridEl && fromEl && targetEl) FX.pteroFlight(gridEl, fromEl, targetEl, { dur: 240 });
      SoundManager.pteroLaunch();
      await this._wait(200);
      if (!this.element) return;
      if (targetEl) {
        targetEl.classList.add('ptero-impact');
        SoundManager.pteroImpact();
        if (gridEl) { const hR = gridEl.getBoundingClientRect(), tR = targetEl.getBoundingClientRect();
          FX.leaves(gridEl, tR.left+tR.width/2-hR.left, tR.top+tR.height/2-hR.top, { count: 6 }); }
      }
      toRemove.push(target);
    }

    this.objectives.addScore(toRemove.length * POINTS_PER_TILE + ROCKET_BONUS);
    this._updateHUD();
    this._bumpScore();

    await this._wait(190);
    if (!this.element) return;

    for (const p of toRemove) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('ptero-impact', 'ptero-launch'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(toRemove));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Color-bomb fire ───────────────────────────────

  async _fireColorBomb(col, row, targetType) {
    if (!this.element) return;

    this.trexo?.react('colorBomb');
    this.trexo?.say('¡Energía Rex Arcoíris!', '🌈');
    this.dangerPanel?.onColorBomb();

    // Phase 1 — Charge: bomb grows and cycles hue before launch
    const cbEl = this._getTileEl(col, row);
    cbEl?.classList.add('color-bomb-charge');
    SoundManager.rainbowCharge();
    let _cbOrbiters = [];
    { const g = this._gridEl();
      if (g && cbEl) {
        const hR = g.getBoundingClientRect(), eR = cbEl.getBoundingClientRect();
        const cx = eR.left + eR.width/2 - hR.left, cy = eR.top + eR.height/2 - hR.top;
        FX.aura(g, cx, cy, { dur: 420, size: 1.2 });
        _cbOrbiters = FX.spawnOrbiters(g, cx, cy, { dur: 320, count: 4 });
      }
    }
    await this._wait(310);
    _cbOrbiters.forEach(o => o?.remove());
    if (!this.element) return;

    cbEl?.classList.remove('color-bomb-charge');
    cbEl?.classList.add('color-bomb-launch');

    // Collect targets
    const targets = [];
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        if (c === col && r === row) continue;
        const tile = this.board.getTile(c, r);
        if (tile && tile.type === targetType) targets.push({ col: c, row: r });
      }
    }

    await this._wait(140);
    if (!this.element) return;

    // Phase 2 — Mark: targets shimmer so the player sees what will be hit
    for (const p of targets) {
      const el = this._getTileEl(p.col, p.row);
      if (el) el.classList.add('color-bomb-mark');
    }
    await this._wait(200);
    if (!this.element) return;

    // Phase 3 — Rays + central flash + board shake + rainbow particles
    SoundManager.rainbowImpact();
    const gridEl = this.element.querySelector('#board-grid');
    const bombEl = this._getTileEl(col, row);
    if (gridEl && bombEl) {
      const gRect = gridEl.getBoundingClientRect();
      const bRect = bombEl.getBoundingClientRect();
      const bx = bRect.left + bRect.width  / 2 - gRect.left;
      const by = bRect.top  + bRect.height / 2 - gRect.top;

      const RAINBOW_HUES = [0, 30, 60, 120, 180, 240, 290, 320];
      const rays = [];
      targets.forEach((p, i) => {
        const tEl = this._getTileEl(p.col, p.row);
        if (!tEl) return;
        const tRect = tEl.getBoundingClientRect();
        const tx = tRect.left + tRect.width  / 2 - gRect.left;
        const ty = tRect.top  + tRect.height / 2 - gRect.top;
        const dx = tx - bx, dy = ty - by;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const ray = document.createElement('div');
        ray.className = 'cb-ray';
        ray.style.left      = `${bx}px`;
        ray.style.top       = `${by}px`;
        ray.style.width     = `${len}px`;
        ray.style.transform = `rotate(${angle}deg)`;
        ray.style.setProperty('--ray-hue', `${RAINBOW_HUES[i % RAINBOW_HUES.length]}`);
        gridEl.appendChild(ray);
        rays.push(ray);
      });

      const flash = document.createElement('div');
      flash.className  = 'cb-central-flash';
      flash.style.left = `${bx}px`;
      flash.style.top  = `${by}px`;
      gridEl.appendChild(flash);
      setTimeout(() => flash.remove(), 520);

      FX.flash(gridEl, bx, by, { color: '#ffffff', dur: 440, size: 1.6 });
      FX.glowTiles(targets.map(p => this._getTileEl(p.col, p.row)), { stagger: 14 });
      gridEl.classList.add('board-shake');
      setTimeout(() => gridEl.classList.remove('board-shake'), 380);

      FX.burst(gridEl, bx, by, { count: 10, colors: FX.C_RAINBOW, minR: 28, maxR: 68, dur: 620 });

      await this._wait(220);
      rays.forEach(r => r.remove());
    } else {
      await this._wait(220);
    }
    if (!this.element) return;

    // Phase 4 — Sweep: staggered pop of all target tiles
    const STAGGER = 28;
    targets.forEach((p, i) => {
      const el = this._getTileEl(p.col, p.row);
      if (el) {
        el.classList.remove('color-bomb-mark');
        el.style.setProperty('--cb-delay', `${i * STAGGER}ms`);
        el.classList.add('color-bomb-sweep');
      }
    });
    this.objectives.addScore((targets.length + 1) * POINTS_PER_TILE + BOMB_BONUS * 2);
    this._updateHUD();
    this._bumpScore();

    await this._wait((targets.length > 0 ? (targets.length - 1) * STAGGER : 0) + 300);
    if (!this.element) return;

    for (const p of targets) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('color-bomb-sweep'); el.classList.add('matched'); }
    }
    const cbFinalEl = this._getTileEl(col, row);
    if (cbFinalEl) cbFinalEl.classList.add('matched');

    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits([...targets, { col, row }]));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Color-bomb + Color-bomb → Poder Jurásico Total ─

  async _fireDoubleColorBomb(col1, row1, col2, row2) {
    if (!this.element) return;
    this.trexo?.react('colorBomb');
    this.trexo?.say('¡Poder jurásico total!', '🌈');
    this.dangerPanel?.onJurassicTotal?.();

    // Phase 1 — double charge
    const e1 = this._getTileEl(col1, row1), e2 = this._getTileEl(col2, row2);
    e1?.classList.add('color-bomb-charge');
    e2?.classList.add('color-bomb-charge');
    SoundManager.rainbowCharge();
    setTimeout(() => SoundManager.rainbowCharge(), 120);
    const gridEl = this._gridEl();
    const cx0 = (col1 + col2) / 2, ry0 = (row1 + row2) / 2;
    { const g = gridEl, mid = this._getTileEl(Math.round(cx0), Math.round(ry0)) || e1;
      if (g && mid) { const hR = g.getBoundingClientRect(), eR = mid.getBoundingClientRect();
        FX.aura(g, eR.left+eR.width/2-hR.left, eR.top+eR.height/2-hR.top, { dur: 460, size: 1.8 }); } }
    await this._wait(340);
    if (!this.element) return;
    e1?.classList.remove('color-bomb-charge');
    e2?.classList.remove('color-bomb-charge');

    // Collect EVERY board cell
    const all = [];
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) all.push({ col: c, row: r });

    // Phase 2 — full-board impact: rays + flash + shockwave + shake
    SoundManager.rainbowImpact();
    SoundManager.megaCombo();
    if (gridEl) {
      const gR = gridEl.getBoundingClientRect();
      const ref = this._getTileEl(Math.round(cx0), Math.round(ry0)) || e1;
      const bR = (ref || e1)?.getBoundingClientRect() || gR;
      const bx = bR.left + bR.width / 2 - gR.left, by = bR.top + bR.height / 2 - gR.top;
      const HUES = [0,30,60,120,180,240,290,320];
      let ri = 0;
      for (const p of all) {
        if (ri >= 24) break;                       // cap rays for perf
        if ((p.col + p.row) % 2 !== 0) continue;   // every other cell
        const tEl = this._getTileEl(p.col, p.row);
        if (!tEl) continue;
        const tR = tEl.getBoundingClientRect();
        const tx = tR.left + tR.width/2 - gR.left, ty = tR.top + tR.height/2 - gR.top;
        const len = Math.hypot(tx-bx, ty-by);
        const ang = Math.atan2(ty-by, tx-bx) * 180/Math.PI;
        const ray = document.createElement('div');
        ray.className = 'cb-ray';
        ray.style.left = `${bx}px`; ray.style.top = `${by}px`;
        ray.style.width = `${len}px`; ray.style.transform = `rotate(${ang}deg)`;
        ray.style.setProperty('--ray-hue', `${HUES[ri % HUES.length]}`);
        gridEl.appendChild(ray);
        setTimeout(() => ray.remove(), 360);
        ri++;
      }
      FX.flash(gridEl, bx, by, { color: '#ffffff', dur: 520, size: 2.4 });
      FX.multiRing(gridEl, bx, by, { rings: 3, color: 'rgba(255,255,255,0.9)', dur: 760 });
      FX.burst(gridEl, bx, by, { count: 14, colors: FX.C_RAINBOW, minR: 30, maxR: 90, dur: 680 });
      FX.comboFlash(gridEl, { color: 'rgba(180,140,255,0.5)', dur: 300 });
      FX.shake(gridEl, 'strong');
    }
    await this._wait(260);
    if (!this.element) return;

    // Phase 3 — sequential glow + pop, then clear board + heavy obstacle damage
    FX.glowTiles(all.map(p => this._getTileEl(p.col, p.row)), { stagger: 6 });
    this.objectives.addScore(all.length * POINTS_PER_TILE + BOMB_BONUS * 4);
    this._updateHUD(); this._bumpScore();
    await this._wait(300);
    if (!this.element) return;
    for (const p of all) this._getTileEl(p.col, p.row)?.classList.add('matched');
    await this._wait(POP_MS);
    if (!this.element) return;

    // Two damage passes so tougher obstacles also break
    const keep1     = this._applyObstacleHits(all);
    const remaining = all.filter(p => this.board.getTile(p.col, p.row)?.obstacle);
    const keep2     = this._applyObstacleHits(remaining);
    this.board.removeMatched([...keep1, ...keep2]);
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Color-bomb + Bomb → Lluvia Explosiva Rex ───────

  async _fireColorBombBomb(cbCol, cbRow, bmCol, bmRow) {
    if (!this.element) return;
    this.trexo?.react('rocketBomb');
    this.trexo?.say('¡Lluvia explosiva Rex!', '💥');
    this.dangerPanel?.onRainbowBomb?.();

    const gridEl = this._gridEl();
    const cbEl = this._getTileEl(cbCol, cbRow), bmEl = this._getTileEl(bmCol, bmRow);

    // Phase 1 — charge (~300ms): rainbow loads, bomb vibrates
    cbEl?.classList.add('color-bomb-charge');
    bmEl?.classList.add('bomb-launch');
    SoundManager.rainbowCharge();
    let cbx = 0, cby = 0, gR = null;
    if (gridEl && cbEl) { gR = gridEl.getBoundingClientRect();
      const eR = cbEl.getBoundingClientRect();
      cbx = eR.left + eR.width/2 - gR.left; cby = eR.top + eR.height/2 - gR.top;
      FX.aura(gridEl, cbx, cby, { dur: 320, size: 1.3 }); }
    await this._wait(300);
    if (!this.element) return;
    cbEl?.classList.remove('color-bomb-charge');

    // Pick scattered normal tiles to become mini-bombs
    const candidates = [];
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) {
        if (c === cbCol && r === cbRow) continue;
        const t = this.board.getTile(c, r);
        if (t && !t.booster && !t.obstacle) candidates.push({ col: c, row: r });
      }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const SEEDS = candidates.slice(0, Math.min(6, candidates.length));

    // Phase 2 — conversion (~300ms): rainbow rays connect, tiles flag as mini-bombs
    if (gridEl && gR) {
      SEEDS.forEach((p, i) => {
        const tEl = this._getTileEl(p.col, p.row);
        if (!tEl) return;
        const tR = tEl.getBoundingClientRect();
        const tx = tR.left + tR.width/2 - gR.left, ty = tR.top + tR.height/2 - gR.top;
        const len = Math.hypot(tx-cbx, ty-cby);
        const ang = Math.atan2(ty-cby, tx-cbx) * 180/Math.PI;
        const ray = document.createElement('div');
        ray.className = 'cb-ray';
        ray.style.left = `${cbx}px`; ray.style.top = `${cby}px`;
        ray.style.width = `${len}px`; ray.style.transform = `rotate(${ang}deg)`;
        ray.style.setProperty('--ray-hue', `${(i * 55) % 360}`);
        gridEl.appendChild(ray);
        setTimeout(() => ray.remove(), 320);
        tEl.classList.add('cb-minibomb');
      });
    }
    await this._wait(300);
    if (!this.element) return;

    // Phase 3 — sequential explosions (~600-800ms): one mini-bomb per group
    const affectedSet = new Set([`${cbCol},${cbRow}`, `${bmCol},${bmRow}`]);
    for (let i = 0; i < SEEDS.length; i++) {
      if (!this.element) return;
      const s = SEEDS[i];
      const sEl = this._getTileEl(s.col, s.row);
      sEl?.classList.remove('cb-minibomb');
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const c = s.col + dc, r = s.row + dr;
          if (c >= 0 && c < this.board.cols && r >= 0 && r < this.board.rows) affectedSet.add(`${c},${r}`);
        }
      if (gridEl && gR && sEl) {
        const tR = sEl.getBoundingClientRect();
        const bx = tR.left + tR.width/2 - gR.left, by = tR.top + tR.height/2 - gR.top;
        FX.flash(gridEl, bx, by, { color: '#ff9900', dur: 300, size: 1.1 });
        FX.multiRing(gridEl, bx, by, { rings: 1, color: 'rgba(255,140,0,1)', dur: 460 });
        FX.burst(gridEl, bx, by, { count: 7, colors: FX.C_BOMB, minR: 14, maxR: 38, dur: 420 });
        FX.sparks(gridEl, bx, by, { count: 5 });
      }
      SoundManager.bombBlast();
      if (i === 0) FX.shake(gridEl, 'soft');
      await this._wait(130);
    }
    if (gridEl) FX.shake(gridEl, 'strong');

    const affected = [...affectedSet].map(k => { const [c, r] = k.split(',').map(Number); return { col: c, row: r }; });
    FX.glowTiles(affected.map(p => this._getTileEl(p.col, p.row)), { stagger: 8 });
    this.objectives.addScore(affected.length * POINTS_PER_TILE + BOMB_BONUS * 3);
    this._updateHUD(); this._bumpScore();
    await this._wait(220);
    if (!this.element) return;
    for (const p of affected) this._getTileEl(p.col, p.row)?.classList.add('matched');
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(affected));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Color-bomb + Rocket → Lluvia de Cohetes Rex ────

  async _fireColorBombRocket(cbCol, cbRow, rkCol, rkRow) {
    if (!this.element) return;
    this.trexo?.react('dinoCross');
    this.trexo?.say('¡Lluvia de cohetes Rex!', '🚀');
    this.dangerPanel?.onRainbowRocket?.();

    const gridEl = this._gridEl();
    const cbEl = this._getTileEl(cbCol, cbRow);
    cbEl?.classList.add('color-bomb-charge');
    this._getTileEl(rkCol, rkRow)?.classList.add('rocket-launch');
    SoundManager.rainbowCharge();
    let cbx = 0, cby = 0, gR = null;
    if (gridEl && cbEl) { gR = gridEl.getBoundingClientRect();
      const eR = cbEl.getBoundingClientRect();
      cbx = eR.left + eR.width/2 - gR.left; cby = eR.top + eR.height/2 - gR.top;
      FX.aura(gridEl, cbx, cby, { dur: 320, size: 1.3 }); }
    await this._wait(300);
    if (!this.element) return;
    cbEl?.classList.remove('color-bomb-charge');

    // Pick scattered normal tiles → temporary rockets (alternating H/V)
    const candidates = [];
    for (let r = 0; r < this.board.rows; r++)
      for (let c = 0; c < this.board.cols; c++) {
        if (c === cbCol && r === cbRow) continue;
        const t = this.board.getTile(c, r);
        if (t && !t.booster && !t.obstacle) candidates.push({ col: c, row: r });
      }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const SEEDS = candidates.slice(0, Math.min(8, candidates.length));

    // Conversion: rainbow rays mark seeds as mini-rockets
    if (gridEl && gR) {
      SEEDS.forEach((p, i) => {
        const tEl = this._getTileEl(p.col, p.row);
        if (!tEl) return;
        const tR = tEl.getBoundingClientRect();
        const tx = tR.left + tR.width/2 - gR.left, ty = tR.top + tR.height/2 - gR.top;
        const len = Math.hypot(tx-cbx, ty-cby);
        const ang = Math.atan2(ty-cby, tx-cbx) * 180/Math.PI;
        const ray = document.createElement('div');
        ray.className = 'cb-ray';
        ray.style.left = `${cbx}px`; ray.style.top = `${cby}px`;
        ray.style.width = `${len}px`; ray.style.transform = `rotate(${ang}deg)`;
        ray.style.setProperty('--ray-hue', `${(i * 47) % 360}`);
        gridEl.appendChild(ray);
        setTimeout(() => ray.remove(), 320);
        tEl.classList.add('cb-minibomb');
      });
    }
    await this._wait(280);
    if (!this.element) return;

    // Sequential rocket launches — alternate horizontal / vertical
    const affectedSet = new Set([`${cbCol},${cbRow}`, `${rkCol},${rkRow}`]);
    for (let i = 0; i < SEEDS.length; i++) {
      if (!this.element) return;
      const s = SEEDS[i];
      const isH = i % 2 === 0;
      const sEl = this._getTileEl(s.col, s.row);
      sEl?.classList.remove('cb-minibomb');
      if (gridEl && sEl) { FX.rocketBeam(gridEl, sEl, isH); FX.rocketHead(gridEl, sEl, isH); }
      SoundManager.rocketLaunch();
      if (isH) for (let c = 0; c < this.board.cols; c++) affectedSet.add(`${c},${s.row}`);
      else     for (let r = 0; r < this.board.rows; r++) affectedSet.add(`${s.col},${r}`);
      await this._wait(110);
    }
    if (gridEl) FX.shake(gridEl, 'strong');

    const affected = [...affectedSet].map(k => { const [c, r] = k.split(',').map(Number); return { col: c, row: r }; });
    FX.glowTiles(affected.map(p => this._getTileEl(p.col, p.row)), { stagger: 6 });
    this.objectives.addScore(affected.length * POINTS_PER_TILE + ROCKET_BONUS * 2);
    this._updateHUD(); this._bumpScore();
    await this._wait(220);
    if (!this.element) return;
    for (const p of affected) this._getTileEl(p.col, p.row)?.classList.add('matched');
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(affected));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Color-bomb + Ptero → Bandada Rex ───────────────

  async _fireColorBombPtero(cbCol, cbRow, ptCol, ptRow) {
    if (!this.element) return;
    this.trexo?.react('doublePtero');
    this.trexo?.say('¡Bandada Rex!', '🦅');
    this.dangerPanel?.onBandada?.();

    const gridEl = this._gridEl();
    const cbEl = this._getTileEl(cbCol, cbRow);
    cbEl?.classList.add('color-bomb-charge');
    SoundManager.rainbowCharge();
    if (gridEl && cbEl) { const gR = gridEl.getBoundingClientRect(), eR = cbEl.getBoundingClientRect();
      FX.aura(gridEl, eR.left+eR.width/2-gR.left, eR.top+eR.height/2-gR.top, { dur: 340, size: 1.4 }); }
    await this._wait(300);
    if (!this.element) return;
    cbEl?.classList.remove('color-bomb-charge');

    // Choose distinct priority targets (box > liana > egg > normal)
    const FLOCK = 5;
    const excludes = [{ col: cbCol, row: cbRow }, { col: ptCol, row: ptRow }];
    const targets = [];
    for (let i = 0; i < FLOCK; i++) {
      const t = this._findPriorityTarget(excludes);
      if (!t) break;
      targets.push(t);
      excludes.push(t);
    }

    // Send a flyer to each target in quick succession
    const fromEl = this._getTileEl(ptCol, ptRow) || cbEl;
    SoundManager.pteroLaunch();
    for (let i = 0; i < targets.length; i++) {
      if (!this.element) return;
      const tEl = this._getTileEl(targets[i].col, targets[i].row);
      if (gridEl && fromEl && tEl) FX.pteroFlight(gridEl, fromEl, tEl, { dur: 300 });
      await this._wait(90);
    }
    await this._wait(220);
    if (!this.element) return;

    // Impacts: flash + leaves on each target
    for (const t of targets) {
      const tEl = this._getTileEl(t.col, t.row);
      if (tEl) tEl.classList.add('ptero-impact');
      if (gridEl && tEl) { const gR = gridEl.getBoundingClientRect(), tR = tEl.getBoundingClientRect();
        const bx = tR.left+tR.width/2-gR.left, by = tR.top+tR.height/2-gR.top;
        FX.flash(gridEl, bx, by, { color: '#9bff7a', dur: 280, size: 0.9 });
        FX.leaves(gridEl, bx, by, { count: 6, dur: 420 }); }
    }
    SoundManager.pteroImpact();
    SoundManager.megaCombo();
    if (gridEl) FX.shake(gridEl, 'soft');
    await this._wait(220);
    if (!this.element) return;

    const remove = [{ col: cbCol, row: cbRow }, { col: ptCol, row: ptRow }, ...targets];
    FX.glowTiles(remove.map(p => this._getTileEl(p.col, p.row)), { stagger: 10 });
    this.objectives.addScore(remove.length * POINTS_PER_TILE + PTERO_BOMB_BONUS);
    this._updateHUD(); this._bumpScore();
    await this._wait(200);
    if (!this.element) return;
    for (const p of remove) this._getTileEl(p.col, p.row)?.classList.add('matched');
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(remove));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Game flow ─────────────────────────────────────

  async _attemptSwap(col1, row1, col2, row2) {
    this.busy = true;

    // Boxes and lianas are immovable — block any swap involving them
    if (this.board.getTile(col1, row1)?.obstacle?.startsWith('box')   ||
        this.board.getTile(col2, row2)?.obstacle?.startsWith('box')   ||
        this.board.getTile(col1, row1)?.obstacle?.startsWith('liana') ||
        this.board.getTile(col2, row2)?.obstacle?.startsWith('liana')) {
      this._getTileEl(col1, row1)?.classList.add('shake');
      this._getTileEl(col2, row2)?.classList.add('shake');
      await this._wait(SHAKE_MS);
      this.busy = false;
      return;
    }

    await this._animateSwap(col1, row1, col2, row2);
    this.board.swapTiles(col1, row1, col2, row2);
    this._renderBoard();

    const tileA = this.board.getTile(col1, row1);
    const tileB = this.board.getTile(col2, row2);

    // Rainbow combos must be checked BEFORE the generic ptero/booster blocks
    {
      const isCbA  = tileA?.booster === 'color-bomb';
      const isCbB  = tileB?.booster === 'color-bomb';
      const isRkA  = tileA?.booster === 'rocket-h' || tileA?.booster === 'rocket-v';
      const isRkB  = tileB?.booster === 'rocket-h' || tileB?.booster === 'rocket-v';
      const isPtA  = tileA?.booster === 'ptero';
      const isPtB  = tileB?.booster === 'ptero';

      // Color-bomb + Rocket → Lluvia de Cohetes Rex
      if ((isCbA && isRkB) || (isRkA && isCbB)) {
        this.objectives.useMove();
        const cbCol = isCbA ? col1 : col2, cbRow = isCbA ? row1 : row2;
        await this._fireColorBombRocket(cbCol, cbRow, isCbA ? col2 : col1, isCbA ? row2 : row1);
        await this._runCascade(-1, -1);
        this._updateHUD();
        if (!this.element) return;
        this._checkGameOver(); this.busy = false; return;
      }

      // Color-bomb + Ptero → Bandada Rex
      if ((isCbA && isPtB) || (isPtA && isCbB)) {
        this.objectives.useMove();
        const cbCol = isCbA ? col1 : col2, cbRow = isCbA ? row1 : row2;
        await this._fireColorBombPtero(cbCol, cbRow, isCbA ? col2 : col1, isCbA ? row2 : row1);
        await this._runCascade(-1, -1);
        this._updateHUD();
        if (!this.element) return;
        this._checkGameOver(); this.busy = false; return;
      }
    }

    // Bomb + Bomb combo → mega 5×5 explosion
    if (tileA?.booster === 'bomb' && tileB?.booster === 'bomb') {
      this.objectives.useMove();
      await this._fireDoubleBomb(col1, row1, col2, row2);
      await this._runCascade(-1, -1);
      this._updateHUD();
      if (!this.element) return;
      this._checkGameOver();
      this.busy = false;
      return;
    }

    // Rocket + Bomb combo → thick cross clear (3 rows × 3 cols)
    {
      const isRocketA = tileA?.booster === 'rocket-h' || tileA?.booster === 'rocket-v';
      const isRocketB = tileB?.booster === 'rocket-h' || tileB?.booster === 'rocket-v';
      const isBombA   = tileA?.booster === 'bomb';
      const isBombB   = tileB?.booster === 'bomb';
      if ((isRocketA && isBombB) || (isBombA && isRocketB)) {
        this.objectives.useMove();
        await this._fireRocketBomb(col1, row1, col2, row2);
        await this._runCascade(-1, -1);
        this._updateHUD();
        if (!this.element) return;
        this._checkGameOver();
        this.busy = false;
        return;
      }
    }

    // Rocket + Rocket combo → Cruz Dino (1 row + 1 col cross)
    {
      const isRocketA = tileA?.booster === 'rocket-h' || tileA?.booster === 'rocket-v';
      const isRocketB = tileB?.booster === 'rocket-h' || tileB?.booster === 'rocket-v';
      if (isRocketA && isRocketB) {
        this.objectives.useMove();
        await this._fireDoubleRocket(col1, row1, col2, row2);
        await this._runCascade(-1, -1);
        this._updateHUD();
        if (!this.element) return;
        this._checkGameOver();
        this.busy = false;
        return;
      }
    }

    // Ptero + Bomb combo → Bomba Aérea
    {
      const isPteroA = tileA?.booster === 'ptero';
      const isPteroB = tileB?.booster === 'ptero';
      const isBombA  = tileA?.booster === 'bomb';
      const isBombB  = tileB?.booster === 'bomb';
      if ((isPteroA && isBombB) || (isBombA && isPteroB)) {
        this.objectives.useMove();
        const ptCol = isPteroA ? col1 : col2;
        const ptRow = isPteroA ? row1 : row2;
        const bmCol = isPteroA ? col2 : col1;
        const bmRow = isPteroA ? row2 : row1;
        await this._firePteroBomb(ptCol, ptRow, bmCol, bmRow);
        await this._runCascade(-1, -1);
        this._updateHUD();
        if (!this.element) return;
        this._checkGameOver();
        this.busy = false;
        return;
      }
    }

    // Ptero + Ptero combo → Doble Ataque Aéreo
    if (tileA?.booster === 'ptero' && tileB?.booster === 'ptero') {
      this.objectives.useMove();
      await this._fireDoublePtero(col1, row1, col2, row2);
      await this._runCascade(-1, -1);
      this._updateHUD();
      if (!this.element) return;
      this._checkGameOver();
      this.busy = false;
      return;
    }

    // Ptero: any swap activates it
    if (tileA?.booster === 'ptero' || tileB?.booster === 'ptero') {
      this.objectives.useMove();
      const ptCol = tileA?.booster === 'ptero' ? col1 : col2;
      const ptRow = tileA?.booster === 'ptero' ? row1 : row2;
      await this._firePtero(ptCol, ptRow);
      await this._runCascade(-1, -1);
      this._updateHUD();
      if (!this.element) return;
      this._checkGameOver();
      this.busy = false;
      return;
    }

    // Color-bomb + Color-bomb → Poder Jurásico Total
    if (tileA?.booster === 'color-bomb' && tileB?.booster === 'color-bomb') {
      this.objectives.useMove();
      await this._fireDoubleColorBomb(col1, row1, col2, row2);
      await this._runCascade(-1, -1);
      this._updateHUD();
      if (!this.element) return;
      this._checkGameOver();
      this.busy = false;
      return;
    }

    // Color-bomb + Bomb → Lluvia Explosiva Rex
    {
      const isCbA   = tileA?.booster === 'color-bomb';
      const isCbB   = tileB?.booster === 'color-bomb';
      const isBombA = tileA?.booster === 'bomb';
      const isBombB = tileB?.booster === 'bomb';
      if ((isCbA && isBombB) || (isBombA && isCbB)) {
        this.objectives.useMove();
        const cbCol = isCbA ? col1 : col2, cbRow = isCbA ? row1 : row2;
        const bmCol = isCbA ? col2 : col1, bmRow = isCbA ? row2 : row1;
        await this._fireColorBombBomb(cbCol, cbRow, bmCol, bmRow);
        await this._runCascade(-1, -1);
        this._updateHUD();
        if (!this.element) return;
        this._checkGameOver();
        this.busy = false;
        return;
      }
    }

    // Color-bomb swapped with a normal tile → clear all of that type
    if ((tileA?.booster === 'color-bomb' && !tileB?.booster) ||
        (tileB?.booster === 'color-bomb' && !tileA?.booster)) {
      this.objectives.useMove();
      const cbCol   = tileA?.booster === 'color-bomb' ? col1 : col2;
      const cbRow   = tileA?.booster === 'color-bomb' ? row1 : row2;
      const srcTile = tileA?.booster === 'color-bomb' ? tileB : tileA;
      await this._fireColorBomb(cbCol, cbRow, srcTile.type);
      await this._runCascade(-1, -1);
      this._updateHUD();
      if (!this.element) return;
      this._checkGameOver();
      this.busy = false;
      return;
    }

    if (tileA?.booster || tileB?.booster) {
      this.objectives.useMove();
      if (tileA?.booster) { await this._fireBooster(col1, row1, tileA.booster); if (!this.element) { this.busy = false; return; } }
      if (tileB?.booster) { await this._fireBooster(col2, row2, tileB.booster); if (!this.element) { this.busy = false; return; } }
      await this._runCascade(-1, -1);
      this._updateHUD();
      if (!this.element) return;
      this._checkGameOver();
      this.busy = false;
      return;
    }

    const matches = this.detector.findMatches();
    if (matches.length === 0) {
      await this._animateSwap(col1, row1, col2, row2);
      this.board.swapTiles(col1, row1, col2, row2);
      this._renderBoard();
      this._getTileEl(col1, row1)?.classList.add('shake');
      this._getTileEl(col2, row2)?.classList.add('shake');
      this.trexo?.react('noMatch');
      await this._wait(SHAKE_MS);
      this.busy = false;
      return;
    }

    this.objectives.useMove();
    await this._runCascade(col2, row2);
    this._updateHUD();
    if (!this.element) return;
    this._checkGameOver();
    this.busy = false;
  }

  // ── Cascade ───────────────────────────────────────

  async _runCascade(preferCol = -1, preferRow = -1) {
    let runs    = this.detector.findRuns();
    let squares = this.detector.find2x2Squares();

    while (runs.length > 0 || squares.length > 0) {
      if (!this.element) return;

      // ── Detect T/L junctions → bomb positions ─────
      const posOrient = new Map();
      for (const run of runs) {
        for (const p of run.positions) {
          const key = `${p.col},${p.row}`;
          if (!posOrient.has(key)) posOrient.set(key, new Set());
          posOrient.get(key).add(run.orientation);
        }
      }
      const tljunctions = new Set();
      for (const [key, oSet] of posOrient) {
        if (oSet.has('h') && oSet.has('v')) tljunctions.add(key);
      }

      // ── Classify each run ─────────────────────────
      const removeSet     = new Set();
      const newRockets    = [];
      const newBombs      = [];
      const newColorBombs = [];
      const newPteros     = [];
      const assignedKeys  = new Set();

      for (const run of runs) {
        // 1. T/L junction present → bomb
        let junctionKey = null, junction = null;
        for (const p of run.positions) {
          const key = `${p.col},${p.row}`;
          if (tljunctions.has(key) && !assignedKeys.has(key)) { junctionKey = key; junction = p; break; }
        }

        if (junction) {
          assignedKeys.add(junctionKey);
          newBombs.push({ col: junction.col, row: junction.row });
          for (const p of run.positions) {
            const key = `${p.col},${p.row}`;
            if (!assignedKeys.has(key)) removeSet.add(key);
          }
        } else if (run.length >= 5) {
          // 2. 5-in-line → color-bomb
          let cbIdx = Math.floor(run.positions.length / 2);
          if (preferCol >= 0) {
            for (let i = 0; i < run.positions.length; i++) {
              if (run.positions[i].col === preferCol && run.positions[i].row === preferRow) { cbIdx = i; break; }
            }
          }
          const cbp = run.positions[cbIdx], cbKey = `${cbp.col},${cbp.row}`;
          if (!assignedKeys.has(cbKey) && !removeSet.has(cbKey)) {
            assignedKeys.add(cbKey);
            newColorBombs.push({ col: cbp.col, row: cbp.row });
          }
          for (const p of run.positions) {
            const key = `${p.col},${p.row}`;
            if (!assignedKeys.has(key)) removeSet.add(key);
          }
        } else if (run.length === 4) {
          // 3. 4-in-line → rocket
          let rIdx = Math.floor(run.positions.length / 2);
          if (preferCol >= 0) {
            for (let i = 0; i < run.positions.length; i++) {
              if (run.positions[i].col === preferCol && run.positions[i].row === preferRow) { rIdx = i; break; }
            }
          }
          const rp = run.positions[rIdx], rpKey = `${rp.col},${rp.row}`;
          if (!assignedKeys.has(rpKey) && !removeSet.has(rpKey)) {
            assignedKeys.add(rpKey);
            const tile = this.board.getTile(rp.col, rp.row);
            if (tile) newRockets.push({ col: rp.col, row: rp.row, booster: run.orientation === 'h' ? 'rocket-h' : 'rocket-v' });
          }
          for (const p of run.positions) {
            const key = `${p.col},${p.row}`;
            if (!assignedKeys.has(key)) removeSet.add(key);
          }
        } else {
          // 3. Normal match
          for (const p of run.positions) {
            const key = `${p.col},${p.row}`;
            if (!assignedKeys.has(key)) removeSet.add(key);
          }
        }
      }

      // ── Detect 2×2 squares → ptero positions ─────
      for (const sq of squares) {
        const sqKeys = sq.positions.map(p => `${p.col},${p.row}`);
        if (sqKeys.some(k => removeSet.has(k) || assignedKeys.has(k))) continue;
        const pteroPos = sq.positions[0];
        assignedKeys.add(`${pteroPos.col},${pteroPos.row}`);
        newPteros.push({ col: pteroPos.col, row: pteroPos.row });
        for (const p of sq.positions) {
          const key = `${p.col},${p.row}`;
          if (!assignedKeys.has(key)) removeSet.add(key);
        }
      }

      // ── Activate existing boosters caught in removeSet ──
      const initSize = removeSet.size;
      for (const key of [...removeSet]) {
        const [c, r] = key.split(',').map(Number);
        const tile   = this.board.getTile(c, r);
        if      (tile?.booster === 'rocket-h') { for (let cc = 0; cc < this.board.cols; cc++) removeSet.add(`${cc},${r}`); }
        else if (tile?.booster === 'rocket-v') { for (let rr = 0; rr < this.board.rows; rr++) removeSet.add(`${c},${rr}`); }
        else if (tile?.booster === 'bomb') {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < this.board.rows && cc >= 0 && cc < this.board.cols) removeSet.add(`${cc},${rr}`);
          }
        }
      }

      // ── Adjacent crate damage ─────────────────────
      const boxDamaged    = [];
      const checkedCrates = new Set();
      for (const key of [...removeSet]) {
        const [c, r] = key.split(',').map(Number);
        for (const [dc, dr] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nc = c + dc, nr = r + dr;
          if (nc < 0 || nc >= this.board.cols || nr < 0 || nr >= this.board.rows) continue;
          const nKey = `${nc},${nr}`;
          if (removeSet.has(nKey) || checkedCrates.has(nKey)) continue;
          const nt = this.board.getTile(nc, nr);
          if (!nt?.obstacle?.startsWith('box')) continue;
          checkedCrates.add(nKey);
          if      (nt.obstacle === 'box-1') removeSet.add(nKey);
          else if (nt.obstacle === 'box-2') boxDamaged.push({ col: nc, row: nr, newObstacle: 'box-1' });
          else if (nt.obstacle === 'box-3') boxDamaged.push({ col: nc, row: nr, newObstacle: 'box-2' });
        }
      }

      const hasBooster = newRockets.length > 0 || newBombs.length > 0 || newColorBombs.length > 0 || newPteros.length > 0 || removeSet.size > initSize;
      const pts        = removeSet.size * POINTS_PER_TILE + (hasBooster ? Math.max(ROCKET_BONUS, BOMB_BONUS) : 0);
      this.objectives.addScore(pts);
      this._updateHUD();
      this._bumpScore();
      { const _r = newColorBombs.length > 0 ? 'colorBomb'
                 : newPteros.length > 0 ? 'ptero'
                 : newBombs.length > 0 || removeSet.size > initSize ? 'bomb'
                 : hasBooster ? 'rocket'
                 : removeSet.size >= 5 ? 'bigMatch' : 'match';
        this.trexo?.react(_r);
        if (['colorBomb','ptero','bomb','rocket'].includes(_r)) this.dangerPanel?.onBooster();
        else this.dangerPanel?.onMatch(); }

      // Obstacle destruction particles + sounds + HUD fly
      { const g = this._gridEl(); let flyCap = 0;
        if (g) for (const key of removeSet) {
          const [c, r] = key.split(',').map(Number);
          const tile = this.board.getTile(c, r), el = this._getTileEl(c, r);
          if (!tile || !el) continue;
          const hR = g.getBoundingClientRect(), eR = el.getBoundingClientRect();
          const cx = eR.left + eR.width/2 - hR.left, cy = eR.top + eR.height/2 - hR.top;
          if (tile.obstacle === 'egg') {
            FX.debris(g, el, { count: 6, colors: FX.C_EGG, dur: 380 });
            SoundManager.obstacleDestroy();
            if (flyCap++ < 2) { FX.objectiveFly(el, '\u{1F95A}', 'egg-count', { type: 'egg' }); SoundManager.objectiveFly(); }
          } else if (tile.obstacle === 'box-1') {
            FX.debris(g, el, { count: 7, colors: FX.C_DEBRIS, dur: 420 });
            FX.sparks(g, cx, cy, { count: 5, dur: 340 });
            SoundManager.obstacleDestroy();
            if (flyCap++ < 2) { FX.objectiveFly(el, '\u{1F4E6}', 'box-count', { type: 'box' }); SoundManager.objectiveFly(); }
          } else if (tile.obstacle === 'liana-1') {
            FX.leaves(g, cx, cy, { count: 7, dur: 420 });
            SoundManager.obstacleDestroy();
            if (flyCap++ < 2) { FX.objectiveFly(el, '\u{1F33F}', 'liana-count', { type: 'vine' }); SoundManager.objectiveFly(); }
          }
        }
      }
      for (const key of removeSet) {
        const [c, r] = key.split(',').map(Number);
        this._getTileEl(c, r)?.classList.add('matched');
      }
      // Brief explosion visual for new special tile positions
      for (const nb  of newBombs)      this._getTileEl(nb.col,  nb.row)?.classList.add('bomb-create');
      for (const ncb of newColorBombs) this._getTileEl(ncb.col, ncb.row)?.classList.add('color-bomb-create');
      for (const np  of newPteros)     this._getTileEl(np.col,  np.row)?.classList.add('ptero-create');

      await this._wait(POP_MS);
      if (!this.element) return;

      const removeArr = [...removeSet].map(k => { const [col, row] = k.split(',').map(Number); return { col, row }; });
      this.board.removeMatched(this._applyObstacleHits(removeArr));

      // Place new rockets
      for (const nr of newRockets) {
        if (!removeSet.has(`${nr.col},${nr.row}`)) {
          const tile = this.board.getTile(nr.col, nr.row);
          if (tile) tile.booster = nr.booster;
        }
      }
      // Place new bombs
      for (const nb of newBombs) {
        if (!removeSet.has(`${nb.col},${nb.row}`)) {
          const tile = this.board.getTile(nb.col, nb.row);
          if (tile) tile.booster = 'bomb';
        }
      }
      // Place new color-bombs
      for (const ncb of newColorBombs) {
        if (!removeSet.has(`${ncb.col},${ncb.row}`)) {
          const tile = this.board.getTile(ncb.col, ncb.row);
          if (tile) tile.booster = 'color-bomb';
        }
      }
      // Place new pteros
      for (const np of newPteros) {
        if (!removeSet.has(`${np.col},${np.row}`)) {
          const tile = this.board.getTile(np.col, np.row);
          if (tile) tile.booster = 'ptero';
        }
      }
      // Crack adjacent crates (reduce resistance) + hit feedback
      for (const p of boxDamaged) {
        const tile = this.board.getTile(p.col, p.row);
        if (tile) tile.obstacle = p.newObstacle;
        FX.tileHit(this._getTileEl(p.col, p.row));
      }

      this.board.applyGravity();
      this.board.refill();
      this._renderBoard();
      await this._wait(FALL_MS);
      if (!this.element) return;

      preferCol = preferRow = -1;
      runs    = this.detector.findRuns();
      squares = this.detector.find2x2Squares();
    }

    if (!this.objectives.isOver() && !this.detector.hasValidMoves()) await this._shuffleBoard();
  }

  async _shuffleBoard() {
    if (!this.element) return;
    let attempts = 0;
    do {
      const flat = this.board.grid.flat();
      for (let i = flat.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = flat[i].type; flat[i].type = flat[j].type; flat[j].type = tmp;
      }
      attempts++;
    } while (!this.detector.hasValidMoves() && attempts < 6);
    this._renderBoard();
  }

  _checkGameOver() {
    if (!this.objectives.isOver() || this._gameEnded) return;
    this._gameEnded = true;
    clearInterval(this._timerInterval);
    const won = this.objectives.isWon();
    this.trexo?.react(won ? 'win' : 'lose');
    this.dangerPanel?.[won ? 'onWin' : 'onLose']();
    if (won) {
      this._deliverRewards();
      setTimeout(() => { if (this.element) this._showRewardModal(); }, 800);
    } else {
      setTimeout(() => {
        if (!this.element) return;
        const overlay = this.element.querySelector('#game-overlay');
        const emojiEl = this.element.querySelector('#overlay-emoji');
        const msgEl   = this.element.querySelector('#overlay-msg');
        if (!overlay) return;
        emojiEl.textContent = '😢';
        msgEl.textContent   = 'T-REXo necesita otro intento.';
        overlay.classList.remove('hidden');
      }, 500);
    }
  }

  _deliverRewards() {
    if (this._rewardGiven) return;
    this._rewardGiven = true;

    addFragment('trexo');
    addCoins(50);

    const BOOSTERS = [
      { key: 'rocket',    icon: '🚀', name: 'Cohete' },
      { key: 'bomb',      icon: '💣', name: 'Bomba' },
      { key: 'colorBomb', icon: '🌈', name: 'Arcoíris' },
      { key: 'ptero',     icon: '🦅', name: 'Pterodáctilo' },
    ];
    const pick = BOOSTERS[Math.floor(Math.random() * BOOSTERS.length)];
    const inv  = getInventory();
    inv[pick.key] = (inv[pick.key] ?? 0) + 1;
    saveInventory(inv);
    this._wonBooster = pick;
  }

  _showRewardModal() {
    const overlay = this.element?.querySelector('#victory-overlay');
    if (!overlay || !this._wonBooster) return;

    overlay.querySelector('#vc-booster-icon').textContent = this._wonBooster.icon;
    overlay.querySelector('#vc-booster-name').textContent = this._wonBooster.name;

    // Calculate stars from remaining time
    const pct   = this._timeLeft / LEVEL_TIME;
    const stars  = pct > 0.5 ? 3 : pct > 0.2 ? 2 : 1;

    // Persist best star count
    try {
      const prev = parseInt(localStorage.getItem('trexo_level_stars') ?? '0', 10) || 0;
      if (stars > prev) localStorage.setItem('trexo_level_stars', String(stars));
    } catch {}

    overlay.classList.remove('hidden');

    // Animate stars in sequence
    const starEls = overlay.querySelectorAll('.vc-star');
    starEls.forEach((el, i) => {
      if (i < stars) {
        setTimeout(() => {
          el.classList.remove('vc-star--dim');
          el.classList.add('vc-star--earned');
        }, 350 + i * 300);
      }
    });

    // Confetti for 2+ stars
    if (stars >= 2) {
      setTimeout(() => this._spawnVictoryConfetti(overlay.querySelector('#vc-confetti')), 500);
    }
  }

  _spawnVictoryConfetti(container) {
    if (!container) return;
    const COLORS = ['#ffd700','#ff6b35','#28a85f','#4895ef','#9b5de5','#ff6b6b','#fff'];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement('div');
      el.className = 'vc-confetti-piece';
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = COLORS[i % COLORS.length];
      el.style.animationDelay = `${(Math.random() * 0.5).toFixed(2)}s`;
      el.style.animationDuration = `${(0.7 + Math.random() * 0.6).toFixed(2)}s`;
      el.style.setProperty('--cf-x', `${((Math.random() - 0.5) * 110).toFixed(0)}px`);
      el.style.width  = `${5 + Math.floor(Math.random() * 5)}px`;
      el.style.height = `${8 + Math.floor(Math.random() * 6)}px`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }
  }

  _applyObstacleHits(positions) {
    const keep = [];
    for (const p of positions) {
      const tile = this.board.getTile(p.col, p.row);
      if (!tile) { keep.push(p); continue; }
      if (tile.obstacle === 'egg') {
        tile.obstacle = null; this.objectives.breakEgg(); keep.push(p);
      } else if (tile.obstacle === 'box-1') {
        tile.obstacle = null; this.objectives.breakBox(); keep.push(p);
      } else if (tile.obstacle === 'box-2') {
        tile.obstacle = 'box-1'; // damaged, stays on board
      } else if (tile.obstacle === 'box-3') {
        tile.obstacle = 'box-2'; // damaged, stays on board
      } else if (tile.obstacle === 'liana-1') {
        tile.obstacle = null; this.objectives.breakLiana();
        this._lianasBrokenThisTurn.push({ col: p.col, row: p.row });
        // tile stays on board — do NOT push to keep
      } else if (tile.obstacle === 'liana-2') {
        tile.obstacle = 'liana-1'; // cracked, stays on board
      } else {
        keep.push(p); // normal tile → remove
      }
    }
    return keep;
  }

  _injectFossilEggs(count = EGG_COUNT) {
    const skip = new Set();
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        if (this.board.getTile(c, r)?.booster) skip.add(`${c},${r}`);
      }
    }
    let placed = 0, attempts = 0;
    while (placed < count && attempts < 300) {
      attempts++;
      const col = Math.floor(Math.random() * this.board.cols);
      const row = Math.floor(Math.random() * this.board.rows);
      const key = `${col},${row}`;
      if (skip.has(key)) continue;
      const tile = this.board.getTile(col, row);
      if (tile && !tile.obstacle) {
        tile.obstacle = 'egg';
        skip.add(key);
        placed++;
      }
    }
  }

  // ── Double-bomb combo ────────────────────────────

  async _fireDoubleBomb(col1, row1, col2, row2) {
    if (!this.element) return;

    this.trexo?.react('megaBomb');
    this.trexo?.say('¡Mega explosión Rex!', '🔥');
    this.dangerPanel?.onMegaCombo();

    // Phase 1: both bombs build up
    this._getTileEl(col1, row1)?.classList.add('bomb-launch');
    this._getTileEl(col2, row2)?.classList.add('bomb-launch');
    await this._wait(260);
    if (!this.element) return;

    // 5×5 area centered between the two bombs
    const cCol = Math.round((col1 + col2) / 2);
    const cRow = Math.round((row1 + row2) / 2);
    const affected = [];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = cRow + dr, c = cCol + dc;
        if (r >= 0 && r < this.board.rows && c >= 0 && c < this.board.cols)
          affected.push({ col: c, row: r });
      }
    }

    // Phase 2: big flash + double shockwave + shake + premium FX
    const gridEl = this.element.querySelector('#board-grid');
    if (gridEl) {
      const flash = document.createElement('div');
      flash.className = 'bomb-flash double-bomb-flash';
      gridEl.appendChild(flash);
      setTimeout(() => flash.remove(), 340);

      const refEl = this._getTileEl(col1, row1);
      if (refEl) {
        const bRect = refEl.getBoundingClientRect();
        const gRect = gridEl.getBoundingClientRect();
        const bx = bRect.left + bRect.width / 2 - gRect.left;
        const by = bRect.top  + bRect.height / 2 - gRect.top;
        const wave  = document.createElement('div');
        wave.className = 'bomb-shockwave double-bomb-shockwave';
        wave.style.left = `${bx}px`;
        wave.style.top  = `${by}px`;
        gridEl.appendChild(wave);
        setTimeout(() => wave.remove(), 950);
        SoundManager.megaBombBlast();
        FX.flash(gridEl, bx, by, { color: '#ff7000', dur: 460, size: 2.0 });
        FX.multiRing(gridEl, bx, by, { rings: 3, color: 'rgba(255,80,0,1)', dur: 700 });
        FX.sparks(gridEl, bx, by, { count: 12 });
        FX.smoke(gridEl, bx, by, { count: 7 });
        FX.comboFlash(gridEl, { color: 'rgba(255,60,0,0.50)', dur: 240 });
      }
      FX.shake(gridEl, 'strong');
    }

    // Phase 3: tiles burst outward with stagger
    for (const p of affected) {
      const el = this._getTileEl(p.col, p.row);
      if (el) {
        const dx = p.col - cCol, dy = p.row - cRow;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        el.style.setProperty('--ex', `${dx * 30}px`);
        el.style.setProperty('--ey', `${dy * 30}px`);
        el.style.setProperty('--bomb-delay', `${dist * 32}ms`);
        el.classList.add('bomb-explode');
      }
    }

    this.objectives.addScore(affected.length * POINTS_PER_TILE + DOUBLE_BOMB_BONUS);
    this._updateHUD();
    this._bumpScore();
    await this._wait(400);
    if (!this.element) return;

    for (const p of affected) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('bomb-explode'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(affected));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Rocket + Bomb combo fire ──────────────────────

  async _fireRocketBomb(col1, row1, col2, row2) {
    if (!this.element) return;

    this.trexo?.react('rocketBomb');
    this.trexo?.say('¡Mega cohete Rex!', '💥');
    this.dangerPanel?.onMegaCombo();

    // Phase 1: both boosters build up
    this._getTileEl(col1, row1)?.classList.add('bomb-launch');
    this._getTileEl(col2, row2)?.classList.add('bomb-launch');
    await this._wait(240);
    if (!this.element) return;

    // Cross center between the two boosters
    const cCol = Math.round((col1 + col2) / 2);
    const cRow = Math.round((row1 + row2) / 2);

    // 3 full rows + 3 full columns centered at cCol/cRow
    const affectedSet = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      const r = cRow + dr;
      if (r >= 0 && r < this.board.rows)
        for (let c = 0; c < this.board.cols; c++) affectedSet.add(`${c},${r}`);
    }
    for (let dc = -1; dc <= 1; dc++) {
      const c = cCol + dc;
      if (c >= 0 && c < this.board.cols)
        for (let r = 0; r < this.board.rows; r++) affectedSet.add(`${c},${r}`);
    }
    const affected = [...affectedSet]
      .map(k => { const [c, r] = k.split(',').map(Number); return { col: c, row: r }; })
      .sort((a, b) => (Math.abs(a.col - cCol) + Math.abs(a.row - cRow)) - (Math.abs(b.col - cCol) + Math.abs(b.row - cRow)));

    // Phase 2: flash + shockwave + shake + premium FX
    const gridEl = this.element.querySelector('#board-grid');
    if (gridEl) {
      const flash = document.createElement('div');
      flash.className = 'bomb-flash double-bomb-flash';
      gridEl.appendChild(flash);
      setTimeout(() => flash.remove(), 280);

      const refEl = this._getTileEl(col1, row1);
      if (refEl) {
        const bRect = refEl.getBoundingClientRect();
        const gRect = gridEl.getBoundingClientRect();
        const bx = bRect.left + bRect.width  / 2 - gRect.left;
        const by = bRect.top  + bRect.height / 2 - gRect.top;
        const wave  = document.createElement('div');
        wave.className = 'bomb-shockwave';
        wave.style.left = `${bx}px`;
        wave.style.top  = `${by}px`;
        gridEl.appendChild(wave);
        setTimeout(() => wave.remove(), 700);
        SoundManager.megaCombo();
        FX.flash(gridEl, bx, by, { color: '#ffd24a', dur: 420, size: 1.7 });
        FX.multiRing(gridEl, bx, by, { rings: 2, color: 'rgba(255,200,0,1)', dur: 580 });
        FX.sparks(gridEl, bx, by, { count: 12 });
        FX.comboFlash(gridEl, { color: 'rgba(255,200,80,0.45)', dur: 220 });
      }
      FX.shake(gridEl, 'strong');
    }

    // Phase 3: radiating cross sweep from center outward
    const STAGGER = 12;
    affected.forEach((p, i) => {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.style.setProperty('--sweep-delay', `${i * STAGGER}ms`); el.classList.add('rocket-sweep'); }
    });

    this.objectives.addScore(affected.length * POINTS_PER_TILE + ROCKET_BONUS + BOMB_BONUS);
    this._updateHUD();
    this._bumpScore();
    await this._wait((affected.length - 1) * STAGGER + 280);
    if (!this.element) return;

    for (const p of affected) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('rocket-sweep'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;

    this.board.removeMatched(this._applyObstacleHits(affected));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Cruz Dino: Rocket + Rocket ───────────────────

  async _fireDoubleRocket(col1, row1, col2, row2) {
    if (!this.element) return;
    this.trexo?.react('dinoCross');
    this.trexo?.say('¡Cruz Dino!', '⚡');
    this.dangerPanel?.onMegaCombo();

    this._getTileEl(col1, row1)?.classList.add('rocket-launch');
    this._getTileEl(col2, row2)?.classList.add('rocket-launch');
    await this._wait(180);
    if (!this.element) return;

    const cCol = Math.round((col1 + col2) / 2);
    const cRow = Math.round((row1 + row2) / 2);
    const affSet = new Set();
    for (let c = 0; c < this.board.cols; c++) affSet.add(`${c},${cRow}`);
    for (let r = 0; r < this.board.rows; r++) affSet.add(`${cCol},${r}`);
    const affected = [...affSet]
      .map(k => { const [c, r] = k.split(',').map(Number); return { col: c, row: r }; })
      .sort((a, b) =>
        (Math.abs(a.col - cCol) + Math.abs(a.row - cRow)) -
        (Math.abs(b.col - cCol) + Math.abs(b.row - cRow)));

    const gridEl = this.element.querySelector('#board-grid');
    if (gridEl) {
      const flash = document.createElement('div');
      flash.className = 'bomb-flash';
      gridEl.appendChild(flash);
      setTimeout(() => flash.remove(), 220);
      gridEl.classList.add('board-shake');
      setTimeout(() => gridEl.classList.remove('board-shake'), 320);

      const refEl2 = this._getTileEl(cCol, cRow) || this._getTileEl(col1, row1);
      if (refEl2) {
        const bRect2 = refEl2.getBoundingClientRect();
        const gRect2 = gridEl.getBoundingClientRect();
        const bx2 = bRect2.left + bRect2.width  / 2 - gRect2.left;
        const by2 = bRect2.top  + bRect2.height / 2 - gRect2.top;
        SoundManager.rocketCross();
        FX.rocketBeam(gridEl, refEl2, true);
        FX.rocketBeam(gridEl, refEl2, false);
        FX.rocketHead(gridEl, refEl2, true);
        FX.rocketHead(gridEl, refEl2, false);
        FX.flash(gridEl, bx2, by2, { color: '#ffe680', dur: 400, size: 1.6 });
        FX.comboFlash(gridEl, { color: 'rgba(255,230,80,0.40)', dur: 200 });
        FX.multiRing(gridEl, bx2, by2, { rings: 2, color: 'rgba(255,220,0,1)', dur: 500 });
      }
    }

    const STAGGER = 13;
    affected.forEach((p, i) => {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.style.setProperty('--sweep-delay', `${i * STAGGER}ms`); el.classList.add('rocket-sweep'); }
    });
    this.objectives.addScore(affected.length * POINTS_PER_TILE + CROSS_BONUS);
    this._updateHUD(); this._bumpScore();
    await this._wait((affected.length - 1) * STAGGER + 220);
    if (!this.element) return;

    for (const p of affected) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('rocket-sweep'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;
    this.board.removeMatched(this._applyObstacleHits(affected));
    this.board.applyGravity(); this.board.refill(); this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Bomba Aérea: Ptero + Bomb ─────────────────────

  async _firePteroBomb(ptCol, ptRow, bmCol, bmRow) {
    if (!this.element) return;
    this.trexo?.react('pteroBomb');
    this.dangerPanel?.onMegaCombo();

    SoundManager.pteroLaunch();
    this._getTileEl(ptCol, ptRow)?.classList.add('ptero-launch');
    await this._wait(200);
    if (!this.element) return;

    const target = this._findPriorityTarget([{ col: ptCol, row: ptRow }, { col: bmCol, row: bmRow }]);
    const targetEl = this._getTileEl(target.col, target.row);
    if (targetEl) targetEl.classList.add('ptero-impact');
    await this._wait(260);
    if (!this.element) return;

    const explosion = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = target.row + dr, c = target.col + dc;
        if (r >= 0 && r < this.board.rows && c >= 0 && c < this.board.cols)
          explosion.push({ col: c, row: r });
      }
    }

    const gridEl = this.element.querySelector('#board-grid');
    if (gridEl && targetEl) {
      const bRect = targetEl.getBoundingClientRect();
      const gRect = gridEl.getBoundingClientRect();
      const bx = bRect.left + bRect.width  / 2 - gRect.left;
      const by = bRect.top  + bRect.height / 2 - gRect.top;
      const wave  = document.createElement('div');
      wave.className = 'bomb-shockwave';
      wave.style.left = `${bx}px`;
      wave.style.top  = `${by}px`;
      gridEl.appendChild(wave);
      setTimeout(() => wave.remove(), 680);
      gridEl.classList.add('board-shake');
      setTimeout(() => gridEl.classList.remove('board-shake'), 360);
      SoundManager.megaCombo();
      FX.pteroFlight(gridEl, this._getTileEl(ptCol, ptRow) ?? targetEl, targetEl);
      FX.leaves(gridEl, bx, by, { count: 8, dur: 480 });
      FX.multiRing(gridEl, bx, by, { rings: 2, color: 'rgba(100,200,60,1)', dur: 580 });
      FX.comboFlash(gridEl, { color: 'rgba(80,200,80,0.35)', dur: 220 });
    }

    for (const p of explosion) {
      const el = this._getTileEl(p.col, p.row);
      if (el) {
        const dx = p.col - target.col, dy = p.row - target.row;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        el.style.setProperty('--ex', `${dx * 24}px`);
        el.style.setProperty('--ey', `${dy * 24}px`);
        el.style.setProperty('--bomb-delay', `${dist * 28}ms`);
        el.classList.add('bomb-explode');
      }
    }

    const allSet = new Map();
    for (const p of explosion) allSet.set(`${p.col},${p.row}`, p);
    allSet.set(`${ptCol},${ptRow}`, { col: ptCol, row: ptRow });
    allSet.set(`${bmCol},${bmRow}`, { col: bmCol, row: bmRow });
    const allRemove = [...allSet.values()];

    this.objectives.addScore(allRemove.length * POINTS_PER_TILE + PTERO_BOMB_BONUS);
    this._updateHUD(); this._bumpScore();
    await this._wait(360);
    if (!this.element) return;

    for (const p of allRemove) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('bomb-explode', 'ptero-impact', 'ptero-launch'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;
    this.board.removeMatched(this._applyObstacleHits(allRemove));
    this.board.applyGravity(); this.board.refill(); this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Doble Ataque Aéreo: Ptero + Ptero ────────────

  async _fireDoublePtero(col1, row1, col2, row2) {
    if (!this.element) return;
    this.trexo?.react('doublePtero');
    this.dangerPanel?.onMegaCombo();

    SoundManager.pteroLaunch();
    this._getTileEl(col1, row1)?.classList.add('ptero-launch');
    this._getTileEl(col2, row2)?.classList.add('ptero-launch');
    await this._wait(200);
    if (!this.element) return;

    const gridElPt = this.element.querySelector('#board-grid');
    const excludes  = [{ col: col1, row: row1 }, { col: col2, row: row2 }];
    const toRemove  = [...excludes];
    for (let i = 0; i < 3; i++) {
      const t = this._findPriorityTarget(excludes);
      excludes.push(t);
      toRemove.push(t);
      const el = this._getTileEl(t.col, t.row);
      if (el) {
        el.style.setProperty('--cb-delay', `${i * 90}ms`);
        el.classList.add('ptero-impact');
        if (gridElPt) {
          const hR = gridElPt.getBoundingClientRect(), tR = el.getBoundingClientRect();
          const cx = tR.left + tR.width/2 - hR.left, cy = tR.top + tR.height/2 - hR.top;
          setTimeout(() => {
            SoundManager.pteroImpact();
            FX.leaves(gridElPt, cx, cy, { count: 5, dur: 380 });
          }, i * 90);
        }
      }
    }
    SoundManager.megaCombo();
    if (gridElPt) FX.comboFlash(gridElPt, { color: 'rgba(80,200,80,0.35)', dur: 220 });

    this.objectives.addScore(toRemove.length * POINTS_PER_TILE + DOUBLE_PTERO_BONUS);
    this._updateHUD(); this._bumpScore();
    await this._wait(380);
    if (!this.element) return;

    for (const p of toRemove) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('ptero-impact', 'ptero-launch'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;
    this.board.removeMatched(this._applyObstacleHits(toRemove));
    this.board.applyGravity(); this.board.refill(); this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Priority target finder ────────────────────────

  _findPriorityTarget(excludes = []) {
    const excSet = new Set(excludes.map(p => `${p.col},${p.row}`));
    const boxes = [], lianas = [], eggs = [], normals = [];
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        if (excSet.has(`${c},${r}`)) continue;
        const tile = this.board.getTile(c, r);
        if (!tile) continue;
        if      (tile.obstacle?.startsWith('box'))   boxes.push({ col: c, row: r });
        else if (tile.obstacle?.startsWith('liana'))  lianas.push({ col: c, row: r });
        else if (tile.obstacle === 'egg')             eggs.push({ col: c, row: r });
        else if (!tile.booster)                       normals.push({ col: c, row: r });
      }
    }
    const rnd = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    return rnd(boxes) ?? rnd(lianas) ?? rnd(eggs) ?? rnd(normals) ?? { col: 0, row: 0 };
  }

  _injectDinoCrates() {
    // Fixed cluster pattern: bottom rows (7,6) + middle row (4)
    // Resistances: 1=easy, 2=medium, 3=hard
    const pattern = [
      { col: 2, row: 7, res: 1 }, { col: 3, row: 7, res: 2 },
      { col: 4, row: 7, res: 2 }, { col: 5, row: 7, res: 1 },
      { col: 3, row: 6, res: 2 }, { col: 4, row: 6, res: 3 },
      { col: 1, row: 4, res: 3 }, { col: 6, row: 4, res: 3 },
    ];
    for (const { col, row, res } of pattern) {
      const tile = this.board.getTile(col, row);
      if (tile && !tile.booster) tile.obstacle = `box-${res}`;
    }
  }

  _injectLianas() {
    // Middle zone, some near crates (rows 4,6,7) — avoids existing obstacles
    const pattern = [
      { col: 0, row: 3, res: 2 },
      { col: 3, row: 3, res: 1 },
      { col: 5, row: 3, res: 2 },
      { col: 7, row: 3, res: 1 },
      { col: 2, row: 5, res: 1 },
      { col: 5, row: 5, res: 2 },
    ];
    for (const { col, row, res } of pattern) {
      const tile = this.board.getTile(col, row);
      if (tile && !tile.booster && !tile.obstacle) tile.obstacle = `liana-${res}`;
    }
  }

  _injectTwoBoosters() {
    const ALIAS = {
      rainbow: 'color-bomb', rocket: 'rocket-h', normal: null,
      // No existe nave espacial: flying/eagle/bird/spaceship/ufo/ship/nave → ptero (único volador real)
      flying: 'ptero', eagle: 'ptero', bird: 'ptero',
      spaceship: 'ptero', ufo: 'ptero', ship: 'ptero', nave: 'ptero',
    };
    const norm = (b) => (b in ALIAS ? ALIAS[b] : b);
    const [raw1, raw2] = GameConfig.debug.TEST_BOOSTER_PAIR ?? ['bomb', 'bomb'];
    const b1 = norm(raw1), b2 = norm(raw2);
    const used = new Set();
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const t = this.board.getTile(c, r);
        if (t?.booster || t?.obstacle) used.add(`${c},${r}`);
      }
    }
    let placed = false;
    for (let r = 0; r < this.board.rows && !placed; r++) {
      for (let c = 0; c < this.board.cols - 1 && !placed; c++) {
        if (used.has(`${c},${r}`) || used.has(`${c + 1},${r}`)) continue;
        const t1 = this.board.getTile(c, r);
        const t2 = this.board.getTile(c + 1, r);
        if (!t1 || !t2 || t1.obstacle || t2.obstacle) continue;
        if (b1) t1.booster = b1;
        if (b2) t2.booster = b2;
        placed = true;
      }
    }
    if (this.element) {
      const badge = document.createElement('div');
      badge.id = 'debug-badge';
      badge.textContent = `🧪 Prueba: ${b1 ?? 'normal'} + ${b2 ?? 'normal'}`;
      badge.style.cssText = 'position:fixed;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#ffd60a;font-size:0.68rem;padding:2px 8px;border-radius:10px;pointer-events:none;z-index:999;letter-spacing:.03em';
      document.body.appendChild(badge);
    }
  }

  _injectBoosterPairs() {
    // All combos to test — pairs placed adjacent horizontally
    const pairs = [
      ['bomb',        'bomb'       ],  // 1. mega explosión
      ['rocket-h',    'rocket-v'   ],  // 2. Cruz Dino
      ['bomb',        'rocket-h'   ],  // 3. Mega Cohete
      ['color-bomb',  'rocket-h'   ],  // 4. arcoíris + cohete
      ['color-bomb',  'bomb'       ],  // 5. arcoíris + bomba
      ['color-bomb',  'color-bomb' ],  // 6. limpieza total
      ['ptero',       'bomb'       ],  // 7. Bomba aérea
      ['ptero',       'ptero'      ],  // 8. Doble ataque
      ['ptero',       'rocket-h'   ],  // 9. ptero + cohete
    ];
    // Note: color-bomb + pieza normal is testable by swapping any placed color-bomb
    // with an adjacent normal tile (it's always adjacent to one by default).

    const used = new Set();
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const t = this.board.getTile(c, r);
        if (t?.booster || t?.obstacle) used.add(`${c},${r}`);
      }
    }
    for (const [b1, b2] of pairs) {
      let placed = false, attempts = 0;
      while (!placed && attempts < 400) {
        attempts++;
        const col = Math.floor(Math.random() * this.board.cols);
        const row = Math.floor(Math.random() * this.board.rows);
        if (used.has(`${col},${row}`)) continue;
        // prefer horizontal placement to avoid accidental 3-in-line vertically
        const col2 = col + 1;
        if (col2 >= this.board.cols) continue;
        if (used.has(`${col2},${row}`)) continue;
        const t1 = this.board.getTile(col,  row);
        const t2 = this.board.getTile(col2, row);
        if (!t1 || !t2 || t1.obstacle || t2.obstacle) continue;
        t1.booster = b1;
        t2.booster = b2;
        used.add(`${col},${row}`);
        used.add(`${col2},${row}`);
        placed = true;
      }
    }

    // Debug badge
    if (this.element) {
      const badge = document.createElement('div');
      badge.id = 'debug-badge';
      badge.textContent = '🧪 Modo prueba boosters';
      badge.style.cssText = 'position:fixed;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#ffd60a;font-size:0.68rem;padding:2px 8px;border-radius:10px;pointer-events:none;z-index:999;letter-spacing:.03em';
      document.body.appendChild(badge);
    }
  }

  _injectStartingBoosters() {
    const rocket   = Math.random() < 0.5 ? 'rocket-h' : 'rocket-v';
    const boosters = ['bomb', rocket, 'color-bomb', 'ptero'];
    const used     = new Set();
    for (const booster of boosters) {
      let col, row, key;
      let attempts = 0;
      do {
        col = Math.floor(Math.random() * this.board.cols);
        row = Math.floor(Math.random() * this.board.rows);
        key = `${col},${row}`;
        attempts++;
      } while (used.has(key) && attempts < 100);
      used.add(key);
      const tile = this.board.getTile(col, row);
      if (tile) tile.booster = booster;
    }
  }

  _injectPendingBoosters() {
    try {
      const raw = localStorage.getItem('trexo_pending_boosters');
      if (!raw) return;
      const pending = JSON.parse(raw);
      localStorage.removeItem('trexo_pending_boosters');
      const MAP = { rocket: 'rocket-h', bomb: 'bomb', colorBomb: 'color-bomb', ptero: 'ptero' };
      const used = new Set();
      for (let r = 0; r < this.board.rows; r++)
        for (let c = 0; c < this.board.cols; c++) {
          const t = this.board.getTile(c, r);
          if (t?.obstacle || t?.booster) used.add(`${c},${r}`);
        }
      for (const [key, count] of Object.entries(pending)) {
        const booster = MAP[key];
        if (!booster || count <= 0) continue;
        for (let i = 0; i < count; i++) {
          let placed = false, att = 0;
          while (!placed && att++ < 300) {
            const col = Math.floor(Math.random() * this.board.cols);
            const row = Math.floor(Math.random() * this.board.rows);
            const k   = `${col},${row}`;
            if (used.has(k)) continue;
            const tile = this.board.getTile(col, row);
            if (tile && !tile.obstacle && !tile.booster) {
              tile.booster = booster;
              used.add(k);
              placed = true;
            }
          }
        }
      }
    } catch {}
  }

  _startTimer() {
    const URGENCY = ['¡Rápido!', '¡Se acaba el tiempo!', '¡Corre T-REXo!'];
    this._timerInterval = setInterval(() => {
      if (!this.element || this._gameEnded) { clearInterval(this._timerInterval); return; }
      this._timeLeft = Math.max(0, this._timeLeft - 1);
      this._updateTimerHUD();
      const pct = this._timeLeft / LEVEL_TIME;
      this.dangerPanel?.onTimePressure(pct);
      if (this._timeLeft <= 10 && this._timeLeft > 0)
        this.dangerPanel?.setMessage(URGENCY[Math.floor(Math.random() * URGENCY.length)], 'urgent');
      if (this._timeLeft <= 0) { clearInterval(this._timerInterval); this._onTimeUp(); }
    }, 1000);
  }

  _updateTimerHUD() {
    const el = this.element?.querySelector('#time-value');
    if (!el) return;
    el.textContent = this._timeLeft;
    el.className   = 'topbar-time-num';
    if      (this._timeLeft <= 10) el.classList.add('time-critical');
    else if (this._timeLeft <= 30) el.classList.add('time-warning');
  }

  _onTimeUp() {
    if (this._gameEnded) return;
    this._gameEnded = true;
    this.trexo?.react('lose');
    this.dangerPanel?.onLose();
    setTimeout(() => {
      if (!this.element) return;
      const overlay = this.element.querySelector('#game-overlay');
      const emojiEl = this.element.querySelector('#overlay-emoji');
      const msgEl   = this.element.querySelector('#overlay-msg');
      if (!overlay) return;
      emojiEl.textContent = '⏰';
      msgEl.textContent   = '¡Se acabó el tiempo! T-REXo fue alcanzado.';
      overlay.classList.remove('hidden');
    }, 600);
  }

  _wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  _gridEl()  { return this.element?.querySelector('#board-grid'); }
}
