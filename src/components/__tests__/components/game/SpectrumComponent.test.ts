import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SpectrumComponent from '@/components/game/SpectrumComponent.vue'
import { socket } from '@/socket.ts'

vi.mock('@/socket.ts', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/components/game/BlockRenderer.vue', () => ({
  default: {
    name: 'BlockRenderer',
    template: '<div class="block"></div>',
    props: ['cellSize', 'x', 'y', 'type'],
  },
}))

type SocketCallback = (...args: unknown[]) => void

function emptyBoard() {
  return Array.from({ length: 22 }, () => Array(10).fill(0))
}

function lastGameUpdateHandler(): SocketCallback {
  const call = vi
    .mocked(socket.on)
    .mock.calls.findLast(([eventName]: [string]) => eventName === 'game_update')
  if (!call) throw new Error('game_update listener not found')
  return call[1]
}

describe('SpectrumComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back on a generic label when no name is given', () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 3 } })

    expect(wrapper.find('.opponent-name').text()).toBe('PLAYER 3')
  })

  it('displays the opponent name when provided', () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 3, name: 'Alex' } })

    expect(wrapper.find('.opponent-name').text()).toBe('Alex')
  })

  it('renders only the blocks of the matching opponent board', async () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 7, name: 'Bob' } })
    const board = emptyBoard()
    board[5]![2] = 1
    board[6]![2] = 1

    lastGameUpdateHandler()({ name: 'Bob', board, isGameOver: false, id: 7 })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.block')).toHaveLength(2)
  })

  it('ignores updates coming from another opponent', async () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 7, name: 'Bob' } })
    const board = emptyBoard()
    board[5]![2] = 1

    lastGameUpdateHandler()({ name: 'Zoe', board, isGameOver: false, id: 8 })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.block')).toHaveLength(0)
  })

  it('shows the game over overlay once the opponent tops out', async () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 7, name: 'Bob' } })

    lastGameUpdateHandler()({ name: 'Bob', board: emptyBoard(), isGameOver: true, id: 7 })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.overlay.game-over').exists()).toBe(true)
    expect(wrapper.find('.opponent').classes()).toContain('dead')
  })

  it('shows the win overlay for the last player standing', () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 7, name: 'Bob', won: true } })

    expect(wrapper.find('.overlay.win').text()).toBe('WIN')
    expect(wrapper.find('.opponent').classes()).toContain('winner')
  })

  it('registers and releases the game_update listener', () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 1 } })

    expect(socket.on).toHaveBeenCalledWith('game_update', expect.any(Function))

    wrapper.unmount()

    expect(socket.off).toHaveBeenCalledWith('game_update', expect.any(Function))
  })

  it('covers null/falsy boardMatrix fallback', async () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 1 } })

    lastGameUpdateHandler()({
      name: 'Test',
      board: null as unknown as number[][],
      isGameOver: false,
      id: 1,
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.block')).toHaveLength(0)
  })

  it('covers empty matrix and optional chaining fallbacks (?? 0)', async () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 1 } })

    lastGameUpdateHandler()({
      name: 'Test',
      board: [],
      isGameOver: false,
      id: 1,
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.block')).toHaveLength(0)

    const sparseBoard = [
      [1, undefined], // row 0 col 1 is undefined -> triggers `?? 0`
    ] as unknown as number[][]

    lastGameUpdateHandler()({
      name: 'Test',
      board: sparseBoard,
      isGameOver: false,
      id: 1,
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.block')).toHaveLength(1)
  })

  it('covers nullish fallback for cols when first row is undefined', async () => {
    const wrapper = mount(SpectrumComponent, { props: { id: 1 } })

    // totalRows = 1 (passes totalRows === 0 check)
    // boardMatrix.value[0] = undefined (triggers ?. and ?? 0 fallbacks)
    const invalidMatrix = [undefined] as unknown as number[][]

    lastGameUpdateHandler()({
      name: 'Test',
      board: invalidMatrix,
      isGameOver: false,
      id: 1,
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.block')).toHaveLength(0)
  })
})
