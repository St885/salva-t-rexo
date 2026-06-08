import { getInventory, saveInventory, setPendingBoosters } from '../utils/storage.js';

const BOOSTERS = [
  { key: 'rocket',    icon: '🚀', name: 'Cohete'       },
  { key: 'bomb',      icon: '💣', name: 'Bomba'         },
  { key: 'colorBomb', icon: '🌈', name: 'Arcoíris'  },
  { key: 'ptero',     icon: '🦅', name: 'Pterodáctilo' },
];

export class LevelPreparationScene {
  constructor(container, onPlay, onBack) {
    this.container = container;
    this.onPlay    = onPlay;
    this.onBack    = onBack;
    this.element   = null;
    this._inv      = null;
    this._sel      = { rocket: 0, bomb: 0, colorBomb: 0, ptero: 0 };
  }

  create() {
    this._inv = getInventory();
    this._sel = { rocket: 0, bomb: 0, colorBomb: 0, ptero: 0 };

    this.element = document.createElement('div');
    this.element.className = 'scene scene-lprep';
    this.element.innerHTML = `
      <div class="lprep-header">
        <button class="btn-icon" id="lprep-back" title="Base">&#8592;</button>
        <h2 class="lprep-title">Nivel 1</h2>
        <span class="lprep-difficulty">&#x1F7E2; F&#225;cil</span>
      </div>

      <div class="lprep-body">
        <div class="lprep-section">
          <div class="lprep-section-title">&#127919; Objetivos</div>
          <div class="lprep-obj-list">
            <div class="lprep-obj-item"><span>&#129370;</span> Romper 10 huevos f&#243;siles</div>
            <div class="lprep-obj-item"><span>&#128230;</span> Destruir 8 cajas jur&#225;sicas</div>
            <div class="lprep-obj-item"><span>&#11088;</span> Conseguir 1500 puntos</div>
          </div>
        </div>

        <div class="lprep-section">
          <div class="lprep-section-title">&#9888;&#65039; Obst&#225;culos</div>
          <div class="lprep-obs-grid">
            <div class="lprep-obs-item"><span>&#129370;</span> Huevos f&#243;siles</div>
            <div class="lprep-obs-item"><span>&#129430;</span> Caja T-Rex (&#215;3)</div>
            <div class="lprep-obs-item"><span>&#129429;</span> Caja Dino (&#215;2)</div>
            <div class="lprep-obs-item"><span>&#129422;</span> Caja Lizard (&#215;1)</div>
          </div>
        </div>

        <div class="lprep-section">
          <div class="lprep-section-title">&#127890; Mochila</div>
          <div class="lprep-mochila" id="lprep-mochila"></div>
        </div>

        <div class="lprep-section">
          <div class="lprep-section-title">&#127873; Recompensas</div>
          <div class="lprep-rewards">
            <div class="lprep-reward"><span>&#129689;</span><span>&#215;50</span></div>
            <div class="lprep-reward"><span>&#127873;</span><span>Cofre</span></div>
            <div class="lprep-reward"><span>&#129460;</span><span>F&#243;sil</span></div>
          </div>
        </div>
      </div>

      <div class="lprep-footer">
        <button class="btn-play" id="lprep-play">&#161;Jugar! &#129429;</button>
      </div>
    `;
    this.container.appendChild(this.element);
    this._renderMochila();
    this.element.querySelector('#lprep-back').addEventListener('click', () => this.onBack());
    this.element.querySelector('#lprep-play').addEventListener('click', () => this._onPlay());
  }

  _renderMochila() {
    const wrap = this.element.querySelector('#lprep-mochila');
    if (!wrap) return;
    wrap.innerHTML = BOOSTERS.map(b => {
      const avail = this._inv[b.key] ?? 0;
      const sel   = this._sel[b.key];
      return `
        <div class="lprep-mochila-item${avail <= 0 ? ' lprep-mochila-item--empty' : ''}" data-bkey="${b.key}">
          <div class="lprep-mochila-icon">${b.icon}</div>
          <div class="lprep-mochila-name">${b.name}</div>
          <div class="lprep-mochila-controls">
            <button class="lprep-mochila-btn lprep-mochila-minus" data-bkey="${b.key}"${sel <= 0 ? ' disabled' : ''}>&#8722;</button>
            <span class="lprep-mochila-sel" id="sel-${b.key}">${sel}</span>
            <button class="lprep-mochila-btn lprep-mochila-plus" data-bkey="${b.key}"${sel >= avail ? ' disabled' : ''}>+</button>
          </div>
          <div class="lprep-mochila-avail">Disp: <span id="inv-${b.key}">${avail}</span></div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.lprep-mochila-plus').forEach(btn =>
      btn.addEventListener('click', () => this._adjust(btn.dataset.bkey, 1)));
    wrap.querySelectorAll('.lprep-mochila-minus').forEach(btn =>
      btn.addEventListener('click', () => this._adjust(btn.dataset.bkey, -1)));
  }

  _adjust(key, delta) {
    const avail = this._inv[key] ?? 0;
    const cur   = this._sel[key];
    const next  = Math.max(0, Math.min(avail, cur + delta));
    if (next === cur) {
      const btnClass = delta > 0 ? '.lprep-mochila-plus' : '.lprep-mochila-minus';
      const btn = this.element.querySelector(`.lprep-mochila-item[data-bkey="${key}"] ${btnClass}`);
      btn?.classList.add('lprep-mochila-btn--shake');
      setTimeout(() => btn?.classList.remove('lprep-mochila-btn--shake'), 300);
      return;
    }
    this._sel[key] = next;
    this._updateItem(key);
  }

  _updateItem(key) {
    const avail   = this._inv[key] ?? 0;
    const sel     = this._sel[key];
    const item    = this.element.querySelector(`.lprep-mochila-item[data-bkey="${key}"]`);
    if (!item) return;
    const selEl   = item.querySelector(`#sel-${key}`);
    const plusBtn = item.querySelector('.lprep-mochila-plus');
    const minBtn  = item.querySelector('.lprep-mochila-minus');
    if (selEl) {
      selEl.textContent = sel;
      selEl.classList.add('lprep-mochila-sel--pulse');
      setTimeout(() => selEl.classList.remove('lprep-mochila-sel--pulse'), 280);
    }
    if (plusBtn) plusBtn.disabled = sel >= avail;
    if (minBtn)  minBtn.disabled  = sel <= 0;
    item.classList.toggle('lprep-mochila-item--selected', sel > 0);
  }

  _onPlay() {
    const newInv = { ...this._inv };
    for (const { key } of BOOSTERS) newInv[key] = Math.max(0, (newInv[key] ?? 0) - this._sel[key]);
    saveInventory(newInv);
    setPendingBoosters({ ...this._sel });
    this.onPlay();
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}
