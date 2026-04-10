import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GroundHandler from '../../GroundHandler.vue'


describe('Ground', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    BlockRenderer: true
  }
  const defaultProps = {
    height: 20,
    width: 10,
    cellSize: 20,
  }

  it('Should render properly', () => {
    const wrapper = mount(GroundHandler, { global: { stubs }})
  })

  it('Calculate Y coordinate', async () => {
    const wrapper = mount(GroundHandler, {
      props: defaultProps,
      global: { stubs },
    })
    // groundHeight = 20 - 4 = 16.
    const firstBlock = wrapper.findComponent({ name: 'BlockRenderer' })
    expect(firstBlock.props('y')).toBe(16)

    // groundHeight = 20 - 5 = 15.
    wrapper.vm.addGround(1)
    await wrapper.vm.$nextTick()

    expect(firstBlock.props('y')).toBe(15)
  })
})

