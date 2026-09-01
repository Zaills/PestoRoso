import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import SpectrumComponent from '@/components/game/SpectrumComponent.vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { socket } from '@/socket.ts'

vi.mock('@/socket.ts', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/components/game/BlockRenderer.vue', () => ({
  default: { template: '<div class="block"></div>' },
}))

type SocketCallback = (...args: unknown[]) => void

function emptyBoard() {
  return Array.from({ length: 22 }, () => Array(10).fill(0))
}

function lastGameUpdateHandler(): SocketCallback {
  const call = vi
    .mocked(socket.on)
    .mock.calls.findLast(([eventName]: [string]) => eventName === 'game_update')
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
})
