import { ref, computed, onUnmounted, watch } from 'vue'
import { socket } from '@/socket'
import {
  createEmptyBoard,
  spawnPiece,
  checkCollision,
  rotateMatrix,
  lockPiece,
  clearLines,
  getGhostY,
  PIECE_NAMES,
  type PieceState,
  type PieceName,
} from './tetrisEngine'

export function useGameState() {
  const board = ref<number[][]>(createEmptyBoard())
  const currentPiece = ref<PieceState | null>(null)
  const heldPieceId = ref<number | null>(null)
  const canHold = ref(true)
  const pieceQueue = ref<number[]>([])
  const score = ref(0)
  const level = ref(1)
  const linesCount = ref(0)
  const isGameOver = ref(false)

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
    heldPieceId.value = null
    canHold.value = true
    currentPiece.value = null
    spawnNextPiece()
    startGravity()
  }

  function penalityLine(lines: number) {
    if (lines <= 0 || isGameOver.value) return

    for (let i = 0; i < lines; i++) {
      const remainingBoard = board.value.slice(1)

      const row = new Array(10).fill(8)

      board.value = [...remainingBoard, row]
      if (currentPiece.value) {
        while (checkCollision(board.value, currentPiece.value, 0, 0)) {
          currentPiece.value = {
            ...currentPiece.value,
            y: currentPiece.value.y - 1,
          }
        }
      }
    }
  }

  function spawnNextPiece() {
    if (pieceQueue.value.length < 14) {
      socket.emit('request_more_pieces')
    }
    const pieceId = pieceQueue.value.shift()
    if (pieceId === undefined) return
    const piece = spawnPiece(pieceId)
    if (checkCollision(board.value, piece, 0, 0)) {
      isGameOver.value = true
      stopGravity()
      socket.emit('board_update', { board: board.value, score: score.value, isGameOver: true })
      return
    }
    currentPiece.value = piece
    canHold.value = true
  }

  function addPieces(pieces: number[]) {
    pieceQueue.value.push(...pieces)
  }

  function lockCurrentPiece() {
    if (!currentPiece.value) return
    const locked = lockPiece(board.value, currentPiece.value)
    const { newBoard, linesCleared } = clearLines(locked)
    board.value = newBoard
    updateScore(linesCleared)
    socket.emit('board_update', { board: board.value, score: score.value, isGameOver: false })
    spawnNextPiece()
  }

  function updateScore(cleared: number) {
    const points = [0, 100, 300, 500, 800]
    linesCount.value += cleared
    score.value += (points[cleared] ?? 0) * level.value
    level.value = Math.floor(linesCount.value / 10) + 1
  }

  function gravity() {
    if (!currentPiece.value || isGameOver.value) return
    if (!checkCollision(board.value, currentPiece.value, 0, 1)) {
      currentPiece.value = { ...currentPiece.value, y: currentPiece.value.y + 1 }
    } else {
      lockCurrentPiece()
    }
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
    if (!isGameOver.value) startGravity()
  })

  function moveLeft() {
    if (!currentPiece.value || isGameOver.value) return
    if (!checkCollision(board.value, currentPiece.value, -1, 0)) {
      currentPiece.value = { ...currentPiece.value, x: currentPiece.value.x - 1 }
    }
  }

  function moveRight() {
    if (!currentPiece.value || isGameOver.value) return
    if (!checkCollision(board.value, currentPiece.value, 1, 0)) {
      currentPiece.value = { ...currentPiece.value, x: currentPiece.value.x + 1 }
    }
  }

  function softDrop() {
    if (!currentPiece.value || isGameOver.value) return
    if (!checkCollision(board.value, currentPiece.value, 0, 1)) {
      currentPiece.value = { ...currentPiece.value, y: currentPiece.value.y + 1 }
      score.value += 1
    } else {
      lockCurrentPiece()
    }
  }

  function rotate() {
    if (!currentPiece.value || isGameOver.value) return
    const rotated = rotateMatrix(currentPiece.value.matrix)
    if (!checkCollision(board.value, currentPiece.value, 0, 0, rotated)) {
      currentPiece.value = { ...currentPiece.value, matrix: rotated }
      return
    }
    for (const dx of [-1, 1, -2, 2]) {
      if (!checkCollision(board.value, currentPiece.value, dx, 0, rotated)) {
        currentPiece.value = {
          ...currentPiece.value,
          x: currentPiece.value.x + dx,
          matrix: rotated,
        }
        return
      }
    }
  }

  function hardDrop() {
    if (!currentPiece.value || isGameOver.value) return
    const gy = ghostPieceY.value
    score.value += (gy - currentPiece.value.y) * 2
    currentPiece.value = { ...currentPiece.value, y: gy }
    lockCurrentPiece()
  }

  function hold() {
    if (!currentPiece.value || isGameOver.value || !canHold.value) return
    canHold.value = false
    const currentId = currentPiece.value.pieceId
    if (heldPieceId.value === null) {
      heldPieceId.value = currentId
      spawnNextPiece()
    } else {
      const swapId = heldPieceId.value
      heldPieceId.value = currentId
      currentPiece.value = spawnPiece(swapId)
    }
  }

  onUnmounted(stopGravity)

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
    initGame,
    addPieces,
    penalityLine,
    moveLeft,
    moveRight,
    softDrop,
    rotate,
    hardDrop,
    hold,
    stopGravity,
  }
}
