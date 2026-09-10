import { computed, onScopeDispose, ref, watch } from 'vue'
import { socket } from '@/socket'
import {
  applyPenaltyLines,
  checkCollision,
  clearLines,
  createEmptyBoard,
  getGhostY,
  getPieceMatrix,
  isBoardOverflowed,
  levelForLines,
  lockPiece,
  PIECE_NAMES,
  type PieceId,
  type PieceName,
  ROTATIONS,
  scoreForLines,
  spawnPiece
} from './tetrisEngine'
import { Piece } from '@shared/PieceClass.ts'

/**
 * Local game state.
 *
 * Everything is computed here so play stays instant, but the server is the authority:
 * it replays each placement on its own board and owns the penalties, the score and
 * the elimination. This composable only reports what the player did — it never
 * reports a result the server could not check.
 */
export function useGameState() {
  const board = ref<number[][]>(createEmptyBoard())
  const currentPiece = ref<Piece | null>(null)
  const heldPieceId = ref<PieceId | null>(null)
  const canHold = ref(true)
  const pieceQueue = ref<number[]>([])
  const score = ref(0)
  const level = ref(1)
  const linesCount = ref(0)
  const isGameOver = ref(false)
  const isWinner = ref(false)
  // True once the piece rests on the stack but has not been locked yet.
  const isLanded = ref(false)
  // Penalty lines absorbed since the start of the round. Sent with every placement so
  // the server can apply the same penalties in the same order before validating it.
  const penaltiesApplied = ref(0)

  let gravityInterval: ReturnType<typeof setInterval> | null = null

  const nextPieceIds = computed(() => pieceQueue.value.slice(0, 5))

  const heldPieceName = computed<PieceName | null>(() =>
    heldPieceId.value !== null ? PIECE_NAMES[heldPieceId.value] : null,
  )

  const ghostPieceY = computed<number>(() => {
    if (!currentPiece.value) return 0
    return getGhostY(board.value, currentPiece.value)
  })

  function initGame(pieces: number[]) {
    board.value = createEmptyBoard()
    pieceQueue.value = [...pieces]
    score.value = 0
    level.value = 1
    linesCount.value = 0
    isGameOver.value = false
    isWinner.value = false
    isLanded.value = false
    penaltiesApplied.value = 0
    heldPieceId.value = null
    canHold.value = true
    currentPiece.value = null
    spawnNextPiece()
    startGravity()
  }

  // Each penalty line pushes the whole stack up by one row and appends an
  // indestructible row at the bottom.
  function penaltyLine(lines: number) {
    if (lines <= 0 || isGameOver.value || isWinner.value) return

    penaltiesApplied.value += lines
    board.value = applyPenaltyLines(board.value, lines)
    while (currentPiece.value && checkCollision(board.value, currentPiece.value, 0, 0)) {
      currentPiece.value = {
        ...currentPiece.value,
        y: currentPiece.value.y - 1,
      }
    }
  }

  /** Adopts the server board after it rejected a placement or detected a divergence. */
  function resyncBoard(payload: {
    board: number[][]
    pieceId: PieceId | null
    penaltyCount: number
  }) {
    board.value = payload.board.map((row) => [...row])
    penaltiesApplied.value = payload.penaltyCount
    currentPiece.value = payload.pieceId === null ? null : spawnPiece(payload.pieceId)
    isLanded.value = false
  }

  /**
   * Shown right away so the player sees the result of their own move. The server
   * reaches the same conclusion on its own board and is the one that eliminates.
   */
  function triggerGameOver() {
    isGameOver.value = true
    stopGravity()
  }

  function spawnNextPiece() {
    const pieceId = pieceQueue.value.shift()
    if (pieceId === undefined) return
    const piece = spawnPiece(pieceId as PieceId)
    if (checkCollision(board.value, piece, 0, 0)) {
      triggerGameOver()
      return
    }
    currentPiece.value = piece
    canHold.value = true
    isLanded.value = false
  }

  function addPieces(pieces: number[]) {
    pieceQueue.value.push(...pieces)
  }

  function lockCurrentPiece() {
    if (!currentPiece.value) return
    const piece = currentPiece.value

    // Four numbers instead of a 22 x 10 matrix: the server rebuilds the shape from
    // the piece id and rotation, so a tampered client cannot invent a placement.
    socket.emit('piece_locked', {
      pieceId: piece.pieceId,
      x: piece.x,
      y: piece.y,
      rotation: piece.rotation,
      penaltyCount: penaltiesApplied.value,
    })

    const locked = lockPiece(board.value, piece)
    const { newBoard, linesCleared } = clearLines(locked)
    board.value = newBoard
    updateScore(linesCleared)

    // The stack now reaches above the 20 visible lines: the round is lost here rather
    // than one piece later, when the next spawn would have collided.
    if (isBoardOverflowed(board.value)) {
      currentPiece.value = null
      isLanded.value = false
      triggerGameOver()
      return
    }

    spawnNextPiece()
  }

  function updateScore(cleared: number) {
    linesCount.value += cleared
    score.value += scoreForLines(cleared, level.value)
    level.value = levelForLines(linesCount.value)
  }

  function gravity() {
    if (!currentPiece.value || isGameOver.value || isWinner.value) return

    if (!checkCollision(board.value, currentPiece.value, 0, 1)) {
      currentPiece.value = { ...currentPiece.value, y: currentPiece.value.y + 1 }
      isLanded.value = false
      return
    }

    if (!isLanded.value) {
      isLanded.value = true
      return
    }

    lockCurrentPiece()
  }

  function startGravity() {
    stopGravity()
    const delay = Math.max(100, 1000 - (level.value - 1) * 100)
    gravityInterval = setInterval(gravity, delay)
  }

  function stopGravity() {
    if (gravityInterval !== null) {
      clearInterval(gravityInterval)
      gravityInterval = null
    }
  }

  watch(level, () => {
    if (!isGameOver.value && !isWinner.value) startGravity()
  })

  function moveLeft() {
    if (!currentPiece.value || isGameOver.value || isWinner.value) return
    if (!checkCollision(board.value, currentPiece.value, -1, 0)) {
      currentPiece.value = { ...currentPiece.value, x: currentPiece.value.x - 1 }
    }
  }

  function moveRight() {
    if (!currentPiece.value || isGameOver.value || isWinner.value) return
    if (!checkCollision(board.value, currentPiece.value, 1, 0)) {
      currentPiece.value = { ...currentPiece.value, x: currentPiece.value.x + 1 }
    }
  }

  function softDrop() {
    if (!currentPiece.value || isGameOver.value || isWinner.value) return
    if (!checkCollision(board.value, currentPiece.value, 0, 1)) {
      currentPiece.value = { ...currentPiece.value, y: currentPiece.value.y + 1 }
      score.value += 1
    } else {
      lockCurrentPiece()
    }
  }

  function rotate() {
    if (!currentPiece.value || isGameOver.value || isWinner.value) return
    const piece = currentPiece.value
    // The rotation index is what travels to the server, so it is the source of truth:
    // the matrix is always rebuilt from it rather than turned in place.
    const nextRotation = (piece.rotation + 1) % ROTATIONS
    const rotated = getPieceMatrix(piece.pieceId, nextRotation)

    if (!checkCollision(board.value, piece, 0, 0, rotated)) {
      currentPiece.value = { ...piece, matrix: rotated, rotation: nextRotation }
      return
    }
    for (const dx of [-1, 1, -2, 2]) {
      if (!checkCollision(board.value, piece, dx, 0, rotated)) {
        currentPiece.value = {
          ...piece,
          x: piece.x + dx,
          matrix: rotated,
          rotation: nextRotation,
        }
        return
      }
    }
  }

  function hardDrop() {
    if (!currentPiece.value || isGameOver.value || isWinner.value) return
    const gy = ghostPieceY.value
    score.value += (gy - currentPiece.value.y) * 2
    currentPiece.value = { ...currentPiece.value, y: gy }
    lockCurrentPiece()
  }

  function hold() {
    if (!currentPiece.value || isGameOver.value || isWinner.value || !canHold.value) return
    // The server mirrors the same swap, otherwise it would expect the wrong piece
    // on the next placement.
    socket.emit('piece_held')
    const currentId = currentPiece.value.pieceId
    if (heldPieceId.value === null) {
      heldPieceId.value = currentId
      spawnNextPiece()
    } else {
      const swapId = heldPieceId.value
      heldPieceId.value = currentId
      currentPiece.value = spawnPiece(swapId)
      isLanded.value = false
    }
    // Set last: filling an empty hold slot goes through spawnNextPiece(), which grants
    // a fresh hold. Clearing the flag afterward is what makes the once-per-piece rule
    // actually hold, and keeps the server mirror in step.
    canHold.value = false
  }

  // Last player standing: the game stops and the board freezes on the win screen.
  function winGame() {
    if (isGameOver.value) return
    isWinner.value = true
    stopGravity()
  }

  onScopeDispose(stopGravity)

  return {
    board,
    currentPiece,
    ghostPieceY,
    heldPieceName,
    nextPieceIds,
    score,
    level,
    linesCount,
    isGameOver,
    isWinner,
    initGame,
    winGame,
    addPieces,
    penaltyLine,
    resyncBoard,
    moveLeft,
    moveRight,
    softDrop,
    rotate,
    hardDrop,
    hold,
    stopGravity,
  }
}
