import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import ViewerBoard from '@/components/game/ViewerBoard.vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { socket } from '@/socket'

vi.mock('@/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}))

vi.mock('@/components/game/SpectrumComponent.vue', () => ({
  default: {
    name: 'SpectrumComponent',
    props: ['id', 'name', 'cellSize', 'won'],
    template: '<div class="spectrum"></div>',
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

const roster = [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Dana' },
  { id: 4, name: 'Eve' },
]

describe('ViewerBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('announces the spectator mode below the boards and waits for them', () => {
    const wrapper = mount(ViewerBoard)

    expect(wrapper.find('.viewer-badge').text()).toBe('SPECTATOR MODE')
    expect(wrapper.find('.viewer-waiting').exists()).toBe(true)
    expect(wrapper.findAll('.spectrum')).toHaveLength(0)

    const children = Array.from(wrapper.element.children).map((node) => node.className)
    expect(children.indexOf('viewer-footer')).toBe(children.length - 1)
  })

  it('never mounts a playable board or an input handler', () => {
    const wrapper = mount(ViewerBoard)

    expect(wrapper.findComponent({ name: 'InputHandler' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'GameBoard' }).exists()).toBe(false)
    expect(wrapper.find('.player-board').exists()).toBe(false)
  })

  it('never emits gameplay events to the server', async () => {
    const wrapper = mount(ViewerBoard)

    socketEvents()['all_player'](roster)
    await wrapper.vm.$nextTick()

    expect(socket.emit).not.toHaveBeenCalled()
  })

  it('renders one spectrum per player, self included', async () => {
    const wrapper = mount(ViewerBoard)

    socketEvents()['all_player'](roster)
    await wrapper.vm.$nextTick()

    const spectrums = wrapper.findAllComponents({ name: 'SpectrumComponent' })
    expect(spectrums).toHaveLength(4)
    expect(spectrums[0].props('name')).toBe('Alex')
    expect(wrapper.find('.viewer-waiting').exists()).toBe(false)
  })

  it('enlarges the boards when there are fewer players to watch', async () => {
    const wrapper = mount(ViewerBoard)
    const events = socketEvents()

    const cellSize = () =>
      wrapper.findAllComponents({ name: 'SpectrumComponent' })[0].props('cellSize')

    events['all_player'](roster.slice(0, 2))
    await wrapper.vm.$nextTick()
    const twoPlayers = cellSize()

    events['all_player'](roster.slice(0, 3))
    await wrapper.vm.$nextTick()
    const threePlayers = cellSize()

    events['all_player']([...roster, { id: 5, name: 'Frank' }])
    await wrapper.vm.$nextTick()
    const fivePlayers = cellSize()

    expect(twoPlayers).toBeGreaterThan(threePlayers)
    expect(threePlayers).toBeGreaterThan(fivePlayers)
    // Toujours plus grand que les spectres affichés à côté du plateau d'un joueur.
    expect(fivePlayers).toBeGreaterThan(12)
  })

  it('flags the winner and shows the end banner', async () => {
    const wrapper = mount(ViewerBoard)
    const events = socketEvents()

    events['all_player'](roster)
    events['game_end']({ winnerId: 2, winnerName: 'Bob' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.end-banner').text()).toContain('Bob WINS THE GAME')
    expect(wrapper.find('.viewer-hint').text()).toContain('reload the page to join the next one')
    const spectrums = wrapper.findAllComponents({ name: 'SpectrumComponent' })
    expect(spectrums[1].props('won')).toBe(true)
    expect(spectrums[0].props('won')).toBe(false)
  })

  it('falls back on GAME OVER when the round ends without a winner', async () => {
    const wrapper = mount(ViewerBoard)

    socketEvents()['game_end']({ winnerId: null, winnerName: null })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.end-banner').text()).toContain('GAME OVER')
  })

  it('clears the previous result when a new game starts', async () => {
    const wrapper = mount(ViewerBoard)
    const events = socketEvents()

    events['game_end']({ winnerId: 2, winnerName: 'Bob' })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.end-banner').exists()).toBe(true)

    events['all_player'](roster)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.end-banner').exists()).toBe(false)
  })

  it('registers and releases its socket listeners', () => {
    const wrapper = mount(ViewerBoard)

    expect(socket.on).toHaveBeenCalledWith('all_player', expect.any(Function))
    expect(socket.on).toHaveBeenCalledWith('game_end', expect.any(Function))

    wrapper.unmount()

    expect(socket.off).toHaveBeenCalledWith('all_player', expect.any(Function))
    expect(socket.off).toHaveBeenCalledWith('game_end', expect.any(Function))
  })
})
