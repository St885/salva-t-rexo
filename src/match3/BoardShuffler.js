import { shuffle } from '../utils/helpers.js';

export class BoardShuffler {
  constructor(board) {
    this.board = board;
  }

  // TODO (Fase 1): shuffle until at least one valid move exists
  shuffleIfNeeded(matchDetector) {
    if (!matchDetector.hasValidMoves()) {
      console.log('BoardShuffler: no valid moves — reshuffling.');
      this._doShuffle();
    }
  }

  _doShuffle() {
    const all = this.board.grid.flat();
    const shuffled = shuffle(all);
    let i = 0;
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        this.board.grid[r][c]     = shuffled[i];
        shuffled[i].col           = c;
        shuffled[i].row           = r;
        i++;
      }
    }
  }
}
