import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import PlayerHandler from '@/components/game/PlayerHandler.vue'

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const socketHandlers: Record<string, Function> = {}

vi.mock('@/socket.ts', () => ({
  socket: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on: vi.fn((event: string, callback: Function) => {
      socketHandlers[event] = callback
    }),
  },
}))

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
    WaitingRoom: true,
  }

  it('renders properly and listens to socket events on mount', () => {
    const wrapper = mount(PlayerHandler, {
      global: { stubs },
      props: defaultProps,
    })
    expect(wrapper.find('.player-handler').exists()).toBe(true)
    expect(socketHandlers['game_status']).toBeDefined()
    expect(socketHandlers['you_join']).toBeDefined()
  })

  it('renders WaitingRoom initially when game is not started', () => {
    const wrapper = mount(PlayerHandler, {
      global: { stubs },
      props: defaultProps,
    })

    const waitingRoom = wrapper.findComponent({ name: 'WaitingRoom' })
    const gameBoard = wrapper.findComponent({ name: 'GameBoard' })

    expect(waitingRoom.exists()).toBe(true)
    expect(gameBoard.exists()).toBe(false)
    expect(waitingRoom.props('playerList')).toEqual(defaultProps.playerList)
    expect(waitingRoom.props('ViewerList')).toEqual(defaultProps.ViewerList)
  })

  it('switches to GameBoard when "game_status" socket event sends true', async () => {
    const wrapper = mount(PlayerHandler, {
      global: { stubs },
      props: defaultProps,
    })

    // Trigger socket event
    socketHandlers['game_status'](true)
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'WaitingRoom' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'GameBoard' }).exists()).toBe(true)
  })

  it('passes the updated player ID to GameBoard when "you_join" socket event fires', async () => {
    const wrapper = mount(PlayerHandler, {
      global: { stubs },
      props: defaultProps,
    })

    const testId = 42

    // Emit both events: join and start game
    socketHandlers['you_join'](testId)
    socketHandlers['game_status'](true)
    await wrapper.vm.$nextTick()

    const gameBoard = wrapper.findComponent({ name: 'GameBoard' })
    expect(gameBoard.exists()).toBe(true)
    expect(gameBoard.props('id')).toBe(testId)
  })

})
