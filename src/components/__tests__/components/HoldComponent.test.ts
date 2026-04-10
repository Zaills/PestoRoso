import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HoldComponent from '../../HoldComponent.vue'


describe('Hold', () => {
  const cellSize = 20

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    PieceComponent: true
  }

  it('Should render properly', async () => {
    const wrapper = mount(HoldComponent, stubs)
  })

  it('default state ("N")', () => {
    const wrapper = mount(HoldComponent, {
      props: { cellSize },
      global: { stubs },
    })

    const piece = wrapper.getComponent({ name: 'PieceComponent' })

    expect(piece.props('type')).toBe('N')
    expect(piece.props('x')).toBe(2)
    expect(piece.props('y')).toBe(2.5)
  })

  it('offsets "I"', async () => {
    const wrapper = mount(HoldComponent, {
      props: { cellSize },
      global: { stubs },
    })

    wrapper.vm.addHold('I')
    await wrapper.vm.$nextTick()

    const piece = wrapper.getComponent({ name: 'PieceComponent' })
    expect(piece.props('type')).toBe('I')
    expect(piece.props('x')).toBe(2.5)
    expect(piece.props('y')).toBe(2.9)
  })

  it('offsets "O" ', async () => {
    const wrapper = mount(HoldComponent, {
      props: { cellSize },
      global: { stubs },
    })

    wrapper.vm.addHold('O')
    await wrapper.vm.$nextTick()

    const piece = wrapper.getComponent({ name: 'PieceComponent' })
    expect(piece.props('type')).toBe('O')
    expect(piece.props('x')).toBe(2.5)
    expect(piece.props('y')).toBe(2.5)
  })

  it('Replace hold', async () => {
    const wrapper = mount(HoldComponent, { global: { stubs } })

    wrapper.vm.addHold('T')
    await wrapper.vm.$nextTick()

    const piece = wrapper.getComponent({ name: 'PieceComponent' })
    expect(piece.props('type')).toBe('T')
    expect(piece.props('x')).toBe(2)
    expect(piece.props('y')).toBe(2.5)

  })
})
