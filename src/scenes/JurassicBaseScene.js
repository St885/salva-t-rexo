const POPUPS = {
  lab:       '🔬 Muy pronto podrás mejorar tus boosters en el laboratorio.',
  incubator: '🥚 ¡La incubadora estará lista pronto! Vuelve para recoger tu recompensa.',
  museum:    '🏛️ Colecciona fósiles superando niveles y llena el museo de fósiles.',
  missions:  '🎯 Completa misiones para ganar monedas, cofres y potenciadores especiales.',
  park:      '🦕 Aquí vivirán los dinosaurios que desbloquees en tus aventuras.',
  chest:     '🎁 ¡Recompensa gratuita disponible próximamente! Vuelve en unos minutos.',
};

export class JurassicBaseScene {
  constructor(container, onPlay, onBack, onPark = null) {
    this.container      = container;
    this.onPlay         = onPlay;
    this.onBack         = onBack;
    this.onPark         = onPark;
    this.element        = null;
    this._timerInterval = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'scene scene-jbase';
    this.element.innerHTML = `
      <div class="jbase-header">
        <button class="btn-icon" id="jbase-back" title="Menú">&#8592;</button>
        <div class="jbase-title-group">
          <h2 class="jbase-title">Base Jurásica</h2>
          <span class="jbase-subtitle">de T-REXo</span>
        </div>
        <span class="jbase-header-dino">🦕</span>
      </div>

      <div class="jbase-grid">
        <div class="jbase-card jbase-card--glow" data-popup="lab">
          <div class="jbase-card-icon">🔬</div>
          <div class="jbase-card-name">Laboratorio</div>
          <div class="jbase-card-sub">Mejoras próximamente</div>
        </div>
        <div class="jbase-card jbase-card--glow" data-popup="incubator">
          <div class="jbase-card-icon">🥚</div>
          <div class="jbase-card-name">Incubadora</div>
          <div class="jbase-card-sub">Recompensa gratuita</div>
          <div class="jbase-card-timer" id="jbase-timer">03:45</div>
        </div>
        <div class="jbase-card" data-popup="museum">
          <div class="jbase-card-icon">🏛️</div>
          <div class="jbase-card-name">Museo de Fósiles</div>
          <div class="jbase-card-sub">Colección 0/12</div>
        </div>
        <div class="jbase-card" data-popup="missions">
          <div class="jbase-card-icon">🎯</div>
          <div class="jbase-card-name">Misiones</div>
          <div class="jbase-card-badge">3 activas</div>
        </div>
        <div class="jbase-card jbase-card--glow" data-action="park">
          <div class="jbase-card-icon">🦕</div>
          <div class="jbase-card-name">Parque Dino</div>
          <div class="jbase-card-sub">Ver colección</div>
        </div>
        <div class="jbase-card jbase-card--glow" data-popup="chest">
          <div class="jbase-card-icon">🎁</div>
          <div class="jbase-card-name">Cofre</div>
          <div class="jbase-card-sub">Disponible pronto</div>
        </div>
      </div>

      <div class="jbase-footer">
        <button class="btn-play" id="jbase-play">Preparar Partida &#128422;</button>
      </div>

      <div class="jbase-popup hidden" id="jbase-popup">
        <div class="jbase-popup-box">
          <p id="jbase-popup-msg"></p>
          <button class="btn-back" id="jbase-popup-close">Cerrar</button>
        </div>
      </div>
    `;
    this.container.appendChild(this.element);
    this._bindEvents();
    this._startTimer();
  }

  _bindEvents() {
    this.element.querySelector('#jbase-back').addEventListener('click', () => this.onBack());
    this.element.querySelector('#jbase-play').addEventListener('click', () => this.onPlay());
    this.element.querySelector('#jbase-popup-close').addEventListener('click', () => this._closePopup());
    this.element.querySelectorAll('.jbase-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.dataset.action === 'park') { this.onPark?.(); return; }
        const key = card.dataset.popup;
        if (key && POPUPS[key]) this._showPopup(POPUPS[key]);
      });
    });
    this.element.querySelector('#jbase-popup').addEventListener('click', e => {
      if (e.target === e.currentTarget) this._closePopup();
    });
  }

  _showPopup(msg) {
    const popup = this.element.querySelector('#jbase-popup');
    const msgEl = this.element.querySelector('#jbase-popup-msg');
    if (msgEl) msgEl.textContent = msg;
    popup?.classList.remove('hidden');
  }

  _closePopup() {
    this.element?.querySelector('#jbase-popup')?.classList.add('hidden');
  }

  _startTimer() {
    let secs    = 3 * 60 + 45;
    const timerEl = this.element?.querySelector('#jbase-timer');
    if (!timerEl) return;
    this._timerInterval = setInterval(() => {
      if (!this.element) { clearInterval(this._timerInterval); return; }
      secs = Math.max(0, secs - 1);
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  destroy() {
    clearInterval(this._timerInterval);
    this.element?.remove();
    this.element = null;
  }
}
