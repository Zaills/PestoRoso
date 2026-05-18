import { describe, expect, it, vi } from 'vitest'
import { changeTeam, joinOrCreateGame, leaveRoom } from '../../../assets/gamesManager'

const createMockSocket = (id: string) =>
  ({
    id,
    emit: vi.fn(),
  } as any)

describe('Server Game Manager', () => {

  it('should create a new room and add the player to the list', () => {
    const socket = createMockSocket('socket1')
    joinOrCreateGame('roomA', 'Alex', socket)

    expect(socket.emit).toHaveBeenCalledWith(
      'room_update',
      ['Alex'],
      [],
    )
  })

  it('should add new player to the list', () => {
    const socket1 = createMockSocket('socket1')
    const socket2 = createMockSocket('socket2')

    joinOrCreateGame('roomB', 'Alex', socket1)
    joinOrCreateGame('roomB', 'Bob', socket2)

    expect(socket2.emit).toHaveBeenCalledWith('room_update', ['Alex', 'Bob'], [])
    expect(socket1.emit).toHaveBeenLastCalledWith('room_update', ['Alex', 'Bob'], [])
  })

  it('should move a player when change team', () => {
    const socket = createMockSocket('socket1')
    joinOrCreateGame('roomC', 'Alex', socket)

    changeTeam('roomC', 'Alex', socket)
    expect(socket.emit).toHaveBeenLastCalledWith('room_update', [], ['Alex'])

    changeTeam('roomC', 'Alex', socket)
    expect(socket.emit).toHaveBeenLastCalledWith('room_update', ['Alex'], [])
  })

  it('should add joining players to spectators if the game is already started', () => {
    const socket1 = createMockSocket('socket1')
    const socket2 = createMockSocket('socket2')

    joinOrCreateGame('roomD', 'Alex', socket1)
    // TODO
  })

  it('should clean up the room when the last player leaves', () => {
    const socket1 = createMockSocket('socket1')
    joinOrCreateGame('roomE', 'Alex', socket1)

    leaveRoom(socket1)

    const socket2 = createMockSocket('socket2')
    joinOrCreateGame('roomE', 'Bob', socket2)

    expect(socket2.emit).toHaveBeenCalledWith('room_update', ['Bob'], [])
  })

  it('should not crash if changeTeam is called on a non-existent room', () => {
    const socket = createMockSocket('socket1')
    expect(() => changeTeam('roomF', 'Alex', socket)).not.toThrow()
  })
})
