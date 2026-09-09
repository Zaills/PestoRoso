export type PieceId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

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

  // getGhostY(board: number[][]): number {
  //   let ghostY = this.y
  //   while (!checkCollision(board, { ...this, y: ghostY }, 0, 1)) {
  //     ghostY++
  //   }
  //   return ghostY
  // }


}
