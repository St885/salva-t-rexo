import { Game } from './core/Game.js';

console.log('Salva a T-REXo iniciado correctamente');

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
