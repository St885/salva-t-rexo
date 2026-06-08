import { Tile, TILE_COUNT } from './Tile.js';
import { randomInt } from '../utils/helpers.js';

export class Board {
  constructor(cols = 8, rows = 8) {
    this.cols = cols;
    this.rows = rows;
    this.grid = [];
  }

  init() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = new Tile(this._safeType(c, r), c, r);
      }
    }
  }

  // Pick a tile type that won't immediately form a 3-match at (col, row)
  _safeType(col, row) {
    const forbidden = new Set();

    if (col >= 2) {
      const a = this.grid[row][col - 1]?.type;
      const b = this.grid[row][col - 2]?.type;
      if (a !== undefined && a === b) forbidden.add(a);
    }
    if (row >= 2) {
      const a = this.grid[row - 1]?.[col]?.type;
      const b = this.grid[row - 2]?.[col]?.type;
      if (a !== undefined && a === b) forbidden.add(a);
    }

    const available = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      if (!forbidden.has(i)) available.push(i);
    }
    return available[randomInt(0, available.length - 1)];
  }

  getTile(col, row) {
    return this.grid[row]?.[col] ?? null;
  }

  setTile(col, row, tile) {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.grid[row][col] = tile;
      if (tile) { tile.col = col; tile.row = row; }
    }
  }

  swapTiles(col1, row1, col2, row2) {
    const a = this.getTile(col1, row1);
    const b = this.getTile(col2, row2);
    this.setTile(col1, row1, b);
    this.setTile(col2, row2, a);
  }

  isAdjacent(col1, row1, col2, row2) {
    const dc = Math.abs(col2 - col1);
    const dr = Math.abs(row2 - row1);
    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
  }

  removeMatched(matches) {
    for (const { col, row } of matches) {
      this.grid[row][col] = null;
    }
  }

  // Tiles fall down to fill null gaps
  applyGravity() {
    for (let c = 0; c < this.cols; c++) {
      let writeRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = this.grid[r][c];
            this.grid[writeRow][c].row = writeRow;
            this.grid[r][c] = null;
          }
          writeRow--;
        }
      }
      while (writeRow >= 0) {
        this.grid[writeRow][c] = null;
        writeRow--;
      }
    }
  }

  // Fill null slots with new random tiles; marks each new tile with isNew = true
  refill() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === null) {
          const tile  = new Tile(randomInt(0, TILE_COUNT - 1), c, r);
          tile.isNew  = true;
          this.grid[r][c] = tile;
        }
      }
    }
  }
}
