// Game status constants (matching Cairo constants in contracts/src/constants.cairo)
// This file is NOT auto-generated — safe from `npm run generate` overwrites.

export enum GameStatus {
  WAITING = 0,
  COMMITTING = 1,
  REVEALING = 2,
  FINISHED = 3,
}

export enum Move {
  NONE = 0,
  ROCK = 1,
  PAPER = 2,
  SCISSORS = 3,
}
