import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import GroundHandler from '@/components/game/GroundHandler.vue'


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

    //should return
    wrapper.vm.addGround(5)
    wrapper.vm.addGround(5)
    wrapper.vm.addGround(5)
    await wrapper.vm.$nextTick()

    expect(firstBlock.props('y')).toBe(0)
    wrapper.vm.addGround(5)
    await wrapper.vm.$nextTick()

    expect(firstBlock.props('y')).toBe(0)
  })
})

