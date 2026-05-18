import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import GameView from '@/views/GameView.vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { socket } from '@/socket.ts'

vi.mock('@/socket.ts', () => ({
  socket: {
    connected: false,
    connect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
  },
}))

describe('Home View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/roomA/Alex' },
      writable: true,
    })
  })

  it('socket connect an join room on mount ', () => {
    mount(GameView, {
      global: { stubs: { PlayerHandler: true } },
    })

    expect(socket.connect).toHaveBeenCalled()
    expect(socket.emit).toHaveBeenCalledWith('join_room', {
      room: 'roomA',
      name: 'Alex',
    })
  })

  it('socket disconnect on unmount ', () => {
    const wrapper = mount(GameView, {
      global: { stubs: { PlayerHandler: true } },
    })

    wrapper.unmount()
    expect(socket.disconnect).toHaveBeenCalled()
  })

  it('player and viewer list receive on room_update', async () => {
    let updateCallback: (arg0: string[], arg1: string[]) => void
    vi.mocked(socket.on).mockImplementation((event, cb) => {
      if (event === 'room_update') updateCallback = cb
    })

    const wrapper = mount(GameView, {
      global: { stubs: { PlayerHandler: true } },
    })

    const mockPlayers = ['Alex', 'Bob']
    const mockSpectators = ['Charlie']
    updateCallback(mockPlayers, mockSpectators)

    await wrapper.vm.$nextTick()
    const playerHandler = wrapper.getComponent({ name: 'PlayerHandler' })
    expect(playerHandler.props('playerList')).toEqual(mockPlayers)
    expect(playerHandler.props('ViewerList')).toEqual(mockSpectators)
  })
})
