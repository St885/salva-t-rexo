export class MatchDetector {
  constructor(board, minLength = 3) {
    this.board     = board;
    this.minLength = minLength;
  }

  // Returns array of { col, row } for all tiles that are part of a match
  findMatches() {
    const matched = new Set(); // "col,row" strings deduplicate H+V overlap

    // Horizontal scan
    for (let r = 0; r < this.board.rows; r++) {
      let runType = -1, runStart = 0;
      for (let c = 0; c <= this.board.cols; c++) {
        const tile = c < this.board.cols ? this.board.getTile(c, r) : null;
        const type = tile ? tile.type : -1;
        if (type !== runType) {
          if (c - runStart >= this.minLength) {
            for (let x = runStart; x < c; x++) matched.add(`${x},${r}`);
          }
          runType  = type;
          runStart = c;
        }
      }
    }

    // Vertical scan
    for (let c = 0; c < this.board.cols; c++) {
      let runType = -1, runStart = 0;
      for (let r = 0; r <= this.board.rows; r++) {
        const tile = r < this.board.rows ? this.board.getTile(c, r) : null;
        const type = tile ? tile.type : -1;
        if (type !== runType) {
          if (r - runStart >= this.minLength) {
            for (let y = runStart; y < r; y++) matched.add(`${c},${y}`);
          }
          runType  = type;
          runStart = r;
        }
      }
    }

    return [...matched].map(key => {
      const [col, row] = key.split(',').map(Number);
      return { col, row };
    });
  }

  // Returns structured runs: [{ positions:[{col,row}], orientation:'h'|'v', length:N }]
  findRuns() {
    const runs = [];
    // Horizontal
    for (let r = 0; r < this.board.rows; r++) {
      let runType = -1, runStart = 0;
      for (let c = 0; c <= this.board.cols; c++) {
        const tile = c < this.board.cols ? this.board.getTile(c, r) : null;
        const type = tile ? tile.type : -1;
        if (type !== runType) {
          if (c - runStart >= this.minLength) {
            const positions = [];
            for (let x = runStart; x < c; x++) positions.push({ col: x, row: r });
            runs.push({ positions, orientation: 'h', length: c - runStart });
          }
          runType = type; runStart = c;
        }
      }
    }
    // Vertical
    for (let c = 0; c < this.board.cols; c++) {
      let runType = -1, runStart = 0;
      for (let r = 0; r <= this.board.rows; r++) {
        const tile = r < this.board.rows ? this.board.getTile(c, r) : null;
        const type = tile ? tile.type : -1;
        if (type !== runType) {
          if (r - runStart >= this.minLength) {
            const positions = [];
            for (let y = runStart; y < r; y++) positions.push({ col: c, row: y });
            runs.push({ positions, orientation: 'v', length: r - runStart });
          }
          runType = type; runStart = r;
        }
      }
    }
    return runs;
  }

  // Returns true if at least one swap would create a match
  hasValidMoves() {
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        if (c < this.board.cols - 1 && this._swapProducesMatch(c, r, c + 1, r)) return true;
        if (r < this.board.rows - 1 && this._swapProducesMatch(c, r, c, r + 1)) return true;
      }
    }
    return false;
  }

  _swapProducesMatch(c1, r1, c2, r2) {
    this.board.swapTiles(c1, r1, c2, r2);
    const found = this.findMatches().length > 0;
    this.board.swapTiles(c1, r1, c2, r2);
    return found;
  }

  find2x2Squares() {
    const squares = [];
    const used    = new Set();
    for (let r = 0; r < this.board.rows - 1; r++) {
      for (let c = 0; c < this.board.cols - 1; c++) {
        const tl = this.board.getTile(c,   r);
        const tr = this.board.getTile(c+1, r);
        const bl = this.board.getTile(c,   r+1);
        const br = this.board.getTile(c+1, r+1);
        if (!tl || !tr || !bl || !br) continue;
        if (tl.booster || tr.booster || bl.booster || br.booster) continue;
        if (tl.type !== tr.type || tl.type !== bl.type || tl.type !== br.type) continue;
        const keys = [`${c},${r}`, `${c+1},${r}`, `${c},${r+1}`, `${c+1},${r+1}`];
        if (keys.some(k => used.has(k))) continue;
        keys.forEach(k => used.add(k));
        squares.push({ positions: [
          { col: c,   row: r   },
          { col: c+1, row: r   },
          { col: c,   row: r+1 },
          { col: c+1, row: r+1 },
        ], type: tl.type });
      }
    }
    return squares;
  }
}
