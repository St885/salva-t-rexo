export const GameConfig = {
  version: '0.0.1',
  name: 'Salva a T-REXo',

  board: {
    cols: 8,
    rows: 8,
    tileSize: 64,
  },

  tiles: {
    types: 6,
    colors: ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#a8dadc', '#ffd60a'],
    names:  ['rojo', 'naranja', 'verde', 'azul', 'celeste', 'amarillo'],
  },

  gameplay: {
    defaultMoves:     25,
    minMatchLength:   3,
    levelTimeSeconds: 60,
  },

  debug: {
    startingBoosters:     false,
    startingBoosterPairs: true,
  },
};
