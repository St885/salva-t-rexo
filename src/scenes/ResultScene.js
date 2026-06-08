export class ResultScene {
  constructor(container, onMenu) {
    this.container = container;
    this.onMenu    = onMenu;
    this.element   = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'scene scene-result';
    this.element.innerHTML = `
      <div class="menu-content">
        <div class="trexo-emoji">🦕</div>
        <h2 class="game-title">¡Nivel completado!</h2>
        <button class="btn-back" id="btn-menu">Menú principal</button>
      </div>
    `;
    this.container.appendChild(this.element);
    document.getElementById('btn-menu').addEventListener('click', this.onMenu);
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}
