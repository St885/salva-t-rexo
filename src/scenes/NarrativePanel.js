const MSGS = {
  danger:   '¡El tiburón me sigue!',
  escaping: '¡Sigue ayudándome!',
  winning:  '¡Casi llego!',
  won:      '¡Me salvaste! 🎉',
  lost:     '¡Me atrapó! 😱',
};

export class NarrativePanel {
  constructor() {
    this.element    = null;
    this._trexoEl   = null;
    this._sharkEl   = null;
    this._captionEl = null;
    this._state     = '';
  }

  createIn(parent) {
    this.element = document.createElement('div');
    this.element.className = 'narrative-panel np-danger';
    this.element.innerHTML = `
      <div class="np-scene">
        <div class="np-water-bg"></div>
        <span class="np-shark-emoji">🦈</span>
        <span class="np-trexo-emoji">🦕</span>
      </div>
      <div class="np-caption">${MSGS.danger}</div>
    `;
    parent.appendChild(this.element);
    this._trexoEl   = this.element.querySelector('.np-trexo-emoji');
    this._sharkEl   = this.element.querySelector('.np-shark-emoji');
    this._captionEl = this.element.querySelector('.np-caption');
    // Set initial positions
    this._trexoEl.style.left = '22%';
    this._sharkEl.style.left = '2%';
  }

  update(scorePct, isOver, won) {
    if (!this.element) return;

    let state;
    if      (isOver && won)    state = 'won';
    else if (isOver)           state = 'lost';
    else if (scorePct >= 0.7)  state = 'winning';
    else if (scorePct >= 0.35) state = 'escaping';
    else                       state = 'danger';

    if (state !== this._state) {
      this._state = state;
      this.element.className = `narrative-panel np-${state}`;
      if (this._captionEl) this._captionEl.textContent = MSGS[state];
    }

    // T-REXo moves right (22% → 78%) as score increases
    const trexoLeft = isOver && won ? 84 : 22 + scorePct * 56;
    if (this._trexoEl) this._trexoEl.style.left = `${trexoLeft}%`;

    // Shark: always chases but never catches (unless lost)
    const baseGap  = isOver && !won ? 6 : 18 + scorePct * 12;
    const sharkLeft = Math.max(2, trexoLeft - baseGap);
    if (this._sharkEl) {
      this._sharkEl.style.left    = `${sharkLeft}%`;
      this._sharkEl.style.opacity = isOver && won ? '0.2' : '1';
    }
  }

  destroy() {
    this.element?.remove();
    this.element    = null;
    this._trexoEl   = null;
    this._sharkEl   = null;
    this._captionEl = null;
  }
}
