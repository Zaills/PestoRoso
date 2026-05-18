import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import BlockRenderer from '@/components/game/BlockRenderer.vue'


describe('Block Render', () => {
  it('renders correctly', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        type: 'I',
        cellSize: 30,
        x: 2,
        y: 5,
      },
    })
    const div = wrapper.find('.cell')
    const style = div.attributes('style')

    // x(2) * cellSize(30) = 60px
    // y(5) * cellSize(30) = 150px
    expect(style).toContain('width: 30px')
    expect(style).toContain('height: 30px')
    expect(style).toContain('left: 60px')
    expect(style).toContain('top: 150px')
  })

  it('applies the correct CSS class for the tetromino type', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        type: 'Z',
        cellSize: 20,
        x: 0,
        y: 0,
      },
    })

    expect(wrapper.classes()).toContain('cell')
    expect(wrapper.classes()).toContain('Z')
    expect(wrapper.classes()).not.toContain('empty')
  })

  it('updates reactively when props change', async () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        type: 'empty',
        cellSize: 20,
        x: 0,
        y: 0,
      },
    })

    expect(wrapper.classes()).toContain('empty')

    await wrapper.setProps({ type: 'L' })

    expect(wrapper.classes()).toContain('L')
    expect(wrapper.classes()).not.toContain('empty')
  })

  it('renders the cell div', () => {
    const wrapper = mount(BlockRenderer, {
      props: { type: 'I', cellSize: 30, x: 5, y: 10 },
    })

    expect(wrapper.find('.cell').exists()).toBe(true)
  })
})
