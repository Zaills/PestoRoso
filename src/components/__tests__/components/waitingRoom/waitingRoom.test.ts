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
    playerList: ['Alex', 'Bob'],
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

    expect(icons[0].props('player')).toBe('Alex')
    expect(icons[1].props('player')).toBe('Bob')
    expect(icons[2].props('player')).toBe('Charlie')
  })

  it('Start Game button should be define for the 1st User', async () => {
    setMockUrl('http://localhost:3000/roomA/Alex')
    const wrapper = mount(WaitingRoom, {
      global: { stubs },
      props: defaultProps,
    })

    const buttons = wrapper.findAll('button')
    const startButton = buttons.find((b) => b.text() === 'START GAME')

    expect(startButton).toBeDefined()

    await startButton?.trigger('click')
    expect(socket.emit).toHaveBeenCalledWith('start_game', { name: 'Alex', room: "roomA" })
  })

  it('Start Game button should not be define for the 2st User', () => {
    setMockUrl('http://localhost:3000/roomA/Bob')
    const wrapper = mount(WaitingRoom, { props: defaultProps, global: { stubs } })

    const buttons = wrapper.findAll('button')
    const startButton = buttons.find((b) => b.text() === 'START GAME')

    expect(startButton).toBeUndefined()
  })

  it('caps the roster at 5 players and blocks a viewer from taking a 6th slot', async () => {
    setMockUrl('http://localhost:3000/roomA/Frank')
    const wrapper = mount(WaitingRoom, {
      global: { stubs },
      props: {
        playerList: ['Alex', 'Bob', 'Charlie', 'Dave', 'Eve'],
        ViewerList: ['Frank'],
      },
    })

    expect(wrapper.find('.column-title').text()).toBe('PLAYERS 5/5')
    expect(wrapper.find('.room-full').exists()).toBe(true)

    const buttons = wrapper.findAll('button')
    const changeTeamButton = buttons.find((b) => b.text() === 'CHANGE TEAM')
    expect(changeTeamButton?.attributes('disabled')).toBeDefined()

    await changeTeamButton?.trigger('click')
    expect(socket.emit).not.toHaveBeenCalled()
  })

  it('lets a player of a full room step down to the viewers', async () => {
    setMockUrl('http://localhost:3000/roomA/Eve')
    const wrapper = mount(WaitingRoom, {
      global: { stubs },
      props: {
        playerList: ['Alex', 'Bob', 'Charlie', 'Dave', 'Eve'],
        ViewerList: [],
      },
    })

    const buttons = wrapper.findAll('button')
    const changeTeamButton = buttons.find((b) => b.text() === 'CHANGE TEAM')
    expect(changeTeamButton?.attributes('disabled')).toBeUndefined()

    await changeTeamButton?.trigger('click')
    expect(socket.emit).toHaveBeenCalledWith('change_team', { room: 'roomA', name: 'Eve' })
  })

  it('change_team when the Change Team button is clicked', async () => {
    setMockUrl('http://localhost:3000/roomX/Charlie')
    const wrapper = mount(WaitingRoom, { props: defaultProps, global: { stubs } })

    const buttons = wrapper.findAll('button')
    const changeTeamButton = buttons.find((b) => b.text() === 'CHANGE TEAM')

    await changeTeamButton?.trigger('click')

    expect(socket.emit).toHaveBeenCalledWith('change_team', {
      room: 'roomX',
      name: 'Charlie',
    })
  })

  it('prevents a viewer from joining the player team when the room is full', async () => {
    setMockUrl('http://localhost:3000/roomA/Viewer1')

    const wrapper = mount(WaitingRoom, {
      global: { stubs },
      props: {
        playerList: ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'],
        ViewerList: ['Viewer1'],
      },
    })

    const changeTeamButton = wrapper.findAll('button').find((b) => b.text() === 'CHANGE TEAM')
    expect(changeTeamButton?.attributes('disabled')).toBeDefined()

    wrapper.vm.changeTeam()

    expect(socket.emit).not.toHaveBeenCalled()
  })
  it('falls back to empty strings when url fails or is empty', async () => {
    setMockUrl('')

    const wrapper = mount(WaitingRoom, {
      global: { stubs },
      props: {
        playerList: ['Alex'],
        ViewerList: [],
      },
    })

    const changeTeamButton = wrapper.findAll('button').find((b) => b.text() === 'CHANGE TEAM')
    await changeTeamButton?.trigger('click')

    expect(socket.emit).toHaveBeenCalledWith('change_team', {
      room: '',
      name: '',
    })
  })

})
