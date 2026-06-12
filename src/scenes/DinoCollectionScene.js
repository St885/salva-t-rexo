import { getCollection, saveCollection } from '../utils/dinoStorage.js';

const DINOS = [
  { key: 'trexo',  icon: '🦖', name: 'T-REXo',       rarity: 'Legendario', rCls: 'rarity--legendary', role: 'Protagonista',  ability: 'Mejora las bombas'           },
  { key: 'trike',  icon: '🦏', name: 'Triceratops',   rarity: 'Raro',       rCls: 'rarity--rare',      role: 'Defensa',       ability: 'Destruye cajas jurásicas'    },
  { key: 'ptero',  icon: '🦅', name: 'Pterodáctilo',  rarity: 'Raro',       rCls: 'rarity--rare',      role: 'Apoyo aéreo',   ability: 'Mejora el booster volador'   },
  { key: 'diplo',  icon: '🦒', name: 'Diplodocus',    rarity: 'Épico',      rCls: 'rarity--epic',      role: 'Resistencia',   ability: '+1 movimiento extra'         },
  { key: 'raptor', icon: '🦖', name: 'Velociraptor',  rarity: 'Épico',      rCls: 'rarity--epic',      role: 'Velocidad',     ability: 'Cascadas de puntos rápidas'  },
];

export class DinoCollectionScene {
  constructor(container, onBack) {
    this.container = container;
    this.onBack    = onBack;
    this.element   = null;
    this._col      = null;
  }

  create() {
    this._col = getCollection();

    this.element = document.createElement('div');
    this.element.className = 'scene scene-dinocol';
    this.element.innerHTML = `
      <div class="dcol-header">
        <button class="btn-icon" id="dcol-back">&#8592;</button>
        <div class="dcol-header-text">
          <h2 class="dcol-title">Parque Dino</h2>
          <span class="dcol-subtitle">Tu colección</span>
        </div>
        <span class="dcol-header-icon">🦕</span>
      </div>

      <div class="dcol-grid" id="dcol-grid"></div>

      <div class="dcol-detail hidden" id="dcol-detail">
        <div class="dcol-detail-box" id="dcol-detail-box"></div>
      </div>
    `;
    this.container.appendChild(this.element);
    this._renderGrid();
    this.element.querySelector('#dcol-back').addEventListener('click', () => this.onBack());
    this.element.querySelector('#dcol-detail').addEventListener('click', e => {
      if (e.target === e.currentTarget) this._closeDetail();
    });
  }

  _renderGrid() {
    const grid = this.element.querySelector('#dcol-grid');
    if (!grid) return;
    grid.innerHTML = DINOS.map(d => {
      const data      = this._col[d.key];
      const locked    = !data.unlocked;
      const pct       = data.maxFragments > 0 ? Math.round((data.fragments / data.maxFragments) * 100) : 0;
      const canEvolve = !locked && data.fragments >= data.maxFragments;
      const isHero    = d.key === 'trexo' && !locked;
      const cls       = ['dcol-card', locked ? 'dcol-card--locked' : '', isHero ? 'dcol-card--hero' : ''].filter(Boolean).join(' ');
      return `
        <div class="${cls}" data-key="${d.key}">
          <div class="dcol-card-icon-wrap">
            <div class="dcol-card-icon">${d.icon}</div>
            ${locked ? '<div class="dcol-lock-badge">🔒</div>' : ''}
          </div>
          <div class="dcol-card-name">${d.name}</div>
          <div class="dcol-rarity ${d.rCls}${locked ? ' dcol-rarity--dim' : ''}">${d.rarity}</div>
          ${locked
            ? `<div class="dcol-card-status">Bloqueado</div>`
            : `<div class="dcol-card-level">&#9733; Nivel ${data.level}</div>`
          }
          <div class="dcol-card-ability-short">${d.ability}</div>
          <div class="dcol-progress-wrap">
            <div class="dcol-progress">
              <div class="dcol-progress-bar" style="width:${locked ? 0 : pct}%"></div>
            </div>
            <span class="dcol-progress-text">${locked ? '? fragmentos' : `${data.fragments}/${data.maxFragments} frag.`}</span>
          </div>
          <button class="dcol-card-btn${locked ? ' dcol-card-btn--locked' : ''}${canEvolve ? ' dcol-card-btn--evolve' : ''}" data-key="${d.key}" ${locked ? 'disabled' : ''}>
            ${locked ? '🔒 Bloqueado' : canEvolve ? '&#11014;&#65039; Evolucionar' : 'Ver detalles'}
          </button>
        </div>`;
    }).join('');

    grid.querySelectorAll('.dcol-card-btn:not([disabled])').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); this._openDetail(btn.dataset.key); })
    );
  }

  _openDetail(key) {
    const d    = DINOS.find(x => x.key === key);
    const data = this._col[key];
    if (!d || !data) return;
    const pct      = Math.round((data.fragments / data.maxFragments) * 100);
    const canEvolve = data.fragments >= data.maxFragments;
    const box = this.element.querySelector('#dcol-detail-box');
    box.innerHTML = `
      <div class="dcol-detail-icon">${d.icon}</div>
      <div class="dcol-detail-name">${d.name}</div>
      <div class="dcol-rarity ${d.rCls} dcol-rarity--lg">${d.rarity}</div>
      <div class="dcol-detail-level">&#9733; Nivel ${data.level}</div>
      <div class="dcol-detail-role">${d.role}</div>
      <div class="dcol-detail-ability">
        <span class="dcol-ability-label">Habilidad</span>
        <span class="dcol-ability-name">${d.ability}</span>
        <span class="dcol-ability-soon">Próximamente</span>
      </div>
      <div class="dcol-detail-section-label">Fragmentos de evolución</div>
      <div class="dcol-progress dcol-progress--large">
        <div class="dcol-progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="dcol-progress-text">${data.fragments} / ${data.maxFragments} fragmentos</div>
      <button class="btn-play dcol-evolve-btn${canEvolve ? '' : ' dcol-evolve-btn--disabled'}" id="dcol-evolve" ${canEvolve ? '' : 'disabled'}>
        ${canEvolve ? '⬆️ ¡Evolucionar!' : 'Faltan fragmentos'}
      </button>
      <button class="btn-back" id="dcol-close-detail">Cerrar</button>
    `;
    this.element.querySelector('#dcol-close-detail').addEventListener('click', () => this._closeDetail());
    if (canEvolve) {
      this.element.querySelector('#dcol-evolve').addEventListener('click', () => this._evolve(key));
    }
    this.element.querySelector('#dcol-detail').classList.remove('hidden');
  }

  _closeDetail() {
    this.element?.querySelector('#dcol-detail')?.classList.add('hidden');
  }

  _evolve(key) {
    const data = this._col[key];
    if (!data || data.fragments < data.maxFragments) return;
    data.level++;
    data.fragments = 0;
    data.maxFragments = Math.round(data.maxFragments * 1.5); // next evolution costs more
    saveCollection(this._col);
    this._closeDetail();
    this._renderGrid();
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}
