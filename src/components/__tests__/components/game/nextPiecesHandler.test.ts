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
  const cellSize= 20

  it('shifts pieces', async () => {
    const wrapper = mount(NextPiecesHandler, {
      props: { cellSize },
      global: { stubs },
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
