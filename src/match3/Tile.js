export const TILE_COLORS = [
  { bg: '#e63946', dark: '#9b1d28', emoji: '🦴' }, // Red   — bone
  { bg: '#e9c46a', dark: '#b38820', emoji: '🌟' }, // Yellow — star
  { bg: '#52b788', dark: '#2a7a52', emoji: '🍃' }, // Green  — leaf
  { bg: '#4895ef', dark: '#1e5ca8', emoji: '💧' }, // Blue   — water
  { bg: '#9b5de5', dark: '#5e2fa0', emoji: '💎' }, // Purple — gem
];

export const TILE_COUNT = TILE_COLORS.length;

export class Tile {
  constructor(type, col, row) {
    this.type    = type;
    this.col     = col;
    this.row     = row;
    this.matched  = false;
    this.booster  = null; // null | 'rocket-h' | 'rocket-v' | 'bomb' | 'color-bomb' | 'ptero'
    this.obstacle = null; // null | 'egg'
  }
}
