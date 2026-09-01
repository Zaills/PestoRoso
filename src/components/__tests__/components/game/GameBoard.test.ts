import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import GameBoard from '@/components/game/GameBoard.vue'
import { ref } from 'vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { useGameState } from '@/game/useGameState'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { socket } from '@/socket.ts'

vi.mock('@/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/game/useGameState', () => ({
  useGameState: vi.fn(),
}))

vi.mock('@/components/game/BlockRenderer.vue', () => ({
  default: { template: '<div class="block"></div>' },
}))
vi.mock('@/components/game/NextPiecesHandler.vue', () => ({ default: { template: '<div></div>' } }))
vi.mock('@/components/game/HoldComponent.vue', () => ({ default: { template: '<div></div>' } }))
vi.mock('@/components/game/InputHandler.vue', () => ({ default: { template: '<div></div>' } }))
vi.mock('@/components/game/SpectrumComponent.vue', () => ({
  default: { template: '<div class="spectrum"></div>' },
}))

const mockGameState = {
  board: ref(Array.from({ length: 22 }, () => Array(10).fill(0))),
  currentPiece: ref({
    x: 10,
    y: 10,
    type: 'O',
    matrix: [
      [1, 1],
      [1, 1],
    ],
  }),
  ghostPieceY: ref(0),
  heldPieceName: ref(null),
  nextPieceIds: ref([]),
  score: ref(1500),
  level: ref(4),
  linesCount: ref(12),
  isGameOver: ref(false),
  isWinner: ref(false),
  initGame: vi.fn(),
  winGame: vi.fn(),
  addPieces: vi.fn(),
  penalityLine: vi.fn(),
  moveLeft: vi.fn(),
  moveRight: vi.fn(),
  softDrop: vi.fn(),
  rotate: vi.fn(),
  hardDrop: vi.fn(),
  hold: vi.fn(),
}

vi.mocked(useGameState).mockReturnValue(mockGameState)

describe('GameBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('render', () => {
    it('renders stats (score, level, lines) correctly from game state', () => {
      const wrapper = mount(GameBoard, { props: { id: 1 } })
      const scorePanel = wrapper.find('.score-panel')

      expect(scorePanel.text()).toContain('Score: 1500')
      expect(scorePanel.text()).toContain('Level: 4')
      expect(scorePanel.text()).toContain('Lines: 12')
    })

    it('renders the game over screen when isGameOver true', async () => {
      mockGameState.isGameOver.value = true
      const wrapper = mount(GameBoard, { props: { id: 1 } })

      expect(wrapper.find('.game-over').exists()).toBe(true)
      expect(wrapper.find('.game-over').text()).toBe('GAME OVER')
    })

    it('computes and displays active currentPieceCells correctly based on matrix position', () => {
      mockGameState.currentPiece.value = {
        type: 'O',
        x: 3,
        y: 5,
        matrix: [[]],
      }

      const wrapper = mount(GameBoard, { props: { id: 1 } })
      const renderedBlocks = wrapper.findAll('.block')
      expect(renderedBlocks.length).toBe(0)
    })
    it('computes and displays ghostCells when ghostPieceY is different from currentPiece.y', () => {
      mockGameState.currentPiece.value = {
        type: 'J',
        x: 4,
        y: 5,
        matrix: [[1, 1]],
      }
      mockGameState.ghostPieceY.value = 18

      const wrapper = mount(GameBoard, { props: { id: 1 } })

      const renderedBlocks = wrapper.findAll('.block')
      expect(renderedBlocks.length).toBe(4)
    })

    it('does not compute ghostCells if ghostPieceY matches the currentPiece.y exactly', () => {
      mockGameState.currentPiece.value = {
        type: 'J',
        x: 4,
        y: 18,
        matrix: [[1, 1]],
      }
      mockGameState.ghostPieceY.value = 18

      const wrapper = mount(GameBoard, { props: { id: 1 } })

      const renderedBlocks = wrapper.findAll('.block')
      expect(renderedBlocks.length).toBe(2)
    })

    it('correctly filters out zeros in the piece matrix and only renders non-zero cells', () => {
      mockGameState.currentPiece.value = {
        type: 'J',
        x: 3,
        y: 5,
        matrix: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
      }
      mockGameState.ghostPieceY.value = 5

      const wrapper = mount(GameBoard, { props: { id: 1 } })

      const renderedBlocks = wrapper.findAll('.block')

      expect(renderedBlocks.length).toBe(4)
    })

    it('returns an empty array for currentPieceCells if currentPiece is null', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      mockGameState.currentPiece.value = null

      const wrapper = mount(GameBoard, { props: { id: 1 } })

      const renderedBlocks = wrapper.findAll('.block')
      expect(renderedBlocks.length).toBe(0)
    })

    it('returns an empty array for ghostCells if currentPiece is null', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      mockGameState.currentPiece.value = null
      mockGameState.ghostPieceY.value = 10
      const wrapper = mount(GameBoard, { props: { id: 1 } })

      const renderedBlocks = wrapper.findAll('.block')
      expect(renderedBlocks.length).toBe(0)
    })

    it('ghostCells correctly filters out zeros in the piece matrix and only renders non-zero cells', () => {
      mockGameState.currentPiece.value = {
        type: 'J',
        x: 3,
        y: 2,
        matrix: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
      }
      mockGameState.ghostPieceY.value = 15

      const wrapper = mount(GameBoard, { props: { id: 1 } })

      const renderedBlocks = wrapper.findAll('.block')

      expect(renderedBlocks.length).toBe(8)
    })
  })

  describe('socket', () => {
    it('registers socket events on mounted and unregisters them on unmounted', () => {
      const wrapper = mount(GameBoard, { props: { id: 1 } })

      expect(socket.on).toHaveBeenCalledWith('pieces_batch', expect.any(Function))
      expect(socket.on).toHaveBeenCalledWith('more_pieces', expect.any(Function))
      expect(socket.on).toHaveBeenCalledWith('get_penality', expect.any(Function))
      expect(socket.on).toHaveBeenCalledWith('all_player', expect.any(Function))
      expect(socket.on).toHaveBeenCalledWith('game_end', expect.any(Function))

      wrapper.unmount()

      expect(socket.off).toHaveBeenCalledWith('pieces_batch', expect.any(Function))
      expect(socket.off).toHaveBeenCalledWith('more_pieces', expect.any(Function))
      expect(socket.off).toHaveBeenCalledWith('get_penality', expect.any(Function))
      expect(socket.off).toHaveBeenCalledWith('all_player', expect.any(Function))
      expect(socket.off).toHaveBeenCalledWith('game_end', expect.any(Function))
    })

    it('triggers specific game actions when socket events occur', () => {
      mount(GameBoard, { props: { id: 1 } })

      type SocketCallback = (...args: unknown[]) => void
      const socketEvents: Record<string, SocketCallback> = {}
      vi.mocked(socket.on).mock.calls.forEach(([eventName, callback]: [string, SocketCallback]) => {
        socketEvents[eventName] = callback
      })

      socketEvents['pieces_batch']([1, 2, 3, 4])
      expect(mockGameState.initGame).toHaveBeenCalledWith([1, 2, 3, 4])

      socketEvents['more_pieces']([5, 6])
      expect(mockGameState.addPieces).toHaveBeenCalledWith([5, 6])

      socketEvents['get_penality'](2)
      expect(mockGameState.penalityLine).toHaveBeenCalledWith(2)
    })

    it('handles the multiplayer all_player socket event and renders spectrum components for peer IDs', async () => {
      const wrapper = mount(GameBoard, { props: { id: 42 } })

      type SocketCallback = (...args: unknown[]) => void
      const socketEvents: Record<string, SocketCallback> = {}
      vi.mocked(socket.on).mock.calls.forEach(([eventName, callback]: [string, SocketCallback]) => {
        socketEvents[eventName] = callback
      })

      await socketEvents['all_player']([
        { id: 42, name: 'Me' },
        { id: 99, name: 'Alex' },
        { id: 100, name: 'Bob' },
      ])

      const spectrumComponents = wrapper.findAllComponents({ name: 'SpectrumComponent' })
      expect(spectrumComponents).toHaveLength(2)
    })

    it('declares the local player winner when game_end names their id', async () => {
      mockGameState.isGameOver.value = false
      const wrapper = mount(GameBoard, { props: { id: 42 } })

      type SocketCallback = (...args: unknown[]) => void
      const socketEvents: Record<string, SocketCallback> = {}
      vi.mocked(socket.on).mock.calls.forEach(([eventName, callback]: [string, SocketCallback]) => {
        socketEvents[eventName] = callback
      })

      await socketEvents['game_end']({ winnerId: 42, winnerName: 'Me' })
      await wrapper.vm.$nextTick()

      expect(mockGameState.winGame).toHaveBeenCalled()
      expect(wrapper.find('.end-banner').text()).toContain('Me WINS THE GAME')
    })

    it('does not declare the local player winner when someone else wins', async () => {
      const wrapper = mount(GameBoard, { props: { id: 42 } })

      type SocketCallback = (...args: unknown[]) => void
      const socketEvents: Record<string, SocketCallback> = {}
      vi.mocked(socket.on).mock.calls.forEach(([eventName, callback]: [string, SocketCallback]) => {
        socketEvents[eventName] = callback
      })

      await socketEvents['game_end']({ winnerId: 99, winnerName: 'Alex' })
      await wrapper.vm.$nextTick()

      expect(mockGameState.winGame).not.toHaveBeenCalled()
      expect(wrapper.find('.end-banner').text()).toContain('Alex WINS THE GAME')
    })

    it('lays opponents out in a single column up to two of them, 2 x 2 beyond', async () => {
      const wrapper = mount(GameBoard, { props: { id: 1 } })

      type SocketCallback = (...args: unknown[]) => void
      const socketEvents: Record<string, SocketCallback> = {}
      vi.mocked(socket.on).mock.calls.forEach(([eventName, callback]: [string, SocketCallback]) => {
        socketEvents[eventName] = callback
      })

      await socketEvents['all_player']([
        { id: 1, name: 'Me' },
        { id: 2, name: 'Alex' },
        { id: 3, name: 'Bob' },
      ])
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.opponents-grid').attributes('style')).toContain('repeat(1, auto)')

      await socketEvents['all_player']([
        { id: 1, name: 'Me' },
        { id: 2, name: 'Alex' },
        { id: 3, name: 'Bob' },
        { id: 4, name: 'Dana' },
      ])
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.opponents-grid').attributes('style')).toContain('repeat(2, auto)')
    })

    it('renders the win screen when the local player is the last one standing', () => {
      mockGameState.isGameOver.value = false
      mockGameState.isWinner.value = true

      const wrapper = mount(GameBoard, { props: { id: 1 } })

      expect(wrapper.find('.game-win').exists()).toBe(true)
      expect(wrapper.find('.game-win').text()).toBe('WIN')

      mockGameState.isWinner.value = false
    })
  })

  it('computes and displays active static blocks on the board matrix', () => {
    const customBoard = Array.from({ length: 22 }, () => Array(10).fill(0))
    customBoard[2][3] = 1
    mockGameState.board.value = customBoard

    const wrapper = mount(GameBoard, { props: { id: 1 } })

    const blocks = wrapper.findAll('.block')
    expect(blocks.length).toBeGreaterThan(0)
  })
})
