import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import NextPiecesHandler from '@/components/game/NextPiecesHandler.vue'

describe('NextPieces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    BlockRenderer: true,
  }
  const cellSize = 20

  it('renders pieces from pieceIds prop', () => {
    // IDs: 3=L, 6=T, 5=S, 1=I, 7=Z
    const wrapper = mount(NextPiecesHandler, {
      props: { cellSize, pieceIds: [3, 6, 5, 1, 7] },
      global: { stubs },
    })

    const pieces = wrapper.findAllComponents({ name: 'PieceComponent' })
    expect(pieces[0].props('type')).toBe('L')
    expect(pieces[4].props('type')).toBe('Z')
    // y = 2 + (index 4 * 3) = 14
    expect(pieces[4].props('y')).toBe(14)
  })

  it('updates when pieceIds prop changes', async () => {
    const wrapper = mount(NextPiecesHandler, {
      props: { cellSize, pieceIds: [1, 2, 3, 4, 5] },
      global: { stubs },
    })

    await wrapper.setProps({ pieceIds: [7, 6, 5, 4, 3] })
    const pieces = wrapper.findAllComponents({ name: 'PieceComponent' })
    expect(pieces[0].props('type')).toBe('Z')
    expect(pieces[4].props('type')).toBe('L')
  })
})
