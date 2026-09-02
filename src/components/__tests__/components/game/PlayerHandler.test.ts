import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import PlayerHandler from '@/components/game/PlayerHandler.vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { socket } from '@/socket.ts'

vi.mock('@/socket.ts', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}))

type SocketCallback = (...args: unknown[]) => void

function socketEvents(): Record<string, SocketCallback> {
  const events: Record<string, SocketCallback> = {}
  vi.mocked(socket.on).mock.calls.forEach(([eventName, callback]: [string, SocketCallback]) => {
    events[eventName] = callback
  })
  return events
}

describe('PlayerHandler', () => {
  const defaultProps = {
    playerList: ['Alice', 'Bob'],
    ViewerList: ['Charlie'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(socketHandlers).forEach((key) => delete socketHandlers[key])
  })

  const stubs = {
    GameBoard: true,
    ViewerBoard: true,
    waitingRoom: true,
  }

  const props = { playerList: [], ViewerList: [] }

  it('Should render properly', () => {
    const wrapper = mount(PlayerHandler, { global: { stubs }, props })
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('shows the waiting room until the game starts', () => {
    const wrapper = mount(PlayerHandler, { global: { stubs }, props })

    expect(wrapper.findComponent({ name: 'waitingRoom' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'GameBoard' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ViewerBoard' }).exists()).toBe(false)
  })

  it('passes the server host flag down to the waiting room', async () => {
    const wrapper = mount(PlayerHandler, { global: { stubs }, props })
    const events = socketEvents()

    expect(wrapper.findComponent({ name: 'waitingRoom' }).props('isHost')).toBe(false)

    events['host_update'](true)
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'waitingRoom' }).props('isHost')).toBe(true)
  })

  it('gives a player the playable board once the game starts', async () => {
    const wrapper = mount(PlayerHandler, { global: { stubs }, props })
    const events = socketEvents()

    events['you_join'](4)
    events['role_update']('player')
    events['game_status'](true)
    await wrapper.vm.$nextTick()

    const board = wrapper.findComponent({ name: 'GameBoard' })
    expect(board.exists()).toBe(true)
    expect(board.props('id')).toBe(4)
    expect(wrapper.findComponent({ name: 'ViewerBoard' }).exists()).toBe(false)
  })

  it('gives a spectator the viewer page instead of a playable board', async () => {
    const wrapper = mount(PlayerHandler, { global: { stubs }, props })
    const events = socketEvents()

    events['role_update']('spectator')
    events['game_status'](true)
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'ViewerBoard' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'GameBoard' }).exists()).toBe(false)
  })

  it('releases its socket listeners on unmount', () => {
    const wrapper = mount(PlayerHandler, { global: { stubs }, props })

    wrapper.unmount()

    expect(socket.off).toHaveBeenCalledWith('game_status', expect.any(Function))
    expect(socket.off).toHaveBeenCalledWith('you_join', expect.any(Function))
    expect(socket.off).toHaveBeenCalledWith('role_update', expect.any(Function))
    expect(socket.off).toHaveBeenCalledWith('host_update', expect.any(Function))
  })
})
