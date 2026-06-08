export class LevelObjectives {
  constructor({ targetScore = 500, maxMoves = 20, eggsRequired = 0 } = {}) {
    this.targetScore  = targetScore;
    this.maxMoves     = maxMoves;
    this.eggsRequired = eggsRequired;
    this.score        = 0;
    this.movesUsed    = 0;
    this.eggsBroken   = 0;
  }

  get movesLeft() { return Math.max(0, this.maxMoves - this.movesUsed); }

  addScore(points) { this.score += points; }
  useMove()        { this.movesUsed++; }
  breakEgg()       { this.eggsBroken = Math.min(this.eggsRequired, this.eggsBroken + 1); }

  isWon() {
    if (this.eggsRequired > 0) return this.eggsBroken >= this.eggsRequired;
    return this.score >= this.targetScore;
  }
  isLost() { return this.movesLeft <= 0 && !this.isWon(); }
  isOver() { return this.isWon() || this.isLost(); }
}
