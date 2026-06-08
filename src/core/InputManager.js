export class InputManager {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this._setupListeners();
  }

  _setupListeners() {
    document.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });
  }

  // Returns 'left' | 'right' | 'up' | 'down' based on drag delta
  getSwipeDirection(endX, endY) {
    const dx = endX - this.touchStartX;
    const dy = endY - this.touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }
}
