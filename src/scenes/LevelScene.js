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
const BOX_COUNT       = 8;
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
    this.objectives     = new LevelObjectives({ targetScore: TARGET_SCORE, maxMoves: MAX_MOVES, eggsRequired: EGG_COUNT, boxesRequired: BOX_COUNT });
    this.trexo          = new TRexo();
    this.selected       = null;
    this.busy           = false;
    this._drag          = null;
    this._lowMovesAlert = false;

    this.board.init();
    if (GameConfig.debug?.startingBoosterPairs) this._injectBoosterPairs();
    else if (GameConfig.debug?.startingBoosters) this._injectStartingBoosters();
    this._injectFossilEggs();
    this._injectDinoCrates();
    this._injectPendingBoosters();

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
          </div>
        </div>
        <div class="topbar-center" id="trexo-container"></div>
        <div class="topbar-right">
          <div class="topbar-panel">
            <span class="topbar-panel-title">Pasos</span>
            <span id="moves-value" class="topbar-moves-num">${MAX_MOVES}</span>
          </div>
        </div>
      </div>
      <div class="score-bar-wrapper">
        <div class="score-bar" id="score-bar" style="width:0%"></div>
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
    if (this.board.getTile(col, row)?.obstacle?.startsWith('box')) return;
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
    const boxEl = this.element?.querySelector('#box-count');
    if (boxEl) {
      boxEl.textContent = `${this.objectives.boxesBroken} / ${this.objectives.boxesRequired}`;
      if (this.objectives.boxesBroken >= this.objectives.boxesRequired)
        boxEl.classList.add('obj-complete');
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

    this.board.removeMatched(this._applyObstacleHits([...targets, { col, row }]));
    this.board.applyGravity();
    this.board.refill();
    this._renderBoard();
    await this._wait(FALL_MS);
  }

  // ── Game flow ─────────────────────────────────────

  async _attemptSwap(col1, row1, col2, row2) {
    this.busy = true;

    // Boxes are immovable — block any swap involving them
    if (this.board.getTile(col1, row1)?.obstacle?.startsWith('box') ||
        this.board.getTile(col2, row2)?.obstacle?.startsWith('box')) {
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
      // Crack adjacent crates (reduce resistance)
      for (const p of boxDamaged) {
        const tile = this.board.getTile(p.col, p.row);
        if (tile) tile.obstacle = p.newObstacle;
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

    // Phase 2: flash + shockwave + shake
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
        const wave  = document.createElement('div');
        wave.className = 'bomb-shockwave';
        wave.style.left = `${bRect.left + bRect.width  / 2 - gRect.left}px`;
        wave.style.top  = `${bRect.top  + bRect.height / 2 - gRect.top}px`;
        gridEl.appendChild(wave);
        setTimeout(() => wave.remove(), 700);
      }
      gridEl.classList.add('board-shake');
      setTimeout(() => gridEl.classList.remove('board-shake'), 360);
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

  _injectBoosterPairs() {
    const pairs = [
      ['bomb', 'bomb'],
      ['bomb', 'rocket-h'],
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

  _wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
