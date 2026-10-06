import type { PieceId } from './tetrisEngine.ts'

export class Piece {
  pieceId: PieceId
  x: number
  y: number
  rotation: number
  matrix: number[][]

  constructor(pieceId: PieceId, x: number, y: number, rotation: number, matrix: number[][]) {
    this.pieceId = pieceId
    this.x = x
    this.y = y
    this.rotation = rotation
    this.matrix = matrix
  }

}
