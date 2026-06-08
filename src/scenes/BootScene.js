export class BootScene {
  constructor(container, onComplete) {
    this.container  = container;
    this.onComplete = onComplete;
    this.element    = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'scene scene-boot';
    this.container.appendChild(this.element);
    // Boot is instant for now; load assets here in future phases
    setTimeout(this.onComplete, 100);
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}
