import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import HoldComponent from '@/components/game/HoldComponent.vue'

describe('Hold', () => {
  const cellSize = 20

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    PieceComponent: true,
  }

  it('renders nothing when pieceName is null', () => {
    const wrapper = mount(HoldComponent, {
      props: { cellSize, pieceName: null },
      global: { stubs },
    })

    expect(wrapper.findAllComponents({ name: 'PieceComponent' }).length).toBe(0)
  })

  it('offsets "I"', () => {
    const wrapper = mount(HoldComponent, {
      props: { cellSize, pieceName: 'I' },
      global: { stubs },
    })

    const piece = wrapper.getComponent({ name: 'PieceComponent' })
    expect(piece.props('type')).toBe('I')
    expect(piece.props('x')).toBe(2.5)
    expect(piece.props('y')).toBe(2.9)
  })

  it('offsets "O"', () => {
    const wrapper = mount(HoldComponent, {
      props: { cellSize, pieceName: 'O' },
      global: { stubs },
    })

    const piece = wrapper.getComponent({ name: 'PieceComponent' })
    expect(piece.props('type')).toBe('O')
    expect(piece.props('x')).toBe(2.5)
    expect(piece.props('y')).toBe(2.5)
  })

  it('renders "T" with default offsets', () => {
    const wrapper = mount(HoldComponent, {
      props: { cellSize, pieceName: 'T' },
      global: { stubs },
    })

    const piece = wrapper.getComponent({ name: 'PieceComponent' })
    expect(piece.props('type')).toBe('T')
    expect(piece.props('x')).toBe(2)
    expect(piece.props('y')).toBe(2.5)
  })
})
