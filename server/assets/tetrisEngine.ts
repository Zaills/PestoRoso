export const PIECES = {
  1: [ // I
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  2: [ // J
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  3: [ // L
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  4: [ // O
    [4, 4],
    [4, 4],
  ],
  5: [ // S
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  6: [ // T
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  7: [ // Z
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ]
}

export interface PieceState {
  matrix: number[][]
  x: number
  y: number
}

export function spawnPiece(pieceId: number): PieceState {
  const matrix = PIECES[pieceId as keyof typeof PIECES]
  return {
    matrix: matrix,
    x: Math.floor(10 / 2) - Math.floor(matrix[0].length / 2),
    y: 0, // Commence tout en haut (dans la zone de buffer)
  }
}

export function checkCollision(board: number[][], piece: PieceState, dx: number, dy: number, rotatedMatrix?: number[][]): boolean {
  const matrix = rotatedMatrix || piece.matrix
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] !== 0) {
        const newX = piece.x + x + dx
        const newY = piece.y + y + dy

        // Vérifie les murs et le sol
        if (newX < 0 || newX >= 10 || newY >= 22) {
          return true
        }

        // Vérifie les autres blocs sur le plateau
        if (newY >= 0 && board[newY][newX] !== 0) {
          return true
        }
      }
    }
  }
  return false
}

export function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length
  const rotated = Array.from({ length: N }, () => Array(N).fill(0))
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      rotated[x][N - 1 - y] = matrix[y][x]
    }
  }
  return rotated
}
