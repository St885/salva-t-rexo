export class LevelObjectives {
  constructor({ targetScore = 500, maxMoves = 20, eggsRequired = 0, boxesRequired = 0 } = {}) {
    this.targetScore   = targetScore;
    this.maxMoves      = maxMoves;
    this.eggsRequired  = eggsRequired;
    this.boxesRequired = boxesRequired;
    this.score         = 0;
    this.movesUsed     = 0;
    this.eggsBroken    = 0;
    this.boxesBroken   = 0;
  }

  get movesLeft() { return Math.max(0, this.maxMoves - this.movesUsed); }

  addScore(points) { this.score += points; }
  useMove()        { this.movesUsed++; }
  breakEgg()       { this.eggsBroken  = Math.min(this.eggsRequired,  this.eggsBroken  + 1); }
  breakBox()       { this.boxesBroken = Math.min(this.boxesRequired, this.boxesBroken + 1); }

  isWon() {
    const eggsOk  = this.eggsRequired  <= 0 || this.eggsBroken  >= this.eggsRequired;
    const boxesOk = this.boxesRequired <= 0 || this.boxesBroken >= this.boxesRequired;
    if (this.eggsRequired > 0 || this.boxesRequired > 0) return eggsOk && boxesOk;
    return this.score >= this.targetScore;
  }
  isLost() { return this.movesLeft <= 0 && !this.isWon(); }
  isOver() { return this.isWon() || this.isLost(); }
}
