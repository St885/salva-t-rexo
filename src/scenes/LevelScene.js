import { Board }           from '../match3/Board.js';
import { MatchDetector }   from '../match3/MatchDetector.js';
import { LevelObjectives } from '../match3/LevelObjectives.js';
import { TILE_COLORS }     from '../match3/Tile.js';
import { TRexo }           from '../characters/TRexo.js';
import { GameConfig }      from '../config/gameConfig.js';

const POINTS_PER_TILE = 10;
const TARGET_SCORE    = 1500;
const MAX_MOVES       = 30;
const EGG_COUNT       = 10;
const SWAP_MS         = 140;
const POP_MS          = 220;
const FALL_MS         = 190;
const SHAKE_MS        = 240;
const DRAG_THRESHOLD  = 22;
const ROCKET_BONUS       = 60;
const BOMB_BONUS         = 80;
const DOUBLE_BOMB_BONUS  = 220;

export class LevelScene {
  constructor(container, onBack) {
    this.container = container;
    this.onBack    = onBack;
    this.element   = null;
    this.selected  = null;
    this.busy      = false;
    this._drag     = null;
  }

  // ── Lifecycle ─────────────────────────────────────

  create() {
    this.board          = new Board(8, 8);
    this.detector       = new MatchDetector(this.board);
    this.objectives     = new LevelObjectives({ targetScore: TARGET_SCORE, maxMoves: MAX_MOVES, eggsRequired: EGG_COUNT });
    this.trexo          = new TRexo();
    this.selected       = null;
    this.busy           = false;
    this._drag          = null;
    this._lowMovesAlert = false;

    this.board.init();
    if (GameConfig.debug?.startingBoosterPairs) this._injectBoosterPairs();
    else if (GameConfig.debug?.startingBoosters) this._injectStartingBoosters();
    this._injectFossilEggs();

    this.element = document.createElement('div');
    this.element.className = 'scene scene-level';
    this.element.innerHTML = this._buildHTML();
    this.container.appendChild(this.element);

    this.trexo.createIn(this.element.querySelector('#trexo-container'));

    this._boundMouseMove = (e) => this._onDragMove(e);
    this._boundMouseUp   = (e) => this._onDragEnd(e);
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup',   this._boundMouseUp);

    this._bindEvents();
    this._renderBoard();
    this._updateHUD();
    setTimeout(() => this.trexo?.react('start'), 400);
  }

  destroy() {
    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove);
      document.removeEventListener('mouseup',   this._boundMouseUp);
      this._boundMouseMove = null;
      this._boundMouseUp   = null;
    }
    this.trexo?.destroy();
    this.element?.remove();
    this.element = null;
    this.trexo   = null;
    this._drag   = null;
  }

  // ── HTML ──────────────────────────────────────────

  _buildHTML() {
    return `
      <div class="level-header">
        <button class="btn-icon" id="btn-back-level" title="Menú">&#8592;</button>
        <div class="level-hud">
          <div class="hud-item">
            <span class="hud-label">Puntos</span>
            <span class="hud-value" id="score-value">0 / ${TARGET_SCORE}</span>
          </div>
          <span class="hud-sep">🦕</span>
          <div class="hud-item">
            <span class="hud-label">Movimientos</span>
            <span class="hud-value" id="moves-value">${MAX_MOVES}</span>
          </div>
        </div>
      </div>
      <div class="objectives-bar">
        <div class="obj-item">
          <span class="obj-icon">🥚</span>
          <div class="obj-progress">
            <span class="obj-label">Huevos fósiles</span>
            <span class="obj-count" id="egg-count">0 / ${EGG_COUNT}</span>
          </div>
        </div>
      </div>
      <div class="score-bar-wrapper">
        <div class="score-bar" id="score-bar" style="width:0%"></div>
      </div>
      <div id="trexo-container"></div>
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

        if (tile.obstacle === 'egg') {
          el.classList.add('tile-egg');
          el.dataset.obstacle = 'egg';
          el.textContent = '🥚';
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
        if (!this._lowMovesAlert) { this._lowMovesAlert = true; this.trexo?.react('lowMoves'); }
      } else { movesEl.classList.remove('moves-warning'); }
    }
    const eggEl = this.element?.querySelector('#egg-count');
    if (eggEl) {
      eggEl.textContent = `${this.objectives.eggsBroken} / ${this.objectives.eggsRequired}`;
      if (this.objectives.eggsBroken >= this.objectives.eggsRequired)
        eggEl.classList.add('obj-complete');
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
    this._getTileEl(col, row)?.classList.add('rocket-launch');
    await this._wait(160);
    if (!this.element) return;

    const STAGGER = 16;
    for (let i = 0; i < affected.length; i++) {
      const el = this._getTileEl(affected[i].col, affected[i].row);
      if (el) { el.style.setProperty('--sweep-delay', `${i * STAGGER}ms`); el.classList.add('rocket-sweep'); }
    }
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

    this._processEggBreaks(affected);
    this.board.removeMatched(affected);
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

    // Phase 1 — buildup: bomb grows with intensifying glow
    this._getTileEl(col, row)?.classList.add('bomb-launch');
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
      }

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

    this._processEggBreaks(affected);
    this.board.removeMatched(affected);
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
      const targetEl = this._getTileEl(target.col, target.row);
      if (targetEl) targetEl.classList.add('ptero-impact');
      toRemove.push(target);
    }

    this.objectives.addScore(toRemove.length * POINTS_PER_TILE + ROCKET_BONUS);
    this._updateHUD();
    this._bumpScore();

    await this._wait(290);
    if (!this.element) return;

    for (const p of toRemove) {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.classList.remove('ptero-impact', 'ptero-launch'); el.classList.add('matched'); }
    }
    await this._wait(POP_MS);
    if (!this.element) return;

    this._processEggBreaks(toRemove);
    this.board.removeMatched(toRemove);
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Color-bomb fire ───────────────────────────────

  async _fireColorBomb(col, row, targetType) {
    if (!this.element) return;

    this.trexo?.react('colorBomb');
    this._getTileEl(col, row)?.classList.add('color-bomb-launch');
    await this._wait(200);
    if (!this.element) return;

    const targets = [];
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        if (c === col && r === row) continue;
        const tile = this.board.getTile(c, r);
        if (tile && tile.type === targetType) targets.push({ col: c, row: r });
      }
    }

    const STAGGER = 28;
    targets.forEach((p, i) => {
      const el = this._getTileEl(p.col, p.row);
      if (el) { el.style.setProperty('--cb-delay', `${i * STAGGER}ms`); el.classList.add('color-bomb-sweep'); }
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
    const cbEl = this._getTileEl(col, row);
    if (cbEl) cbEl.classList.add('matched');

    await this._wait(POP_MS);
    if (!this.element) return;

    this._processEggBreaks([...targets, { col, row }]);
    this.board.removeMatched([...targets, { col, row }]);
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Game flow ─────────────────────────────────────

  async _attemptSwap(col1, row1, col2, row2) {
    this.busy = true;

    await this._animateSwap(col1, row1, col2, row2);
    this.board.swapTiles(col1, row1, col2, row2);
    this._renderBoard();

    const tileA = this.board.getTile(col1, row1);
    const tileB = this.board.getTile(col2, row2);

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

      const hasBooster = newRockets.length > 0 || newBombs.length > 0 || newColorBombs.length > 0 || newPteros.length > 0 || removeSet.size > initSize;
      const pts        = removeSet.size * POINTS_PER_TILE + (hasBooster ? Math.max(ROCKET_BONUS, BOMB_BONUS) : 0);
      this.objectives.addScore(pts);
      this._updateHUD();
      this._bumpScore();
      this.trexo?.react(newColorBombs.length > 0 ? 'colorBomb'
                      : newPteros.length > 0 ? 'ptero'
                      : newBombs.length > 0 || removeSet.size > initSize ? 'bomb'
                      : hasBooster ? 'rocket'
                      : removeSet.size >= 5 ? 'bigMatch' : 'match');

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
      this._processEggBreaks(removeArr);
      this.board.removeMatched(removeArr);

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
    if (!this.objectives.isOver()) return;
    const won = this.objectives.isWon();
    this.trexo?.react(won ? 'win' : 'lose');
    setTimeout(() => {
      if (!this.element) return;
      const overlay = this.element.querySelector('#game-overlay');
      const emojiEl = this.element.querySelector('#overlay-emoji');
      const msgEl   = this.element.querySelector('#overlay-msg');
      if (!overlay) return;
      emojiEl.textContent = won ? '🎉' : '😢';
      msgEl.textContent   = won ? '¡Has ayudado a T-REXo!' : 'T-REXo necesita otro intento.';
      overlay.classList.remove('hidden');
    }, 500);
  }

  _processEggBreaks(positions) {
    for (const p of positions) {
      const tile = this.board.getTile(p.col, p.row);
      if (tile?.obstacle === 'egg') {
        tile.obstacle = null;
        this.objectives.breakEgg();
      }
    }
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

    // Phase 2: big flash + double shockwave + shake
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
        const wave  = document.createElement('div');
        wave.className = 'bomb-shockwave double-bomb-shockwave';
        wave.style.left = `${bRect.left + bRect.width / 2 - gRect.left}px`;
        wave.style.top  = `${bRect.top  + bRect.height / 2 - gRect.top}px`;
        gridEl.appendChild(wave);
        setTimeout(() => wave.remove(), 950);
      }
      gridEl.classList.add('board-shake');
      setTimeout(() => gridEl.classList.remove('board-shake'), 440);
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

    this._processEggBreaks(affected);
    this.board.removeMatched(affected);
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  _injectBoosterPairs() {
    const pairs = [
      ['bomb', 'bomb'],
      ['rocket-h', 'rocket-v'],
      ['color-bomb', 'color-bomb'],
      ['ptero', 'ptero'],
    ];
    const used = new Set();
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const t = this.board.getTile(c, r);
        if (t?.booster || t?.obstacle) used.add(`${c},${r}`);
      }
    }
    const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
    for (const [b1, b2] of pairs) {
      let placed = false, attempts = 0;
      while (!placed && attempts < 300) {
        attempts++;
        const col = Math.floor(Math.random() * this.board.cols);
        const row = Math.floor(Math.random() * this.board.rows);
        if (used.has(`${col},${row}`)) continue;
        const [dc, dr] = dirs[Math.floor(Math.random() * dirs.length)];
        const col2 = col + dc, row2 = row + dr;
        if (col2 < 0 || col2 >= this.board.cols || row2 < 0 || row2 >= this.board.rows) continue;
        if (used.has(`${col2},${row2}`)) continue;
        const t1 = this.board.getTile(col, row);
        const t2 = this.board.getTile(col2, row2);
        if (!t1 || !t2) continue;
        t1.booster = b1;
        t2.booster = b2;
        used.add(`${col},${row}`);
        used.add(`${col2},${row2}`);
        placed = true;
      }
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

  _wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
