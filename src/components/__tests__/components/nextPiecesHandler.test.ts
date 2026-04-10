import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NextPiecesHandler from '../../NextPiecesHandler.vue'


describe('NextPieces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    BlockRenderer: true,
  }
  const cellSize= 20

  it('Should render properly', () => {
    const wrapper = mount(NextPiecesHandler, { global: { stubs } })
  })

  it('shifts pieces', async () => {
    const wrapper = mount(NextPiecesHandler, {
      props: { cellSize },
      global: { stubs: { PieceComponent: true } },
    })

    wrapper.vm.newPieces('Z')
    await wrapper.vm.$nextTick()

    const pieces = wrapper.findAllComponents({ name: 'PieceComponent' })

    expect(pieces[0].props('type')).toBe('L')
    expect(pieces[4].props('type')).toBe('Z')

    // y = 2 + (index 4 * 3) = 14
    expect(pieces[4].props('y')).toBe(14)
  })
})
