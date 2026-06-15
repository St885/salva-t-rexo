const REACTIONS = {
  start:    { face: '🦖', msgs: ['¡Ayúdame a salir de aquí!'] },
  match:    { face: '🦖', msgs: ['¡Bien hecho!', '¡Genial!', '¡Eso es!', '¡Más, más!'] },
  bigMatch: { face: '🦖', msgs: ['¡INCREÍBLE! 🔥', '¡Combo! 🎯', '¡Brillante! ✨'] },
  noMatch:  { face: '🦖', msgs: ['Hmm…', 'Busca otro…', '¡Hay un match por ahí!'] },
  rocket:    { face: '🚀', msgs: ['¡Boom!', '¡Cohete!', '¡Genial!', '¡Eso fue enorme!'] },
  bomb:      { face: '💥', msgs: ['¡BOOM!', '¡Explosión!', '¡Eso estuvo enorme!', '¡Kaboom!'] },
  megaBomb:   { face: '🔥', msgs: ['¡MEGA BOOM!', '¡Explosión gigante!', '¡Combo bomba!', '¡Eso fue enorme!'] },
  rocketBomb:  { face: '💥', msgs: ['¡Combo brutal!', '¡Mega cohete!', '¡Explosión en cruz!', '¡Eso fue increíble!'] },
  dinoCross:   { face: '⚡', msgs: ['¡Cruz Dino!', '¡Fila y columna!', '¡Combo cruzado!', '¡Limpieza total!'] },
  pteroBomb:   { face: '💥', msgs: ['¡Ataque aéreo!', '¡Bomba voladora!', '¡Objetivo destruido!', '¡Eso fue brutal!'] },
  doublePtero: { face: '🦅', msgs: ['¡Doble ataque!', '¡Dos voladores!', '¡A por todos!', '¡Combo aéreo!'] },
  colorBomb: { face: '🌈', msgs: ['¡Increíble!', '¡Magia dino! ✨', '¡Eso fue enorme!'] },
  ptero:     { face: '🦅', msgs: ['¡Vuela!', '¡Buen ataque!', '¡Gracias, amigo!'] },
  lowMoves: { face: '😰', msgs: ['¡Pocos movimientos!', '¡Rápido, piensa!', '¡Casi!'] },
  win:      { face: '🎉', msgs: ['¡Me salvaste! 🎊', '¡Eres increíble!', '¡Sí!'] },
  lose:     { face: '😢', msgs: ['Intentémoslo otra vez.', '¡La próxima!', '¡No te rindas!'] },
};

export class TRexo {
  constructor() {
    this.element  = null;
    this.faceEl   = null;
    this.bubbleEl = null;
    this._timer   = null;
  }

  // Creates and injects the companion strip into the given parent element
  createIn(parent) {
    this.element = document.createElement('div');
    this.element.className = 'trexo-strip';
    this.element.innerHTML = `
      <span class="trexo-face" id="trexo-face">🦖</span>
      <div class="trexo-bubble" id="trexo-bubble">¡Ayúdame a salir de aquí!</div>
    `;
    parent.appendChild(this.element);
    this.faceEl   = this.element.querySelector('#trexo-face');
    this.bubbleEl = this.element.querySelector('#trexo-bubble');
  }

  react(event) {
    const r = REACTIONS[event];
    if (!r) return;
    this._setFace(r.face);
    this._say(r.msgs[Math.floor(Math.random() * r.msgs.length)]);
  }

  // Force an exact phrase (optionally a face) — used by signature booster lines
  say(msg, face) {
    if (face) this._setFace(face);
    this._say(msg);
  }

  _setFace(emoji) {
    if (!this.faceEl) return;
    this.faceEl.textContent = emoji;
    // Restart bounce animation
    this.faceEl.classList.remove('trexo-bounce');
    void this.faceEl.offsetWidth;
    this.faceEl.classList.add('trexo-bounce');
    setTimeout(() => this.faceEl?.classList.remove('trexo-bounce'), 450);
  }

  _say(msg) {
    if (!this.bubbleEl) return;
    this.bubbleEl.textContent = msg;
    // Flash to signal new message
    this.bubbleEl.classList.remove('bubble-flash');
    void this.bubbleEl.offsetWidth;
    this.bubbleEl.classList.add('bubble-flash');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.bubbleEl?.classList.remove('bubble-flash');
    }, 500);
  }

  destroy() {
    clearTimeout(this._timer);
    this.element?.remove();
    this.element  = null;
    this.faceEl   = null;
    this.bubbleEl = null;
  }
}
