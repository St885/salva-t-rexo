export class MenuScene {
  constructor(container, onPlay) {
    this.container = container;
    this.onPlay    = onPlay;
    this.element   = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'scene scene-menu';
    this.element.innerHTML = `
      <div class="menu-content">
        <div class="trexo-emoji">🦖</div>
        <h1 class="game-title">Salva a T-REXo</h1>
        <p class="game-subtitle">Ayuda a T-REXo resolviendo puzzles.</p>
        <button class="btn-play" id="btn-play">Jugar</button>
      </div>
    `;
    this.container.appendChild(this.element);
    document.getElementById('btn-play').addEventListener('click', this.onPlay);
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}
