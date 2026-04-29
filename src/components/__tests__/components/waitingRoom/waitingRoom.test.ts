import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import WaitingRoom from '@/components/waitingRoom/waitingRoom.vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { socket } from '@/socket.ts'

vi.mock('@/socket.ts', () => ({
  socket: {
    emit: vi.fn(),
  },
}))

describe('Waiting Room', () => {
  const originalLocation = window.location

  const setMockUrl = (url: string) => {
    Object.defineProperty(window, 'location', {
      value: { href: url },
      writable: true,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  const stubs = { PlayerIcon: true }
  const defaultProps = {
    playerList: ['Alice', 'Bob'],
    ViewerList: ['Charlie'],
  }

  it('render list correctly', () => {
    setMockUrl('http://localhost:3000/roomA/Bob')
    const wrapper = mount(WaitingRoom, {
      global: { stubs },
      props: defaultProps,
    })

    const icons = wrapper.findAllComponents({ name: 'PlayerIcon' })
    expect(icons.length).toBe(3)

    expect(icons[0].props('player')).toBe('Alice')
    expect(icons[1].props('player')).toBe('Bob')
    expect(icons[2].props('player')).toBe('Charlie')
  })

  it('Start Game button should be define for the 1st User', async () => {
    setMockUrl('http://localhost:3000/roomA/Alice')
    const wrapper = mount(WaitingRoom, {
      global: { stubs },
      props: defaultProps,
    })

    const buttons = wrapper.findAll('button')
    const startButton = buttons.find((b) => b.text() === 'Start Game')

    expect(startButton).toBeDefined()

    await startButton?.trigger('click')
    expect(socket.emit).toHaveBeenCalledWith('start_game', { name: 'Alice' })
  })

  it('Start Game button should not be define for the 2st User', () => {
    setMockUrl('http://localhost:3000/roomA/Bob')
    const wrapper = mount(WaitingRoom, { props: defaultProps, global: { stubs } })

    const buttons = wrapper.findAll('button')
    const startButton = buttons.find((b) => b.text() === 'Start Game')

    expect(startButton).toBeUndefined()
  })

  it('change_team when the Change Team button is clicked', async () => {
    setMockUrl('http://localhost:3000/roomX/Charlie')
    const wrapper = mount(WaitingRoom, { props: defaultProps, global: { stubs } })

    const buttons = wrapper.findAll('button')
    const changeTeamButton = buttons.find((b) => b.text() === 'Change Team')

    await changeTeamButton?.trigger('click')

    expect(socket.emit).toHaveBeenCalledWith('change_team', {
      room: 'roomX',
      name: 'Charlie',
    })
  })
})
